// T-096 S-01 · `enrollments.decided_reason` es del admin hacia la alumna, no de la docente.
// `enrollments_read` deja a la docente duena leer las FILAS de su curso (el roster), y el grant de
// SELECT por columna de 0029 le daba tambien el motivo de cada rechazo. 0080 saca la columna del
// grant: la unica via de lectura es `my_enrollment_requests()`, que filtra por `auth.uid()`.
// Cada test corre en mutacion real: con el grant de vuelta, la docente tiene que leerlo otra vez.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const MOTIVO = 'Ya hablamos por tu situacion, escribime en marzo';

const asRechazada = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asDuena = (db, fn) => asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, fn);
const asAdmin = (db, fn) => asUser(db, { sub: ID.admin, userRole: 'admin' }, fn);

const WHITELIST_SELECT = [
  'course_id', 'decided_at', 'enrolled_at', 'granted_by', 'id', 'requested_at', 'status', 'updated_at', 'user_id',
];

const columnasConSelect = async (db, rol) =>
  (
    await db.query(
      `select a.attname as col
         from pg_attribute a
        where a.attrelid = 'public.enrollments'::regclass and a.attnum > 0 and not a.attisdropped
          and has_column_privilege($1, a.attrelid, a.attnum, 'SELECT')
        order by 1`,
      [rol],
    )
  ).rows.map((r) => r.col);

describe('T-096 S-01 · decided_reason no sale por select directo', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    // La alumna `otro` pidio el curso de la docente A y el admin la rechazo con un motivo personal.
    await db.query(
      `insert into public.enrollments (user_id, course_id, status, requested_at, decided_at, decided_reason)
       values ($1, $2, 'rejected', now() - interval '1 day', now(), $3)`,
      [ID.otro, ID.courseA, MOTIVO],
    );
  });

  after(async () => db?.close());

  test('la docente duena no lee decided_reason del roster de su curso (42501)', async () => {
    const r = await asDuena(db, () =>
      attempt(db, `select user_id, decided_reason from public.enrollments where course_id = $1`, [ID.courseA]),
    );
    assert.equal(r.ok, false, 'la docente leyo el motivo del rechazo');
    assert.equal(r.code, PRIV_DENIED);
  });

  test('control: la docente duena sigue leyendo las columnas del roster', async () => {
    const r = await asDuena(db, () =>
      attempt(db, `select user_id, status, requested_at, decided_at from public.enrollments where course_id = $1`, [
        ID.courseA,
      ]),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 2);
  });

  test('ni la duena de la fila por select directo: su unica via es la funcion', async () => {
    const r = await asRechazada(db, () =>
      attempt(db, `select decided_reason from public.enrollments where user_id = $1`, [ID.otro]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('el grant de SELECT de authenticated es exactamente la whitelist, sin decided_reason', async () => {
    assert.deepEqual(await columnasConSelect(db, 'authenticated'), WHITELIST_SELECT);
    assert.deepEqual(await columnasConSelect(db, 'anon'), []);
  });

  test('mutacion: con el grant de 0029 de vuelta, la docente lo lee (el test prueba el grant)', async () => {
    await db.exec(`begin; grant select (decided_reason) on public.enrollments to authenticated;`);
    try {
      const r = await asDuena(db, () =>
        attempt(db, `select decided_reason from public.enrollments where course_id = $1 and user_id = $2`, [
          ID.courseA,
          ID.otro,
        ]),
      );
      assert.equal(r.ok, true, r.message);
      assert.equal(r.rows[0].decided_reason, MOTIVO);
    } finally {
      await db.exec(`reset role; rollback;`);
    }
  });
});

describe('T-096 S-01 · my_enrollment_requests()', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(
      `insert into public.enrollments (user_id, course_id, status, requested_at, decided_at, decided_reason)
       values ($1, $2, 'rejected', now() - interval '1 day', now(), $3)`,
      [ID.otro, ID.courseA, MOTIVO],
    );
  });

  after(async () => db?.close());

  test('la alumna rechazada lee su propio motivo', async () => {
    const r = await asRechazada(db, () =>
      attempt(db, `select course_id, status, decided_reason, requested_at is not null as pedida from public.my_enrollment_requests()`),
    );
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ course_id: ID.courseA, status: 'rejected', decided_reason: MOTIVO, pedida: true }]);
  });

  test('otra alumna recibe solo SUS filas, nunca el motivo ajeno', async () => {
    const r = await asStudent(db, () => attempt(db, `select course_id, status, decided_reason from public.my_enrollment_requests()`));
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ course_id: ID.courseA, status: 'active', decided_reason: null }]);
  });

  test('la docente duena no recibe filas de sus alumnas', async () => {
    const r = await asDuena(db, () => attempt(db, `select * from public.my_enrollment_requests()`));
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, []);
  });

  test('el admin por sesion tampoco: su lectura es admin_list_enrollments con service_role', async () => {
    const r = await asAdmin(db, () => attempt(db, `select * from public.my_enrollment_requests()`));
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, []);
  });

  test('anon no tiene EXECUTE', async () => {
    const r = await asAnon(db, () => attempt(db, `select * from public.my_enrollment_requests()`));
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('es SECURITY DEFINER con search_path fijo', async () => {
    const r = await db.query(
      `select p.prosecdef, p.proconfig from pg_proc p
        where p.oid = 'public.my_enrollment_requests()'::regprocedure`,
    );
    assert.equal(r.rows[0].prosecdef, true);
    assert.deepEqual(r.rows[0].proconfig, ['search_path=""']);
  });

  test('admin_list_enrollments (service_role) sigue devolviendo el motivo', async () => {
    const r = await asUser(db, { sub: null, role: 'service_role' }, () =>
      attempt(db, `select decided_reason from public.admin_list_enrollments(null, null, null, 50) where decided_reason is not null`),
    );
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows.map((x) => x.decided_reason), [MOTIVO]);
  });
});

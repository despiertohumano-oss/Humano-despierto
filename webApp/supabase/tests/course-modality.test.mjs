// B2 · Modalidad informativa del curso y certificado opcional (spec 2026-11-08 §B2).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const COLS = ['includes_recorded', 'includes_pdf', 'includes_downloads', 'includes_live', 'access_terms', 'issues_certificate'];

describe('B2 · modalidad del curso', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('defaults: grabado si, certificado si, el resto no', async () => {
    const r = await db.query(`select ${COLS.join(', ')} from public.courses where id = $1`, [ID.courseA]);
    assert.deepEqual(r.rows[0], {
      includes_recorded: true, includes_pdf: false, includes_downloads: false,
      includes_live: false, access_terms: null, issues_certificate: true,
    });
  });

  test('grants: anon y authenticated leen; authenticated inserta y actualiza; anon no escribe', async () => {
    for (const col of COLS) {
      const r = await db.query(
        `select has_column_privilege('anon', 'public.courses', $1, 'SELECT') as anon_sel,
                has_column_privilege('anon', 'public.courses', $1, 'UPDATE') as anon_upd,
                has_column_privilege('authenticated', 'public.courses', $1, 'SELECT') as auth_sel,
                has_column_privilege('authenticated', 'public.courses', $1, 'UPDATE') as auth_upd,
                has_column_privilege('authenticated', 'public.courses', $1, 'INSERT') as auth_ins`,
        [col],
      );
      assert.deepEqual(r.rows[0], { anon_sel: true, anon_upd: false, auth_sel: true, auth_upd: true, auth_ins: true }, col);
    }
  });

  test('la duena carga la modalidad de su curso', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(
        db,
        `update public.courses set includes_pdf = true, includes_live = true,
           access_terms = 'Encuentros los martes; se coordinan por anuncios.', issues_certificate = false
         where id = $1 returning includes_live`,
        [ID.courseA],
      ),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
    await db.query(`update public.courses set includes_pdf = false, includes_live = false, access_terms = null, issues_certificate = true where id = $1`, [ID.courseA]);
  });

  test('access_terms: mas de 500 caracteres rebota', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['x'.repeat(501), ID.courseA]),
    );
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('access_terms: un link rebota (mitad de forma de ADR-009)', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['Bajalo de drive.google.com/file/d/X1', ID.courseA]),
    );
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('access_terms: el video_id real rebota (mitad exacta, courses_locator_guard)', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set access_terms = $1 where id = $2`, ['Mira dQw4w9WgXcQ', ID.courseA]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('otra docente no alcanza la fila', async () => {
    const r = await asUser(db, { sub: ID.teacherB, userRole: 'teacher' }, () =>
      attempt(db, `update public.courses set issues_certificate = false where id = $1 returning id`, [ID.courseA]),
    );
    assert.equal(r.ok, true);
    assert.equal(r.rows.length, 0);
  });
});

describe('B2 · certificado con issues_certificate = false', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    const lecciones = (
      await db.query(`select id, duration_seconds from public.lessons where course_id = $1 and is_published`, [ID.courseA])
    ).rows;
    await db.exec(`set session_replication_role = replica;`);
    try {
      for (const l of lecciones) {
        await db.query(
          `insert into public.lesson_progress (user_id, course_id, lesson_id, seconds_watched, completed, completed_at, last_seen_at)
           values ($1, $2, $3, $4, true, now(), now())`,
          [ID.student, ID.courseA, l.id, l.duration_seconds],
        );
      }
    } finally {
      await db.exec(`set session_replication_role = origin;`);
    }
  });
  after(async () => db?.close());

  const emitir = () =>
    asService(db, () => attempt(db, `insert into public.certificates (user_id, course_id) values ($1, $2) returning id`, [ID.student, ID.courseA]));

  test('con la alumna elegible y el flag apagado, service_role no emite', async () => {
    await db.query(`update public.courses set issues_certificate = false where id = $1`, [ID.courseA]);
    const r = await emitir();
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
    assert.match(r.message, /no emite certificado/);
  });

  test('control: con el flag prendido la misma emision pasa', async () => {
    await db.query(`update public.courses set issues_certificate = true where id = $1`, [ID.courseA]);
    const r = await emitir();
    assert.equal(r.ok, true, r.message);
  });

  test('apagar el flag no revoca lo emitido', async () => {
    await db.query(`update public.courses set issues_certificate = false where id = $1`, [ID.courseA]);
    const r = await db.query(`select count(*)::int as n from public.certificates where course_id = $1`, [ID.courseA]);
    assert.equal(r.rows[0].n, 1);
  });
});

// B4 · Una sola creadora, docente, y solo la marca service_role via admin_set_founder.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const UNIQUE = '23505';
const founders = async (db) =>
  (await db.query(`select id from public.profiles where is_founder order by id`)).rows.map((r) => r.id);

describe('B4 · profiles.is_founder', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('grants: lo leen anon y authenticated, no lo escribe ningun cliente', async () => {
    const r = await db.query(`
      select has_column_privilege('anon', 'public.profiles', 'is_founder', 'SELECT') as anon_sel,
             has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'SELECT') as auth_sel,
             has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'UPDATE') as auth_upd,
             has_column_privilege('anon', 'public.profiles', 'is_founder', 'UPDATE') as anon_upd`);
    assert.deepEqual(r.rows[0], { anon_sel: true, auth_sel: true, auth_upd: false, anon_upd: false });
  });

  test('la docente no se marca sola', async () => {
    const r = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.teacherA]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('admin_set_founder marca y, al marcar a otra, desmarca a la anterior', async () => {
    await asService(db, () => db.query(`select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.deepEqual(await founders(db), [ID.teacherA]);
    await asService(db, () => db.query(`select public.admin_set_founder($1)`, [ID.teacherB]));
    assert.deepEqual(await founders(db), [ID.teacherB]);
  });

  test('admin_set_founder(null) desmarca', async () => {
    await asService(db, () => db.query(`select public.admin_set_founder(null)`));
    assert.deepEqual(await founders(db), []);
  });

  test('una alumna no puede ser la creadora (22023)', async () => {
    const r = await asService(db, () => attempt(db, `select public.admin_set_founder($1)`, [ID.student]));
    assert.equal(r.code, '22023');
  });

  test('ni anon ni authenticated ejecutan admin_set_founder', async () => {
    const a = await asAnon(db, () => attempt(db, `select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.equal(a.code, PRIV_DENIED);
    const u = await asUser(db, { sub: ID.admin, userRole: 'admin' }, () => attempt(db, `select public.admin_set_founder($1)`, [ID.teacherA]));
    assert.equal(u.code, PRIV_DENIED);
  });

  test('dos creadoras chocan con el indice unico, aun como owner', async () => {
    await db.query(`update public.profiles set is_founder = true where id = $1`, [ID.teacherA]);
    const r = await attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.teacherB]);
    assert.equal(r.code, UNIQUE);
  });

  test('marcar a una alumna directo choca con el CHECK', async () => {
    const r = await attempt(db, `update public.profiles set is_founder = true where id = $1`, [ID.student]);
    assert.equal(r.code, CHECK_VIOLATION);
  });

  test('si la creadora deja de ser docente, queda desmarcada', async () => {
    assert.deepEqual(await founders(db), [ID.teacherA]);
    const r = await asService(db, () => attempt(db, `update public.profiles set role = 'student' where id = $1 returning is_founder`, [ID.teacherA]));
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ is_founder: false }]);
  });
});

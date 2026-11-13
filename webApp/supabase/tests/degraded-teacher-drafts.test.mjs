// T-097 · D-121 · Una docente degradada deja de leer sus borradores (curso, su curriculum y posts
// del Diario). Lo publicado y el acceso de la alumna inscripta no cambian.
//
// El JWT de la degradada sigue diciendo `teacher` a proposito: la autoridad es profiles.role.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const LUNA = { sub: ID.teacherB, userRole: 'teacher' };
const SOL = { sub: ID.teacherA, userRole: 'teacher' };
const ALUMNA = { sub: ID.student, userRole: 'student' };
const ADMIN = { sub: ID.admin, userRole: 'admin' };
const MODULO_BORRADOR = '50000000-0000-4000-8000-0000000000dd';

async function ve(db, actor, sql, params) {
  const r = await asUser(db, actor, () => attempt(db, sql, params));
  assert.equal(r.ok, true, r.message);
  return r.rows.length;
}

describe('D-121 · borradores solo para la docente con rol vigente', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(`insert into public.course_modules (id, course_id, position, title) values ($1, $2, 1, 'Raices')`, [
      MODULO_BORRADOR,
      ID.courseDraft,
    ]);
  });
  after(async () => db?.close());

  const curso = `select id from public.courses where id = $1`;
  const modulo = `select id from public.course_modules where id = $1`;
  const post = `select id from public.diario_posts where id = $1`;
  const legible = `select public.can_read_course($1) as si`;

  test('control: con role=teacher ve su curso borrador, su modulo y su post borrador', async () => {
    assert.equal(await ve(db, LUNA, curso, [ID.courseDraft]), 1);
    assert.equal(await ve(db, LUNA, modulo, [MODULO_BORRADOR]), 1);
    assert.equal(await ve(db, LUNA, post, [ID.postDraftB]), 1);
    const r = await asUser(db, LUNA, () => attempt(db, legible, [ID.courseDraft]));
    assert.equal(r.rows[0].si, true);
  });

  test('control: otra docente no ve el borrador ajeno', async () => {
    assert.equal(await ve(db, SOL, curso, [ID.courseDraft]), 0);
    assert.equal(await ve(db, SOL, post, [ID.postDraftB]), 0);
  });

  describe('degradada a student', () => {
    before(async () => {
      await db.query(`update public.profiles set role = 'student' where id = $1`, [ID.teacherB]);
    });
    after(async () => {
      await db.query(`update public.profiles set role = 'teacher' where id = $1`, [ID.teacherB]);
    });

    test('no lee su curso borrador', async () => {
      assert.equal(await ve(db, LUNA, curso, [ID.courseDraft]), 0);
    });

    test('can_read_course da false: tampoco lee modulos del borrador', async () => {
      const r = await asUser(db, LUNA, () => attempt(db, legible, [ID.courseDraft]));
      assert.equal(r.rows[0].si, false);
      assert.equal(await ve(db, LUNA, modulo, [MODULO_BORRADOR]), 0);
    });

    test('no lee su post borrador del Diario', async () => {
      assert.equal(await ve(db, LUNA, post, [ID.postDraftB]), 0);
    });

    test('lo publicado lo sigue viendo como cualquiera', async () => {
      assert.equal(await ve(db, LUNA, curso, [ID.courseB]), 1);
      assert.equal(await ve(db, LUNA, post, [ID.postA]), 1);
    });

    test('el admin sigue viendo el borrador', async () => {
      assert.equal(await ve(db, ADMIN, curso, [ID.courseDraft]), 1);
      assert.equal(await ve(db, ADMIN, modulo, [MODULO_BORRADOR]), 1);
      assert.equal(await ve(db, ADMIN, post, [ID.postDraftB]), 1);
    });
  });

  describe('lo publicado y la alumna no cambian', () => {
    test('anon lee publicados y no borradores, sin 42501', async () => {
      for (const [sql, id, esperado] of [
        [curso, ID.courseA, 1],
        [curso, ID.courseDraft, 0],
        [post, ID.postA, 1],
        [post, ID.postDraftB, 0],
        [modulo, ID.moduleA, 1],
      ]) {
        const r = await asAnon(db, () => attempt(db, sql, [id]));
        assert.equal(r.ok, true, r.message);
        assert.equal(r.rows.length, esperado);
      }
    });

    test('la alumna inscripta sigue leyendo su curso, modulos y lecciones', async () => {
      assert.equal(await ve(db, ALUMNA, curso, [ID.courseA]), 1);
      assert.equal(await ve(db, ALUMNA, modulo, [ID.moduleA]), 1);
      assert.equal(await ve(db, ALUMNA, `select id from public.lessons where id = $1`, [ID.lessonA]), 1);
      assert.equal(await ve(db, ALUMNA, `select id from public.lesson_chapters where id = $1`, [ID.chapterA]), 1);
      assert.equal(await ve(db, ALUMNA, curso, [ID.courseDraft]), 0);
    });
  });
});

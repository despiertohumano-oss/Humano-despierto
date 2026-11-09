// B1 · courses.discipline es una clave de una lista cerrada (spec 2026-11-08 §B1).
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const DUENA = { sub: ID.teacherA, userRole: 'teacher' };
const ANTES_DE_0073 = '20261028100000_0071_tarot_readings.sql';

describe('B1 · disciplinas cerradas', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('la docente guarda una clave de la lista', async () => {
    const r = await asUser(db, DUENA, () =>
      attempt(db, `update public.courses set discipline = 'gemoterapia' where id = $1 returning discipline`, [ID.courseA]),
    );
    assert.equal(r.ok, true, r.message);
    assert.deepEqual(r.rows, [{ discipline: 'gemoterapia' }]);
    await db.query(`update public.courses set discipline = 'tarot' where id = $1`, [ID.courseA]);
  });

  for (const malo of ['Tarot', 'herbolaria', 'reiki', '', 'tarot ']) {
    test(`rechaza "${malo}"`, async () => {
      const r = await asUser(db, DUENA, () =>
        attempt(db, `update public.courses set discipline = $1 where id = $2`, [malo, ID.courseA]),
      );
      assert.equal(r.ok, false, `paso: ${malo}`);
      assert.equal(r.code, CHECK_VIOLATION);
    });
  }

  test('service_role tampoco lo saltea: es invariante', async () => {
    await db.exec(`set role service_role;`);
    try {
      const r = await attempt(db, `update public.courses set discipline = 'Herbal' where id = $1`, [ID.courseA]);
      assert.equal(r.code, CHECK_VIOLATION);
    } finally {
      await db.exec(`reset role;`);
    }
  });
});

describe('B1 · remapeo de valores previos', () => {
  test('astrología/tarot pasan a su clave; el resto a magia y a draft', async () => {
    const { db, applyRemaining } = await bootDatabase({ until: ANTES_DE_0073 });
    try {
      await db.exec(`
        insert into auth.users (id, email) values ('${ID.teacherA}', 'sol@humano.test');
        update public.profiles set role = 'teacher', full_name = 'Sol', slug = 'sol' where id = '${ID.teacherA}';
        insert into public.courses (slug, title, discipline, level, teacher_id, status, published_at) values
          ('a', 'A', 'Astrología', 'Inicial', '${ID.teacherA}', 'published', now()),
          ('b', 'B', 'Tarot',      'Inicial', '${ID.teacherA}', 'published', now()),
          ('c', 'C', 'Herbal',     'Inicial', '${ID.teacherA}', 'published', now()),
          ('d', 'D', 'Reiki',      'Inicial', '${ID.teacherA}', 'draft',     null),
          ('e', 'E', 'Magia',      'Inicial', '${ID.teacherA}', 'published', now());
      `);
      await applyRemaining();
      const r = await db.query(`select slug, discipline, status from public.courses order by slug`);
      assert.deepEqual(r.rows, [
        { slug: 'a', discipline: 'astrologia', status: 'published' },
        { slug: 'b', discipline: 'tarot', status: 'published' },
        { slug: 'c', discipline: 'magia', status: 'draft' },
        { slug: 'd', discipline: 'magia', status: 'draft' },
        { slug: 'e', discipline: 'magia', status: 'published' },
      ]);
    } finally {
      await db.close();
    }
  });
});

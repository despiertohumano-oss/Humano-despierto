// B3 · Diario como revista: categoria cerrada, portada atada al post y cursos relacionados.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const CHECK_VIOLATION = '23514';
const PRIV_DENIED = '42501';
const UNIQUE = '23505';
const SOL = { sub: ID.teacherA, userRole: 'teacher' };
const LUNA = { sub: ID.teacherB, userRole: 'teacher' };
const ARCHIVO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const portadaDe = (postId, ext = 'jpg') => `diario/${postId}/${ARCHIVO}.${ext}`;
const DRAFT_SOL = '40000000-0000-4000-8000-0000000000ee';

describe('B3 · diario_posts.category y cover_path', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('los posts existentes quedan en conciencia', async () => {
    const r = await db.query(`select distinct category from public.diario_posts`);
    assert.deepEqual(r.rows, [{ category: 'conciencia' }]);
  });

  test('la autora elige una categoria de la lista; otra rebota', async () => {
    const ok = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set category = 'tarot-arquetipos' where id = $1 returning category`, [ID.postA]),
    );
    assert.equal(ok.ok, true, ok.message);
    assert.equal(ok.rows.length, 1);
    const mal = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set category = 'reiki' where id = $1`, [ID.postA]),
    );
    assert.equal(mal.code, CHECK_VIOLATION);
  });

  test('portada en la carpeta de SU post; la de otro post rebota, tambien para service_role', async () => {
    const ok = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2 returning id`, [portadaDe(ID.postA, 'webp'), ID.postA]),
    );
    assert.equal(ok.ok, true, ok.message);
    const ajena = await asUser(db, SOL, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [portadaDe(ID.postDraftB), ID.postA]),
    );
    assert.equal(ajena.code, CHECK_VIOLATION);
    const servicio = await asService(db, () =>
      attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [portadaDe(ID.postDraftB), ID.postA]),
    );
    assert.equal(servicio.code, CHECK_VIOLATION);
    for (const malo of [`diario/${ID.postA}/foto.jpg`, `diario/${ID.postA}/${ARCHIVO}.svg`, `covers/${ID.postA}/${ARCHIVO}.jpg`]) {
      const r = await asUser(db, SOL, () => attempt(db, `update public.diario_posts set cover_path = $1 where id = $2`, [malo, ID.postA]));
      assert.equal(r.code, CHECK_VIOLATION, `paso: ${malo}`);
    }
  });

  test('grants: anon lee category y cover_path; authenticated inserta category y no cover_path', async () => {
    const r = await db.query(`
      select has_column_privilege('anon', 'public.diario_posts', 'category', 'SELECT') as anon_cat,
             has_column_privilege('anon', 'public.diario_posts', 'cover_path', 'SELECT') as anon_cov,
             has_column_privilege('authenticated', 'public.diario_posts', 'category', 'INSERT') as ins_cat,
             has_column_privilege('authenticated', 'public.diario_posts', 'cover_path', 'INSERT') as ins_cov,
             has_column_privilege('authenticated', 'public.diario_posts', 'cover_path', 'UPDATE') as upd_cov`);
    assert.deepEqual(r.rows[0], { anon_cat: true, anon_cov: true, ins_cat: true, ins_cov: false, upd_cov: true });
  });
});

describe('B3 · diario_post_courses', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.query(
      `insert into public.courses (id, slug, title, discipline, level, teacher_id, status) values ($1, 'borrador-sol', 'Borrador', 'tarot', 'inicial', $2, 'draft')`,
      [DRAFT_SOL, ID.teacherA],
    );
  });
  after(async () => db?.close());

  const vincular = (actor, post, course) =>
    asUser(db, actor, () => attempt(db, `insert into public.diario_post_courses (post_id, course_id) values ($1, $2) returning post_id`, [post, course]));

  test('la autora vincula su curso publicado', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseA);
    assert.equal(r.ok, true, r.message);
  });

  test('el mismo vinculo dos veces choca con la clave', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseA);
    assert.equal(r.code, UNIQUE);
  });

  test('un curso de otra docente rebota (guard)', async () => {
    const r = await vincular(SOL, ID.postA, ID.courseB);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('un curso propio en borrador rebota (guard)', async () => {
    const r = await vincular(SOL, ID.postA, DRAFT_SOL);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('otra docente no vincula en un post ajeno (RLS)', async () => {
    const r = await vincular(LUNA, ID.postA, ID.courseB);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('service_role tampoco vincula un curso ajeno: invariante', async () => {
    const r = await asService(db, () =>
      attempt(db, `insert into public.diario_post_courses (post_id, course_id) values ($1, $2)`, [ID.postA, ID.courseB]),
    );
    assert.equal(r.code, PRIV_DENIED);
  });

  test('anon ve el vinculo de post y curso publicados; si el curso se despublica, desaparece', async () => {
    const antes = await asAnon(db, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.deepEqual(antes.rows, [{ course_id: ID.courseA }]);
    await db.query(`update public.courses set status = 'draft' where id = $1`, [ID.courseA]);
    const despues = await asAnon(db, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.deepEqual(despues.rows, []);
    const autora = await asUser(db, SOL, () => attempt(db, `select course_id from public.diario_post_courses where post_id = $1`, [ID.postA]));
    assert.equal(autora.rows.length, 1, 'la autora sigue viendo su vinculo');
    await db.query(`update public.courses set status = 'published', published_at = now() where id = $1`, [ID.courseA]);
  });

  test('la autora borra su vinculo; sin UPDATE para nadie', async () => {
    const upd = await db.query(`select has_table_privilege('authenticated', 'public.diario_post_courses', 'UPDATE') as u`);
    assert.equal(upd.rows[0].u, false);
    const r = await asUser(db, SOL, () =>
      attempt(db, `delete from public.diario_post_courses where post_id = $1 and course_id = $2 returning post_id`, [ID.postA, ID.courseA]),
    );
    assert.equal(r.rows.length, 1);
  });

  test('borrar el post borra sus vinculos', async () => {
    await vincular(SOL, ID.postA, ID.courseA);
    await db.query(`delete from public.diario_posts where id = $1`, [ID.postA]);
    const r = await db.query(`select count(*)::int as n from public.diario_post_courses where post_id = $1`, [ID.postA]);
    assert.equal(r.rows[0].n, 0);
  });
});

// T-080 · D-12 · ADR-009 desde el otro lado: escribir el LOCALIZADOR despues del texto.
//
// El guard de texto compara contra los localizadores que ya existen. Este archivo prueba el orden
// inverso: primero el texto (con un id que todavia no es de nadie), despues service_role asigna
// ese id. Sin 0038 los tres pasos pasan y `anon` lee el localizador pago en el titulo.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const SERVIDOR = { sub: null, role: 'service_role' };
const DOCENTE = { sub: ID.teacherA, userRole: 'teacher' };

// El rechazo tiene que venir del BARRIDO, no de otro guard por estado arrastrado entre casos.
const rechazoDelBarrido = (r, msg) => {
  assert.equal(r.ok, false, msg);
  assert.match(r.message, /ya aparece en texto publico/, `rechazado por otra cosa: ${r.message}`);
};

describe('D-12 · el localizador nuevo no puede estar ya en texto publico', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('texto primero, video_id despues: service_role queda rechazado y anon no lo lee', async () => {
    const ID_FUTURO = 'zZfuturo123';
    const texto = await asUser(db, DOCENTE, () =>
      attempt(db, `update public.lessons set title = $1 where id = $2 returning id`, [`Mira ${ID_FUTURO}`, ID.lessonPreviewB]),
    );
    assert.equal(texto.ok, true, `precondicion: el texto con un id que no es de nadie pasa (${texto.message})`);

    const loc = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = $1 where id = $2`, [ID_FUTURO, ID.lessonPreviewB]),
    );
    rechazoDelBarrido(loc, 'service_role asigno un video_id que ya estaba publicado en un titulo');
    assert.equal(loc.code, '42501');

    const leido = await asAnon(db, () => db.query(`select title from public.lessons`));
    const [vid] = (await db.query(`select video_id from public.lessons where id = $1`, [ID.lessonPreviewB])).rows;
    assert.notEqual(vid.video_id, ID_FUTURO, 'el video_id quedo guardado');
    assert.ok(leido.rows.some((r) => r.title.includes(ID_FUTURO)), 'control: el titulo sigue ahi, el que no paso es el localizador');
  });

  test('titulo y video_id en la MISMA sentencia tambien se rechaza', async () => {
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set title = $1, video_id = $2 where id = $3`, ['Clase mismoid1234', 'mismoid1234', ID.lessonA]),
    );
    rechazoDelBarrido(r, 'la sentencia combinada esquivo los dos lados');
  });

  test('normalizado: el id con otra caja y separadores en otra tabla publica (curso)', async () => {
    await asUser(db, DOCENTE, () =>
      attempt(db, `update public.courses set intro = $1 where id = $2`, ['Ver: QQ-xx-99-zz-77-b', ID.courseA]),
    );
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'qqXX99zz77c' where id = $1`, [ID.lessonA]),
    );
    // el intro normalizado es 'verqqxx99zz77b': 'qqxx99zz77c' no esta, 'qqxx99zz77b' si.
    assert.equal(r.ok, true, `un id que NO esta en el texto quedo bloqueado: ${r.message}`);
    const r2 = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'QQxx99ZZ77b' where id = $1`, [ID.lessonA]),
    );
    rechazoDelBarrido(r2, 'el barrido no normaliza caja y separadores');
  });

  test('drive_file_id y url de un recurso: mismo barrido, incluido texto con sesion (Q&A)', async () => {
    const r0 = await asUser(db, { sub: ID.student, userRole: 'student' }, () =>
      attempt(
        db,
        `insert into public.lesson_questions (lesson_id, author_id, title, body) values ($1, $2, 'Duda', 'el archivo DRIVEFUTURO99 no abre') returning id`,
        [ID.lessonA, ID.student],
      ),
    );
    assert.equal(r0.ok, true, `precondicion: la pregunta entra (${r0.message})`);
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lesson_resources set drive_file_id = 'DRIVEFUTURO99' where id = $1`, [ID.resourceA]),
    );
    rechazoDelBarrido(r, 'el barrido no cubre las columnas que lee una sesion (lesson_questions)');

    const d = await asUser(db, DOCENTE, () =>
      attempt(db, `update public.course_modules set description = 'ver https urlfutura example com x' where id = $1`, [ID.moduleA]),
    );
    assert.equal(d.ok, true, `precondicion: la descripcion con un link comun entra (${d.message})`);
    const u = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lesson_resources set url = 'https://urlfutura.example.com/x' where id = $1`, [ID.resourceA]),
    );
    rechazoDelBarrido(u, 'el barrido no cubre lesson_resources.url');
  });

  test('jsonb publico (profiles.formations) tambien se barre', async () => {
    await db.query(`update public.profiles set formations = $1::jsonb where id = $2`, [
      JSON.stringify([{ year: '2020', title: 'Curso jsonbfutur1', place: 'x' }]),
      ID.teacherB,
    ]);
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'jsonbfutur1' where id = $1`, [ID.lessonA]),
    );
    rechazoDelBarrido(r, 'el barrido no mira jsonb');
  });

  test('el barrido no es un oraculo: ningun cliente ejecuta locator_public_occurrence', async () => {
    for (const actor of [DOCENTE, { sub: ID.student, userRole: 'student' }]) {
      const r = await asUser(db, actor, () => attempt(db, `select public.locator_public_occurrence('Loco invertido')`));
      assert.equal(r.ok, false, 'un cliente puede preguntar si un texto aparece en filas que RLS le oculta');
      assert.equal(r.code, '42501');
    }
    const a = await asAnon(db, () => attempt(db, `select public.locator_public_occurrence('Loco invertido')`));
    assert.equal(a.ok, false);
  });

  test('camino legitimo: un video_id que no aparece en ningun texto se asigna', async () => {
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'limpio98765' where id = $1 returning id`, [ID.lessonA]),
    );
    assert.equal(r.ok, true, r.message);
    assert.equal(r.rows.length, 1);
  });

  // 0073: `places` (GeoNames, 86k filas) hacia el barrido de 5 s y un recurso nuevo pasaba el
  // statement_timeout. Sale porque ningun cliente la escribe: no puede tener texto plantado.
  test('exencion: places no se barre, y es porque ningun cliente la escribe', async () => {
    await db.query(
      `insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone)
       values (990001, 'Villa PLACESLOC77', 'Villa PLACESLOC88', 'PLACESLOC99', 'AR', 0, 0, 'UTC')`,
    );
    const v = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'PLACESLOC77' where id = $1`, [ID.lessonA]),
    );
    assert.equal(v.ok, true, `places.name bloqueo un video_id: ${v.message}`);
    const d = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lesson_resources set drive_file_id = 'PLACESLOC88', url = 'https://x.example.com/PLACESLOC99' where id = $1`, [ID.resourceA]),
    );
    assert.equal(d.ok, true, `places bloqueo un recurso: ${d.message}`);

    const escritura = await db.query(
      `select r.rol, p.priv
         from unnest(array['anon', 'authenticated']) r(rol),
              unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p(priv)
        where has_table_privilege(r.rol, 'public.places', p.priv)
           or (p.priv in ('INSERT', 'UPDATE') and has_any_column_privilege(r.rol, 'public.places', p.priv))`,
    );
    assert.deepEqual(escritura.rows, [], 'un cliente puede escribir places: la exencion del barrido ya no vale');
  });

  test('control de la exencion: el mismo localizador en texto publico de otra tabla sigue bloqueado', async () => {
    await asUser(db, DOCENTE, () =>
      attempt(db, `update public.courses set intro = $1 where id = $2`, ['Ver PLACESCTRL1', ID.courseA]),
    );
    await db.query(
      `insert into public.places (id, name, ascii_name, country_code, lat, lon, timezone)
       values (990002, 'PLACESCTRL1', 'PLACESCTRL1', 'AR', 0, 0, 'UTC')`,
    );
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lesson_resources set drive_file_id = 'PLACESCTRL1' where id = $1`, [ID.resourceA]),
    );
    rechazoDelBarrido(r, 'sacar places apago el barrido entero');
    assert.match(r.message, /texto publico de courses/);
  });

  test('exencion: courses.promo_video_id igual a un video_id no bloquea', async () => {
    await db.query(`update public.courses set promo_video_id = 'promo123456' where id = $1`, [ID.courseA]);
    const r = await asUser(db, SERVIDOR, () =>
      attempt(db, `update public.lessons set video_id = 'promo123456' where id = $1`, [ID.lessonA]),
    );
    assert.equal(r.ok, true, `el adelanto bloqueo una leccion: ${r.message}`);
  });
});

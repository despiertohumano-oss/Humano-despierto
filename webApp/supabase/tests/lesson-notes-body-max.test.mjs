// T-098 · G-11 · `lesson_notes.body` con tope de 4000 caracteres (0082), como campus_posts y el Q&A.
//
// La nota se escribe con la sesion de la alumna (RLS `user_id = auth.uid()`): el tope de la accion
// es la primera linea y este CHECK la segunda. Se prueba por la sesion, no como dueño, porque ese es
// el camino real. La migracion no puede romper el deploy si en la nube ya hay notas largas: el CHECK
// nace `not valid` y solo se valida si no queda ninguna fila que lo viole (caso "datos previos").

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const BEFORE_0082 = '20261113130000_0081_degraded_teacher_drafts.sql';
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);

const insertNote = (db, body) =>
  asStudent(db, () =>
    attempt(
      db,
      `insert into public.lesson_notes (user_id, course_id, lesson_id, at_seconds, body)
       values ($1, $2, $3, 10, $4) returning id`,
      [ID.student, ID.courseA, ID.lessonA, body],
    ),
  );

const constraintState = async (db) =>
  (
    await db.query(
      `select convalidated from pg_constraint
        where conrelid = 'public.lesson_notes'::regclass and conname = 'lesson_notes_body_max_length'`,
    )
  ).rows[0];

describe('G-11 · lesson_notes.body <= 4000', () => {
  let db;

  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('4000 caracteres entra', async () => {
    const r = await insertNote(db, 'a'.repeat(4000));
    assert.equal(r.ok, true, r.message);
  });

  test('4001 caracteres es 23514 al insertar', async () => {
    const r = await insertNote(db, 'a'.repeat(4001));
    assert.equal(r.ok, false);
    assert.equal(r.code, '23514');
  });

  test('editar una nota a 4001 caracteres es 23514', async () => {
    const ins = await insertNote(db, 'corta');
    assert.equal(ins.ok, true, ins.message);
    const r = await asStudent(db, () =>
      attempt(db, `update public.lesson_notes set body = $2 where id = $1`, [ins.rows[0].id, 'b'.repeat(4001)]),
    );
    assert.equal(r.ok, false);
    assert.equal(r.code, '23514');
  });

  test('cuenta caracteres, no bytes: 4000 caracteres de dos bytes entran', async () => {
    const r = await insertNote(db, 'ñ'.repeat(4000));
    assert.equal(r.ok, true, r.message);
  });

  test('sin filas previas que lo violen, el CHECK queda validado', async () => {
    assert.deepEqual(await constraintState(db), { convalidated: true });
  });
});

describe('G-11 · datos previos: una nota larga anterior a 0082 no rompe la migracion', () => {
  test('la migracion aplica, la nota sigue y el CHECK queda sin validar pero activo', async () => {
    const { db, applyRemaining } = await bootDatabase({ until: BEFORE_0082 });
    await seed(db);
    const old = await insertNote(db, 'x'.repeat(5000));
    assert.equal(old.ok, true, `precondicion: sin 0082 una nota larga entra (${old.message})`);

    await applyRemaining();

    const kept = await db.query(`select char_length(body) as n from public.lesson_notes where id = $1`, [old.rows[0].id]);
    assert.equal(kept.rows[0].n, 5000, 'la migracion no puede tocar datos de alumnas');
    assert.deepEqual(await constraintState(db), { convalidated: false });
    const r = await insertNote(db, 'a'.repeat(4001));
    assert.equal(r.code, '23514', 'aun sin validar, el CHECK frena las escrituras nuevas');
    await db.close();
  });
});

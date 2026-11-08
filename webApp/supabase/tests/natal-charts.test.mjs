// webApp/supabase/tests/natal-charts.test.mjs
// Carta natal (T-024) · natal_charts y profiles.*_sign. Dato reforzado: la dueña lee y borra;
// nadie más ve nada; escribir es solo de service_role vía save_natal_chart/set_self_natal_chart.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOtra = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const SAVE = `select public.save_natal_chart(
  p_user_id => $1, p_label => $2, p_birth_date => '1990-06-15', p_birth_time => $3::time,
  p_place_id => null, p_lat => -34.60372, p_lon => -58.38159,
  p_timezone => 'America/Argentina/Buenos_Aires', p_utc_offset_seconds => -10800,
  p_ambiguity_choice => null, p_tzdata_version => '2026e', p_house_system => 'placidus',
  p_is_self => $4, p_sun => $5::public.zodiac_sign, p_moon => $6::public.zodiac_sign,
  p_asc => $7::public.zodiac_sign) as id`;

const guardar = (db, { user = ID.student, label = 'Mi carta', time = '09:30', isSelf = false, signos = ['geminis', 'piscis', 'leo'] } = {}) =>
  asService(db, () => attempt(db, SAVE, [user, label, time, isSelf, ...signos]));

const signosDe = async (db, id) =>
  (await db.query(`select sun_sign, moon_sign, asc_sign from public.profiles where id = $1`, [id])).rows[0];

describe('natal_charts', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('anon no tiene ningún privilegio sobre natal_charts', async () => {
    const r = await asAnon(db, () => attempt(db, `select id from public.natal_charts`));
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('authenticated no tiene INSERT ni UPDATE en ninguna columna', async () => {
    const [p] = (await db.query(`
      select bool_or(has_column_privilege('authenticated', 'public.natal_charts', attname, 'INSERT')) as ins,
             bool_or(has_column_privilege('authenticated', 'public.natal_charts', attname, 'UPDATE')) as upd
        from pg_attribute where attrelid = 'public.natal_charts'::regclass and attnum > 0 and not attisdropped`)).rows;
    assert.deepEqual(p, { ins: false, upd: false });
    const ins = await asStudent(db, () => attempt(db,
      `insert into public.natal_charts (user_id, label, birth_date, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
       values ($1, 'x', '1990-01-01', 0, 0, 'UTC', 0, '2026e', 'placidus', now())`, [ID.student]));
    assert.equal(ins.code, PRIV_DENIED);
  });

  test('el cliente no ejecuta las funciones de escritura', async () => {
    const r = await asStudent(db, () => attempt(db, SAVE, [ID.student, 'x', '09:30', false, 'geminis', 'piscis', 'leo']));
    assert.equal(r.code, PRIV_DENIED);
  });

  test('service_role guarda; la dueña la lee; otra lee 0 filas y no la borra ni la cambia', async () => {
    const g = await guardar(db);
    assert.equal(g.ok, true, g.message);
    const id = g.rows[0].id;
    const propia = await asStudent(db, () => attempt(db, `select id, is_self, consented_at from public.natal_charts where id = $1`, [id]));
    assert.equal(propia.rows.length, 1);
    assert.notEqual(propia.rows[0].consented_at, null);
    const ajena = await asOtra(db, () => attempt(db, `select id from public.natal_charts where id = $1`, [id]));
    assert.equal(ajena.rows.length, 0);
    const borrar = await asOtra(db, () => attempt(db, `delete from public.natal_charts where id = $1 returning id`, [id]));
    assert.equal(borrar.rows.length, 0);
    const upd = await asStudent(db, () => attempt(db, `update public.natal_charts set label = 'y' where id = $1`, [id]));
    assert.equal(upd.code, PRIV_DENIED);
  });

  test('una sola carta propia: la segunda desmarca la primera y pisa los signos', async () => {
    assert.equal((await guardar(db, { isSelf: true })).ok, true);
    assert.equal((await guardar(db, { isSelf: true, signos: ['aries', 'tauro', 'cancer'] })).ok, true);
    const n = (await db.query(`select count(*)::int as n from public.natal_charts where user_id = $1 and is_self`, [ID.student])).rows[0].n;
    assert.equal(n, 1);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'aries', moon_sign: 'tauro', asc_sign: 'cancer' });
  });

  test('el índice único rechaza dos propias aunque se saltee la función', async () => {
    const r = await attempt(db, `update public.natal_charts set is_self = true where user_id = $1`, [ID.student]);
    assert.equal(r.ok, false);
    assert.equal(r.code, '23505');
  });

  test('signos inconsistentes con la carta propia: rechazado', async () => {
    const sinHoraConAsc = await guardar(db, { isSelf: true, time: null });
    assert.equal(sinHoraConAsc.code, CHECK_VIOLATION);
    const sinLuna = await guardar(db, { isSelf: true, signos: ['aries', null, 'leo'] });
    assert.equal(sinLuna.ok, false);
    const sinHoraOk = await guardar(db, { isSelf: true, time: null, signos: ['aries', 'tauro', null] });
    assert.equal(sinHoraOk.ok, true, sinHoraOk.message);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'aries', moon_sign: 'tauro', asc_sign: null });
  });

  test('CHECKs de forma: fecha fuera de 1900-2100, ambigüedad sin hora, segundos en la hora', async () => {
    const base = `insert into public.natal_charts (user_id, label, birth_date, birth_time, ambiguity_choice, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
                  values ($1, 'x', $2, $3::time, $4, 0, 0, 'UTC', 0, '2026e', 'placidus', now())`;
    for (const [nombre, params] of [
      ['1899-12-31', [ID.student, '1899-12-31', '10:00', null]],
      ['2101-01-01', [ID.student, '2101-01-01', '10:00', null]],
      ['ambigüedad sin hora', [ID.student, '1990-01-01', null, 'earlier']],
      ['hora con segundos', [ID.student, '1990-01-01', '10:00:30', null]],
    ]) {
      const r = await attempt(db, base, params);
      assert.equal(r.code, CHECK_VIOLATION, nombre);
    }
  });

  test('tope de 100 cartas por usuaria', async () => {
    await db.exec(`do $$ begin for i in 1..100 loop
      insert into public.natal_charts (user_id, label, birth_date, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
      values ('${ID.teacherB}', 'c' || i, '1990-01-01', 0, 0, 'UTC', 0, '2026e', 'placidus', now());
    end loop; end $$;`);
    const r = await guardar(db, { user: ID.teacherB });
    assert.equal(r.code, CHECK_VIOLATION);
    await db.query(`delete from public.natal_charts where user_id = $1`, [ID.teacherB]);
  });

  test('set_self_natal_chart: con carta ajena falla y no cambia nada; con la propia marca y pisa signos', async () => {
    const ajena = (await guardar(db, { user: ID.otro })).rows[0].id;
    const antes = await signosDe(db, ID.student);
    const r = await asService(db, () => attempt(db,
      `select public.set_self_natal_chart($1, $2, 'leo', 'leo', 'leo')`, [ID.student, ajena]));
    assert.equal(r.ok, false);
    assert.equal(r.code, 'P0002');
    assert.deepEqual(await signosDe(db, ID.student), antes);

    const mia = (await guardar(db)).rows[0].id;
    const ok = await asService(db, () => attempt(db,
      `select public.set_self_natal_chart($1, $2, 'virgo', 'libra', 'escorpio')`, [ID.student, mia]));
    assert.equal(ok.ok, true, ok.message);
    const propias = (await db.query(`select id from public.natal_charts where user_id = $1 and is_self`, [ID.student])).rows;
    assert.deepEqual(propias.map((x) => x.id), [mia]);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'virgo', moon_sign: 'libra', asc_sign: 'escorpio' });
  });

  test('la dueña borra su carta propia y los signos del perfil se limpian', async () => {
    const r = await asStudent(db, () => attempt(db, `delete from public.natal_charts where user_id = $1 and is_self returning id`, [ID.student]));
    assert.equal(r.rows.length, 1);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: null, moon_sign: null, asc_sign: null });
  });

  test('profiles: el cliente no escribe *_sign y anon lee los signos de una docente', async () => {
    const upd = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `update public.profiles set sun_sign = 'aries' where id = $1`, [ID.teacherA]));
    assert.equal(upd.code, PRIV_DENIED);
    const lee = await asAnon(db, () => attempt(db, `select sun_sign, moon_sign, asc_sign from public.profiles where id = $1`, [ID.teacherA]));
    assert.equal(lee.ok, true, lee.message);
  });

  test('borrar la cuenta borra sus cartas (cascada)', async () => {
    await guardar(db, { user: ID.otro, isSelf: true });
    const r = await attempt(db, `delete from auth.users where id = $1`, [ID.otro]);
    assert.equal(r.ok, true, r.message);
    const n = (await db.query(`select count(*)::int as n from public.natal_charts where user_id = $1`, [ID.otro])).rows[0].n;
    assert.equal(n, 0);
  });
});

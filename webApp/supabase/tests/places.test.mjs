// Carta natal (T-024) · places es dato abierto (GeoNames, CC BY 4.0): lectura pública, escritura de nadie.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const buscar = (db, q) => asAnon(db, () => attempt(db, `select id, name, admin1, country_code from public.search_places($1)`, [q]));

describe('places', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.exec(`
      insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population) values
        (1, 'Córdoba', 'Cordoba', 'Córdoba', 'AR', -31.4135, -64.18105, 'America/Argentina/Cordoba', 1428214),
        (2, 'Córdoba', 'Cordoba', 'Andalucía', 'ES', 37.89155, -4.77275, 'Europe/Madrid', 328428),
        (3, 'San Martín de los Andes', 'San Martin de los Andes', 'Neuquén', 'AR', -40.15, -71.35, 'America/Argentina/Salta', 28000);
      insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
        select 100 + g, 'Villa Prueba ' || g, 'Villa Prueba ' || g, null, 'AR', -34, -58, 'America/Argentina/Buenos_Aires', g
          from generate_series(1, 15) g;`);
  });
  after(async () => db?.close());

  test('anon lee; nadie del cliente escribe', async () => {
    const lee = await asAnon(db, () => attempt(db, `select id, name, timezone from public.places where id = 1`));
    assert.equal(lee.rows.length, 1);
    for (const sql of [
      `insert into public.places (id, name, ascii_name, country_code, lat, lon, timezone) values (9, 'x', 'x', 'AR', 0, 0, 'UTC')`,
      `update public.places set name = 'x' where id = 1`,
      `delete from public.places where id = 1`,
    ]) {
      for (const who of [(fn) => asAnon(db, fn), (fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn)]) {
        const r = await who(() => attempt(db, sql));
        assert.equal(r.code, '42501', sql);
      }
    }
  });

  test('búsqueda sin tildes, primero los que empiezan así, por población', async () => {
    const r = await buscar(db, 'córdoba');
    assert.deepEqual(r.rows.map((x) => [x.id, x.country_code]), [['1', 'AR'], ['2', 'ES']].map(([i, c]) => [Number(i), c]));
    assert.equal((await buscar(db, 'san mart')).rows[0].id, 3);
  });

  test('tolera un error de tipeo (trigramas)', async () => {
    assert.ok((await buscar(db, 'cordova')).rows.some((x) => Number(x.id) === 1));
  });

  test('menos de 3 caracteres no busca; nunca más de 10 filas; los comodines son literales', async () => {
    assert.equal((await buscar(db, 'co')).rows.length, 0);
    assert.equal((await buscar(db, 'villa prueba')).rows.length, 10);
    assert.equal((await buscar(db, '%%%')).rows.length, 0);
  });
});

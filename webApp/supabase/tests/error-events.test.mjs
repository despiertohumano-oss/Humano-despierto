// 0078 · error_events + record_error_event: conteo por huella, topes de aviso y cierre a clientes.

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase } from '../harness/db.mjs';

const FN = 'public.record_error_event(text,text,text,text,text,text)';
const fp = (n) => n.toString(16).padStart(32, '0');

const asService = async (db, fn) => {
  await db.exec(`set role service_role;`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
};

const record = (db, fingerprint, extra = {}) =>
  asService(db, async () =>
    (await db.query(
      `select public.record_error_event($1, $2, $3, $4, $5, $6) as notify`,
      [fingerprint, extra.source ?? 'server', extra.path ?? '/panel', extra.message ?? 'boom', extra.routeType ?? 'render', extra.digest ?? null],
    )).rows[0].notify);

const row = async (db, fingerprint) =>
  (await db.query(`select * from public.error_events where fingerprint = $1`, [fingerprint])).rows[0];

describe('0078 · record_error_event', () => {
  let db;
  before(async () => { ({ db } = await bootDatabase()); });
  after(async () => { await db.close(); });
  beforeEach(async () => { await db.exec(`delete from public.error_events;`); });

  test('ningún rol cliente ve la tabla ni ejecuta la función', async () => {
    const r = (await db.query(`
      select has_function_privilege('anon', '${FN}', 'execute') as anon_exec,
             has_function_privilege('authenticated', '${FN}', 'execute') as auth_exec,
             has_function_privilege('service_role', '${FN}', 'execute') as srv_exec,
             has_table_privilege('anon', 'public.error_events', 'select,insert,update,delete') as anon_tab,
             has_table_privilege('authenticated', 'public.error_events', 'select,insert,update,delete') as auth_tab,
             (select relrowsecurity from pg_class where oid = 'public.error_events'::regclass) as rls,
             (select prosecdef from pg_proc where oid = '${FN}'::regprocedure) as definer
    `)).rows[0];
    assert.deepEqual(r, { anon_exec: false, auth_exec: false, srv_exec: true, anon_tab: false, auth_tab: false, rls: true, definer: true });
  });

  test('la primera vez avisa; la repetición cuenta y no vuelve a avisar en 24 h', async () => {
    assert.equal(await record(db, fp(1), { digest: 'd1' }), true);
    assert.equal(await record(db, fp(1), { digest: 'd2' }), false);
    const r = await row(db, fp(1));
    assert.equal(r.hits, 2);
    assert.equal(r.last_digest, 'd2');
    assert.ok(r.notified_at);
  });

  test('pasadas 24 h del último aviso vuelve a avisar', async () => {
    await record(db, fp(2));
    await db.exec(`update public.error_events set notified_at = now() - interval '25 hours' where fingerprint = '${fp(2)}';`);
    assert.equal(await record(db, fp(2)), true);
  });

  test('como mucho 3 avisos por hora entre todas las huellas', async () => {
    const avisos = [];
    for (let i = 10; i < 15; i++) avisos.push(await record(db, fp(i)));
    assert.deepEqual(avisos, [true, true, true, false, false]);
    assert.equal(Number((await db.query(`select count(*) from public.error_events`)).rows[0].count), 5);
  });

  test('como mucho 10 avisos por día', async () => {
    for (let i = 20; i < 30; i++) {
      await db.exec(`insert into public.error_events (fingerprint, source, path, message, notified_at)
                     values ('${fp(i)}', 'client', '/x', 'm', now() - interval '2 hours');`);
    }
    assert.equal(await record(db, fp(99)), false);
  });

  test('con 2000 huellas no entra una nueva, pero la conocida sigue contando', async () => {
    await db.exec(`insert into public.error_events (fingerprint, source, path, message)
                   select lpad(to_hex(g), 32, '0'), 'client', '/x', 'm' from generate_series(1000, 2999) g;`);
    assert.equal(await record(db, fp(0xfffff)), false);
    assert.equal(await row(db, fp(0xfffff)), undefined);
    await record(db, fp(1000));
    assert.equal((await row(db, fp(1000))).hits, 2);
  });

  test('barre las huellas sin actividad en 30 días', async () => {
    await db.exec(`insert into public.error_events (fingerprint, source, path, message, first_seen, last_seen)
                   values ('${fp(3)}', 'server', '/x', 'viejo', now() - interval '40 days', now() - interval '40 days');`);
    await record(db, fp(4));
    assert.equal(await row(db, fp(3)), undefined);
  });

  test('recorta textos largos y rechaza huella u origen inválidos', async () => {
    await record(db, fp(5), { path: '/' + 'a'.repeat(400), message: 'm'.repeat(900), digest: 'd'.repeat(300) });
    const r = await row(db, fp(5));
    assert.equal(r.path.length, 200);
    assert.equal(r.message.length, 500);
    assert.equal(r.last_digest.length, 100);
    await assert.rejects(record(db, 'no-hex'), /huella/);
    await assert.rejects(record(db, fp(6), { source: 'otro' }), /origen/);
  });
});

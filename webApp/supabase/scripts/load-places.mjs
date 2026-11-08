// Carga public.places desde GeoNames. Reproducible e idempotente (upsert + borra lo que ya no está).
// Local:  cd webApp/supabase && npm run places:load            (usa docker exec sobre supabase_db_webApp)
// Cloud:  DATABASE_URL='postgresql://...' npm run places:load  (necesita psql en el PATH)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CSV_HEADER, keep, parseAdmin1, parseGeonamesLine, toCsvRow } from './places-lib.mjs';

const BASE = 'https://download.geonames.org/export/dump/';
const dir = await mkdtemp(join(tmpdir(), 'geonames-'));

async function fetchOk(name) {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`GeoNames ${name}: ${res.status}`);
  return res;
}

async function download(name) {
  const path = join(dir, name);
  await writeFile(path, Buffer.from(await (await fetchOk(name)).arrayBuffer()));
  return path;
}

const unzipText = (zip, entry) => execFileSync('unzip', ['-p', zip, entry], { maxBuffer: 1 << 30, encoding: 'utf8' });

try {
  const admin1 = parseAdmin1(await (await fetchOk('admin1CodesASCII.txt')).text());
  const sources = [
    ['AR', await download('AR.zip'), 'AR.txt'],
    ['cities1000', await download('cities1000.zip'), 'cities1000.txt'],
    ['cities15000', await download('cities15000.zip'), 'cities15000.txt'],
  ];

  const seen = new Set();
  const lines = [CSV_HEADER];
  const counts = {};
  for (const [source, zip, entry] of sources) {
    for (const line of unzipText(zip, entry).split('\n')) {
      const row = parseGeonamesLine(line);
      if (!keep(row, source) || seen.has(row.id)) continue;
      seen.add(row.id);
      lines.push(toCsvRow(row, admin1));
      counts[source] = (counts[source] ?? 0) + 1;
    }
  }
  const total = lines.length - 1;
  console.log(counts, 'total', total);
  if (total < 80000 || total > 95000) throw new Error(`total ${total} fuera de lo esperado (~86.600, lugar-y-hora.md §3.3)`);

  const [cmd, base] = process.env.DATABASE_URL
    ? ['psql', [process.env.DATABASE_URL]]
    : ['docker', ['exec', '-i', process.env.DBC ?? 'supabase_db_webApp', 'psql', '-U', 'postgres', '-d', 'postgres']];
  const sql = [
    'create temp table places_stage (like public.places including defaults) on commit drop',
    '\\copy places_stage (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population) from pstdin with (format csv, header true)',
    `insert into public.places select * from places_stage
       on conflict (id) do update set name = excluded.name, ascii_name = excluded.ascii_name, admin1 = excluded.admin1,
         country_code = excluded.country_code, lat = excluded.lat, lon = excluded.lon, timezone = excluded.timezone,
         population = excluded.population`,
    'delete from public.places p where not exists (select 1 from places_stage s where s.id = p.id)',
    'select count(*) as places from public.places',
  ];
  const r = spawnSync(cmd, [...base, '-v', 'ON_ERROR_STOP=1', '--single-transaction', ...sql.flatMap((c) => ['-c', c])], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  if (r.status !== 0) process.exitCode = r.status ?? 1;
} finally {
  await rm(dir, { recursive: true, force: true });
}

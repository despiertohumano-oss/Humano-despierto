// Parseo y filtro de los dumps de GeoNames (CC BY 4.0) para public.places. Puro: sin red ni base.

export const COUNTRIES_CITIES1000 = new Set([
  'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE',
  'PR', 'PY', 'SV', 'US', 'UY', 'VE',
]);

export const CSV_HEADER = 'id,name,ascii_name,admin1,country_code,lat,lon,timezone,population';

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function parseGeonamesLine(line) {
  const c = line.split('\t');
  if (c.length < 18) return null;
  const id = Number(c[0]);
  if (!Number.isInteger(id) || id <= 0 || !c[1]) return null;
  return {
    id,
    name: c[1],
    asciiName: c[2] || stripAccents(c[1]),
    lat: Number(c[4]),
    lon: Number(c[5]),
    featureClass: c[6],
    countryCode: c[8],
    admin1Code: c[10],
    population: Number(c[14]) || 0,
    timezone: c[17],
  };
}

export function parseAdmin1(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const [code, name] = line.split('\t');
    if (code && name) map.set(code, name);
  }
  return map;
}

export function keep(row, source) {
  if (!row || !row.timezone || !Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return false;
  if (source === 'AR') return row.countryCode === 'AR' && row.featureClass === 'P';
  if (row.countryCode === 'AR') return false;
  if (source === 'cities1000') return COUNTRIES_CITIES1000.has(row.countryCode);
  if (source === 'cities15000') return !COUNTRIES_CITIES1000.has(row.countryCode);
  return false;
}

function csvField(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvRow(row, admin1) {
  const provincia = admin1.get(`${row.countryCode}.${row.admin1Code}`) ?? '';
  return [row.id, row.name, row.asciiName, provincia, row.countryCode, row.lat, row.lon, row.timezone, row.population]
    .map(csvField)
    .join(',');
}

// La URL lleva la contraseña: en argv la vería cualquiera con `ps`. Se pasa por las PG* de libpq.
export function psqlInvocation(processEnv) {
  const { DATABASE_URL, ...rest } = processEnv;
  if (!DATABASE_URL) {
    return { cmd: 'docker', args: ['exec', '-i', processEnv.DBC ?? 'supabase_db_webApp', 'psql', '-U', 'postgres', '-d', 'postgres'], env: rest };
  }
  const u = new URL(DATABASE_URL);
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') throw new Error('DATABASE_URL tiene que ser postgres:// o postgresql://');
  const env = { ...rest, PGHOST: u.hostname.replace(/^\[|\]$/g, ''), PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password) };
  if (u.port) env.PGPORT = u.port;
  const db = decodeURIComponent(u.pathname.slice(1));
  if (db) env.PGDATABASE = db;
  for (const [k, v] of u.searchParams) {
    if (k !== 'sslmode') throw new Error(`DATABASE_URL: el parámetro ${k} no se sabe pasar por el entorno`);
    env.PGSSLMODE = v;
  }
  return { cmd: 'psql', args: [], env };
}

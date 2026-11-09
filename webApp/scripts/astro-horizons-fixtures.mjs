// Uso (a mano, nunca en CI): node scripts/astro-horizons-fixtures.mjs src/lib/astro/__fixtures__/horizons.json
import { writeFile } from "node:fs/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
// 1900-01-01, 1950-01-01, 1990-06-15 12:00, 2026-11-07, 2100-01-01 (TT)
const JDS_TT = [2415020.5, 2433282.5, 2448058.0, 2461351.5, 2488069.5];
const BODIES = {
  sol: "10", luna: "301", mercurio: "199", venus: "299", marte: "499", jupiter: "599",
  saturno: "699", urano: "799", neptuno: "899", pluton: "999", quiron: "2060;",
};

async function horizons(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ format: "json", OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", ...params })}`);
  if (!res.ok) throw new Error(`Horizons respondió ${res.status}`);
  const { result } = await res.json();
  const block = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!block) throw new Error(`sin $$SOE:\n${result.slice(0, 2000)}`);
  return { result, lines: block.trim().split("\n") };
}

async function q31(command) {
  const { lines } = await horizons({
    COMMAND: `'${command}'`, EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'31'",
    ANG_FORMAT: "'DEG'", EXTRA_PREC: "'YES'", TIME_TYPE: "'TT'", TLIST_TYPE: "'JD'",
    TLIST: `'${JDS_TT.join(" ")}'`, CAL_FORMAT: "'JD'",
  });
  const rows = lines.map((l) => l.trim().split(/\s+/).map(Number)).map(([jdTT, lon]) => ({ jdTT, lon }));
  if (rows.length !== JDS_TT.length) throw new Error(`${command}: ${rows.length} filas`);
  return rows;
}

async function moonNode() {
  const { result, lines } = await horizons({
    COMMAND: "'301'", EPHEM_TYPE: "'ELEMENTS'", CENTER: "'500@399'", REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'J2000'", TLIST_TYPE: "'JD'", TLIST: `'${JDS_TT.join(" ")}'`, CSV_FORMAT: "'YES'",
  });
  const header = result.split("$$SOE")[0].split("\n").filter((l) => l.includes("JDTDB")).pop();
  const cols = header.split(",").map((s) => s.trim());
  const iOM = cols.indexOf("OM");
  if (iOM < 0) throw new Error("sin columna OM");
  return lines.map((l) => l.split(",").map((s) => s.trim())).map((c) => ({ jdTDB: Number(c[0]), om: Number(c[iOM]) }));
}

const bodies = {};
for (const [id, cmd] of Object.entries(BODIES)) bodies[id] = await q31(cmd);
const out = {
  _meta: {
    fuente: "JPL Horizons API (DE441). Cuerpos: QUANTITIES=31, CENTER=500@399, TIME_TYPE=TT. moonNode: ELEMENTS de 301, eclíptica J2000, TDB.",
    consultado: new Date().toISOString().slice(0, 10),
    url: API,
  },
  jdsTT: JDS_TT,
  bodies,
  moonNode: await moonNode(),
};
await writeFile(process.argv[2], JSON.stringify(out, null, 2) + "\n");
console.log("ok", Object.keys(bodies).length, "cuerpos");

// Uso (a mano, nunca en CI): node scripts/astro-chiron-table.mjs src/lib/astro/data/chiron.json
import { writeFile } from "node:fs/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const params = new URLSearchParams({
  format: "json", COMMAND: "'2060;'", OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'VECTORS'",
  CENTER: "'500@10'", REF_PLANE: "'FRAME'", REF_SYSTEM: "'ICRF'", OUT_UNITS: "'AU-D'", VEC_TABLE: "'1'",
  VEC_CORR: "'NONE'", CSV_FORMAT: "'YES'", TIME_TYPE: "'TT'",
  START_TIME: "'JD 2414900.5'", STOP_TIME: "'JD 2488580.5'", STEP_SIZE: "'30 d'",
});
const res = await fetch(`${API}?${params}`);
if (!res.ok) throw new Error(`Horizons respondió ${res.status}`);
const { result } = await res.json();
const block = result.split("$$SOE")[1]?.split("$$EOE")[0];
if (!block) throw new Error(result.slice(0, 3000));
const rows = block.trim().split("\n").map((l) => l.split(",").map((s) => s.trim()));
const jd0TT = Number(rows[0][0]);
rows.forEach((r, i) => {
  if (Math.abs(Number(r[0]) - (jd0TT + 30 * i)) > 1e-6) throw new Error(`paso irregular en la fila ${i}`);
});
const out = {
  _meta: {
    fuente: "JPL Horizons API, 2060 Chiron, VECTORS heliocéntricos, REF_SYSTEM=ICRF, REF_PLANE=FRAME, VEC_CORR=NONE, TT, paso 30 d",
    consultado: new Date().toISOString().slice(0, 10),
  },
  jd0TT,
  stepDays: 30,
  xyz: rows.map((r) => [2, 3, 4].map((k) => Number(Number(r[k]).toPrecision(12)))),
};
await writeFile(process.argv[2], JSON.stringify(out) + "\n");
console.log("ok", out.xyz.length, "filas desde JD", jd0TT);

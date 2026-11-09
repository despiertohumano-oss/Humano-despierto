import { type AstroTime, Body, C_AUDAY, Ecliptic, HelioState, Vector } from "astronomy-engine";
import { z } from "@/lib/validation/zod";
import raw from "./data/chiron.json";
import { J2000_JD } from "./ephemeris";
import { norm360 } from "./zodiac";

const table = z
  .object({ jd0TT: z.number(), stepDays: z.literal(30), xyz: z.array(z.tuple([z.number(), z.number(), z.number()])).min(2400) })
  .parse(raw);

export const CHIRON_TABLE_RANGE_JD_TT = [table.jd0TT, table.jd0TT + table.stepDays * (table.xyz.length - 1)] as const;

function helio(jdTT: number): [number, number, number] {
  const s = (jdTT - table.jd0TT) / table.stepDays;
  const i = Math.min(Math.max(Math.floor(s) - 1, 0), table.xyz.length - 4);
  const u = s - i;
  if (s < 1 || s > table.xyz.length - 2) throw new RangeError("Quirón fuera de la tabla 1900-2100");
  const w = [-(u - 1) * (u - 2) * (u - 3) / 6, (u * (u - 2) * (u - 3)) / 2, -(u * (u - 1) * (u - 3)) / 2, (u * (u - 1) * (u - 2)) / 6];
  return [0, 1, 2].map((k) => w.reduce((acc, wj, j) => acc + wj * table.xyz[i + j]![k]!, 0)) as [number, number, number];
}

export function chironLongitude(t: AstroTime): number {
  const earth = HelioState(Body.Earth, t);
  const jdTT = t.tt + J2000_JD;
  let tau = 0;
  let g: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const c = helio(jdTT - tau);
    g = [c[0] - earth.x, c[1] - earth.y, c[2] - earth.z];
    tau = Math.hypot(...g) / C_AUDAY;
  }
  const n = Math.hypot(...g);
  const u = g.map((x) => x / n);
  const beta = [earth.vx / C_AUDAY, earth.vy / C_AUDAY, earth.vz / C_AUDAY];
  const ub = u[0]! * beta[0]! + u[1]! * beta[1]! + u[2]! * beta[2]!;
  const up = u.map((x, k) => x + beta[k]! - x * ub);
  return norm360(Ecliptic(new Vector(up[0]!, up[1]!, up[2]!, t)).elon);
}

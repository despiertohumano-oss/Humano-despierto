import { type PointId, norm360 } from "./zodiac";

export const ASPECTS = [
  { id: "conjuncion", angle: 0, orb: 8 },
  { id: "sextil", angle: 60, orb: 4 },
  { id: "cuadratura", angle: 90, orb: 5 },
  { id: "trigono", angle: 120, orb: 5 },
  { id: "oposicion", angle: 180, orb: 8 },
] as const;
export type AspectId = (typeof ASPECTS)[number]["id"];
export type AspectPoint = { id: PointId; lon: number; speed: number };
export type Aspect = { a: PointId; b: PointId; type: AspectId; orb: number; applying: boolean };

const ONE_HOUR = 1 / 24;
const isAngle = (id: PointId) => id === "asc" || id === "mc";

export function separation(a: number, b: number): number {
  return Math.abs(norm360(a - b + 180) - 180);
}

export function findAspects(points: readonly AspectPoint[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i]!;
      const q = points[j]!;
      if (isAngle(p.id) && isAngle(q.id)) continue;
      const sep = separation(p.lon, q.lon);
      const match = ASPECTS.find((asp) => Math.abs(sep - asp.angle) <= asp.orb);
      if (!match) continue;
      const orb = Math.abs(sep - match.angle);
      const later = Math.abs(separation(p.lon + p.speed * ONE_HOUR, q.lon + q.speed * ONE_HOUR) - match.angle);
      out.push({ a: p.id, b: q.id, type: match.id, orb, applying: later < orb });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

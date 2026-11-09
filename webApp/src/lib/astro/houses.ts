import { type Angles, ascendant, midheaven } from "./angles";
import { type HouseSystem, norm360 } from "./zodiac";

const RAD = Math.PI / 180;
export const PLACIDUS_MAX_LAT = 66;

export type Houses = { system: HouseSystem; cusps: number[]; fallback: boolean };

function placidusCusp(ramc: number, eps: number, lat: number, f: number, aboveHorizon: boolean): number | null {
  const e = eps * RAD;
  const lambdaOf = (alpha: number) => norm360(Math.atan2(Math.sin(alpha * RAD), Math.cos(alpha * RAD) * Math.cos(e)) / RAD);
  const decOf = (lambda: number) => Math.asin(Math.sin(e) * Math.sin(lambda * RAD));
  let alpha = ramc + (aboveHorizon ? f * 90 : 180 - f * 90);
  for (let i = 0; i < 100; i++) {
    const x = -Math.tan(lat * RAD) * Math.tan(decOf(lambdaOf(alpha)));
    if (Math.abs(x) > 1) return null;
    const sda = Math.acos(x) / RAD;
    const next = aboveHorizon ? ramc + f * sda : ramc + 180 - f * (180 - sda);
    const delta = Math.abs(norm360(next - alpha + 180) - 180);
    alpha = next;
    if (delta < 1e-9) return lambdaOf(alpha);
  }
  return null;
}

export function placidusCusps(ramc: number, eps: number, lat: number): number[] | null {
  const c11 = placidusCusp(ramc, eps, lat, 1 / 3, true);
  const c12 = placidusCusp(ramc, eps, lat, 2 / 3, true);
  const c2 = placidusCusp(ramc, eps, lat, 2 / 3, false);
  const c3 = placidusCusp(ramc, eps, lat, 1 / 3, false);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  const asc = ascendant(ramc, eps, lat);
  const mc = midheaven(ramc, eps);
  const first = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180)];
  return [...first, ...first.map((x) => norm360(x + 180))];
}

export function wholeSignCusps(asc: number): number[] {
  const first = Math.floor(norm360(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(first + 30 * i));
}

export function computeHouses(requested: HouseSystem, a: Angles, lat: number): Houses {
  if (requested === "whole_sign") return { system: "whole_sign", cusps: wholeSignCusps(a.asc), fallback: false };
  const cusps = Math.abs(lat) > PLACIDUS_MAX_LAT ? null : placidusCusps(a.ramc, a.eps, lat);
  if (cusps === null) return { system: "whole_sign", cusps: wholeSignCusps(a.asc), fallback: true };
  return { system: "placidus", cusps, fallback: false };
}

export function houseOf(lon: number, cusps: readonly number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    const span = norm360(cusps[(i + 1) % 12]! - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 12;
}

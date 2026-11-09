import { type AstroTime, SiderealTime, e_tilt } from "astronomy-engine";
import { norm360 } from "./zodiac";

const RAD = Math.PI / 180;

export type Angles = { asc: number; mc: number; ramc: number; eps: number };

export function trueObliquity(t: AstroTime): number {
  return e_tilt(t).tobl;
}

// SiderealTime es GAST (incluye la ecuación de los equinoccios), en horas.
export function localSiderealDegrees(t: AstroTime, lon: number): number {
  return norm360(SiderealTime(t) * 15 + lon);
}

export function eclipticToEquatorial(lon: number, eps: number): { ra: number; dec: number } {
  const l = lon * RAD;
  const e = eps * RAD;
  return {
    ra: norm360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) / RAD),
    dec: Math.asin(Math.sin(e) * Math.sin(l)) / RAD,
  };
}

export function midheaven(ramc: number, eps: number): number {
  const th = ramc * RAD;
  return norm360(Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps * RAD)) / RAD);
}

export function ascendant(ramc: number, eps: number, lat: number): number {
  const th = ramc * RAD;
  const e = eps * RAD;
  let asc = norm360(Math.atan2(Math.cos(th), -(Math.sin(th) * Math.cos(e) + Math.tan(lat * RAD) * Math.sin(e))) / RAD);
  // Ángulo horario en [0,180) = el punto está al oeste: pasado el círculo polar la fórmula puede
  // devolver el punto que se pone. Convención de Swiss Ephemeris: el ASC siempre al este.
  if (norm360(ramc - eclipticToEquatorial(asc, eps).ra) < 180) asc = norm360(asc + 180);
  return asc;
}

export function computeAngles(t: AstroTime, lat: number, lon: number): Angles {
  const eps = trueObliquity(t);
  const ramc = localSiderealDegrees(t, lon);
  return { asc: ascendant(ramc, eps, lat), mc: midheaven(ramc, eps), ramc, eps };
}

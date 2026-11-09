import { type AstroTime, GeoMoonState, RotateState, Rotation_EQJ_ECL, Rotation_EQJ_ECT, e_tilt } from "astronomy-engine";
import { norm360 } from "./zodiac";

const RAD = Math.PI / 180;
const MOON_INCLINATION = 5.1453964;

function meanElements(t: AstroTime) {
  const T = t.tt / 36525;
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000;
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T ** 3 / 80053 + T ** 4 / 18999000;
  return { omega, perigee, dpsi: e_tilt(t).dpsi / 3600 };
}

export function meanNodeLongitude(t: AstroTime): number {
  const { omega, dpsi } = meanElements(t);
  return norm360(omega + dpsi);
}

// El apogeo medio se mueve sobre la órbita lunar media, inclinada 5°: sin proyectarlo a la
// eclíptica el error llega a 7′ (motor-de-calculo.md §6.1).
export function meanLilithLongitude(t: AstroTime, projected = true): number {
  const { omega, perigee, dpsi } = meanElements(t);
  const apogee = perigee + 180;
  if (!projected) return norm360(apogee + dpsi);
  const u = (apogee - omega) * RAD;
  const i = MOON_INCLINATION * RAD;
  return norm360(omega + Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) / RAD + dpsi);
}

export function trueNodeLongitude(t: AstroTime, frame: "date" | "j2000" = "date"): number {
  const s = RotateState(frame === "date" ? Rotation_EQJ_ECT(t) : Rotation_EQJ_ECL(), GeoMoonState(t));
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  return norm360(Math.atan2(hx, -hy) / RAD);
}

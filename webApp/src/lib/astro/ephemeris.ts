import { type AstroTime, Body, Ecliptic, EclipticGeoMoon, GeoVector } from "astronomy-engine";
import { type PlanetId, norm360 } from "./zodiac";

export const J2000_JD = 2451545.0;

const AE_BODY: Record<Exclude<PlanetId, "luna">, Body> = {
  sol: Body.Sun, mercurio: Body.Mercury, venus: Body.Venus, marte: Body.Mars, jupiter: Body.Jupiter,
  saturno: Body.Saturn, urano: Body.Uranus, neptuno: Body.Neptune, pluton: Body.Pluto,
};

// Ecliptic() aplica precesión + nutación y rota con la oblicuidad VERDADERA: es la longitud de la
// fecha. EclipticLongitude() es heliocéntrica y Rotation_EQJ_ECL es J2000: las dos dan cartas mal.
export function apparentLongitude(body: PlanetId, t: AstroTime): number {
  if (body === "luna") return norm360(EclipticGeoMoon(t).lon);
  return norm360(Ecliptic(GeoVector(AE_BODY[body], t, true)).elon);
}

export function speedOf(f: (t: AstroTime) => number, t: AstroTime): number {
  const delta = f(t.AddDays(0.5)) - f(t.AddDays(-0.5));
  return norm360(delta + 180) - 180;
}

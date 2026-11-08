import { type AstroTime, MakeTime } from "astronomy-engine";
import { computeAngles } from "./angles";
import { type Aspect, type AspectPoint, findAspects } from "./aspects";
import { chironLongitude } from "./chiron";
import { apparentLongitude, speedOf } from "./ephemeris";
import { type Houses, computeHouses, houseOf } from "./houses";
import { meanLilithLongitude, trueNodeLongitude } from "./points";
import {
  BODY_IDS, PLANET_IDS, SIGNS, type BodyId, type Element, type HouseSystem, type Modality,
  type PlanetId, type SignId, signOf,
} from "./zodiac";

export type ChartInput = { utc: Date; lat: number; lon: number; houseSystem: HouseSystem; hasTime: boolean };
export type BodyPosition = { id: BodyId; lon: number; sign: SignId; house: number | null; retrograde: boolean; speed: number };
export type Balance<K extends string> = { counts: Record<K, number>; dominant: K[] };
export type Stellium = { kind: "signo"; sign: SignId; bodies: PlanetId[] } | { kind: "casa"; house: number; bodies: PlanetId[] };
export type ChartFacts = {
  utcIso: string;
  lat: number;
  lon: number;
  requestedHouseSystem: HouseSystem;
  bodies: BodyPosition[];
  angles: { asc: number; mc: number } | null;
  houses: Houses | null;
  aspects: Aspect[];
  elements: Balance<Element>;
  modalities: Balance<Modality>;
  stelliums: Stellium[];
  chartRuler: PlanetId | null;
  big3: { sun: SignId; moon: SignId; asc: SignId | null };
  flags: { sinHora: boolean; houseSystemFallback: boolean; moonSignUncertain: boolean };
};

export const MIN_UTC = Date.UTC(1899, 11, 31);
export const MAX_UTC = Date.UTC(2101, 0, 2);
const NO_RETRO: readonly BodyId[] = ["sol", "luna", "nodo_norte", "lilith_media"];

function longitudeFn(id: BodyId): (t: AstroTime) => number {
  if (id === "quiron") return chironLongitude;
  if (id === "nodo_norte") return (t) => trueNodeLongitude(t);
  if (id === "lilith_media") return (t) => meanLilithLongitude(t);
  return (t) => apparentLongitude(id, t);
}

function balance<K extends string>(keys: readonly K[], values: K[]): Balance<K> {
  const counts = Object.fromEntries(keys.map((k) => [k, values.filter((v) => v === k).length])) as Record<K, number>;
  const max = Math.max(...Object.values<number>(counts));
  return { counts, dominant: keys.filter((k) => counts[k] === max) };
}

function groups<K>(planets: BodyPosition[], key: (b: BodyPosition) => K): [K, PlanetId[]][] {
  const map = new Map<K, PlanetId[]>();
  for (const b of planets) map.set(key(b), [...(map.get(key(b)) ?? []), b.id as PlanetId]);
  return [...map.entries()].filter(([, ids]) => ids.length >= 3);
}

export function computeChart(input: ChartInput): ChartFacts {
  const ms = input.utc.getTime();
  if (!(ms >= MIN_UTC && ms <= MAX_UTC)) throw new RangeError("fecha fuera de 1900-2100");
  if (!Number.isFinite(input.lat) || Math.abs(input.lat) >= 90) throw new RangeError("latitud fuera de rango");
  if (!Number.isFinite(input.lon) || Math.abs(input.lon) > 180) throw new RangeError("longitud fuera de rango");

  const t = MakeTime(input.utc);
  const angles = input.hasTime ? computeAngles(t, input.lat, input.lon) : null;
  const houses = angles ? computeHouses(input.houseSystem, angles, input.lat) : null;

  const bodies: BodyPosition[] = BODY_IDS.map((id) => {
    const f = longitudeFn(id);
    const lon = f(t);
    const speed = speedOf(f, t);
    return { id, lon, sign: signOf(lon), house: houses ? houseOf(lon, houses.cusps) : null, retrograde: !NO_RETRO.includes(id) && speed < 0, speed };
  });

  const points: AspectPoint[] = bodies.map((b) => ({ id: b.id, lon: b.lon, speed: b.speed }));
  if (angles) points.push({ id: "asc", lon: angles.asc, speed: 0 }, { id: "mc", lon: angles.mc, speed: 0 });

  const planets = bodies.filter((b) => (PLANET_IDS as readonly string[]).includes(b.id));
  const stelliums: Stellium[] = [
    ...groups(planets, (b) => b.sign).map(([sign, ids]) => ({ kind: "signo" as const, sign, bodies: ids })),
    ...(houses ? groups(planets, (b) => b.house!).map(([house, ids]) => ({ kind: "casa" as const, house, bodies: ids })) : []),
  ];

  const moon = longitudeFn("luna");
  const sun = bodies[0]!;
  const moonPos = bodies[1]!;
  return {
    utcIso: input.utc.toISOString(),
    lat: input.lat,
    lon: input.lon,
    requestedHouseSystem: input.houseSystem,
    bodies,
    angles: angles ? { asc: angles.asc, mc: angles.mc } : null,
    houses,
    aspects: findAspects(points),
    elements: balance(["fuego", "tierra", "aire", "agua"], planets.map((b) => SIGNS[b.sign].elemento)),
    modalities: balance(["cardinal", "fijo", "mutable"], planets.map((b) => SIGNS[b.sign].modalidad)),
    stelliums,
    chartRuler: angles ? SIGNS[signOf(angles.asc)].regente : null,
    big3: { sun: sun.sign, moon: moonPos.sign, asc: angles ? signOf(angles.asc) : null },
    flags: {
      sinHora: !input.hasTime,
      houseSystemFallback: houses?.fallback ?? false,
      moonSignUncertain: !input.hasTime && signOf(moon(t.AddDays(-0.5))) !== signOf(moon(t.AddDays(0.5))),
    },
  };
}

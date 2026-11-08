export const SIGN_IDS = ["aries", "tauro", "geminis", "cancer", "leo", "virgo", "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis"] as const;
export type SignId = (typeof SIGN_IDS)[number];

export const PLANET_IDS = ["sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton"] as const;
export type PlanetId = (typeof PLANET_IDS)[number];

export const BODY_IDS = [...PLANET_IDS, "quiron", "nodo_norte", "lilith_media"] as const;
export type BodyId = (typeof BODY_IDS)[number];
export type AngleId = "asc" | "mc";
export type PointId = BodyId | AngleId;

export type Element = "fuego" | "tierra" | "aire" | "agua";
export type Modality = "cardinal" | "fijo" | "mutable";
export type HouseSystem = "placidus" | "whole_sign";

type SignInfo = { nombre: string; abbr: string; elemento: Element; modalidad: Modality; regente: PlanetId };

// Regente TRADICIONAL: el regente de la carta prioriza el tradicional (fundamentos §5.1).
export const SIGNS: Record<SignId, SignInfo> = {
  aries: { nombre: "Aries", abbr: "Ari", elemento: "fuego", modalidad: "cardinal", regente: "marte" },
  tauro: { nombre: "Tauro", abbr: "Tau", elemento: "tierra", modalidad: "fijo", regente: "venus" },
  geminis: { nombre: "Géminis", abbr: "Gém", elemento: "aire", modalidad: "mutable", regente: "mercurio" },
  cancer: { nombre: "Cáncer", abbr: "Cán", elemento: "agua", modalidad: "cardinal", regente: "luna" },
  leo: { nombre: "Leo", abbr: "Leo", elemento: "fuego", modalidad: "fijo", regente: "sol" },
  virgo: { nombre: "Virgo", abbr: "Vir", elemento: "tierra", modalidad: "mutable", regente: "mercurio" },
  libra: { nombre: "Libra", abbr: "Lib", elemento: "aire", modalidad: "cardinal", regente: "venus" },
  escorpio: { nombre: "Escorpio", abbr: "Esc", elemento: "agua", modalidad: "fijo", regente: "marte" },
  sagitario: { nombre: "Sagitario", abbr: "Sag", elemento: "fuego", modalidad: "mutable", regente: "jupiter" },
  capricornio: { nombre: "Capricornio", abbr: "Cap", elemento: "tierra", modalidad: "cardinal", regente: "saturno" },
  acuario: { nombre: "Acuario", abbr: "Acu", elemento: "aire", modalidad: "fijo", regente: "saturno" },
  piscis: { nombre: "Piscis", abbr: "Pis", elemento: "agua", modalidad: "mutable", regente: "jupiter" },
};

export const BODY_NAMES: Record<BodyId, string> = {
  sol: "Sol", luna: "Luna", mercurio: "Mercurio", venus: "Venus", marte: "Marte", jupiter: "Júpiter",
  saturno: "Saturno", urano: "Urano", neptuno: "Neptuno", pluton: "Plutón", quiron: "Quirón",
  nodo_norte: "Nodo Norte", lilith_media: "Lilith (Luna Negra media)",
};

export const ANGLE_NAMES: Record<AngleId, string> = { asc: "Ascendente", mc: "Medio Cielo" };

export function pointName(id: PointId): string {
  return id === "asc" || id === "mc" ? ANGLE_NAMES[id] : BODY_NAMES[id];
}

export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

export function arcsecBetween(a: number, b: number): number {
  return Math.abs(norm360(a - b + 180) - 180) * 3600;
}

export function signOf(lon: number): SignId {
  return SIGN_IDS[Math.floor(norm360(lon) / 30)]!;
}

export function degreeInSign(lon: number): number {
  return norm360(lon) % 30;
}

// Trunca (no redondea): un cuerpo a 29°59,9′ no puede mostrarse como 30°00′ del signo anterior.
export function formatDegree(lon: number): string {
  const d = degreeInSign(lon);
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, "0")}′`;
}

export function bodySlug(id: BodyId): string {
  return id.replace("_", "-");
}

export function bodyBySlug(slug: string): BodyId | undefined {
  return BODY_IDS.find((b) => bodySlug(b) === slug);
}

export function isSignId(s: string): s is SignId {
  return (SIGN_IDS as readonly string[]).includes(s);
}

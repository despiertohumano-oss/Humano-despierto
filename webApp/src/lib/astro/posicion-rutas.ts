import { POSICIONES, type Posicion, isPlanetId } from "./posiciones";
import { HOUSE_KEYS, type HouseKey } from "./prose";
import { BODY_NAMES, PLANET_IDS, SIGNS, SIGN_IDS, bodySlug, isSignId, type PlanetId, type SignId } from "./zodiac";

export type TipoPosicion = "signo" | "casa";
export type PosicionRef =
  | { planeta: PlanetId; tipo: "signo"; clave: SignId; entrada: Posicion }
  | { planeta: PlanetId; tipo: "casa"; clave: HouseKey; entrada: Posicion };

const isHouseKey = (k: string): k is HouseKey => (HOUSE_KEYS as readonly string[]).includes(k);

export function posicionSlug(tipo: TipoPosicion, clave: string): string {
  return tipo === "casa" ? `casa-${clave}` : clave;
}

export function posicionPath(planeta: PlanetId, tipo: TipoPosicion, clave: string): string {
  return `/carta-natal/planetas/${bodySlug(planeta)}/${posicionSlug(tipo, clave)}`;
}

// Solo los luminares llevan artículo (“El Sol en Leo”), igual que en la prosa de la carta.
export function tituloPosicion(planeta: PlanetId, tipo: TipoPosicion, clave: string): string {
  const nombre = planeta === "sol" ? "El Sol" : planeta === "luna" ? "La Luna" : BODY_NAMES[planeta];
  return `${nombre} en ${tipo === "casa" ? `la casa ${clave}` : SIGNS[clave as SignId].nombre}`;
}

function build(planeta: PlanetId, tipo: TipoPosicion, clave: string): PosicionRef | undefined {
  const entrada = tipo === "signo" ? POSICIONES[planeta].en_signo[clave as SignId] : POSICIONES[planeta].en_casa[clave as HouseKey];
  return entrada ? ({ planeta, tipo, clave, entrada } as PosicionRef) : undefined;
}

/** Solo los diez planetas con texto propio; el slug del punto o de la posición tiene que ser exacto. */
export function resolverPosicion(planetaSlug: string, posicion: string): PosicionRef | undefined {
  const planeta = PLANET_IDS.find((p) => bodySlug(p) === planetaSlug);
  if (!planeta || !isPlanetId(planeta)) return undefined;
  if (isSignId(posicion)) return build(planeta, "signo", posicion);
  const m = /^casa-(\d{1,2})$/.exec(posicion);
  return m && isHouseKey(m[1]!) ? build(planeta, "casa", m[1]!) : undefined;
}

/** Las 24 posiciones de un planeta: 12 signos y luego 12 casas. */
export function posicionesDe(planeta: PlanetId): PosicionRef[] {
  return [
    ...SIGN_IDS.map((s) => build(planeta, "signo", s)),
    ...HOUSE_KEYS.map((h) => build(planeta, "casa", h)),
  ].filter((r): r is PosicionRef => r !== undefined);
}

export function planetasEn(tipo: TipoPosicion, clave: string): PosicionRef[] {
  return PLANET_IDS.map((p) => build(p, tipo, clave)).filter((r): r is PosicionRef => r !== undefined);
}

export const POSICION_RUTAS = PLANET_IDS.flatMap((p) =>
  posicionesDe(p).map((r) => ({ slug: bodySlug(p), posicion: posicionSlug(r.tipo, r.clave) })),
);

export function vecinosDe(ref: PosicionRef): { prev: PosicionRef; next: PosicionRef } {
  const todas = posicionesDe(ref.planeta);
  const i = todas.findIndex((r) => r.tipo === ref.tipo && r.clave === ref.clave);
  return { prev: todas[(i + todas.length - 1) % todas.length]!, next: todas[(i + 1) % todas.length]! };
}


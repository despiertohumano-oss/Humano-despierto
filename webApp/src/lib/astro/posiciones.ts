import { z } from "@/lib/validation/zod";
import type { Aspect } from "./aspects";
import jupiter from "./data/posiciones/jupiter.json";
import luna from "./data/posiciones/luna.json";
import marte from "./data/posiciones/marte.json";
import mercurio from "./data/posiciones/mercurio.json";
import neptuno from "./data/posiciones/neptuno.json";
import pluton from "./data/posiciones/pluton.json";
import saturno from "./data/posiciones/saturno.json";
import sol from "./data/posiciones/sol.json";
import urano from "./data/posiciones/urano.json";
import venus from "./data/posiciones/venus.json";
import { HOUSE_KEYS, PLANET_IDS, SIGN_IDS, type HouseKey, type PlanetId, type SignId } from "./zodiac";

// Sin comillas ni apóstrofos: las vistas comparan el texto contra HTML escapado.
const limpio = (min: number, max: number) =>
  z.string().min(min).max(max).refine((s) => !/["']/.test(s), "sin comillas ni apóstrofos");

const entrada = z.object({ texto: limpio(280, 700), luz: limpio(90, 260), sombra: limpio(90, 260) });
export type Posicion = z.infer<typeof entrada>;

// Registros parciales: una entrada que falta no rompe, la carta cae al texto genérico.
const registro = <K extends string>(claves: readonly K[]) =>
  z.record(z.string(), entrada).refine((r) => Object.keys(r).every((k) => (claves as readonly string[]).includes(k)), "clave desconocida");

export const posicionesSchema = z.object({ en_signo: registro(SIGN_IDS), en_casa: registro(HOUSE_KEYS) });
export type PosicionesPlaneta = { en_signo: Partial<Record<SignId, Posicion>>; en_casa: Partial<Record<HouseKey, Posicion>> };
export type Posiciones = Record<PlanetId, PosicionesPlaneta>;

const crudo: Record<PlanetId, unknown> = { sol, luna, mercurio, venus, marte, jupiter, saturno, urano, neptuno, pluton };
// Se valida al importar: un texto fuera de las reglas rompe el build, no una carta.
export const POSICIONES = Object.fromEntries(PLANET_IDS.map((p) => [p, posicionesSchema.parse(crudo[p])])) as Posiciones;

export type Tono = "luz" | "sombra" | "ambas";

export function isPlanetId(id: string): id is PlanetId {
  return (PLANET_IDS as readonly string[]).includes(id);
}

const FLUIDOS = ["trigono", "sextil"];
const TENSOS = ["cuadratura", "oposicion"];

// Solo cuentan los aspectos entre los diez planetas; la conjunción no empuja a ningún lado.
export function tonoDe(planeta: PlanetId, aspects: readonly Aspect[]): { tono: Tono; fluidos: number; tensos: number } {
  let fluidos = 0;
  let tensos = 0;
  for (const a of aspects) {
    const otro = a.a === planeta ? a.b : a.b === planeta ? a.a : null;
    if (!otro || !isPlanetId(otro)) continue;
    if (FLUIDOS.includes(a.type)) fluidos++;
    else if (TENSOS.includes(a.type)) tensos++;
  }
  return { tono: fluidos > tensos ? "luz" : tensos > fluidos ? "sombra" : "ambas", fluidos, tensos };
}

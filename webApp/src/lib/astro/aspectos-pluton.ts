import { z } from "@/lib/validation/zod";
import type { Aspect, AspectId } from "./aspects";
import raw from "./data/aspectos/pluton.json";
import { isPlanetId, limpio } from "./posiciones";
import { PLANET_IDS, type PlanetId } from "./zodiac";

export const CON_PLUTON = PLANET_IDS.filter((p): p is Exclude<PlanetId, "pluton"> => p !== "pluton");
export type ConPluton = (typeof CON_PLUTON)[number];

export const FAMILIAS = ["conjuncion", "fluido", "tenso"] as const;
export type Familia = (typeof FAMILIAS)[number];

// `texto` presenta el encuentro; la frase de la familia lo continúa en el mismo párrafo.
const par = z.object({ texto: limpio(280, 600), conjuncion: limpio(90, 260), fluido: limpio(90, 260), tenso: limpio(90, 260) });
export type ParPluton = z.infer<typeof par>;

// Registro parcial, como `posiciones`: un par que falta cae a la frase genérica.
export const aspectosPlutonSchema = z
  .record(z.string(), par)
  .refine((r) => Object.keys(r).every((k) => (CON_PLUTON as readonly string[]).includes(k)), "clave desconocida");
export type AspectosPluton = Partial<Record<ConPluton, ParPluton>>;

// Se valida al importar: un texto fuera de las reglas rompe el build, no una carta.
export const ASPECTOS_PLUTON: AspectosPluton = aspectosPlutonSchema.parse(raw);

export function familiaDe(tipo: AspectId): Familia {
  return tipo === "conjuncion" ? "conjuncion" : tipo === "trigono" || tipo === "sextil" ? "fluido" : "tenso";
}

// Solo entre Plutón y otro de los diez planetas; ángulos, Quirón, nodo y Lilith devuelven null.
export function textoDePluton(a: Aspect, datos: AspectosPluton): string | null {
  const otro = a.a === "pluton" ? a.b : a.b === "pluton" ? a.a : null;
  if (!otro || otro === "pluton" || !isPlanetId(otro)) return null;
  const e = datos[otro];
  return e ? `${e.texto} ${e[familiaDe(a.type)]}` : null;
}

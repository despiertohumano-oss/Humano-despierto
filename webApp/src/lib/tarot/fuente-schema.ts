// Forma de la extracción fiel de docs/TAROT (capa 1). Solo la usan los tests.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "@/lib/validation/zod";

export const FUENTE_DIR = join(process.cwd(), "..", "docs", "TAROT", "fuente");

const origen = { doc: z.string().min(1), seccion: z.string().min(1) };
const texto = z.string().min(1);

const mayor = z.object({
  ...origen,
  numero: z.number().int().min(0).max(21),
  descripcion: texto,
  desequilibrio: texto,
  equilibrio: texto,
  preguntas: z.array(texto).min(1),
  claves: z.array(texto).min(1),
  mascara: texto,
});

const menor = z.object({
  ...origen,
  numero: z.number().int().min(1).max(14), // 1 = As ... 10, 11 Sota, 12 Caballo, 13 Reina, 14 Rey
  imagen: texto,
  significados: texto,
  invertida: z.string(), // puede ser «Waite no cita ningún significado»: se copia igual
});

const palo = z.object({
  doc: z.string().min(1),
  palo: z.enum(["bastos", "copas", "espadas", "oros"]),
  correspondencias: z.object({
    energia: texto,
    cuerpo: texto,
    elemento: texto,
    reino: texto,
    solido: texto,
  }),
  narrativa: z.array(texto).length(10),
  cartas: z.array(menor).length(14),
});

const posicion = z.object({
  n: z.number().int().min(1),
  etiqueta: texto,
  grupo: z.string().min(1).nullable(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  rotada: z.boolean(),
});

const tiradas = z.object({
  doc: z.string().min(1),
  pautas: z.array(texto).min(1),
  criterio_invertidas: texto,
  tiradas: z
    .array(
      z.object({
        clave: z.enum(["cruz-simple", "consulta-situacion", "cruz-celta", "pregunta-situacion", "karma", "relaciones", "astrologica"]),
        nombre: texto,
        forma: z.enum(["grilla", "rueda"]),
        posiciones: z.array(posicion).min(1),
      }),
    )
    .length(7),
});

const casas = z.object({
  doc: z.string().min(1),
  casas: z
    .array(z.object({ casa: z.number().int().min(1).max(12), clave: texto, subtitulo: texto }))
    .length(12),
});

export const revisionSchema = z.object({ estado: z.enum(["pendiente", "aprobado"]), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const fuenteSchemas = {
  mayores: z.array(mayor).length(22),
  "menores-bastos": palo,
  "menores-copas": palo,
  "menores-espadas": palo,
  "menores-oros": palo,
  tiradas,
  casas,
  revision: revisionSchema,
} as const;

export type FuenteName = keyof typeof fuenteSchemas;

export function loadFuente<N extends FuenteName>(name: N): z.infer<(typeof fuenteSchemas)[N]> {
  const raw = JSON.parse(readFileSync(join(FUENTE_DIR, `${name}.json`), "utf8"));
  return fuenteSchemas[name].parse(raw) as z.infer<(typeof fuenteSchemas)[N]>;
}

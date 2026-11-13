import { describe, expect, it } from "vitest";
import cards from "../data/cards.json";
import lenses from "../data/lenses.json";
import { LENSES } from "./lenses";

type Entry = Record<string, string>;
const data = lenses as Record<string, Entry>;
const grupos: Record<string, (c: { arcano: string; palo: string | null }) => boolean> = {
  mayores: (c) => c.arcano === "mayor",
  bastos: (c) => c.palo === "bastos",
  copas: (c) => c.palo === "copas",
  espadas: (c) => c.palo === "espadas",
  oros: (c) => c.palo === "oros",
};
const MAYUSCULA = /^[A-ZÁÉÍÓÚÑ¡¿]/u;
const ARTICULO = /^(El|La|Los|Las|Un|Una|Este|Esta)\b/u;

describe("lenses.json", () => {
  for (const [g, f] of Object.entries(grupos)) {
    it(`${g}: cada carta trae las 11 lentes con su fuente`, () => {
      for (const c of cards.filter(f)) {
        const e = data[c.id];
        expect(e, c.id).toBeDefined();
        expect(e!.fuente, c.id).toBe((c as { fuente: string }).fuente);
        for (const l of LENSES) {
          const t = e![l] ?? "";
          expect(t.length, `${c.id}.${l}`).toBeGreaterThanOrEqual(60);
          expect(t.length, `${c.id}.${l}`).toBeLessThanOrEqual(260);
          expect(t, `${c.id}.${l}`).toMatch(MAYUSCULA);
          expect(t, `${c.id}.${l}`).not.toMatch(ARTICULO);
          expect(t.toLowerCase(), `${c.id}.${l}`).not.toContain(c.nombre_es.toLowerCase());
        }
      }
    });
  }
});

const apertura = (t: string) => t.split(/\s+/).slice(0, 2).join(" ").replace(/[.,:;]$/u, "");
const variedad: Record<string, { f: (c: { arcano: string }) => boolean; min: number; max: number }> = {
  mayores: { f: (c) => c.arcano === "mayor", min: 4, max: 6 },
  menores: { f: (c) => c.arcano === "menor", min: 4, max: 15 },
};

describe("lenses.json: aperturas variadas", () => {
  for (const [g, { f, min, max }] of Object.entries(variedad)) {
    const grupo = cards.filter(f).sort((a, b) => a.indice - b.indice);
    const presente = grupo.length > 0 && grupo.every((c) => data[c.id]);
    it.skipIf(!presente)(`${g}: ninguna lente abre igual en demasiadas cartas`, () => {
      for (const l of LENSES) {
        const aperturas = grupo.map((c) => apertura(data[c.id]![l] ?? ""));
        const cuenta = new Map<string, number>();
        for (const a of aperturas) cuenta.set(a, (cuenta.get(a) ?? 0) + 1);
        expect(cuenta.size, l).toBeGreaterThanOrEqual(min);
        const tope = g === "menores" && (l === "nucleo" || l === "transito") ? 10 : max;
        for (const [a, n] of cuenta) expect(n, `${l}: «${a}»`).toBeLessThanOrEqual(tope);
        if (g === "mayores") {
          for (let i = 1; i < aperturas.length; i++) expect(aperturas[i], `${l}: ${grupo[i]!.id}`).not.toBe(aperturas[i - 1]);
        }
      }
    });
  }
});

import { describe, expect, it } from "vitest";
import combos from "./data/combos.json";
import { cardBySlug } from "./cards";
import { buildReading, classifyDomain } from "./reading";
import type { Reading } from "./codec";

const idx = (slug: string) => cardBySlug(slug)!.indice;

describe("combos.json", () => {
  it("solo nombra cartas existentes y no repite pares", () => {
    const keys = new Set<string>();
    for (const c of combos) {
      expect(cardBySlug(c.a), c.a).toBeDefined();
      expect(cardBySlug(c.b), c.b).toBeDefined();
      const k = [c.a, c.b].sort().join("+");
      expect(keys.has(k), k).toBe(false);
      keys.add(k);
    }
  });
});

describe("classifyDomain", () => {
  it.each([
    ["¿Volverá mi ex?", "amor"],
    ["me conviene cambiar de trabajo", "trabajo"],
    ["voy a poder pagar la deuda", "dinero"],
    ["cómo sigue mi salud", "salud"],
    ["estoy enamorada, ¿es correspondido?", "amor"],
    ["mis sentimientos están confusos", "amor"],
    ["¿cómo van mis relaciones?", "amor"],
    ["tengo un examen difícil", "trabajo"],
    ["¿me conviene esta pareja?", "amor"],
    ["qué necesito saber hoy", null],
    [null, null],
  ])("%s → %s", (q, expected) => {
    expect(classifyDomain(q)).toBe(expected);
  });
});

describe("buildReading", () => {
  const ppf: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("la-torre"), reversed: false }, { indice: idx("el-sol"), reversed: true }, { indice: idx("reina-de-copas"), reversed: false }] };

  it("coloca cada carta en su posición con el significado según orientación", () => {
    const f = buildReading(ppf, "¿Cómo sigue mi pareja?");
    expect(f.placed.map((p) => p.position.nombre)).toEqual(["Pasado", "Presente", "Futuro"]);
    expect(f.placed[0]!.meaning).toBe(cardBySlug("la-torre")!.significado_derecha);
    expect(f.placed[1]!.meaning).toBe(cardBySlug("el-sol")!.significado_invertida);
    expect(f.domain).toBe("amor");
    expect(f.placed[2]!.domainText).toBe(cardBySlug("reina-de-copas")!.amor);
  });

  it("enlaza posiciones consecutivas con su dignidad", () => {
    const f = buildReading(ppf);
    expect(f.links).toHaveLength(2);
    expect(f.links[0]!.dignity).toBe("intensifica"); // Torre (fuego) + Sol (fuego)
    expect(f.links[1]!.dignity).toBe("debilita"); // Sol (fuego) + Reina de Copas (agua)
  });

  it("calcula proporciones", () => {
    const f = buildReading(ppf);
    expect(f.proportions.majors).toBe(2);
    expect(f.proportions.majorsDominant).toBe(true);
    expect(f.proportions.courts).toBe(1);
    expect(f.proportions.peopleInvolved).toBe(false);
    expect(f.proportions.reversed).toBe(1);
    expect(f.proportions.blocked).toBe(false);
  });

  it("detecta combinaciones conocidas sin importar posición ni orden", () => {
    const f = buildReading(ppf);
    expect(f.combos.map((c) => [c.a, c.b].sort().join("+"))).toContain("el-sol+la-torre");
  });

  it("números repetidos y palo dominante en menores", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("tres-de-bastos"), reversed: false }, { indice: idx("tres-de-copas"), reversed: false }, { indice: idx("cinco-de-bastos"), reversed: false }] };
    const f = buildReading(r);
    expect(f.proportions.repeatedNumbers).toEqual([3]);
    expect(f.proportions.dominantSuit).toBe("bastos");
    expect(f.proportions.absentSuits).toEqual(["espadas", "oros"]);
  });

  it("palo dominante exige al menos 2 cartas del palo", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: idx("el-sol"), reversed: false }, { indice: idx("tres-de-bastos"), reversed: false }, { indice: idx("tres-de-copas"), reversed: false }] };
    expect(buildReading(r).proportions.dominantSuit).toBeNull();
  });

  it("un único palo ausente entre 3 o más menores se informa", () => {
    const r: Reading = { spread: "pasado-presente-futuro", cards: ["tres-de-bastos", "dos-de-copas", "as-de-espadas"].map((s) => ({ indice: idx(s), reversed: false })) };
    expect(buildReading(r).proportions.absentSuit).toBe("oros");
    const dos: Reading = { spread: "pasado-presente-futuro", cards: ["tres-de-bastos", "dos-de-copas", "el-sol"].map((s) => ({ indice: idx(s), reversed: false })) };
    expect(buildReading(dos).proportions.absentSuit).toBeNull();
  });

  it("quintaesencia solo en cruz celta, con reducción a 1..22 y el Loco como 22", () => {
    const cards = ["la-torre", "el-sol", "la-luna", "el-mundo", "as-de-bastos", "dos-de-copas", "tres-de-espadas", "cuatro-de-oros", "cinco-de-bastos", "seis-de-copas"].map((s) => ({ indice: idx(s), reversed: false }));
    const f = buildReading({ spread: "cruz-celta", cards });
    // 16 + 19 + 18 + 21 = 74 → 7 + 4 = 11 → La Justicia
    expect(f.quintessence?.id).toBe("la-justicia");
    expect(buildReading(ppf).quintessence).toBeNull();
  });

  it("sí/no solo en la tirada sí o no", () => {
    const f = buildReading({ spread: "si-o-no", cards: [{ indice: idx("el-sol"), reversed: false }] });
    expect(f.yesNo?.verdict).toBe("sí");
    expect(buildReading(ppf).yesNo).toBeNull();
  });
});

function lcg(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
function deal(rnd: () => number, n: number) {
  const deck = Array.from({ length: 78 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck.slice(0, n).map((indice) => ({ indice, reversed: rnd() < 0.5 }));
}

describe("modo, grupos y contraste", () => {
  it("modo: invertida o vínculo que debilita => desequilibrio", () => {
    const r = buildReading({ spread: "cruz-simple", cards: [
      { indice: idx("as-de-bastos"), reversed: false },
      { indice: idx("as-de-copas"), reversed: false },
      { indice: idx("el-sol"), reversed: true },
      { indice: idx("as-de-oros"), reversed: false },
      { indice: idx("as-de-espadas"), reversed: false },
    ] });
    expect(r.placed.map((p) => p.mode)).toEqual(["equilibrio", "desequilibrio", "desequilibrio", "equilibrio", "desequilibrio"]);
  });

  it("relaciones arma los grupos A y B y elige el que fluye más", () => {
    const cards = ["el-sol", "la-torre", "la-estrella", "cinco-de-copas", "el-mundo", "tres-de-espadas"].map((s, i) => ({ indice: idx(s), reversed: i % 2 === 1 }));
    const r = buildReading({ spread: "relaciones", cards });
    expect(r.groups.map((g) => [g.clave, g.placed.length])).toEqual([["a", 3], ["b", 3]]);
    expect(r.contrast).toEqual({ kind: "relaciones", winner: "a" });
  });

  it("pregunta-situacion contrasta seguir igual contra cambiar", () => {
    const cards = Array.from({ length: 13 }, (_, i) => ({ indice: i, reversed: false }));
    const r = buildReading({ spread: "pregunta-situacion", cards });
    expect(r.groups.map((g) => g.clave)).toEqual(["si-continua", "si-cambia", "pasado-reciente", "karmica"]);
    expect(r.contrast?.kind).toBe("camino");
  });

  it("relaciones: intercambiar las cartas de A y B intercambia el ganador", () => {
    const flip = (w: string) => (w === "a" ? "b" : w === "b" ? "a" : w);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const rnd = lcg(seed);
      const draw = deal(rnd, 6);
      const swapped = [draw[1]!, draw[0]!, draw[3]!, draw[2]!, draw[5]!, draw[4]!];
      const w1 = buildReading({ spread: "relaciones", cards: draw }).contrast;
      const w2 = buildReading({ spread: "relaciones", cards: swapped }).contrast;
      expect(w2).toEqual({ kind: "relaciones", winner: flip((w1 as { winner: string }).winner) });
    }
  });

  it("relaciones: sin sesgo hacia A o B en 5000 tiradas deterministas", () => {
    const rnd = lcg(20261112);
    const tally = { a: 0, b: 0, parejo: 0 };
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const c = buildReading({ spread: "relaciones", cards: deal(rnd, 6) }).contrast as { winner: "a" | "b" | "parejo" };
      tally[c.winner]++;
    }
    expect(Math.abs(tally.a - tally.b) / N).toBeLessThan(0.03);
  });

  it("los vínculos no cruzan grupos (relaciones y pregunta-situacion)", () => {
    const rnd = lcg(7);
    for (const [spread, n] of [["relaciones", 6], ["pregunta-situacion", 13]] as const) {
      for (let i = 0; i < 50; i++) {
        const f = buildReading({ spread, cards: deal(rnd, n) });
        expect(f.links.length).toBeGreaterThan(0);
        for (const l of f.links) {
          expect(l.from.position.grupo).toBe(l.to.position.grupo);
          expect(l.from.position.n).toBeLessThan(l.to.position.n);
        }
      }
    }
    const f = buildReading({ spread: "relaciones", cards: deal(lcg(3), 6) });
    expect(f.links.map((l) => [l.from.position.n, l.to.position.n])).toEqual([[1, 3], [3, 5], [2, 4], [4, 6]].sort((x, y) => x[1]! - y[1]!));
  });

  it("tiradas sin grupos no tienen contraste", () => {
    const r = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] });
    expect(r.groups).toEqual([]);
    expect(r.contrast).toBeNull();
  });
});

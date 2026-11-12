# Tarot · interpretación real (T-094) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la lectura de tarot interprete: cada carta leída por la lente de su posición, relaciones y tensiones entre cartas, carta dominante, idea lineal y una respuesta reflexiva a la pregunta.

**Architecture:** Módulos puros nuevos en `webApp/src/lib/tarot/interpret/` (lentes, dignidad por vecinos, patrones, tensiones, respuesta, narrativa). `reading.ts` arma los hechos; `interpret/narrative.ts` reemplaza el armado de texto de `prose.ts` (que queda con utilidades de nombrado). Contenido nuevo: `data/lenses.json` (78 × 11) y claves nuevas de `data/templates.json`, escritos desde `docs/TAROT/fuente/`.

**Tech Stack:** TypeScript, Zod, Vitest, Next.js 16 (App Router), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-tarot-interpretacion-design.md` (leerla entera).

## Global Constraints

- Rama `dev`, local; sin push, sin merge a `main`.
- Motor puro y determinista: misma tirada + misma pregunta + misma semilla → mismo texto. Sin IA, sin red. `src/lib/tarot/` no importa nada de `docs/` (solo los tests leen `docs/TAROT/fuente/` con `fs`).
- D1 (T-093): voz del sitio (vos, rioplatense, cálido, claro). D2: el método de la dueña no se nombra («máscara de la esencia», «equilibrio:»/«desequilibrio:» como rótulo, «preguntarse», «waite no cita»). D4: invertida = mismo tema atenuado o en proceso, nunca el opuesto.
- E2: respuesta reflexiva, nunca fechas ni plazos; no lee la mente de terceros (lee el vínculo desde quien pregunta).
- E5: el veredicto de `yes-no.ts` no cambia.
- Brote: tokens semánticos, sin emojis ni glifos-icono, contraste ≥ 4.5:1 (nunca `text-suave` sobre `bg-salvia`), sin `opacity-*` en contenedores con texto.
- tsc se juzga fuera de `.next/`: `npx tsc --noEmit 2>&1 | grep -E '^(src|e2e)/'` vacío. Nunca borrar `.next`; no tocar el puerto 3000.
- Comandos: unit `cd webApp && npx vitest run <ruta>`; lint `cd webApp && npm run lint`.
- Commits con `git commit -m "<msg>" -m "Co-Authored-By: <modelo que implementa> <noreply@anthropic.com>" -- <rutas propias>`.

## Modelo por tarea

| Tareas | Modelo |
|---|---|
| 6, 7, 8 (contenido) | Opus, esfuerzo alto |
| 1, 2, 3, 4, 5, 9, 10, 11 | Sonnet |

## File Structure

```
webApp/src/lib/tarot/interpret/
  lenses.ts          LENSES, Lens, LENS_LABEL                         (T1)
  dignity.ts         neighborEffect, estadoOf, Estado                 (T3)
  patterns.ts        patternsOf, dominantOf, Patterns                 (T4)
  tensions.ts        tensionsOf, Tension                              (T5)
  answer.ts          answerCards, balanceOf, buildAnswer              (T9)
  text.ts            rngFrom, fill, pick, lowerFirst, joinY           (T9)
  lens-texts.ts      lensText (carga data/lenses.json)                (T10)
  narrative.ts       renderReading, ReadingText                       (T10)
webApp/src/lib/tarot/question.ts        + classifyQuestion, QuestionType (T2)
webApp/src/lib/tarot/spreads.ts         + Position.lente               (T1)
webApp/src/lib/tarot/data/spreads.json  + lente por posición           (T1)
webApp/src/lib/tarot/reading.ts         estados, patrones, tensiones, questionType (T3,T4,T5,T9)
webApp/src/lib/tarot/data/lenses.json   78 × 11                        (T6,T7)
webApp/src/lib/tarot/data/templates.json claves nuevas                 (T8; T10 borra las viejas)
webApp/src/lib/tarot/prose.ts           queda solo nombrado            (T10)
webApp/src/components/tarot/ReadingView.tsx                            (T10)
webApp/e2e/tarot.spec.ts · exposicion.test.ts · CLAUDE.md · revision.json (T11)
```

Orden: 1 → 2 → 3 → 4 → 5 → (6, 7, 8 en paralelo: archivos/claves disjuntos; 6 y 7 tocan `lenses.json` → secuenciales entre sí) → 9 → 10 → 11.

---

### Task 1: Lentes y mapa posición → lente

**Files:**
- Create: `webApp/src/lib/tarot/interpret/lenses.ts`
- Modify: `webApp/src/lib/tarot/spreads.ts` (positionSchema)
- Modify: `webApp/src/lib/tarot/data/spreads.json` (campo `lente` en cada posición)
- Test: `webApp/src/lib/tarot/interpret/lenses.test.ts`

**Interfaces:**
- Produces: `LENSES` (tupla readonly de 11), `type Lens`, `LENS_LABEL: Record<Lens, string>`; `Position.lente: Lens`.

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/lenses.test.ts
import { describe, expect, it } from "vitest";
import { LENSES, LENS_LABEL } from "./lenses";
import { SPREADS, spreadBySlug } from "../spreads";

const lentes = (slug: string) => spreadBySlug(slug)!.posiciones.map((p) => p.lente);

describe("lentes", () => {
  it("son once, cerradas, con rótulo", () => {
    expect(LENSES).toEqual(["nucleo", "cruce", "raiz", "transito", "meta", "yo", "otros", "sosten", "sombra", "consejo", "leccion"]);
    for (const l of LENSES) expect(LENS_LABEL[l].length).toBeGreaterThan(2);
  });

  it("toda posición de toda tirada tiene lente", () => {
    for (const s of SPREADS) for (const p of s.posiciones) expect(LENSES, `${s.slug}#${p.n}`).toContain(p.lente);
  });

  it("mapa de la spec §4.1", () => {
    expect(lentes("carta-del-dia")).toEqual(["consejo"]);
    expect(lentes("si-o-no")).toEqual(["nucleo", "nucleo", "nucleo"]);
    expect(lentes("cruz-simple")).toEqual(["raiz", "transito", "raiz", "transito", "nucleo"]);
    expect(lentes("consulta-situacion")).toEqual(["sosten", "cruce", "nucleo", "consejo", "transito"]);
    expect(lentes("cruz-celta")).toEqual(["nucleo", "cruce", "meta", "raiz", "sosten", "transito", "yo", "otros", "sombra", "consejo"]);
    expect(lentes("karma")).toEqual(["yo", "leccion", "otros", "otros", "otros", "transito", "leccion", "consejo"]);
    expect(lentes("relaciones")).toEqual(["yo", "otros", "yo", "otros", "yo", "otros"]);
    expect(lentes("astrologica")).toEqual(Array(12).fill("nucleo"));
    expect(lentes("pasado-presente-futuro")).toEqual(["raiz", "nucleo", "transito"]);
    const ps = spreadBySlug("pregunta-situacion")!.posiciones;
    const porGrupo: Record<string, string> = { "si-continua": "transito", "si-cambia": "transito", "pasado-reciente": "raiz", karmica: "leccion" };
    for (const p of ps) expect(p.lente, `#${p.n}`).toBe(p.grupo ? porGrupo[p.grupo] : "nucleo");
  });
});
```

Run: `cd webApp && npx vitest run src/lib/tarot/interpret/lenses.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 2: `lenses.ts`**

```ts
// webApp/src/lib/tarot/interpret/lenses.ts
// Lente = el rol desde el que se lee una carta según su posición (spec T-094 §4).
export const LENSES = ["nucleo", "cruce", "raiz", "transito", "meta", "yo", "otros", "sosten", "sombra", "consejo", "leccion"] as const;
export type Lens = (typeof LENSES)[number];

export const LENS_LABEL: Record<Lens, string> = {
  nucleo: "el centro",
  cruce: "lo que te cruza",
  raiz: "la raíz",
  transito: "lo que viene",
  meta: "lo que buscás",
  yo: "vos",
  otros: "tu entorno",
  sosten: "lo que te sostiene",
  sombra: "lo que temés",
  consejo: "el consejo",
  leccion: "la lección",
};
```

- [ ] **Step 3: esquema** — en `spreads.ts`, importar `LENSES` de `./interpret/lenses` y sumar al `positionSchema`: `lente: z.enum(LENSES),`.

- [ ] **Step 4: datos** — agregar `"lente"` a cada posición de `data/spreads.json` según el test (script, preservando formato 2 espacios, UTF-8 sin escapes).

Run: `cd webApp && npx vitest run src/lib/tarot/` → PASS.

- [ ] **Step 5: Commit** — `feat(tarot): lentes de lectura por posición`.

---

### Task 2: Tipo de pregunta

**Files:**
- Modify: `webApp/src/lib/tarot/question.ts`
- Test: `webApp/src/lib/tarot/question.test.ts` (sumar)

**Interfaces:**
- Produces: `type QuestionType = "si_no" | "cuando" | "que_hacer" | "el_otro" | "como_sale" | "general"`; `classifyQuestion(q: string | null): QuestionType`.

- [ ] **Step 1: Test que falla** (sumar a `question.test.ts`)

```ts
import { classifyQuestion, type QuestionType } from "./question";

const CASOS: [string | null, QuestionType][] = [
  ["¿Cuándo voy a conseguir trabajo?", "cuando"],
  ["¿Para cuándo se resuelve lo de la casa?", "cuando"],
  ["¿En cuánto tiempo me mudo?", "cuando"],
  ["¿Cuánto falta para que vuelva?", "cuando"],
  ["¿cuando llega la plata?", "cuando"],
  ["¿Cuándo conozco a alguien?", "cuando"],
  ["¿Qué siente por mí?", "el_otro"],
  ["¿Piensa en mí?", "el_otro"],
  ["¿Me quiere?", "el_otro"],
  ["¿Me extraña?", "el_otro"],
  ["¿Qué le pasa a mi ex conmigo?", "el_otro"],
  ["¿Qué piensa mi jefa de mi trabajo?", "el_otro"],
  ["¿Siente algo por mí?", "el_otro"],
  ["¿Qué hago con mi pareja?", "que_hacer"],
  ["¿Debo aceptar la oferta?", "que_hacer"],
  ["¿Debería mudarme?", "que_hacer"],
  ["¿Me conviene renunciar?", "que_hacer"],
  ["¿Qué puedo hacer para mejorar mi salud?", "que_hacer"],
  ["¿Cómo hago para ahorrar?", "que_hacer"],
  ["¿Qué camino tomo?", "que_hacer"],
  ["¿Cómo me va a ir en el examen?", "como_sale"],
  ["¿Cómo va a terminar esto?", "como_sale"],
  ["¿Qué va a pasar con mi relación?", "como_sale"],
  ["¿Cómo sigue lo del juicio?", "como_sale"],
  ["¿Qué pasará con el negocio?", "como_sale"],
  ["¿Cómo viene el año?", "como_sale"],
  ["¿Vuelve conmigo?", "si_no"],
  ["¿Consigo el trabajo?", "si_no"],
  ["¿Va a funcionar?", "si_no"],
  ["¿Me van a ascender?", "si_no"],
  ["¿Es la persona indicada?", "si_no"],
  ["¿Hay futuro con él?", "si_no"],
  ["¿Puedo confiar en ella?", "si_no"],
  ["¿Tengo que preocuparme?", "si_no"],
  ["Mi situación laboral", "general"],
  ["Quiero saber sobre mi familia", "general"],
  ["Amor", "general"],
  ["¿Qué me dicen las cartas sobre este mes?", "general"],
  ["Contame de mi salud", "general"],
  [null, "general"],
];

describe("classifyQuestion", () => {
  for (const [q, tipo] of CASOS) it(`${q} → ${tipo}`, () => expect(classifyQuestion(q)).toBe(tipo));
});
```

Run → FAIL.

- [ ] **Step 2: Implementación** (agregar a `question.ts`)

```ts
export type QuestionType = "si_no" | "cuando" | "que_hacer" | "el_otro" | "como_sale" | "general";

// Orden de prioridad: la primera que coincide gana (spec T-094 §6.1).
const TIPOS: [Exclude<QuestionType, "general">, RegExp][] = [
  ["cuando", /\b(cu[aá]ndo|cu[aá]nto falta|cu[aá]nto tiempo|qu[eé] fecha)/iu],
  ["el_otro", /\b(qu[eé] siente|qu[eé] piensa|piensa en m[ií]|me quiere|me ama|me extra[nñ]a|qu[eé] le pasa|siente algo|est[aá] enamorad)/iu],
  ["que_hacer", /\b(qu[eé] (hago|puedo hacer|debo|deber[ií]a|me conviene)|deber[ií]a|debo|me conviene|conviene|c[oó]mo hago|qu[eé] camino)/iu],
  ["como_sale", /\b(c[oó]mo (me va|va a|le va|ir[aá]|saldr[aá]|sigue|termina|viene)|qu[eé] va a pasar|qu[eé] pasar[aá])/iu],
  ["si_no", /^¿?\s*(va|van|voy|vuelve|volver[aá]|consigo|conseguir[eé]|me|lo|la|le|es|est[aá]|hay|tengo|tendr[eé]|puedo|podr[eé]|sale|saldr[aá]|ser[aá]|habr[aá]|quiere|se)\b/iu],
];

export function classifyQuestion(q: string | null): QuestionType {
  if (!q) return "general";
  for (const [tipo, re] of TIPOS) if (re.test(q)) return tipo;
  return "general";
}
```

Run → PASS. Si algún caso falla, corregir la expresión (no el caso) y anotarlo en el reporte.

- [ ] **Step 3: Commit** — `feat(tarot): tipo de pregunta`.

---

### Task 3: Dignidad por vecinos y tres estados

**Files:**
- Create: `webApp/src/lib/tarot/interpret/dignity.ts`, `webApp/src/lib/tarot/interpret/dignity.test.ts`
- Modify: `webApp/src/lib/tarot/reading.ts`, `webApp/src/lib/tarot/reading.test.ts`
- Modify: `webApp/src/lib/tarot/prose.ts` (solo lo mínimo para compilar: `mode` → `estado`, ver Step 5)

**Interfaces:**
- Produces: `type Estado = "pleno" | "en_proceso" | "trabada"`; `neighborEffect(self: Element, prev: Element | null, next: Element | null): { weakened: boolean; reinforced: number }`; `estadoOf(reversed: boolean, weakened: boolean): Estado`. En `PlacedCard`: se elimina `mode`, se agregan `estado: Estado` y `reinforced: number`. `Group`/`Contrast`/`links` se mantienen; el contraste cuenta `estado === "pleno"`.

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/dignity.test.ts
import { describe, expect, it } from "vitest";
import { estadoOf, neighborEffect } from "./dignity";

describe("neighborEffect (Book T)", () => {
  it("vecino amigo refuerza, enemigo debilita, neutro no cuenta", () => {
    expect(neighborEffect("fuego", "aire", null)).toEqual({ weakened: false, reinforced: 1 });
    expect(neighborEffect("fuego", null, "agua")).toEqual({ weakened: true, reinforced: 0 });
    expect(neighborEffect("fuego", "tierra", null)).toEqual({ weakened: false, reinforced: 0 });
    expect(neighborEffect("agua", "agua", "tierra")).toEqual({ weakened: false, reinforced: 2 });
  });
  it("entre dos vecinos enemigos entre sí, la carta no se ve afectada", () => {
    expect(neighborEffect("tierra", "fuego", "agua")).toEqual({ weakened: false, reinforced: 0 });
    expect(neighborEffect("aire", "tierra", "aire")).toEqual({ weakened: false, reinforced: 0 }); // tierra y aire, enemigos entre sí
  });
  it("un refuerzo y un debilitamiento se compensan", () => {
    expect(neighborEffect("fuego", "aire", "agua")).toEqual({ weakened: false, reinforced: 1 });
  });
});

describe("estadoOf", () => {
  it("trabada gana; si no, invertida es en proceso; si no, pleno", () => {
    expect(estadoOf(false, true)).toBe("trabada");
    expect(estadoOf(true, true)).toBe("trabada");
    expect(estadoOf(true, false)).toBe("en_proceso");
    expect(estadoOf(false, false)).toBe("pleno");
  });
});
```

Run → FAIL.

- [ ] **Step 2: `dignity.ts`**

```ts
// webApp/src/lib/tarot/interpret/dignity.ts
// Dignidades por vecinos (Golden Dawn, Book T) y los tres estados de la spec T-094 §5.3.
import type { Element } from "../cards";
import { dignityBetween } from "../dignities";

export type Estado = "pleno" | "en_proceso" | "trabada";

export function neighborEffect(self: Element, prev: Element | null, next: Element | null): { weakened: boolean; reinforced: number } {
  if (prev && next && dignityBetween(prev, next) === "debilita") return { weakened: false, reinforced: 0 };
  let score = 0;
  let reinforced = 0;
  for (const n of [prev, next]) {
    if (!n) continue;
    const d = dignityBetween(n, self);
    if (d === "intensifica" || d === "refuerza") {
      score += 1;
      reinforced += 1;
    } else if (d === "debilita") score -= 1;
  }
  return { weakened: score < 0, reinforced };
}

export function estadoOf(reversed: boolean, weakened: boolean): Estado {
  if (weakened) return "trabada";
  return reversed ? "en_proceso" : "pleno";
}
```

Run dignity.test → PASS.

- [ ] **Step 3: Tests de `reading.ts`** — reemplazar el test «modo: invertida o vínculo que debilita => desequilibrio» por:

```ts
it("estados por vecinos dentro de la cadena", () => {
  const r = buildReading({ spread: "cruz-simple", cards: [
    { indice: idx("as-de-bastos"), reversed: false },  // fuego, vecino aire → pleno
    { indice: idx("as-de-espadas"), reversed: false }, // aire entre fuego y fuego → pleno
    { indice: idx("el-sol"), reversed: true },         // fuego entre aire(+1) y agua(−1) → 0 → invertida → en_proceso
    { indice: idx("as-de-copas"), reversed: false },   // agua entre fuego(−1) y tierra(+1) → pleno
    { indice: idx("as-de-oros"), reversed: false },    // tierra, vecino agua → pleno
  ] });
  expect(r.placed.map((p) => p.estado)).toEqual(["pleno", "pleno", "en_proceso", "pleno", "pleno"]);
});
```

En los demás tests de `reading.test.ts` que miran `mode`, cambiar `mode === "equilibrio"` por `estado === "pleno"` y recomputar cualquier expectativa con la regla nueva (nunca al revés). Los tests de simetría A↔B y de sesgo (5000 tiradas) deben seguir pasando.

- [ ] **Step 4: `reading.ts`**

- Tipos: `PlacedCard = { position; card; reversed; meaning; keywords; domainText; estado: Estado; reinforced: number }`; quitar `Mode`.
- En `buildReading`, además de `prev`, armar `next` con la misma cadena (`for k: next.set(idx[k-1], idx[k])`). Para cada `i`: `const eff = neighborEffect(baseElement(raw[i].card), prev.has(i) ? baseElement(raw[prev.get(i)!].card) : null, next.has(i) ? baseElement(raw[next.get(i)!].card) : null)`; `estado: estadoOf(raw[i].reversed, eff.weakened)`, `reinforced: eff.reinforced`.
- `fluye` cuenta `p.estado === "pleno"`.
- `links` se mantiene igual (prev → actual con `dignityAt`).

- [ ] **Step 5: compilar `prose.ts`** — en `posicion()`: `const estadoTexto = p.estado === "trabada" ? p.card.en_desequilibrio : p.card.en_equilibrio; const estado = " " + fill(pick(rng, templates.estado[p.estado === "trabada" ? "desequilibrio" : "equilibrio"]), { nombre: nombre(p), texto: estadoTexto });` (la prosa nueva llega en T10).

Run: `cd webApp && npx vitest run src/lib/tarot/` → PASS; tsc fuera de `.next/` vacío.

- [ ] **Step 6: Commit** — `feat(tarot): dignidad por vecinos y estados pleno, en proceso y trabada`.

---

### Task 4: Patrones y carta dominante

**Files:**
- Create: `webApp/src/lib/tarot/interpret/patterns.ts`, `webApp/src/lib/tarot/interpret/patterns.test.ts`
- Modify: `webApp/src/lib/tarot/reading.ts` (sumar `patterns` y `dominant` a `ReadingFacts`)

**Interfaces:**
- Consumes: `PlacedCard` con `estado`, `reinforced`, `position.lente`.
- Produces:
  ```ts
  export type Patterns = {
    repeated: { numero: number; cartas: PlacedCard[] }[];   // menores 1..10 con 2+ apariciones
    progression: "avanza" | "retrocede" | null;
    people: PlacedCard[];   // figuras (numero ≥ 11) en lentes otros/sosten/cruce
    facets: PlacedCard[];   // figuras en lentes yo/sombra
  };
  export function patternsOf(placed: PlacedCard[]): Patterns;
  export function dominantOf(placed: PlacedCard[]): PlacedCard;
  ```
  `ReadingFacts` suma `patterns: Patterns; dominant: PlacedCard`.

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/patterns.test.ts
import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { dominantOf, patternsOf } from "./patterns";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const leer = (spread: string, slugs: string[], rev: boolean[] = []) =>
  buildReading({ spread: spread as never, cards: slugs.map((s, i) => ({ indice: idx(s), reversed: rev[i] ?? false })) });

describe("patternsOf", () => {
  it("números repetidos entre menores 1..10", () => {
    const r = leer("cruz-simple", ["cinco-de-copas", "cinco-de-oros", "as-de-bastos", "dos-de-espadas", "rey-de-copas"]);
    expect(patternsOf(r.placed).repeated.map((x) => [x.numero, x.cartas.length])).toEqual([[5, 2]]);
  });
  it("progresión: avanza si sube en ≥ 2/3 de los pasos, retrocede si baja", () => {
    expect(patternsOf(leer("cruz-simple", ["as-de-bastos", "tres-de-copas", "cinco-de-oros", "siete-de-espadas", "nueve-de-copas"]).placed).progression).toBe("avanza");
    expect(patternsOf(leer("cruz-simple", ["diez-de-bastos", "ocho-de-copas", "seis-de-oros", "cuatro-de-espadas", "dos-de-copas"]).placed).progression).toBe("retrocede");
    expect(patternsOf(leer("cruz-simple", ["tres-de-bastos", "ocho-de-copas", "dos-de-oros", "nueve-de-espadas", "cuatro-de-copas"]).placed).progression).toBeNull();
  });
  it("figuras: personas en otros/sosten/cruce, facetas en yo/sombra", () => {
    // cruz-celta: 1 nucleo, 2 cruce, 3 meta, 4 raiz, 5 sosten, 6 transito, 7 yo, 8 otros, 9 sombra, 10 consejo
    const r = leer("cruz-celta", ["as-de-bastos", "rey-de-copas", "dos-de-oros", "tres-de-espadas", "reina-de-oros", "seis-de-bastos", "sota-de-copas", "caballero-de-espadas", "rey-de-bastos", "diez-de-oros"]);
    const p = patternsOf(r.placed);
    expect(p.people.map((x) => x.card.id)).toEqual(["rey-de-copas", "reina-de-oros", "caballero-de-espadas"]);
    expect(p.facets.map((x) => x.card.id)).toEqual(["sota-de-copas", "rey-de-bastos"]);
  });
});

describe("dominantOf", () => {
  it("1) mayor en núcleo o cruce", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "la-torre", "el-sol", "tres-de-espadas", "cuatro-de-oros", "seis-de-bastos", "dos-de-copas", "ocho-de-espadas", "nueve-de-bastos", "diez-de-oros"]);
    expect(dominantOf(r.placed).card.id).toBe("la-torre");
  });
  it("2) si no, el mayor de menor posición", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-oros", "tres-de-copas", "el-sol", "cuatro-de-oros", "la-luna", "dos-de-copas", "ocho-de-espadas", "nueve-de-bastos", "diez-de-oros"]);
    expect(dominantOf(r.placed).card.id).toBe("el-sol");
  });
  it("3) sin mayores, la más reforzada; 4) si nadie refuerza, la del núcleo", () => {
    const r = leer("cruz-simple", ["as-de-bastos", "as-de-espadas", "dos-de-bastos", "as-de-copas", "as-de-oros"]);
    const max = Math.max(...r.placed.map((p) => p.reinforced));
    expect(dominantOf(r.placed).reinforced).toBe(max);
    const sola = leer("carta-del-dia", ["as-de-oros"]);
    expect(dominantOf(sola.placed).card.id).toBe("as-de-oros");
  });
});
```

Run → FAIL.

- [ ] **Step 2: `patterns.ts`**

```ts
// webApp/src/lib/tarot/interpret/patterns.ts
// Patrones de tirada y carta dominante (spec T-094 §5.1, §5.2).
import type { PlacedCard } from "../reading";

export type Patterns = {
  repeated: { numero: number; cartas: PlacedCard[] }[];
  progression: "avanza" | "retrocede" | null;
  people: PlacedCard[];
  facets: PlacedCard[];
};

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;
const isCourt = (p: PlacedCard) => p.card.arcano === "menor" && p.card.numero >= 11;
const numbered = (p: PlacedCard) => p.card.arcano === "menor" && p.card.numero <= 10;

export function patternsOf(placed: PlacedCard[]): Patterns {
  const ordered = [...placed].sort(byN);
  const byNum = new Map<number, PlacedCard[]>();
  for (const p of ordered.filter(numbered)) byNum.set(p.card.numero, [...(byNum.get(p.card.numero) ?? []), p]);
  const repeated = [...byNum.entries()].filter(([, cs]) => cs.length >= 2).map(([numero, cartas]) => ({ numero, cartas })).sort((a, b) => a.numero - b.numero);

  const nums = ordered.filter(numbered).map((p) => p.card.numero);
  let progression: Patterns["progression"] = null;
  if (nums.length >= 3) {
    const steps = nums.length - 1;
    let up = 0;
    let down = 0;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i]! > nums[i - 1]!) up++;
      else if (nums[i]! < nums[i - 1]!) down++;
    }
    if (up * 3 >= steps * 2) progression = "avanza";
    else if (down * 3 >= steps * 2) progression = "retrocede";
  }

  const courts = ordered.filter(isCourt);
  return {
    repeated,
    progression,
    people: courts.filter((p) => ["otros", "sosten", "cruce"].includes(p.position.lente)),
    facets: courts.filter((p) => ["yo", "sombra"].includes(p.position.lente)),
  };
}

export function dominantOf(placed: PlacedCard[]): PlacedCard {
  const ordered = [...placed].sort(byN);
  const majors = ordered.filter((p) => p.card.arcano === "mayor");
  const enCentro = majors.find((p) => p.position.lente === "nucleo" || p.position.lente === "cruce");
  if (enCentro) return enCentro;
  if (majors.length) return majors[0]!;
  const max = Math.max(...ordered.map((p) => p.reinforced));
  if (max > 0) return ordered.find((p) => p.reinforced === max)!;
  return ordered.find((p) => p.position.lente === "nucleo") ?? ordered[0]!;
}
```

- [ ] **Step 3: `reading.ts`** — importar y sumar a `ReadingFacts` `patterns: patternsOf(placed)`, `dominant: dominantOf(placed)`.

Run: `cd webApp && npx vitest run src/lib/tarot/` → PASS.

- [ ] **Step 4: Commit** — `feat(tarot): patrones de tirada y carta dominante`.

---

### Task 5: Tensiones entre lentes

**Files:**
- Create: `webApp/src/lib/tarot/interpret/tensions.ts`, `webApp/src/lib/tarot/interpret/tensions.test.ts`
- Modify: `webApp/src/lib/tarot/reading.ts` (sumar `tensions`)

**Interfaces:**
- Produces: `type Tension = { a: PlacedCard; b: PlacedCard; dignity: Dignity }`; `tensionsOf(placed: PlacedCard[], hasContrast: boolean): Tension[]`; `ReadingFacts.tensions: Tension[]`.

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/tensions.test.ts
import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const leer = (spread: string, slugs: string[]) =>
  buildReading({ spread: spread as never, cards: slugs.map((s) => ({ indice: idx(s), reversed: false })) });
const lentes = (r: ReturnType<typeof leer>) => r.tensions.map((t) => `${t.a.position.lente}-${t.b.position.lente}`);

describe("tensionsOf", () => {
  it("cruz celta: hasta 3, en orden de prioridad", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"]);
    expect(lentes(r)).toEqual(["nucleo-cruce", "raiz-transito", "yo-otros"]);
  });
  it("califica con la dignidad entre las dos cartas", () => {
    const r = leer("cruz-celta", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"]);
    expect(r.tensions[0]!.dignity).toBe("debilita"); // fuego-agua
  });
  it("con contraste de grupos, máximo 2 y sin yo-otros", () => {
    const r = leer("relaciones", ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas"]);
    expect(r.tensions.length).toBeLessThanOrEqual(2);
    expect(lentes(r)).not.toContain("yo-otros");
  });
  it("tiradas sin pares de lentes no tienen tensiones", () => {
    expect(leer("carta-del-dia", ["as-de-oros"]).tensions).toEqual([]);
    expect(leer("astrologica", CARDS.slice(22, 34).map((c) => c.id)).tensions).toEqual([]);
  });
});
```

Run → FAIL.

- [ ] **Step 2: `tensions.ts`**

```ts
// webApp/src/lib/tarot/interpret/tensions.ts
// Pares de lentes que se oponen (spec T-094 §5.4). Máximo 3; 2 si la tirada ya tiene contraste de grupos.
import { baseElement } from "../cards";
import { dignityBetween, type Dignity } from "../dignities";
import type { PlacedCard } from "../reading";
import type { Lens } from "./lenses";

export type Tension = { a: PlacedCard; b: PlacedCard; dignity: Dignity };

const PAIRS: [Lens, Lens][] = [
  ["nucleo", "cruce"],
  ["raiz", "transito"],
  ["yo", "otros"],
  ["meta", "consejo"],
  ["sosten", "cruce"],
];

export function tensionsOf(placed: PlacedCard[], hasContrast: boolean): Tension[] {
  const first = (l: Lens) => [...placed].sort((x, y) => x.position.n - y.position.n).find((p) => p.position.lente === l);
  const out: Tension[] = [];
  for (const [la, lb] of PAIRS) {
    if (hasContrast && la === "yo" && lb === "otros") continue;
    const a = first(la);
    const b = first(lb);
    if (!a || !b || a === b) continue;
    out.push({ a, b, dignity: dignityBetween(baseElement(a.card), baseElement(b.card)) });
  }
  return out.slice(0, hasContrast ? 2 : 3);
}
```

- [ ] **Step 3: `reading.ts`** — `const contrast = contrastOf(spread, groups); … tensions: tensionsOf(placed, contrast !== null)`.

Run: `cd webApp && npx vitest run src/lib/tarot/` → PASS.

- [ ] **Step 4: Commit** — `feat(tarot): tensiones entre lentes opuestas`.

---

### Task 6: Contenido por lente · 22 mayores (Opus)

**Files:**
- Create: `webApp/src/lib/tarot/data/lenses.json`
- Create: `webApp/src/lib/tarot/interpret/lens-content.test.ts`

**Interfaces:**
- Produces: `lenses.json` = objeto `{ "<card-id>": { "fuente": string, "nucleo": string, …11 lentes } }`.

Reglas de contenido (valen para T6 y T7):
- Cada texto: **una o dos oraciones, 60–260 caracteres**, que **empiezan con un verbo en tercera persona del singular con mayúscula** cuyo sujeto implícito es la carta («Trae…», «Señala…», «Pide…», «Es…»), nunca con artículo. No nombra la carta (la plantilla la nombra), porque la plantilla la usa tal cual («… aparece la Torre. Trae…») o en minúscula a continuación del nombre («… la Torre trae…»).
- Lee la carta **como** esa lente (spec §4): `nucleo` qué es el centro de la situación con esta carta; `cruce` qué atraviesa (obstáculo o facilidad); `raiz` qué pasado dejó; `transito` qué entra si nada cambia (posibilidad, no sentencia); `meta` qué ideal propone; `yo` qué actitud o recurso propio muestra; `otros` qué persona o entorno representa; `sosten` qué apoyo ofrece; `sombra` qué miedo encarna; `consejo` qué propone hacer; `leccion` qué aprendizaje de largo plazo trae.
- Fuente: `docs/TAROT/fuente/` (verificada), `cards.json` (significados, `en_equilibrio`, `en_desequilibrio`), narrativa del palo en `suits.json`. Para `leccion` y `consejo` de los mayores, apoyarse en el material kármico de la dueña (equilibrio/desequilibrio/preguntas/máscara de `mayores.json`), sin nombrarlo.
- Voz del sitio, sin fatalismo, D2 y D4 de las Global Constraints, sin erratas de la fuente.
- `fuente` = la misma clave que la carta tiene en `cards.json`.

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/lens-content.test.ts
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
```

(Se ejecuta con `-t mayores` en esta tarea; los palos quedan rojos hasta T7.)

- [ ] **Step 2: Escribir las 22 entradas** de los mayores (script que preserva formato; claves = `id` de `cards.json`).

Run: `cd webApp && npx vitest run src/lib/tarot/interpret/lens-content.test.ts -t mayores` → PASS.

- [ ] **Step 3: Commit** — `feat(tarot): lectura por lente de los 22 mayores`.

---

### Task 7: Contenido por lente · 56 menores (Opus)

**Files:**
- Modify: `webApp/src/lib/tarot/data/lenses.json`

Mismas reglas que T6 (copiadas arriba en la tarea 6; leerlas allí). Particular de menores: el número es el capítulo del palo en la narrativa As→Diez de la dueña; las figuras en `otros`/`sosten` son personas, en `yo`/`sombra` facetas propias (sin color de pelo, estado civil ni género prescriptivo). Rey de Oros y Reina de Espadas: derivar como en T-093 (la fuente duplica texto; ver `docs/TAROT/fuente/PREGUNTAS-DUENA.md`).

- [ ] **Step 1:** escribir un palo por vez y correr `npx vitest run src/lib/tarot/interpret/lens-content.test.ts -t <palo>` → PASS por palo.
- [ ] **Step 2:** `npx vitest run src/lib/tarot/interpret/lens-content.test.ts` → PASS completo.
- [ ] **Step 3: Commit** — `feat(tarot): lectura por lente de los 56 menores`.

---

### Task 8: Plantillas nuevas (Opus)

**Files:**
- Modify: `webApp/src/lib/tarot/data/templates.json` (solo **agregar** claves; no tocar las existentes)
- Create: `webApp/src/lib/tarot/interpret/templates.test.ts`

**Interfaces:**
- Produces: las claves de la tabla, cada hoja con ≥ 3 variantes y solo los marcadores permitidos.

| Clave | Marcadores | Uso |
|---|---|---|
| `idea_inicio` | `{A}` `{clave}` | primera carta de la idea lineal («Todo arranca en {clave}, con {A}») — `{A}` es el nombre con mayúscula |
| `idea_paso` | `{a}` `{clave}` | cartas intermedias, cláusula que sigue la frase |
| `idea_fin` | `{a}` `{clave}` | última carta, cierra la oración |
| `posicion_lente` | `{nombre}` `{Nombre}` `{posicion}` `{texto}` `{texto_min}` | apertura de cada posición; p. ej. «En «{posicion}», {nombre} {texto_min}» / «En «{posicion}» aparece {nombre}. {texto}» |
| `estado.pleno` / `estado.en_proceso` / `estado.trabada` | `{nombre}` `{texto}` | estado de la carta; `en_proceso` reformula como algo que todavía no llega del todo |
| `patron_numero.1` … `patron_numero.10` | `{cartas}` | número repetido leído con la narrativa As→Diez de la dueña (los cuatro palos) |
| `progresion.avanza` / `progresion.retrocede` | — | progresión de números |
| `gente` | `{cartas}` | figuras como personas |
| `facetas` | `{cartas}` | figuras como facetas propias |
| `dominante` | `{nombre}` `{Nombre}` `{posicion}` `{texto}` | párrafo de la carta dominante (`{texto}` = su significado) |
| `tension.intensifica` / `.refuerza` / `.debilita` / `.neutral` | `{A}` `{b}` `{la}` `{lb}` | tensión entre dos lentes (`{la}`/`{lb}` = `LENS_LABEL`) |
| `respuesta.<tipo>.<balance>` | `{pregunta}` `{cartas}` `{dominante}` | tipos `si_no` `cuando` `que_hacer` `el_otro` `como_sale` `general` × balances `favorable` `abierta` `desfavorable` (E2: reflexiva, sin fechas; `el_otro` dice que se lee el vínculo desde quien pregunta; `cuando` nunca da plazo) |
| `resolucion` | `{nombre}` `{Nombre}` `{texto}` `{texto_min}` | cierre con la carta de consejo (`{texto}` = su lectura por lente `consejo`) |

- [ ] **Step 1: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/templates.test.ts
import { describe, expect, it } from "vitest";
import templates from "../data/templates.json";

const T = templates as Record<string, unknown>;
const TIPOS = ["si_no", "cuando", "que_hacer", "el_otro", "como_sale", "general"];
const BAL = ["favorable", "abierta", "desfavorable"];

const HOJAS: [string, string[]][] = [
  ["idea_inicio", ["A", "clave"]],
  ["idea_paso", ["a", "clave"]],
  ["idea_fin", ["a", "clave"]],
  ["posicion_lente", ["nombre", "Nombre", "posicion", "texto", "texto_min"]],
  ...["pleno", "en_proceso", "trabada"].map((k) => [`estado_nuevo.${k}`, ["nombre", "texto"]] as [string, string[]]),
  ...Array.from({ length: 10 }, (_, i) => [`patron_numero.${i + 1}`, ["cartas"]] as [string, string[]]),
  ["progresion.avanza", []],
  ["progresion.retrocede", []],
  ["gente", ["cartas"]],
  ["facetas", ["cartas"]],
  ["dominante", ["nombre", "Nombre", "posicion", "texto"]],
  ...["intensifica", "refuerza", "debilita", "neutral"].map((k) => [`tension.${k}`, ["A", "b", "la", "lb"]] as [string, string[]]),
  ...TIPOS.flatMap((t) => BAL.map((b) => [`respuesta.${t}.${b}`, ["pregunta", "cartas", "dominante"]] as [string, string[]])),
  ["resolucion", ["nombre", "Nombre", "texto", "texto_min"]],
];

const get = (path: string) => path.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], T);

describe("plantillas de T-094", () => {
  for (const [path, allowed] of HOJAS) {
    it(`${path}: ≥ 3 variantes y solo {${allowed.join(",")}}`, () => {
      const v = get(path) as string[];
      expect(Array.isArray(v), path).toBe(true);
      expect(v.length).toBeGreaterThanOrEqual(3);
      for (const s of v) for (const m of s.matchAll(/\{(\w+)\}/g)) expect(allowed, `${path}: ${s}`).toContain(m[1]);
    });
  }
  it("toda respuesta retoma la pregunta", () => {
    for (const t of TIPOS) for (const b of BAL) for (const s of get(`respuesta.${t}.${b}`) as string[]) expect(s, `${t}.${b}`).toContain("{pregunta}");
  });
  it("respuesta.cuando nunca promete fechas", () => {
    for (const b of BAL) for (const s of get(`respuesta.cuando.${b}`) as string[]) expect(s).not.toMatch(/\b(d[ií]as?|semanas?|mes(es)?|años?|pronto)\b/i);
  });
});
```

**Nota de nombre:** el estado nuevo va en la clave `estado_nuevo` (no `estado`, que hoy usa `prose.ts` con `equilibrio`/`desequilibrio`); T10 la renombra a `estado` al borrar las viejas.

Run → FAIL.

- [ ] **Step 2:** escribir las claves (voz del sitio, D2, E2). `respuesta.*` de 2–3 oraciones; el resto 1–2.
- [ ] **Step 3:** `npx vitest run src/lib/tarot/interpret/templates.test.ts src/lib/tarot/prose.test.ts` → PASS.
- [ ] **Step 4: Commit** — `feat(tarot): plantillas de interpretación`.

---

### Task 9: Respuesta reflexiva

**Files:**
- Create: `webApp/src/lib/tarot/interpret/text.ts`, `webApp/src/lib/tarot/interpret/answer.ts`, `webApp/src/lib/tarot/interpret/answer.test.ts`
- Modify: `webApp/src/lib/tarot/reading.ts` (`questionType`)

**Interfaces:**
- Consumes: `classifyQuestion`, `QuestionType` (T2); `PlacedCard.estado` (T3); `dominant` (T4); `templates.respuesta` (T8); `nombrar` de `../prose`.
- Produces: `text.ts`: `rngFrom(seed: number): () => number`, `fill(t: string, vars: Record<string, string>): string`, `pick(rng, opts: readonly string[]): string`, `lowerFirst(s: string): string`, `joinY(xs: string[]): string`. `answer.ts`: `type Balance = "favorable" | "abierta" | "desfavorable"`, `answerCards(facts: ReadingFacts): PlacedCard[]`, `balanceOf(cards: PlacedCard[]): Balance`, `buildAnswer(facts: ReadingFacts, rng: () => number): string | null`. `ReadingFacts.questionType: QuestionType`.

- [ ] **Step 1: `text.ts`** (mover `rngFrom`, `fill`, `pick` desde `prose.ts` sin cambios de lógica; `prose.ts` pasa a importarlos de aquí)

```ts
// webApp/src/lib/tarot/interpret/text.ts
// mulberry32: chico, determinista, suficiente para elegir variantes.
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`plantilla sin valor para {${k}}`);
    return v;
  });
}

export function pick(rng: () => number, options: readonly string[]): string {
  return options[Math.floor(rng() * options.length)]!;
}

export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function joinY(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`;
}
```

- [ ] **Step 2: Test que falla**

```ts
// webApp/src/lib/tarot/interpret/answer.test.ts
import { describe, expect, it } from "vitest";
import { CARDS } from "../cards";
import { buildReading } from "../reading";
import { answerCards, balanceOf, buildAnswer } from "./answer";
import { rngFrom } from "./text";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const celta = (q: string | null, rev: boolean[] = []) =>
  buildReading({ spread: "cruz-celta", cards: ["as-de-bastos", "dos-de-copas", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"].map((s, i) => ({ indice: idx(s), reversed: rev[i] ?? false })) }, q);

describe("respuesta reflexiva", () => {
  it("sin pregunta no hay respuesta", () => {
    expect(buildAnswer(celta(null), rngFrom(1))).toBeNull();
  });
  it("toma las lentes de cada tipo", () => {
    expect(answerCards(celta("¿Qué hago con esto?")).map((p) => p.position.lente)).toEqual(["sosten", "yo", "consejo"]);
    expect(answerCards(celta("¿Qué siente por mí?")).map((p) => p.position.lente)).toEqual(["yo", "otros"]);
    expect(answerCards(celta("¿Cuándo se resuelve?")).length).toBe(10);
  });
  it("si faltan las lentes del tipo, cae en núcleo, consejo o la última", () => {
    const r = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] }, "¿Qué siente por mí?");
    expect(answerCards(r).map((p) => p.position.lente)).toEqual(["consejo"]);
  });
  it("balance: favorable, desfavorable o abierta", () => {
    const P = { estado: "pleno" } as never, T = { estado: "trabada" } as never, E = { estado: "en_proceso" } as never;
    expect(balanceOf([P, P, T])).toBe("favorable");
    expect(balanceOf([T, T, P])).toBe("desfavorable");
    expect(balanceOf([P, T])).toBe("abierta");
    expect(balanceOf([E, E, P])).toBe("abierta");
  });
  it("retoma la pregunta literal y es determinista", () => {
    const r = celta("¿Vuelve conmigo?");
    const a = buildAnswer(r, rngFrom(7))!;
    expect(a).toContain("Vuelve conmigo");
    expect(buildAnswer(r, rngFrom(7))).toBe(a);
  });
});
```

Run → FAIL.

- [ ] **Step 3: `answer.ts`**

```ts
// webApp/src/lib/tarot/interpret/answer.ts
// Respuesta reflexiva a la pregunta (spec T-094 §6): muestra fuerzas, no sentencia.
import templates from "../data/templates.json";
import { nombrar } from "../prose";
import type { PlacedCard, ReadingFacts } from "../reading";
import type { QuestionType } from "../question";
import type { Lens } from "./lenses";
import { fill, joinY, pick } from "./text";

export type Balance = "favorable" | "abierta" | "desfavorable";

const LENTES: Record<QuestionType, Lens[] | "todas"> = {
  si_no: ["nucleo", "cruce", "transito", "consejo"],
  cuando: "todas",
  que_hacer: ["yo", "consejo", "sosten"],
  el_otro: ["otros", "yo"],
  como_sale: ["nucleo", "transito", "consejo"],
  general: ["nucleo", "consejo"],
};

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;

export function answerCards(facts: ReadingFacts): PlacedCard[] {
  const ordered = [...facts.placed].sort(byN);
  const want = LENTES[facts.questionType];
  if (want === "todas") return ordered;
  const hit = ordered.filter((p) => want.includes(p.position.lente));
  if (hit.length) return hit;
  const nucleo = ordered.filter((p) => p.position.lente === "nucleo");
  if (nucleo.length) return nucleo;
  const consejo = ordered.filter((p) => p.position.lente === "consejo");
  return consejo.length ? consejo : [ordered.at(-1)!];
}

export function balanceOf(cards: PlacedCard[]): Balance {
  const P = cards.filter((c) => c.estado === "pleno").length;
  const T = cards.filter((c) => c.estado === "trabada").length;
  const E = cards.filter((c) => c.estado === "en_proceso").length;
  if (E > P + T) return "abierta";
  if (P > T) return "favorable";
  if (T > P) return "desfavorable";
  return "abierta";
}

export function buildAnswer(facts: ReadingFacts, rng: () => number): string | null {
  if (!facts.question) return null;
  const cards = answerCards(facts);
  const balance = balanceOf(cards);
  const pregunta = facts.question.replace(/^¿\s*/, "").replace(/\s*\?$/, "");
  const base = fill(pick(rng, templates.respuesta[facts.questionType][balance]), {
    pregunta,
    cartas: joinY(cards.map((p) => nombrar(p.card))),
    dominante: nombrar(facts.dominant.card),
  });
  const dominio = facts.domain ? ` ${facts.dominant.card[facts.domain]}` : "";
  return base + dominio;
}
```

- [ ] **Step 4: `reading.ts`** — `questionType: classifyQuestion(question)` en `ReadingFacts`.

Run: `cd webApp && npx vitest run src/lib/tarot/` → PASS.

- [ ] **Step 5: Commit** — `feat(tarot): respuesta reflexiva según el tipo de pregunta`.

---

### Task 10: Narrativa y vista

**Files:**
- Create: `webApp/src/lib/tarot/interpret/lens-texts.ts`, `webApp/src/lib/tarot/interpret/narrative.ts`, `webApp/src/lib/tarot/interpret/narrative.test.ts`
- Modify: `webApp/src/lib/tarot/prose.ts` (queda: `articulo`, `nombrar`, `cap`, `de`; borrar `renderReading`, `ReadingText` y el armado)
- Delete: `webApp/src/lib/tarot/prose.test.ts` → sus tests vigentes pasan a `narrative.test.ts` (el de «concordancia» de `nombrar`/`de` se queda en un `prose.test.ts` reducido)
- Modify: `webApp/src/lib/tarot/data/templates.json` (borrar claves viejas sin uso: `hilo`, `estado`, `posicion_derecha`, `posicion_invertida`, `sintesis`, `panorama_gente`, `panorama_numero`, `grupo` **si** la vista ya no lo usa; renombrar `estado_nuevo` → `estado`)
- Modify: `webApp/src/components/tarot/ReadingView.tsx`; importadores de `renderReading` (`grep -rn "renderReading\|ReadingText" webApp/src`)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:

```ts
export type ReadingText = {
  apertura: string;
  ideaLineal: string;
  panorama: string | null;
  dominante: { titulo: string; texto: string };
  posiciones: { titulo: string; glosa: string; texto: string }[];
  grupos: { titulo: string; texto: string }[];
  tensiones: string[];
  respuesta: string | null;
  sintesis: string;
  consejo: string;
  espejo: string;
};
export function renderReading(facts: ReadingFacts, seed: number): ReadingText;
```

- [ ] **Step 1: `lens-texts.ts`**

```ts
// webApp/src/lib/tarot/interpret/lens-texts.ts
import { z } from "@/lib/validation/zod";
import raw from "../data/lenses.json";
import { CARDS, type Card } from "../cards";
import { LENSES, type Lens } from "./lenses";

const entry = z.object({ fuente: z.string().min(1), ...Object.fromEntries(LENSES.map((l) => [l, z.string().min(60).max(260)])) });
const DATA = z.record(z.string(), entry).parse(raw) as Record<string, Record<Lens | "fuente", string>>;
if (CARDS.some((c) => !DATA[c.id])) throw new Error("lenses.json no cubre las 78 cartas");

export function lensText(card: Card, lens: Lens): string {
  return DATA[card.id]![lens];
}
```

- [ ] **Step 2: Tests que fallan** (`narrative.test.ts`; traer de `prose.test.ts` los tests de determinismo, apertura con pregunta, palo ausente, sí/no con desempate, retirada renderiza, «≥ 3 variantes por clave», y el exhaustivo adaptado). Nuevos:

```ts
import { describe, expect, it } from "vitest";
import { CARDS, cardByIndex } from "../cards";
import { readingSeed, type Reading } from "../codec";
import { buildReading } from "../reading";
import { SPREADS } from "../spreads";
import { lensText } from "./lens-texts";
import { renderReading } from "./narrative";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;
const celta: Reading = { spread: "cruz-celta", cards: ["as-de-bastos", "la-torre", "tres-de-oros", "cuatro-de-espadas", "cinco-de-bastos", "seis-de-copas", "siete-de-oros", "ocho-de-espadas", "nueve-de-bastos", "diez-de-copas"].map((s) => ({ indice: idx(s), reversed: false })) };

describe("narrativa", () => {
  it("cada posición lee la carta por su lente y trae la glosa de la posición", () => {
    const f = buildReading(celta);
    const t = renderReading(f, 3);
    const torre = t.posiciones[1]!;
    expect(torre.glosa).toBe(f.placed[1]!.position.significado);
    const lente = lensText(cardByIndex(idx("la-torre"))!, "cruce");
    expect(torre.texto.toLowerCase()).toContain(lente.slice(1, 40).toLowerCase());
  });
  it("la dominante es la Torre (mayor en cruce) y el espejo sale de sus preguntas", () => {
    const t = renderReading(buildReading(celta), 3);
    expect(t.dominante.titulo).toMatch(/Torre/);
    expect(cardByIndex(idx("la-torre"))!.reflexion.some((q) => t.espejo.includes(q))).toBe(true);
  });
  it("idea lineal nombra todas las cartas en orden", () => {
    const t = renderReading(buildReading(celta), 3);
    expect(t.ideaLineal.toLowerCase().indexOf("torre")).toBeGreaterThan(t.ideaLineal.toLowerCase().indexOf("as de bastos"));
  });
  it("tensiones: hasta 3; respuesta solo con pregunta y retoma la pregunta", () => {
    expect(renderReading(buildReading(celta), 3).tensiones.length).toBeLessThanOrEqual(3);
    expect(renderReading(buildReading(celta), 3).respuesta).toBeNull();
    expect(renderReading(buildReading(celta, "¿Vuelve conmigo?"), 3).respuesta).toContain("Vuelve conmigo");
  });
  it("misma tirada + pregunta + semilla = mismo texto", () => {
    const f = buildReading(celta, "¿Qué hago?");
    expect(renderReading(f, readingSeed(celta))).toEqual(renderReading(f, readingSeed(celta)));
  });
  it("exhaustivo: 20 cartas × cada posición de cada tirada × orientación × 6 tipos de pregunta, sin marcadores ni vacíos", () => {
    const preguntas = [null, "¿Vuelve?", "¿Cuándo?", "¿Qué hago?", "¿Qué siente?", "¿Cómo me va a ir?"];
    const muestra = CARDS.filter((_, i) => i % 4 === 0).slice(0, 20);
    for (const s of SPREADS) for (const count of s.cartas) for (const card of muestra) for (const rev of s.allowReversed ? [false, true] : [false]) {
      for (let pos = 0; pos < count; pos++) {
        const otras = CARDS.filter((c) => c.indice !== card.indice).slice(pos, pos + count - 1).map((c) => ({ indice: c.indice, reversed: false }));
        const cards = [...otras.slice(0, pos), { indice: card.indice, reversed: rev }, ...otras.slice(pos)];
        for (const q of preguntas) {
          const t = renderReading(buildReading({ spread: s.slug, cards }, q), pos + count);
          const all = [t.apertura, t.ideaLineal, t.panorama ?? "", t.dominante.texto, ...t.posiciones.map((p) => p.texto), ...t.grupos.map((g) => g.texto), ...t.tensiones, t.respuesta ?? "", t.sintesis, t.consejo, t.espejo].join(" ");
          expect(all, `${s.slug} ${card.id} ${q}`).not.toMatch(/[{}]|undefined|\bnull\b|\[object/);
          for (const p of t.posiciones) expect(p.texto.length).toBeGreaterThan(40);
        }
      }
    }
  }, 120_000);
});
```

Run → FAIL.

- [ ] **Step 3: `narrative.ts`**

```ts
// webApp/src/lib/tarot/interpret/narrative.ts
// Arma el texto de la lectura (spec T-094 §5, §6): idea lineal → conjunto → dominante → posiciones → tensiones → respuesta → resolución → espejo.
import templates from "../data/templates.json";
import { cap, nombrar } from "../prose";
import type { PlacedCard, ReadingFacts } from "../reading";
import { buildAnswer } from "./answer";
import { lensText } from "./lens-texts";
import { LENS_LABEL } from "./lenses";
import { fill, joinY, lowerFirst, pick, rngFrom } from "./text";

export type ReadingText = {
  apertura: string;
  ideaLineal: string;
  panorama: string | null;
  dominante: { titulo: string; texto: string };
  posiciones: { titulo: string; glosa: string; texto: string }[];
  grupos: { titulo: string; texto: string }[];
  tensiones: string[];
  respuesta: string | null;
  sintesis: string;
  consejo: string;
  espejo: string;
};

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;
const nom = (p: PlacedCard) => nombrar(p.card);

function ideaLineal(facts: ReadingFacts, rng: () => number): string {
  const o = [...facts.placed].sort(byN);
  const clave = (p: PlacedCard) => p.keywords[0]!;
  const parts = [fill(pick(rng, templates.idea_inicio), { A: cap(nom(o[0]!)), clave: clave(o[0]!) })];
  for (const p of o.slice(1, -1)) parts.push(fill(pick(rng, templates.idea_paso), { a: nom(p), clave: clave(p) }));
  if (o.length > 1) parts.push(fill(pick(rng, templates.idea_fin), { a: nom(o.at(-1)!), clave: clave(o.at(-1)!) }));
  return parts.join(" ");
}

function panorama(facts: ReadingFacts, rng: () => number): string | null {
  const { proportions: pr, patterns: pt } = facts;
  const parts: string[] = [];
  if (pr.majorsDominant) parts.push(pick(rng, templates.panorama_mayores));
  if (pr.dominantSuit) parts.push(pick(rng, templates.panorama_palo[pr.dominantSuit]));
  if (pr.absentSuit) parts.push(pick(rng, templates.panorama_ausente[pr.absentSuit]));
  if (pt.people.length >= 2) parts.push(fill(pick(rng, templates.gente), { cartas: joinY(pt.people.map(nom)) }));
  if (pt.facets.length) parts.push(fill(pick(rng, templates.facetas), { cartas: joinY(pt.facets.map(nom)) }));
  if (pr.blocked) parts.push(pick(rng, templates.panorama_bloqueo));
  for (const r of pt.repeated) {
    const key = String(r.numero) as keyof typeof templates.patron_numero;
    parts.push(fill(pick(rng, templates.patron_numero[key]), { cartas: joinY(r.cartas.map(nom)) }));
  }
  if (pt.progression) parts.push(pick(rng, templates.progresion[pt.progression]));
  return parts.length ? parts.join(" ") : null;
}

function posicion(p: PlacedCard, facts: ReadingFacts, rng: () => number) {
  const lente = lensText(p.card, p.position.lente);
  const base = fill(pick(rng, templates.posicion_lente), { nombre: nom(p), Nombre: cap(nom(p)), posicion: p.position.nombre, texto: lente, texto_min: lowerFirst(lente) });
  const estadoTexto = p.estado === "trabada" ? p.card.en_desequilibrio : p.card.en_equilibrio;
  const estado = fill(pick(rng, templates.estado[p.estado]), { nombre: nom(p), texto: estadoTexto });
  const dominio = facts.domain && p.domainText ? " " + fill(pick(rng, templates.posicion_dominio[facts.domain]), { texto: p.domainText }) : "";
  return { titulo: `${p.position.n}. ${p.position.nombre}`, glosa: p.position.significado, texto: `${base} ${estado}${dominio}` };
}

function tensiones(facts: ReadingFacts, rng: () => number): string[] {
  const out: string[] = [];
  const c = facts.contrast;
  if (c) out.push(c.kind === "relaciones" ? pick(rng, templates.contraste_relaciones[c.winner]) : pick(rng, templates.contraste_camino[c.winner]));
  for (const t of facts.tensions) {
    out.push(fill(pick(rng, templates.tension[t.dignity]), { A: cap(nom(t.a)), b: nom(t.b), la: LENS_LABEL[t.a.position.lente], lb: LENS_LABEL[t.b.position.lente] }));
  }
  return out;
}

function resolucionCard(facts: ReadingFacts): PlacedCard {
  const o = [...facts.placed].sort(byN);
  return o.find((p) => p.position.lente === "consejo") ?? o.at(-1)!;
}

function sintesis(facts: ReadingFacts, rng: () => number): string {
  const parts: string[] = [];
  if (facts.yesNo) {
    const centro = facts.placed[Math.floor(facts.placed.length / 2)]!;
    const detalle = `${cap(nom(centro))}${centro.reversed ? " al revés" : ""} habla de ${centro.keywords.slice(0, 3).join(", ")}.`;
    parts.push(fill(pick(rng, templates.sino[facts.yesNo.verdict]), { detalle }));
    if (facts.yesNo.tiebreak) parts.push(pick(rng, templates.sino_desempate));
  }
  for (const c of facts.combos) {
    const pa = facts.placed.find((p) => p.card.id === c.a)!;
    const pb = facts.placed.find((p) => p.card.id === c.b)!;
    parts.push(fill(pick(rng, templates.combo), { texto: c.texto, a: nom(pa), b: nom(pb) }));
  }
  if (facts.quintessence) {
    parts.push(fill(pick(rng, templates.quintaesencia), { nombre: nombrar(facts.quintessence), palabras: facts.quintessence.palabras_clave_derecha.slice(0, 3).join(", ") }));
  }
  const r = resolucionCard(facts);
  const t = lensText(r.card, "consejo");
  parts.push(fill(pick(rng, templates.resolucion), { nombre: nom(r), Nombre: cap(nom(r)), texto: t, texto_min: lowerFirst(t) }));
  return parts.join(" ");
}

export function renderReading(facts: ReadingFacts, seed: number): ReadingText {
  const rng = rngFrom(seed);
  const apertura = facts.question ? fill(pick(rng, templates.apertura_pregunta), { pregunta: facts.question }) : pick(rng, templates.apertura);
  const d = facts.dominant;
  return {
    apertura,
    ideaLineal: ideaLineal(facts, rng),
    panorama: panorama(facts, rng),
    dominante: { titulo: cap(nom(d)), texto: fill(pick(rng, templates.dominante), { nombre: nom(d), Nombre: cap(nom(d)), posicion: d.position.nombre, texto: d.meaning }) },
    posiciones: facts.placed.map((p) => posicion(p, facts, rng)),
    grupos: facts.groups.map((g) => ({ titulo: g.nombre, texto: fill(pick(rng, templates.grupo), { grupo: g.nombre, claves: g.placed.map((p) => p.keywords[0]!).join(", ") }) })),
    tensiones: tensiones(facts, rng),
    respuesta: buildAnswer(facts, rng),
    sintesis: sintesis(facts, rng),
    consejo: fill(pick(rng, templates.consejo), { consejo: resolucionCard(facts).card.consejo }),
    espejo: fill(pick(rng, templates.reflexion), { pregunta: pick(rng, d.card.reflexion) }),
  };
}
```

`grupo` se mantiene (lo usa `grupos`). Borrar de `templates.json`: `hilo`, `estado` viejo, `posicion_derecha`, `posicion_invertida`, `sintesis`, `panorama_gente`, `panorama_numero`; renombrar `estado_nuevo` → `estado` y actualizar `templates.test.ts` (T8) a `estado.*`.

- [ ] **Step 4: `prose.ts`** — dejar solo `articulo`, `nombrar`, `cap`, `de` (y sus imports). `prose.test.ts` conserva solo el bloque «concordancia».

- [ ] **Step 5: Consumidores** — cambiar `import { renderReading } from "@/lib/tarot/prose"` por `@/lib/tarot/interpret/narrative` (y `ReadingText`) en todos los importadores.

- [ ] **Step 6: `ReadingView.tsx`** (orden de la spec §7; Brote; sin nombres del método)

```tsx
import SpreadLayout from "@/components/tarot/SpreadLayout";
import TarotCard from "@/components/tarot/TarotCard";
import EthicsNote from "@/components/tarot/EthicsNote";
import type { ReadingFacts } from "@/lib/tarot/reading";
import type { ReadingText } from "@/lib/tarot/interpret/narrative";
import { positionsFor } from "@/lib/tarot/spreads";

export default function ReadingView({ facts, text }: { facts: ReadingFacts; text: ReadingText }) {
  const positions = positionsFor(facts.spread, facts.placed.length);
  return (
    <div className="space-y-12">
      <SpreadLayout positions={positions} forma={facts.spread.forma} render={(_p, i) => <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size={facts.placed.length > 3 ? "sm" : "md"} priority={i === 0} />} />
      <section className="mx-auto max-w-[68ch] space-y-5 text-lg leading-relaxed text-tinta">
        <p>{text.apertura}</p>
        <p>{text.ideaLineal}</p>
        {text.panorama && <p className="text-suave">{text.panorama}</p>}
      </section>
      <section className="mx-auto max-w-[68ch] rounded-lg bg-papel p-6 shadow-card">
        <p className="text-sm font-semibold text-miel-800">La carta que más pesa</p>
        <h2 className="mt-1 text-xl font-bold text-bosque">{text.dominante.titulo}</h2>
        <p className="mt-2 text-tinta">{text.dominante.texto}</p>
      </section>
      <section className="mx-auto max-w-[68ch] space-y-8">
        {text.posiciones.map((p, i) => (
          <article key={p.titulo} className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <TarotCard card={facts.placed[i]!.card} reversed={facts.placed[i]!.reversed} size="sm" />
            <div>
              <h2 className="text-xl font-bold text-bosque">{p.titulo}</h2>
              <p className="mt-1 text-sm text-suave">{p.glosa}</p>
              <p className="mt-2 text-tinta">{p.texto}</p>
            </div>
          </article>
        ))}
      </section>
      {text.grupos.length > 0 && (
        <section className="mx-auto max-w-[68ch] space-y-3">
          <h2 className="text-xl font-bold text-bosque">Por grupos</h2>
          {text.grupos.map((g) => (
            <p key={g.titulo} className="text-tinta"><strong className="text-bosque">{g.titulo}.</strong> {g.texto}</p>
          ))}
        </section>
      )}
      {text.tensiones.length > 0 && (
        <section className="mx-auto max-w-[68ch] space-y-3">
          <h2 className="text-xl font-bold text-bosque">Cómo se relacionan</h2>
          {text.tensiones.map((t) => <p key={t} className="text-tinta">{t}</p>)}
        </section>
      )}
      <section className="mx-auto max-w-[68ch] space-y-4 rounded-lg bg-papel p-6 shadow-card">
        {text.respuesta && (
          <div>
            <h2 className="text-xl font-bold text-bosque">Sobre tu pregunta</h2>
            <p className="mt-2 text-tinta">{text.respuesta}</p>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-bosque">Síntesis</h2>
          <p className="mt-2 text-tinta">{text.sintesis}</p>
        </div>
        <p className="font-semibold text-miel-800">{text.consejo}</p>
        <p className="text-tinta">{text.espejo}</p>
      </section>
      <div className="mx-auto max-w-[68ch]"><EthicsNote /></div>
    </div>
  );
}
```

- [ ] **Step 7: Verificar** — `cd webApp && npx vitest run && npm run lint && npx tsc --noEmit 2>&1 | grep -E '^(src|e2e)/'` (vacío). Medir el exhaustivo; timeout ≈ 2× lo medido.
- [ ] **Step 8: Commit** — `feat(tarot): la lectura interpreta: idea lineal, dominante, lentes, tensiones y respuesta`.

---

### Task 11: Cierre: exposición, e2e, documentación, revisión

**Files:**
- Modify: `webApp/src/lib/tarot/exposicion.test.ts` (sumar `lenses.json`)
- Modify: `webApp/e2e/tarot.spec.ts`
- Modify: `docs/TAROT/fuente/revision.json` (`"pendiente"`, fecha del día)
- Modify: `docs/TAROT/fuente/PREGUNTAS-DUENA.md` (sumar: qué significa «Primera pregunta» en `consulta-situacion`; revisar lecturas por lente)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Exposición** — en `exposicion.test.ts`, importar `lenses from "./data/lenses.json"` y sumarlo al `blob` del test D2 y al recorrido de opuestos D4 (las lentes de una carta no deben contener los opuestos de sus palabras clave derechas). Run → PASS (si falla por contenido, reportar BLOCKED con los hits; no aflojar el test).
- [ ] **Step 2: e2e** (con `assertStackUp(request)` como el resto):

```ts
test("lectura con pregunta: interpreta y responde sobre la pregunta", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/lectura?t=cruz-celta&c=0.16.3.4.5.6.7.8.9.10&q=" + encodeURIComponent("¿Vuelve conmigo?"));
  await expect(page.getByRole("heading", { name: "Sobre tu pregunta" })).toBeVisible();
  await expect(page.getByText(/Vuelve conmigo/).first()).toBeVisible();
  await expect(page.getByText("La carta que más pesa")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cómo se relacionan" })).toBeVisible();
});
```

Correrlo con el stack local (`npx supabase status` arriba; Colima prendido): `cd webApp && npx playwright test e2e/tarot.spec.ts`. Si el stack no está, listarlo (`--list`) y anotarlo.

- [ ] **Step 3: CLAUDE.md** — en la fila de `webApp/src` sumar «interpretación por lentes en `src/lib/tarot/interpret/` (T-094)» y actualizar el total real de tests unitarios (medido). En «External dependencies» la línea de revisión de la dueña ya existe: confirmar que dice que bloquea la release del tarot.
- [ ] **Step 4: Verificación final** — `cd webApp && npx vitest run && npm run lint`, tsc fuera de `.next/`.
- [ ] **Step 5: Commit** — `test(tarot): no exposición en lentes, e2e de la respuesta y documentación`.

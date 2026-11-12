# Tarot con la fuente de la dueña · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que todo el tarot Rider-Waite del sitio (78 fichas, 9 tiradas, lecturas) derive del material del taller de Patricia González, con trazabilidad verificable por test.

**Architecture:** Dos capas. (1) `docs/TAROT/fuente/*.json`: extracción fiel de sus documentos, versionada, fuera del bundle. (2) `webApp/src/lib/tarot/data/*.json`: contenido del sitio reescrito en la voz del sitio, cada carta con `fuente` apuntando a la capa 1. El motor (`src/lib/tarot/`) suma grupos, casas, modo equilibrio/desequilibrio y reflexión; una migración amplía las tiradas válidas.

**Tech Stack:** Next.js 16 / React 19 / Tailwind 4, Zod, Vitest, Playwright, Postgres (PGlite en tests, `node:test`).

**Spec:** `docs/superpowers/specs/2026-11-12-tarot-fuente-duena-design.md` (leerla entera antes de cualquier tarea).

## Global Constraints

- Rama `dev`, local. Sin push, sin PR, sin merge a `main` (release la hace el orquestador con el PO).
- Originales en `docs/TAROT/*.doc|docx|pdf` están en `.gitignore`: **nunca** `git add -f` de esos archivos. Solo `docs/TAROT/fuente/` se versiona.
- D1: todo el contenido público del tarot se **reescribe** en la voz del sitio (vos, rioplatense, cálido, claro). Nada de giros de 1911 («hombre rubio», «esposa perfecta», «Waite no cita ningún significado»).
- D2: no exponer el método: ni «máscara de la esencia», ni «desequilibrio:», ni «equilibrio:» como rótulo, ni «preguntarse» en ningún texto público ni en `src/` (salvo tests que los citan para prohibirlos).
- D4: invertida = **mismo tema, atenuado, demorado o en proceso**; nunca el opuesto. `yes-no.ts` no cambia.
- Motor puro: sin IA, sin red, determinista por semilla. `src/lib/tarot/` no importa nada de `docs/` (solo los tests leen `docs/TAROT/fuente/` con `fs`).
- Diseño Brote (CLAUDE.md): tokens semánticos, sin emojis ni glifos-icono, contraste ≥ 4.5:1, `motion-reduce:` en transforms de hover.
- Rate limit (CLAUDE.md regla 11): ninguna export nueva en archivos `"use server"` sin `withRateLimit`.
- Migraciones aplicadas nunca se editan; la nueva es `0079`.
- Comandos: unit `cd webApp && npx vitest run <ruta>`; DB `cd webApp/supabase && node --test tests/<archivo>`; tipos `cd webApp && npx tsc --noEmit`; lint `cd webApp && npm run lint`.
- Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Modelo por tarea (lo elige el orquestador)

| Tareas | Modelo | Por qué |
|---|---|---|
| 2, 3, 4 (extracción) | Opus, esfuerzo alto | Transcripción fiel; un error es caro y silencioso |
| 6, 7 (reescritura) | Opus, esfuerzo alto | Voz, matiz, fidelidad de sentido |
| 1, 5, 8, 9, 10, 11, 12 | Sonnet | Esquema, motor, UI y tests mecánicos |

## File Structure

```
docs/TAROT/fuente/                       (nuevo, versionado)
  mayores.json                           22 arcanos, extracción fiel
  menores-bastos.json · -copas · -espadas · -oros
  tiradas.json                           7 tiradas de los diagramas + pautas + criterio de invertidas
  casas.json                             12 claves de casa («Primer escrito»)
  revision.json                          { estado, fecha } de la revisión de la dueña
webApp/src/lib/tarot/
  fuente.test.ts                         (nuevo) forma de la capa 1 + cobertura capa 2 -> capa 1
  exposicion.test.ts                     (nuevo) D2 y D4 sobre el contenido
  cards.ts                               + en_equilibrio, en_desequilibrio, reflexion, fuente; suitInfo()
  suits.ts · data/suits.json             (nuevo) correspondencias + narrativa por palo
  spreads.ts · data/spreads.json         10 slugs (9 activos + retirada), grupo, casa, forma
  reading.ts                             groups, contraste, modo por carta
  prose.ts · data/templates.json         estado, grupos, contraste, reflexión; invertida atenuada
  data/cards.json                        78 cartas reescritas
webApp/supabase/migrations/20261112120000_0079_tarot_spreads_duena.sql
webApp/supabase/tests/tarot-readings.test.mjs   + casos de 0079
webApp/src/components/tarot/SpreadLayout.tsx    rueda + lista móvil
webApp/src/components/tarot/ReadingView.tsx    grupos, contraste, reflexión
webApp/src/app/(marketing)/tarot/page.tsx, [tirada]/page.tsx, cartas/[slug]/page.tsx, actions.ts
webApp/src/app/sitemap.ts · webApp/next.config.ts · webApp/src/lib/server/tarot.ts
webApp/e2e/tarot.spec.ts
CLAUDE.md
```

Orden: 1 → (2, 3, 4 en paralelo) → 5 → (6, 7 en paralelo) → 8 → 9 → 10 → 11 → 12.
El esquema Zod de `cards.ts` no es estricto (descarta claves de más), así que escribir los campos nuevos en
`cards.json` (tareas 6-7) antes de declararlos en el esquema (tarea 8) no rompe nada.

---

### Task 1: Esquema de la fuente y test de forma

**Files:**
- Create: `webApp/src/lib/tarot/fuente-schema.ts`
- Create: `webApp/src/lib/tarot/fuente.test.ts`
- Create: `docs/TAROT/fuente/revision.json`

**Interfaces:**
- Produces: `fuenteSchemas` con `mayores`, `menores`, `tiradas`, `casas`; `FUENTE_DIR` (ruta absoluta a `docs/TAROT/fuente` desde `webApp`); `loadFuente(name)` que lee y parsea. Solo para tests: el archivo no lleva `import 'server-only'` porque no es server code, pero **ningún archivo no-test lo importa** (lo verifica el test de la tarea 12).

- [ ] **Step 1: Escribir el esquema**

```ts
// webApp/src/lib/tarot/fuente-schema.ts
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
```

- [ ] **Step 2: Escribir el test de forma (fallará: no hay archivos)**

```ts
// webApp/src/lib/tarot/fuente.test.ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FUENTE_DIR, fuenteSchemas, loadFuente, type FuenteName } from "./fuente-schema";

describe("capa 1: docs/TAROT/fuente", () => {
  for (const name of Object.keys(fuenteSchemas) as FuenteName[]) {
    it(`${name}.json existe y respeta su forma`, () => {
      expect(existsSync(join(FUENTE_DIR, `${name}.json`))).toBe(true);
      expect(() => loadFuente(name)).not.toThrow();
    });
  }

  it("los mayores van del 0 al 21 sin huecos", () => {
    expect(loadFuente("mayores").map((m) => m.numero)).toEqual([...Array(22).keys()]);
  });

  it("cada palo trae sus 14 cartas del 1 al 14", () => {
    for (const p of ["bastos", "copas", "espadas", "oros"] as const) {
      const nums = loadFuente(`menores-${p}`).cartas.map((c) => c.numero).sort((a, b) => a - b);
      expect(nums, p).toEqual([...Array(14).keys()].map((i) => i + 1));
    }
  });

  it("las posiciones de cada tirada van de 1 a N sin huecos", () => {
    for (const t of loadFuente("tiradas").tiradas) {
      expect(t.posiciones.map((p) => p.n), t.clave).toEqual(t.posiciones.map((_, i) => i + 1));
    }
  });
});
```

- [ ] **Step 3: Crear `revision.json`**

```json
{ "estado": "pendiente", "fecha": "2026-11-12" }
```

- [ ] **Step 4: Correr y ver que falla solo por los archivos que faltan**

Run: `cd webApp && npx vitest run src/lib/tarot/fuente.test.ts`
Expected: FAIL en `mayores`, `menores-*`, `tiradas`, `casas` («existe»); PASS en `revision`.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/tarot/fuente-schema.ts webApp/src/lib/tarot/fuente.test.ts docs/TAROT/fuente/revision.json
git commit -m "test(tarot): forma de la fuente extraída de la dueña"
```

El test queda rojo hasta las tareas 2-4: es intencional y se dice en el commit body si el hook lo pide.

---

### Task 2: Extracción de los arcanos mayores (Opus)

**Files:**
- Create: `docs/TAROT/fuente/mayores.json`

**Interfaces:**
- Consumes: esquema `mayor` de la tarea 1.
- Produces: 22 objetos `{ doc, seccion, numero, descripcion, desequilibrio, equilibrio, preguntas[], claves[], mascara }`.

Reglas de extracción (valen para las tareas 2-4):
- **Copia fiel**: el texto tal como está, sin corregir ortografía ni estilo, sin resumir. Solo se normalizan espacios repetidos y se quitan artefactos de Word (`HYPERLINK "…"`, `PAGE \* MERGEFORMAT`, números de página, encabezados «TALLER DE TAROT RIDER WAITE»).
- Nada se completa de memoria. Si un dato no está, el campo lleva `"(no figura en el documento)"`.
- `doc` = nombre del archivo; `seccion` = el nombre del arcano/carta.

- [ ] **Step 1: Convertir a texto**

```bash
mkdir -p "$TMPDIR/tarot-txt" && textutil -convert txt -output "$TMPDIR/tarot-txt/mayores.txt" "docs/TAROT/Módulo Arcanos Mayores.doc"
grep -c "Máscara de la esencia" "$TMPDIR/tarot-txt/mayores.txt"   # esperado: 22
```

- [ ] **Step 2: Segmentar por arcano**

El documento no trae el título de cada carta en el texto (eran imágenes). El orden es 0..21 (El Loco … El Mundo); cada bloque termina en «Máscara de la esencia: …». Dentro del bloque: descripción (todo antes de «Desequilibrio:»), `Desequilibrio:`, `Equilibrio:`, `Preguntarse:` (separar en preguntas por `?`), `Palabras claves` (siguiente línea, separar por `.`), `Máscara de la esencia:`. Verificar el orden contra la descripción (el bloque 1 describe al Mago con la lemniscata, el 2 a la Sacerdotisa con Tora, etc.). La introducción histórica previa al Loco no se extrae.

- [ ] **Step 3: Escribir `docs/TAROT/fuente/mayores.json`**

Forma de una entrada (ejemplo real, bloque 0, abreviado aquí solo en `descripcion`; en el archivo va completa):

```json
{
  "doc": "Módulo Arcanos Mayores.doc",
  "seccion": "0 · El Loco",
  "numero": 0,
  "descripcion": "Con paso ligero, como si la tierra y sus impedimentos no tuviesen el poder de limitarlo, …",
  "desequilibrio": "Opositor",
  "equilibrio": "Merecedor",
  "preguntas": ["¿Estás siguiendo tus sueños?", "¿Eres demasiado apasionado?", "…"],
  "claves": ["Inicio", "Aventura", "Inocencia", "Confianza ciega", "Entusiasmo", "Imprevisión"],
  "mascara": "Por naturaleza soy una persona tierna, llena de vida y de entusiasmo, …"
}
```

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/fuente.test.ts -t mayores`
Expected: PASS en «mayores.json existe…» y «los mayores van del 0 al 21».
Además, cotejo manual: elegir 3 arcanos al azar y comparar palabra por palabra `claves` y `desequilibrio/equilibrio` contra el `.doc`.

- [ ] **Step 5: Commit**

```bash
git add docs/TAROT/fuente/mayores.json
git commit -m "feat(tarot): fuente extraída de los arcanos mayores"
```

---

### Task 3: Extracción de los cuatro palos (Opus, 4 en paralelo o secuencial)

**Files:**
- Create: `docs/TAROT/fuente/menores-bastos.json`, `menores-copas.json`, `menores-espadas.json`, `menores-oros.json`

**Interfaces:**
- Consumes: esquema `palo` de la tarea 1.
- Produces: por palo `{ doc, palo, correspondencias{energia,cuerpo,elemento,reino,solido}, narrativa[10], cartas[14] }`.

Mismas reglas de extracción que la tarea 2.

- [ ] **Step 1: Convertir a texto**

```bash
for p in bastos copas Espadas Oros; do textutil -convert txt -output "$TMPDIR/tarot-txt/$p.txt" "docs/TAROT/Arcanos menores. $p.docx"; done
grep -c "Invertida" "$TMPDIR"/tarot-txt/{bastos,copas,Espadas,Oros}.txt   # esperado: 14 cada uno
```

- [ ] **Step 2: Extraer correspondencias y narrativa**

`correspondencias` sale de la lista «Simbolismo y equivalencia»: p. ej. copas → `energia: "Emoción"`, `cuerpo: "Cuerpo Emocional"`, `elemento: "Elemento Agua"`, `reino: "Reino Animal"`, `solido: "Icosaedro (Sólidos platónicos)"` (texto tal cual). `narrativa` = el párrafo del As al Diez partido en 10 tramos, uno por carta, cortando en cada «(N de Palo)» y dejando el paréntesis dentro del tramo.

- [ ] **Step 3: Extraer las 14 cartas**

Cada carta: título («Rey de Copas», «As de Copas»…) → `seccion`; `numero` (As 1 … Diez 10, Sota 11, Caballo 12, Reina 13, Rey 14); `imagen` = descripción antes de «Significados adivinatorios»; `significados` = desde «Significados adivinatorios:» hasta «Invertida:» (sin el rótulo); `invertida` = después de «Invertida:» (sin el rótulo).

```json
{
  "doc": "Arcanos menores. copas.docx",
  "seccion": "Dos de Copas",
  "numero": 2,
  "imagen": "Un joven y una joven están brindando juntos. Sobre sus copas aparece el Caduceo de Hermes: …",
  "significados": "Amor, pasión, amistad, afinidad, unión, concordia, simpatía, …",
  "invertida": "Waite no cita ningún significado."
}
```

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/fuente.test.ts -t "menores|palo"`
Expected: PASS en los cuatro `menores-*.json` y en «cada palo trae sus 14 cartas».
Cotejo manual: una figura y un número por palo contra el `.docx`.

- [ ] **Step 5: Commit**

```bash
git add docs/TAROT/fuente/menores-*.json
git commit -m "feat(tarot): fuente extraída de los cuatro palos"
```

---

### Task 4: Extracción de tiradas y casas (Opus)

**Files:**
- Create: `docs/TAROT/fuente/tiradas.json`, `docs/TAROT/fuente/casas.json`

**Interfaces:**
- Produces: `tiradas.tiradas[]` con `clave` en {`cruz-simple`, `consulta-situacion`, `cruz-celta`, `pregunta-situacion`, `karma`, `relaciones`, `astrologica`} y posiciones con `x,y,rotada,grupo`; `casas.casas[12]`.

- [ ] **Step 1: Leer los diagramas**

Los diagramas son imágenes; el texto no los contiene. Renderizar `docs/TAROT/TIRADAS.pdf` páginas 3-6 a PNG (PDFKit vía `swift`, o `qlmanage -t`) y leerlas. `pautas` y `criterio_invertidas` salen de `textutil` sobre `TIRADAS.doc` (los párrafos «Pautas» y el de «Para algunos intérpretes las cartas invertidas…» hasta el ejemplo del Sol inclusive).

- [ ] **Step 2: Escribir `tiradas.json` con estas posiciones (leídas de los diagramas; `etiqueta` literal del diagrama)**

| clave | n · etiqueta · (x,y) · grupo · rotada |
|---|---|
| cruz-simple (grilla) | 1 pasado (0,1) · 2 futuro (2,1) · 3 información del pasado (1,0) · 4 información del futuro (1,2) · 5 presente (1,1) |
| consulta-situacion (grilla) | 1 A favor (0,1) · 2 Oposiciones (2,1) · 3 Pregunta (1,0) · 4 Síntesis (1,1) · 5 Primera pregunta (1,2) |
| cruz-celta (grilla) | 1 Situación actual. Parte oculta del consultante (1,1) · 2 Influencias-obstáculos. Reto inmediato. Facilidades. Cómo actúa ante el problema (1,1, **rotada**) · 3 Objetivos, deseos, posible solución (1,0) · 4 Pasado-consecuencias hoy. Raíz del problema. Incluye eventos (2,1) · 5 Personas que te apoyan, situaciones a favor. Pasado cercano (1,2) · 6 Posibilidades, alternativas, caminos disponibles. Futuro cercano (0,1) · 7 Esperanzas, recursos. Sentimientos, reacción del consultante (3,3) · 8 Obstáculos que se pueden presentar, personas, entorno familiar (3,2) · 9 Miedos y temores, emociones internas (3,1) · 10 Conclusión, consejo (3,0) |
| pregunta-situacion (grilla 7×7) | 1 Carta base (3,3) · grupo `si-continua` «Resultado si continúa en la situación actual»: 2 (2,2) · 6 (1,1) · 10 (0,0) · grupo `si-cambia` «Resultado si introduce un cambio»: 5 (4,2) · 9 (5,1) · 13 (6,0) · grupo `pasado-reciente` «Influencia del pasado reciente»: 3 (2,4) · 7 (1,5) · 11 (0,6) · grupo `karmica` «Influencia kármica a largo plazo»: 4 (4,4) · 8 (5,5) · 12 (6,6) |
| karma (grilla) | 1 Consultante (1,0) · 2 Karma que debe cumplir (1,1, **rotada**) · 3, 4, 5 ¿Cómo se manifiesta ese karma? (0,2) (1,2) (2,2), grupo `manifestacion` · 6 ¿Qué situaciones debo vivir? (0,3) · 7 ¿Qué es lo que debo aprender? (1,3) · 8 Consejo de la Esencia Divina (2,3, **rotada**) |
| relaciones (grilla) | grupo `a` «Persona A»: 1 (0,0) · 3 (1,0) · 5 (2,0) · grupo `b` «Persona B»: 2 (0,1) · 4 (1,1) · 6 (2,1). Etiqueta de cada posición: «Persona A» / «Persona B» (el diagrama no nombra columnas) |
| astrologica (rueda) | 1..12, etiqueta «Casa N» (N en romanos), `x = n-1`, `y = 0` (la rueda la calcula la UI) |

- [ ] **Step 3: Escribir `casas.json`**

`textutil` sobre `docs/TAROT/Primer escrito.doc`; sección «CASAS». Cada casa trae una clave en mayúsculas y un subtítulo (tal cual del documento):

| casa | clave | subtitulo |
|---|---|---|
| 1 | IDENTIDAD | Proyección de la persona |
| 2 | VALORES | Autoestima y bienes materiales |
| 3 | CONOCIMIENTO | Desarrollo mental |
| 4 | SEGURIDAD | Entorno emocional íntimo |
| 5 | CREATIVIDAD | Experiencia |
| 6 | DEBER | Integración práctica |
| 7 | COOPERACIÓN | Relaciones |
| 8 | REGENERACIÓN | Recursos ocultos |
| 9 | ASPIRACIÓN | El sentido de la vida |
| 10 | HONOR | Lo conseguido |
| 11 | CONCIENCIA SOCIAL | Compromiso social |
| 12 | SUBCONCIENCIA | Disolución |

Confirmar cada fila contra el texto antes de escribir (la tabla de arriba es la lectura del orquestador; si el documento difiere, gana el documento y se avisa).

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/fuente.test.ts`
Expected: PASS completo (todas las capas 1 presentes).

- [ ] **Step 5: Commit**

```bash
git add docs/TAROT/fuente/tiradas.json docs/TAROT/fuente/casas.json
git commit -m "feat(tarot): fuente extraída de las tiradas y las casas"
```

---

### Task 5: Migración 0079: tiradas válidas en la base

**Files:**
- Create: `webApp/supabase/migrations/20261112120000_0079_tarot_spreads_duena.sql`
- Modify: `webApp/supabase/tests/tarot-readings.test.mjs` (casos nuevos al final del `describe`)

**Interfaces:**
- Produces: `tarot_readings.spread_id` acepta `carta-del-dia, si-o-no, pasado-presente-futuro, cruz-celta, cruz-simple, consulta-situacion, pregunta-situacion, karma, relaciones, astrologica`. Cantidades: 1 · 1|3 · 3 · 10 · 5 · 5 · 13 · 8 · 6 · 12.

- [ ] **Step 1: Tests que fallan**

Agregar dentro del `describe('tarot_readings', …)`:

```js
  const cartas = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ i, r: false })));

  for (const [spread, n] of [['cruz-simple', 5], ['consulta-situacion', 5], ['pregunta-situacion', 13], ['karma', 8], ['relaciones', 6], ['astrologica', 12]]) {
    test(`0079 · ${spread} acepta ${n} cartas`, async () => {
      const r = await save(db, asStudent, { spread, cards: cartas(n) });
      assert.equal(r.ok, true, r.message);
    });
    test(`0079 · ${spread} rechaza ${n - 1} cartas`, async () => {
      const r = await save(db, asStudent, { spread, cards: cartas(n - 1) });
      assert.equal(r.ok, false);
      assert.equal(r.code, '23514');
    });
  }

  test('0079 · la retirada pasado-presente-futuro sigue siendo válida para filas existentes', async () => {
    const r = await save(db, asStudent, { spread: 'pasado-presente-futuro', cards: cartas(3) });
    assert.equal(r.ok, true, r.message);
  });

  test('0079 · un slug desconocido se rechaza', async () => {
    const r = await save(db, asStudent, { spread: 'herradura', cards: cartas(7) });
    assert.equal(r.ok, false);
    assert.equal(r.code, '23514');
  });
```

Run: `cd webApp/supabase && node --test tests/tarot-readings.test.mjs`
Expected: FAIL en los «acepta» de las 6 tiradas nuevas.

- [ ] **Step 2: Escribir la migración**

Copia íntegra de `guard_tarot_readings()` de `0071` con el `case` ampliado (las migraciones aplicadas no se editan; esta la reemplaza):

```sql
-- Tarot · tiradas de la dueña (spec 2026-11-12). Amplía el CHECK y la cantidad de cartas del guard.
-- pasado-presente-futuro queda: hay filas guardadas con ese slug y la app ya no lo ofrece.

alter table public.tarot_readings drop constraint tarot_readings_spread_id_check;
alter table public.tarot_readings add constraint tarot_readings_spread_id_check
  check (spread_id in (
    'carta-del-dia', 'si-o-no', 'pasado-presente-futuro', 'cruz-celta',
    'cruz-simple', 'consulta-situacion', 'pregunta-situacion', 'karma', 'relaciones', 'astrologica'
  ));

create or replace function public.guard_tarot_readings()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  expected int[];
  n int;
  elem jsonb;
  idx int;
  seen int[] := '{}';
begin
  if public.body_has_known_locator(coalesce(new.question, '')) then
    raise exception 'la pregunta contiene un localizador de contenido pago'
      using errcode = '42501';
  end if;

  new.user_id := (select auth.uid());
  if new.user_id is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;

  expected := case new.spread_id
    when 'carta-del-dia' then array[1]
    when 'si-o-no' then array[1, 3]
    when 'pasado-presente-futuro' then array[3]
    when 'cruz-celta' then array[10]
    when 'cruz-simple' then array[5]
    when 'consulta-situacion' then array[5]
    when 'pregunta-situacion' then array[13]
    when 'karma' then array[8]
    when 'relaciones' then array[6]
    when 'astrologica' then array[12]
    else null
  end;
  if expected is null then
    raise exception 'tirada desconocida' using errcode = '23514';
  end if;

  if jsonb_typeof(new.cards) <> 'array' then
    raise exception 'cards debe ser un array' using errcode = '23514';
  end if;
  n := jsonb_array_length(new.cards);
  if not (n = any (expected)) then
    raise exception 'cantidad de cartas inválida para %', new.spread_id using errcode = '23514';
  end if;

  -- PostgREST inserta sin pasar por el rate limit de la app: este tope es el respaldo.
  if (select count(*) from public.tarot_readings where user_id = new.user_id) >= 1000 then
    raise exception 'límite de tiradas guardadas' using errcode = '23514';
  end if;

  for elem in select * from jsonb_array_elements(new.cards) loop
    if jsonb_typeof(elem) <> 'object' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if elem - 'i' - 'r' <> '{}'::jsonb then
      raise exception 'carta con claves de más' using errcode = '23514';
    end if;
    if coalesce(jsonb_typeof(elem -> 'i'), '') <> 'number' or coalesce(jsonb_typeof(elem -> 'r'), '') <> 'boolean' then
      raise exception 'carta mal formada' using errcode = '23514';
    end if;
    if (elem ->> 'i') !~ '^[0-9]{1,2}$' then
      raise exception 'índice de carta inválido' using errcode = '23514';
    end if;
    idx := (elem ->> 'i')::int;
    if idx > 77 then
      raise exception 'índice de carta fuera de rango' using errcode = '23514';
    end if;
    if idx = any (seen) then
      raise exception 'carta repetida' using errcode = '23514';
    end if;
    seen := seen || idx;
    if (elem ->> 'r')::boolean and (not new.reversed_enabled or new.spread_id = 'carta-del-dia') then
      raise exception 'invertida no admitida' using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.guard_tarot_readings() from public;
```

Antes de escribirla, confirmar el nombre del CHECK: `grep -n "spread_id_check" webApp/supabase/tests/*.mjs` o, en PGlite, `select conname from pg_constraint where conrelid = 'public.tarot_readings'::regclass`. Si el nombre difiere, usar el real. Confirmar también que `0071` revoca `execute` igual (lo hace con `revoke execute on all functions … from public`); si algún test de superficie (`security-surface`, hash de cuerpo de función) compara contra una lista, actualizarla en el mismo commit.

- [ ] **Step 3: Correr**

Run: `cd webApp/supabase && node --test tests/tarot-readings.test.mjs`
Expected: PASS todo.
Run: `cd webApp/supabase && npm test`
Expected: PASS (los 966 + los nuevos).

- [ ] **Step 4: Commit**

```bash
git add webApp/supabase/migrations/20261112120000_0079_tarot_spreads_duena.sql webApp/supabase/tests/tarot-readings.test.mjs
git commit -m "feat(tarot): 0079, la base acepta las tiradas de la dueña"
```

---

### Task 6: Reescritura de los 22 mayores (Opus)

**Files:**
- Modify: `webApp/src/lib/tarot/data/cards.json` (índices 0-21)
- Create: `webApp/src/lib/tarot/contenido.test.ts`

**Interfaces:**
- Consumes: `docs/TAROT/fuente/mayores.json`.
- Produces: en cada carta, además de los campos actuales, `en_equilibrio: string`, `en_desequilibrio: string`, `reflexion: string[]` (2-3), `fuente: string` con formato `mayores#<numero>`.

Reglas de reescritura (valen para las tareas 6 y 7):
- Base = la fuente de la dueña. Lo propio del motor (amor/trabajo/dinero/salud, consejo, si_no, astrología, letra hebrea, numerología, `waite_divinatory`) **se conserva** y solo se toca si contradice la fuente.
- Voz del sitio: vos, rioplatense, frases claras, sin tecnicismos esotéricos sin explicar, sin fatalismo.
- `significado_derecha` (≥ 80 caracteres): desde `descripcion` + `claves` + `equilibrio` de la fuente.
- `significado_invertida` (≥ 60): **el mismo tema atenuado, demorado o en proceso** (criterio de la dueña, D4). Ejemplo para el Sol: «Invertido, el Sol no apaga lo que promete: avisa que todavía falta…». Nunca el opuesto.
- `palabras_clave_derecha` (≥ 5): desde `claves`. `palabras_clave_invertida` (≥ 5): versiones atenuadas («éxito demorado», «inicio que se posterga»), no antónimos.
- `en_equilibrio` / `en_desequilibrio` (80-300 caracteres cada uno): la energía bien llevada y trabada, desde `equilibrio`/`desequilibrio` + `mascara`. **Sin** las palabras «máscara», «esencia» como rótulo, «equilibrio:»/«desequilibrio:», ni la primera persona de la máscara.
- `reflexion` (2-3): preguntas reescritas desde `preguntas`, en voseo («¿Estás siguiendo…?»), cada una ≤ 120 caracteres.
- `descripcion_imagen`: desde `descripcion` (la parte que describe la imagen), reescrita.
- Nada de «Waite afirma», «según Waite» en los campos en castellano; `waite_divinatory` (inglés, dominio público) no se toca.

- [ ] **Step 1: Test de contenido que falla**

```ts
// webApp/src/lib/tarot/contenido.test.ts
import { describe, expect, it } from "vitest";
import raw from "./data/cards.json";
import { loadFuente } from "./fuente-schema";

type Raw = { indice: number; id: string; arcano: string; palo: string | null; numero: number; fuente?: string; en_equilibrio?: string; en_desequilibrio?: string; reflexion?: string[] };
const cards = raw as Raw[];

const NUM_A_FUENTE: Record<number, string> = { 11: "sota", 12: "caballo", 13: "reina", 14: "rey" };

function fuenteEsperada(c: Raw): string {
  if (c.arcano === "mayor") return `mayores#${c.numero}`;
  return `${c.palo}#${NUM_A_FUENTE[c.numero] ?? c.numero}`;
}

describe("capa 2 -> capa 1", () => {
  const grupos = { mayores: cards.filter((c) => c.arcano === "mayor"), bastos: cards.filter((c) => c.palo === "bastos"), copas: cards.filter((c) => c.palo === "copas"), espadas: cards.filter((c) => c.palo === "espadas"), oros: cards.filter((c) => c.palo === "oros") };

  for (const [grupo, lista] of Object.entries(grupos)) {
    it(`${grupo}: cada carta apunta a su entrada de la fuente`, () => {
      for (const c of lista) expect(c.fuente, c.id).toBe(fuenteEsperada(c));
    });
    it(`${grupo}: trae en_equilibrio, en_desequilibrio y 2-3 preguntas de reflexión`, () => {
      for (const c of lista) {
        expect(c.en_equilibrio?.length ?? 0, c.id).toBeGreaterThanOrEqual(80);
        expect(c.en_desequilibrio?.length ?? 0, c.id).toBeGreaterThanOrEqual(80);
        expect(c.reflexion?.length ?? 0, c.id).toBeGreaterThanOrEqual(2);
        expect(c.reflexion?.length ?? 0, c.id).toBeLessThanOrEqual(3);
        for (const q of c.reflexion ?? []) expect(q, c.id).toMatch(/^¿.+\?$/);
      }
    });
  }

  it("las referencias resuelven en la fuente", () => {
    const mayores = loadFuente("mayores");
    for (const c of grupos.mayores) expect(mayores.some((m) => `mayores#${m.numero}` === c.fuente)).toBe(true);
    for (const p of ["bastos", "copas", "espadas", "oros"] as const) {
      const f = loadFuente(`menores-${p}`);
      for (const c of grupos[p]) expect(f.cartas.some((m) => `${p}#${NUM_A_FUENTE[m.numero] ?? m.numero}` === c.fuente), c.id).toBe(true);
    }
  });
});
```

Run: `cd webApp && npx vitest run src/lib/tarot/contenido.test.ts -t mayores`
Expected: FAIL («fuente» undefined).

- [ ] **Step 2: Reescribir los 22 mayores en `cards.json`**

Editar solo las entradas `indice` 0-21, siguiendo las reglas de arriba. No reordenar el array ni cambiar `indice`, `id`, `numero`, `nombre_*`.

- [ ] **Step 3: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/contenido.test.ts -t mayores && npx vitest run src/lib/tarot/cards.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/lib/tarot/data/cards.json webApp/src/lib/tarot/contenido.test.ts
git commit -m "feat(tarot): los 22 mayores reescritos desde la fuente de la dueña"
```

---

### Task 7: Reescritura de los 56 menores, suits.json y templates.json (Opus)

**Files:**
- Modify: `webApp/src/lib/tarot/data/cards.json` (índices 22-77)
- Create: `webApp/src/lib/tarot/data/suits.json`
- Modify: `webApp/src/lib/tarot/data/templates.json` (claves existentes)

**Interfaces:**
- Consumes: `docs/TAROT/fuente/menores-*.json`; reglas de la tarea 6.
- Produces: `fuente` con formato `<palo>#<1..10|sota|caballo|reina|rey>`; `suits.json` con la forma de abajo.

Particular de los menores:
- `en_equilibrio` desde `significados`; `en_desequilibrio` desde `invertida` **reinterpretada con D4** (si la fuente dice «Waite no cita ningún significado», se deriva del propio tema atenuado).
- `reflexion`: no hay preguntas en la fuente de menores; se derivan de la narrativa del palo y de los significados (2 preguntas).
- Las figuras ya no describen a la persona por color de pelo, estado civil ni género prescriptivo: «una persona de agua: sensible, creativa, que cuida».

- [ ] **Step 1: Escribir `suits.json`**

```json
[
  { "palo": "bastos", "cuerpo": "vital", "elemento": "fuego", "reino": "<de la fuente>", "solido": "tetraedro", "narrativa": "<viaje del As al Diez reescrito, 400-900 caracteres>", "fuente": "menores-bastos" },
  { "palo": "copas", "cuerpo": "emocional", "elemento": "agua", "reino": "<de la fuente>", "solido": "icosaedro", "narrativa": "…", "fuente": "menores-copas" },
  { "palo": "espadas", "cuerpo": "mental", "elemento": "aire", "reino": "<de la fuente>", "solido": "octaedro", "narrativa": "…", "fuente": "menores-espadas" },
  { "palo": "oros", "cuerpo": "físico", "elemento": "tierra", "reino": "<de la fuente>", "solido": "cubo", "narrativa": "…", "fuente": "menores-oros" },
  { "palo": "mayores", "cuerpo": "espiritual", "elemento": "cosmos", "reino": "—", "solido": "dodecaedro", "narrativa": "<los mayores como el viaje del Loco al Mundo, 400-900>", "fuente": "mayores" }
]
```

`reino` en minúscula tomado de `correspondencias.reino` de cada fuente (p. ej. «Reino Animal» → «animal»). Los `<…>` de este bloque son contenido a producir por esta tarea, no placeholders del plan.

- [ ] **Step 2: Reescribir las 56 cartas** (índices 22-77), un palo por vez, corriendo el test del palo al terminar cada uno:

Run: `cd webApp && npx vitest run src/lib/tarot/contenido.test.ts -t copas` (y `bastos`, `espadas`, `oros`)
Expected: PASS por palo.

- [ ] **Step 3: Reescribir las claves existentes de `templates.json`**

- `posicion_invertida` (3 variantes): narrar la invertida como presente pero atenuada o en proceso. Mismos marcadores que hoy (`{nombre}`, `{Nombre}`, `{posicion}`, `{significado}`).
- `panorama_mayores` (3): nombrar «lo cósmico» o «lo espiritual».
- `panorama_palo.{bastos,copas,espadas,oros}` (3 c/u): nombrar el cuerpo del palo («lo vital», «lo emocional», «lo mental», «lo físico»).
- `panorama_bloqueo` (3): «muchas cartas invertidas: lo que se mueve todavía está en proceso», no «está bloqueado para siempre».
- Resto de claves: revisar que no contradigan D4; si no contradicen, no tocarlas.

Run: `cd webApp && npx vitest run src/lib/tarot/prose.test.ts`
Expected: PASS (las variantes siguen ≥ 3 y sin marcadores sueltos).

- [ ] **Step 4: Verificar todo**

Run: `cd webApp && npx vitest run src/lib/tarot/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/tarot/data/cards.json webApp/src/lib/tarot/data/suits.json webApp/src/lib/tarot/data/templates.json
git commit -m "feat(tarot): los 56 menores, los palos y la prosa con el criterio de la dueña"
```

---

### Task 8: Esquema de cartas y palos

**Files:**
- Modify: `webApp/src/lib/tarot/cards.ts`
- Create: `webApp/src/lib/tarot/suits.ts`
- Modify: `webApp/src/lib/tarot/cards.test.ts`

**Interfaces:**
- Produces: `Card` con `en_equilibrio: string`, `en_desequilibrio: string`, `reflexion: string[]`, `fuente: string`. `type SuitKey = Suit | "mayores"`; `type SuitInfo = { palo: SuitKey; cuerpo: string; elemento: string; reino: string; solido: string; narrativa: string; fuente: string }`; `suitInfo(card: Card): SuitInfo`; `SUITS_INFO: readonly SuitInfo[]`.

- [ ] **Step 1: Tests que fallan** (agregar a `cards.test.ts`)

```ts
import { suitInfo } from "./suits";

it("toda carta trae los campos de la fuente", () => {
  for (const c of CARDS) {
    expect(c.en_equilibrio.length, c.id).toBeGreaterThanOrEqual(80);
    expect(c.en_desequilibrio.length, c.id).toBeGreaterThanOrEqual(80);
    expect(c.reflexion.length, c.id).toBeGreaterThanOrEqual(2);
    expect(c.fuente, c.id).toMatch(/^(mayores|bastos|copas|espadas|oros)#/);
  }
});

it("suitInfo da el palo de la carta o mayores", () => {
  expect(suitInfo(cardBySlug("el-loco")!).palo).toBe("mayores");
  expect(suitInfo(cardBySlug("as-de-copas")!).cuerpo).toBe("emocional");
  expect(suitInfo(cardBySlug("as-de-copas")!).solido).toBe("icosaedro");
});
```

Run: `cd webApp && npx vitest run src/lib/tarot/cards.test.ts`
Expected: FAIL (tipos / `suits` inexistente).

- [ ] **Step 2: Implementar**

En `cards.ts`, sumar al `cardSchema`:

```ts
  en_equilibrio: z.string().min(80),
  en_desequilibrio: z.string().min(80),
  reflexion: z.array(z.string().regex(/^¿.+\?$/)).min(2).max(3),
  fuente: z.string().regex(/^(mayores|bastos|copas|espadas|oros)#(\d{1,2}|sota|caballo|reina|rey)$/),
```

`suits.ts`:

```ts
import { z } from "@/lib/validation/zod";
import raw from "./data/suits.json";
import type { Card, Suit } from "./cards";

export type SuitKey = Suit | "mayores";

const suitSchema = z.object({
  palo: z.enum(["bastos", "copas", "espadas", "oros", "mayores"]),
  cuerpo: z.string().min(1),
  elemento: z.string().min(1),
  reino: z.string().min(1),
  solido: z.string().min(1),
  narrativa: z.string().min(200),
  fuente: z.string().min(1),
});

export type SuitInfo = z.infer<typeof suitSchema>;

export const SUITS_INFO: readonly SuitInfo[] = z.array(suitSchema).length(5).parse(raw);

const BY_KEY = new Map(SUITS_INFO.map((s) => [s.palo, s]));

export function suitInfo(card: Card): SuitInfo {
  return BY_KEY.get(card.palo ?? "mayores")!;
}
```

- [ ] **Step 3: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/ && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/lib/tarot/cards.ts webApp/src/lib/tarot/suits.ts webApp/src/lib/tarot/cards.test.ts
git commit -m "feat(tarot): esquema con los campos de la fuente y los palos"
```

---

### Task 9: Tiradas de la dueña en el motor

**Files:**
- Modify: `webApp/src/lib/tarot/spreads.ts`, `webApp/src/lib/tarot/data/spreads.json`, `webApp/src/lib/tarot/spreads.test.ts`

**Interfaces:**
- Produces:
  - `SPREAD_SLUGS = ["carta-del-dia","si-o-no","cruz-simple","consulta-situacion","cruz-celta","pregunta-situacion","karma","relaciones","astrologica","pasado-presente-futuro"]`.
  - `Position` suma `grupo: string | null` y `casa: number | null`.
  - `Spread` suma `forma: "grilla" | "rueda"`, `retirada: boolean`, `grupos: { clave: string; nombre: string }[]`, `fuente: string | null` (clave en `tiradas.json`; `null` para carta del día y sí/no).
  - `activeSpreads(): Spread[]` (excluye `retirada`).

- [ ] **Step 1: Tests que fallan** (reemplazar el primer `it` de `spreads.test.ts` y sumar)

```ts
import { activeSpreads, SPREADS, positionsFor, spreadBySlug } from "./spreads";
import { loadFuente } from "./fuente-schema";

it("ofrece las nueve tiradas activas en orden", () => {
  expect(activeSpreads().map((s) => s.slug)).toEqual(["carta-del-dia", "si-o-no", "cruz-simple", "consulta-situacion", "cruz-celta", "pregunta-situacion", "karma", "relaciones", "astrologica"]);
});

it("pasado-presente-futuro sigue existiendo pero retirada", () => {
  expect(spreadBySlug("pasado-presente-futuro")?.retirada).toBe(true);
  expect(SPREADS).toHaveLength(10);
});

it("cada tirada de la dueña coincide con su fuente en cantidad, orden, rotación y grupo", () => {
  const fuente = loadFuente("tiradas").tiradas;
  for (const s of activeSpreads().filter((x) => x.fuente)) {
    const f = fuente.find((t) => t.clave === s.fuente)!;
    expect(s.cartas, s.slug).toEqual([f.posiciones.length]);
    expect(s.forma, s.slug).toBe(f.forma);
    expect(s.posiciones.map((p) => [p.n, p.rotada, p.grupo]), s.slug).toEqual(f.posiciones.map((p) => [p.n, p.rotada, p.grupo]));
    if (s.forma === "grilla") expect(s.posiciones.map((p) => [p.x, p.y]), s.slug).toEqual(f.posiciones.map((p) => [p.x, p.y]));
  }
});

it("la astrológica lleva la casa 1..12 en cada posición", () => {
  expect(spreadBySlug("astrologica")!.posiciones.map((p) => p.casa)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

it("relaciones no nombra columnas: solo Persona A / Persona B", () => {
  expect(spreadBySlug("relaciones")!.posiciones.map((p) => p.nombre)).toEqual(["Persona A", "Persona B", "Persona A", "Persona B", "Persona A", "Persona B"]);
});
```

Run: `cd webApp && npx vitest run src/lib/tarot/spreads.test.ts`
Expected: FAIL.

- [ ] **Step 2: Esquema en `spreads.ts`**

```ts
export const SPREAD_SLUGS = ["carta-del-dia", "si-o-no", "cruz-simple", "consulta-situacion", "cruz-celta", "pregunta-situacion", "karma", "relaciones", "astrologica", "pasado-presente-futuro"] as const;

const positionSchema = z.object({
  n: z.number().int().min(1),
  nombre: z.string().min(1),
  significado: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  rotada: z.boolean(),
  grupo: z.string().min(1).nullable(),
  casa: z.number().int().min(1).max(12).nullable(),
});

const spreadSchema = z.object({
  slug: z.enum(SPREAD_SLUGS),
  nombre: z.string().min(1),
  descripcion: z.string().min(1),
  cartas: z.array(z.number().int().min(1)).min(1),
  allowReversed: z.boolean(),
  forma: z.enum(["grilla", "rueda"]),
  retirada: z.boolean(),
  fuente: z.enum(["cruz-simple", "consulta-situacion", "cruz-celta", "pregunta-situacion", "karma", "relaciones", "astrologica"]).nullable(),
  grupos: z.array(z.object({ clave: z.string().min(1), nombre: z.string().min(1) })),
  posiciones: z.array(positionSchema).min(1),
});

export const SPREADS: readonly Spread[] = z.array(spreadSchema).length(10).parse(raw);

export function activeSpreads(): Spread[] {
  return SPREADS.filter((s) => !s.retirada);
}
```

(`spreadBySlug`, `isSpreadSlug`, `positionsFor` quedan iguales.)

- [ ] **Step 3: Escribir `spreads.json`**

- `carta-del-dia`, `si-o-no`: como hoy + `"forma": "grilla", "retirada": false, "fuente": null, "grupos": []` y en cada posición `"grupo": null, "casa": null`.
- `pasado-presente-futuro`: como hoy + `"retirada": true`, mismos agregados.
- Las 7 de la dueña: `x`, `y`, `rotada`, `grupo` exactamente como en `docs/TAROT/fuente/tiradas.json`. `nombre` de cada posición = la etiqueta reescrita corta (≤ 40 caracteres); `significado` = una frase en la voz del sitio que la explica (≤ 140). `relaciones`: `nombre` «Persona A»/«Persona B», `significado` «Cómo se vive el vínculo desde la persona A» / «…desde la persona B». `astrologica`: `nombre` «Casa I · Identidad» … «Casa XII · Subconciencia» (clave en minúscula con mayúscula inicial), `significado` desde el `subtitulo` de `casas.json` reescrito, `casa` = n. `grupos` con nombre visible: `pregunta-situacion` → `si-continua` «Si seguís igual», `si-cambia` «Si introducís un cambio», `pasado-reciente` «Lo que viene del pasado reciente», `karmica` «Lo kármico, a largo plazo»; `karma` → `manifestacion` «Cómo se manifiesta»; `relaciones` → `a` «Persona A», `b` «Persona B».
- `allowReversed: true` en las 7. `descripcion` de cada tirada ≤ 160 caracteres, en la voz del sitio.

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/`
Expected: PASS salvo `prose.test.ts` si el exhaustivo tarda o falla por posiciones nuevas: si falla, el fallo es real y se corrige en la tarea 10 (anotarlo); si pasa, mejor.
Run: `cd webApp && npx tsc --noEmit`
Expected: errores solo en consumidores de `SPREADS` que la tarea 11 cambia; si hay, se listan y se corrigen allá.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/tarot/spreads.ts webApp/src/lib/tarot/data/spreads.json webApp/src/lib/tarot/spreads.test.ts
git commit -m "feat(tarot): las siete tiradas de la dueña en el motor"
```

---

### Task 10: Lectura con grupos, contraste, modo y reflexión

**Files:**
- Modify: `webApp/src/lib/tarot/reading.ts`, `webApp/src/lib/tarot/reading.test.ts`
- Modify: `webApp/src/lib/tarot/prose.ts`, `webApp/src/lib/tarot/prose.test.ts`, `webApp/src/lib/tarot/data/templates.json` (claves nuevas)

**Interfaces:**
- Consumes: `Position.grupo`, `Spread.grupos`, `Card.en_equilibrio/en_desequilibrio/reflexion`.
- Produces:
  - `PlacedCard` suma `mode: "equilibrio" | "desequilibrio"`.
  - `ReadingFacts` suma `groups: { clave: string; nombre: string; placed: PlacedCard[] }[]` y `contrast: { kind: "relaciones" | "camino"; winner: "parejo" | "a" | "b" | "continua" | "cambio" } | null`.
  - `ReadingText` suma `grupos: { titulo: string; texto: string }[]`, `contraste: string | null`, `reflexion: string`.

- [ ] **Step 1: Tests de `reading.ts` que fallan**

```ts
import { buildReading } from "./reading";

const idx = (slug: string) => CARDS.find((c) => c.id === slug)!.indice;

it("modo: invertida o vínculo que debilita => desequilibrio", () => {
  const r = buildReading({ spread: "cruz-simple", cards: [
    { indice: idx("as-de-bastos"), reversed: false },
    { indice: idx("as-de-copas"), reversed: false },   // fuego -> agua: debilita
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

it("tiradas sin grupos no tienen contraste", () => {
  const r = buildReading({ spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] });
  expect(r.groups).toEqual([]);
  expect(r.contrast).toBeNull();
});
```

Comprobar la cuenta del ejemplo de dignidades antes de fijar el `expected` (bastos→copas = fuego→agua «debilita»; copas→sol(fuego) debilita; sol→oros: fuego→tierra «neutral» pero el sol invertido ya es desequilibrio; oros→espadas tierra→aire «debilita»). Si `el-sol` tiene otro `elemento` en `cards.json`, recalcular y ajustar el `expected` con la regla, no la regla al test.

Run: `cd webApp && npx vitest run src/lib/tarot/reading.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implementar en `reading.ts`**

```ts
export type Mode = "equilibrio" | "desequilibrio";
export type Group = { clave: string; nombre: string; placed: PlacedCard[] };
export type Contrast = { kind: "relaciones"; winner: "parejo" | "a" | "b" } | { kind: "camino"; winner: "parejo" | "continua" | "cambio" };
// PlacedCard suma: mode: Mode
// ReadingFacts suma: groups: Group[]; contrast: Contrast | null

function groupsOf(spread: Spread, placed: PlacedCard[]): Group[] {
  return spread.grupos.map((g) => ({ ...g, placed: placed.filter((p) => p.position.grupo === g.clave) }));
}

const fluye = (g: Group | undefined) => (g ? g.placed.filter((p) => p.mode === "equilibrio").length : 0);

function contrastOf(spread: Spread, groups: Group[]): Contrast | null {
  const by = (k: string) => groups.find((g) => g.clave === k);
  if (spread.slug === "relaciones") {
    const a = fluye(by("a")), b = fluye(by("b"));
    return { kind: "relaciones", winner: a === b ? "parejo" : a > b ? "a" : "b" };
  }
  if (spread.slug === "pregunta-situacion") {
    const c = fluye(by("si-continua")), m = fluye(by("si-cambia"));
    return { kind: "camino", winner: c === m ? "parejo" : c > m ? "continua" : "cambio" };
  }
  return null;
}
```

En `buildReading`: calcular `links` como hoy; después asignar `mode` a cada `placed[i]`: `"desequilibrio"` si `reversed` o si `i > 0 && links[i-1].dignity === "debilita"`, si no `"equilibrio"`. Para no mutar, construir `placed` en dos pasadas (primero sin `mode`, links, después `placed.map((p, i) => ({ ...p, mode }))`, y recalcular `links` con los objetos finales para que `from`/`to` lleven `mode`). Devolver `groups: groupsOf(spread, placed)` y `contrast: contrastOf(spread, groups)`.

Run: `cd webApp && npx vitest run src/lib/tarot/reading.test.ts`
Expected: PASS.

- [ ] **Step 3: Claves nuevas en `templates.json`**

```json
  "estado": {
    "equilibrio": [
      "Bien llevada, esta energía se ve así: {texto}",
      "Cuando fluye, {nombre} se expresa de esta manera: {texto}",
      "En su mejor versión: {texto}"
    ],
    "desequilibrio": [
      "Acá todavía está trabada: {texto}",
      "Cuando se traba, {nombre} se nota así: {texto}",
      "Lo que conviene mirar es su lado en proceso: {texto}"
    ]
  },
  "grupo": [
    "{grupo}: aparecen {claves}.",
    "En {grupo} se juntan {claves}.",
    "{grupo} reúne {claves}."
  ],
  "contraste_relaciones": {
    "parejo": ["Las dos personas llegan con un peso parecido: ninguna lleva sola el vínculo.", "Lo que cada una trae está bastante equilibrado.", "Hay paridad: el vínculo se sostiene de los dos lados."],
    "a": ["La persona A llega más entera al vínculo; la B está todavía en proceso.", "Del lado de A las cartas fluyen más; del lado de B hay cosas que se están acomodando.", "A trae más soltura; B necesita su tiempo."],
    "b": ["La persona B llega más entera al vínculo; la A está todavía en proceso.", "Del lado de B las cartas fluyen más; del lado de A hay cosas que se están acomodando.", "B trae más soltura; A necesita su tiempo."]
  },
  "contraste_camino": {
    "parejo": ["Seguir igual o cambiar pesan parecido: la decisión es más tuya que de las cartas.", "Los dos caminos tienen luces y sombras en la misma medida.", "No hay un camino claramente mejor: mirá cuál te representa más."],
    "continua": ["Si seguís como estás, las cartas fluyen más que si cambiás.", "El camino actual tiene más a favor que el cambio, por ahora.", "Quedarte donde estás aparece más sereno que moverte."],
    "cambio": ["Si introducís un cambio, las cartas fluyen más que si seguís igual.", "El cambio aparece con más a favor que el camino actual.", "Moverte se ve más liviano que quedarte."]
  },
  "reflexion": [
    "Para llevarte: {pregunta}",
    "Una pregunta para quedarte pensando: {pregunta}",
    "Te dejo esta pregunta: {pregunta}"
  ]
```

- [ ] **Step 4: Tests de prosa que fallan** (agregar a `prose.test.ts`; actualizar el `ppf` existente a `cruz-simple` con 5 cartas, y los tests que usaban `pasado-presente-futuro` a `cruz-simple`, salvo uno que verifique que la retirada sigue renderizando)

```ts
it("la retirada pasado-presente-futuro sigue renderizando", () => {
  const r: Reading = { spread: "pasado-presente-futuro", cards: [{ indice: 16, reversed: false }, { indice: 19, reversed: true }, { indice: 49, reversed: false }] };
  expect(() => renderReading(buildReading(r), 1)).not.toThrow();
});

it("cada posición suma el estado según el modo", () => {
  const r: Reading = { spread: "carta-del-dia", cards: [{ indice: 19, reversed: false }] };
  const t = renderReading(buildReading(r), 2);
  expect(t.posiciones[0]!.texto).toContain(cardByIndex(19)!.en_equilibrio);
});

it("relaciones trae grupos y contraste", () => {
  const cards = [0, 1, 2, 3, 4, 5].map((i) => ({ indice: i, reversed: false }));
  const t = renderReading(buildReading({ spread: "relaciones", cards }), 4);
  expect(t.grupos.map((g) => g.titulo)).toEqual(["Persona A", "Persona B"]);
  expect(t.contraste).toBeTruthy();
});

it("cierra con una pregunta de reflexión de la última carta", () => {
  const r: Reading = { spread: "carta-del-dia", cards: [{ indice: 0, reversed: false }] };
  const t = renderReading(buildReading(r), 9);
  expect(cardByIndex(0)!.reflexion.some((q) => t.reflexion.includes(q))).toBe(true);
});
```

El test exhaustivo existente itera `SPREADS`: debe pasar con las 10 tiradas (incluida la de 13 y la rueda). Si tarda > 60 s, limitar sus cartas a una muestra fija de 20 índices, no saltear tiradas.

Run: `cd webApp && npx vitest run src/lib/tarot/prose.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implementar en `prose.ts`**

```ts
export type ReadingText = {
  apertura: string;
  panorama: string | null;
  posiciones: { titulo: string; texto: string }[];
  grupos: { titulo: string; texto: string }[];
  contraste: string | null;
  hilo: string | null;
  sintesis: string;
  consejo: string;
  reflexion: string;
};
```

En `posicion(...)`, después de `base` y antes de `dominio`:

```ts
  const estadoTexto = p.mode === "equilibrio" ? p.card.en_equilibrio : p.card.en_desequilibrio;
  const estado = " " + fill(pick(rng, templates.estado[p.mode]), { nombre: nombre(p), texto: estadoTexto });
  return { titulo: `${p.position.n}. ${p.position.nombre}`, texto: base + estado + dominio };
```

Nuevas funciones:

```ts
function grupos(facts: ReadingFacts, rng: () => number): { titulo: string; texto: string }[] {
  return facts.groups.map((g) => ({
    titulo: g.nombre,
    texto: fill(pick(rng, templates.grupo), { grupo: g.nombre, claves: g.placed.map((p) => p.keywords[0]!).join(", ") }),
  }));
}

function contraste(facts: ReadingFacts, rng: () => number): string | null {
  const c = facts.contrast;
  if (!c) return null;
  return c.kind === "relaciones" ? pick(rng, templates.contraste_relaciones[c.winner]) : pick(rng, templates.contraste_camino[c.winner]);
}
```

En `renderReading`, sumar al objeto devuelto (manteniendo el orden de llamadas a `rng` existente y agregando las nuevas **al final**, para que la semilla de las secciones viejas no cambie más de lo necesario):

```ts
  const text = { apertura, panorama: panorama(facts, rng), posiciones: facts.placed.map((p) => posicion(p, facts, rng)), hilo: hilo(facts.links, rng), sintesis: sintesis(facts, rng), consejo: fill(pick(rng, templates.consejo), { consejo: ultima.card.consejo }) };
  return {
    ...text,
    grupos: grupos(facts, rng),
    contraste: contraste(facts, rng),
    reflexion: fill(pick(rng, templates.reflexion), { pregunta: pick(rng, ultima.card.reflexion) }),
  };
```

- [ ] **Step 6: Verificar**

Run: `cd webApp && npx vitest run src/lib/tarot/ && npx tsc --noEmit`
Expected: PASS en `src/lib/tarot/`; `tsc` puede marcar `ReadingView` (lo arregla la tarea 11).

- [ ] **Step 7: Commit**

```bash
git add webApp/src/lib/tarot/reading.ts webApp/src/lib/tarot/reading.test.ts webApp/src/lib/tarot/prose.ts webApp/src/lib/tarot/prose.test.ts webApp/src/lib/tarot/data/templates.json
git commit -m "feat(tarot): lectura con grupos, contraste, estado y reflexión"
```

---

### Task 11: App: tiradas, layouts, fichas, guardado

**Files:**
- Modify: `webApp/src/components/tarot/SpreadLayout.tsx`, `webApp/src/components/tarot/ReadingView.tsx`
- Modify: `webApp/src/app/(marketing)/tarot/page.tsx`, `webApp/src/app/(marketing)/tarot/[tirada]/page.tsx`, `webApp/src/app/(marketing)/tarot/cartas/[slug]/page.tsx`, `webApp/src/app/(marketing)/tarot/actions.ts`
- Modify: `webApp/src/app/sitemap.ts`, `webApp/next.config.ts`
- Test: `webApp/src/app/(marketing)/tarot/actions.test.ts` (crear si no existe; si existe, sumar)

**Interfaces:**
- Consumes: `activeSpreads()`, `Spread.forma/grupos/retirada`, `ReadingText.grupos/contraste/reflexion`, `suitInfo()`.

- [ ] **Step 1: Test de la Server Action que falla**

Seguir el patrón de mocks de los tests existentes de Server Actions del repo (`grep -rl "vi.mock(\"@/lib/supabase/server\"" webApp/src | head -1` y copiar su forma). Caso:

```ts
it("rechaza guardar una tirada retirada", async () => {
  const fd = new FormData();
  fd.set("t", "pasado-presente-futuro");
  fd.set("c", "16.19r.49");
  const r = await saveTarotReadingAction({ error: null, success: null }, fd);
  expect(r.error).toMatch(/ya no está disponible/);
});
```

Run: `cd webApp && npx vitest run "src/app/(marketing)/tarot/actions.test.ts"`
Expected: FAIL.

- [ ] **Step 2: Implementar la Server Action**

En `saveTarotReadingAction`, después de `decodeReading`:

```ts
    if (spreadBySlug(reading.spread)?.retirada) return { error: "Esa tirada ya no está disponible para guardar.", success: null };
```

(importar `spreadBySlug` de `@/lib/tarot/spreads`). `src/lib/server/tarot.ts` no cambia: `isSpreadSlug` sigue aceptando la retirada, así las guardadas se abren.

Run: el test del Step 1. Expected: PASS.

- [ ] **Step 3: Rutas y listados**

- `tarot/page.tsx`: `SPREADS` → `activeSpreads()`; dos secciones: «Para una consulta rápida» (`carta-del-dia`, `si-o-no`) y «Las tiradas del taller» (las 7 con `fuente`). Actualizar `metadata.description` (sin «pasado-presente-futuro»; mencionar cruz celta, karma, relaciones, astrológica).
- `[tirada]/page.tsx`: `generateStaticParams` desde `activeSpreads()`; si `spread.retirada` → `permanentRedirect("/tarot/cruz-simple")` (import de `next/navigation`).
- `sitemap.ts`: `SPREADS` → `activeSpreads()`.
- `next.config.ts` `redirects()`: sumar `{ source: "/tarot/pasado-presente-futuro", destination: "/tarot/cruz-simple", permanent: true }` (doble red con el `permanentRedirect`: la del config corre antes y evita el render).

- [ ] **Step 4: `SpreadLayout` con rueda y lista móvil**

```tsx
import type { ReactNode } from "react";
import type { Position } from "@/lib/tarot/spreads";
import { cn } from "@/lib/utils/cn";

type Props = { positions: Position[]; forma?: "grilla" | "rueda"; render: (p: Position, i: number) => ReactNode };

/** Grilla CSS por x/y, o rueda de 12 (casa 1 a la izquierda, sentido antihorario: 4 abajo, 7 a la derecha, 10 arriba).
 *  En pantallas chicas, más de 6 cartas se muestran como lista numerada: la forma se pierde, el orden no. */
export default function SpreadLayout({ positions, forma = "grilla", render }: Props) {
  const lista = positions.length > 6;
  return (
    <>
      {lista && (
        <ol className="grid grid-cols-2 gap-4 sm:hidden">
          {positions.map((p, i) => (
            <li key={p.n} className="grid justify-items-center gap-2 text-center">
              {render(p, i)}
              <span className="text-sm text-suave">{p.n}. {p.nombre}</span>
            </li>
          ))}
        </ol>
      )}
      <div className={cn(lista && "hidden sm:block")}>{forma === "rueda" ? <Rueda positions={positions} render={render} /> : <Grilla positions={positions} render={render} />}</div>
    </>
  );
}

function Grilla({ positions, render }: Omit<Props, "forma">) {
  const cols = Math.max(...positions.map((p) => p.x)) + 1;
  const rows = Math.max(...positions.map((p) => p.y)) + 1;
  return (
    <div className="mx-auto grid w-fit gap-4" style={{ gridTemplateColumns: `repeat(${cols}, auto)`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {positions.map((p, i) => (
        <div key={p.n} className={cn("relative grid place-items-center", p.rotada && "z-10")} style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}>
          <div className={p.rotada ? "rotate-90 scale-75" : undefined}>{render(p, i)}</div>
        </div>
      ))}
    </div>
  );
}

function Rueda({ positions, render }: Omit<Props, "forma">) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px]">
      {positions.map((p, i) => {
        const ang = ((180 + (p.n - 1) * 30) * Math.PI) / 180;
        const left = 50 + 40 * Math.cos(ang);
        const top = 50 - 40 * Math.sin(ang);
        return (
          <div key={p.n} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
            {render(p, i)}
          </div>
        );
      })}
    </div>
  );
}
```

Pasar `forma={spread.forma}` en todos los usos (`ReadingView`, `Picker` si usa `SpreadLayout`: `grep -n SpreadLayout webApp/src -r`). Para 13 cartas y rueda, `TarotCard` va en `size="sm"` (la regla actual `> 3 ? "sm"` ya lo cubre).

- [ ] **Step 5: `ReadingView`**

- Tras las posiciones, si `text.grupos.length`: sección `<h2>` «Por grupos» con un `<p>` por grupo (`<strong className="text-bosque">{g.titulo}.</strong> {g.texto}`), y `text.contraste` en un `<p>` debajo.
- En la tarjeta de Síntesis, después de `consejo`: `<p className="mt-4 text-tinta">{text.reflexion}</p>` (sin itálica en gris: contraste ≥ 4.5:1).

- [ ] **Step 6: Ficha de carta**

En `cartas/[slug]/page.tsx`, en el `<dl>`: tras «Elemento», `<dt>Plano</dt><dd>{cap(info.cuerpo)}</dd>` y `<dt>Forma</dt><dd>{cap(info.solido)}</dd>` con `const info = suitInfo(card)` (`cap` de `@/lib/tarot/prose`). **No** se muestran `en_equilibrio`, `en_desequilibrio` ni `reflexion` en la ficha (D2: son del motor de lectura).

- [ ] **Step 7: Verificar**

Run: `cd webApp && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: PASS (toda la suite unit, incluidos `coverage.test.ts` de rate limit y `cosmic-tokens.test.ts`).

- [ ] **Step 8: Commit**

```bash
git add webApp/src/components/tarot webApp/src/app/\(marketing\)/tarot webApp/src/app/sitemap.ts webApp/next.config.ts
git commit -m "feat(tarot): nueve tiradas en la app, rueda astrológica y lista móvil"
```

---

### Task 12: No exposición, invertidas, e2e y documentación

**Files:**
- Create: `webApp/src/lib/tarot/exposicion.test.ts`
- Modify: `webApp/src/content/forbidden-terms.test.ts`
- Modify: `webApp/e2e/tarot.spec.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Test de no exposición y de invertidas**

```ts
// webApp/src/lib/tarot/exposicion.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CARDS } from "./cards";
import suits from "./data/suits.json";
import spreads from "./data/spreads.json";
import templates from "./data/templates.json";

// D2: el método de la dueña alimenta la lectura pero no se nombra. Este test cita los términos a propósito.
const METODO = /m[aá]scara de la esencia|\bdesequilibrio:|\bequilibrio:|\bpreguntarse\b|waite no cita/i;

// D4: la invertida es el mismo tema atenuado; estos pares opuestos no pueden aparecer derecha -> invertida.
const OPUESTOS: [RegExp, RegExp][] = [
  [/éxito|triunfo|logro/i, /fracaso|derrota|pérdida total/i],
  [/amor|unión/i, /odio|desamor|separación definitiva/i],
  [/abundancia|prosperidad/i, /ruina|miseria/i],
  [/alegría|felicidad/i, /desgracia|tragedia/i],
  [/salud|curación/i, /enfermedad grave|muerte/i],
];

describe("no exposición del método (D2)", () => {
  it("ningún texto de datos lo nombra", () => {
    const blob = JSON.stringify([CARDS, suits, spreads, templates]);
    expect(blob.match(METODO)).toBeNull();
  });

  it("nada fuera de los tests importa la fuente", () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const offenders = walk(join(process.cwd(), "src"))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith("fuente-schema.ts"))
      .filter((f) => /fuente-schema|docs\/TAROT/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("invertidas atenuadas (D4)", () => {
  it("ninguna invertida usa el opuesto de su derecha", () => {
    const hits: string[] = [];
    for (const c of CARDS) {
      const der = c.palabras_clave_derecha.join(" ");
      const inv = c.palabras_clave_invertida.join(" ") + " " + c.significado_invertida;
      for (const [a, b] of OPUESTOS) if (a.test(der) && b.test(inv)) hits.push(c.id);
    }
    expect(hits).toEqual([]);
  });
});
```

Run: `cd webApp && npx vitest run src/lib/tarot/exposicion.test.ts`
Expected: PASS (si falla, el contenido de las tareas 6-7 se corrige; no se afloja el test).

- [ ] **Step 2: Términos prohibidos en todo `src/`**

En `forbidden-terms.test.ts`, ampliar `BANNED` con `|m[aá]scara de la esencia|\bpreguntarse\b`. Run: `cd webApp && npx vitest run src/content/forbidden-terms.test.ts` → PASS.

- [ ] **Step 3: e2e**

En `e2e/tarot.spec.ts` (importar `test` de `./fixtures`, como el resto), sumar:
- `/tarot` lista 9 tiradas (`getByRole("link", { name: "Tirar" })` → 9).
- `/tarot/pasado-presente-futuro` termina en `/tarot/cruz-simple`.
- Una tirada de `karma` con `?listo=1`, elegir 8 cartas con el Picker (seguir el helper que ya use el spec para cruz celta) y ver la sección «Síntesis» con la pregunta de reflexión (`/^(Para llevarte|Una pregunta|Te dejo)/`).
- `relaciones`: ver «Por grupos» con «Persona A» y «Persona B».
- `astrologica` en viewport 375×812: ve la lista numerada (`getByText("1. Casa I · Identidad")`).

Run (con el stack local arriba, ver CLAUDE.md): `cd webApp && npx playwright test e2e/tarot.spec.ts`
Expected: PASS. Si el stack no está disponible, dejarlo listado y anotarlo en el handoff (como los specs del bloque B).

- [ ] **Step 4: CLAUDE.md**

- Tabla de estado: `webApp/supabase` → 51 migraciones, última `0079`; sumar «Tarot: fuente de la dueña en `docs/TAROT/fuente/` (originales fuera de git)».
- Rutas: `/tarot` «9 tiradas (2 rápidas + 7 del taller)»; `/tarot/pasado-presente-futuro` → 308 a `/tarot/cruz-simple`.
- Coding standards, línea de copy: «Excepción: el tarot se reescribe en la voz del sitio desde `docs/TAROT/fuente/` (PO 2026-11-12); el método de la dueña (máscara de la esencia, equilibrio/desequilibrio, preguntarse) alimenta las lecturas y nunca se nombra (`exposicion.test.ts`)».
- Bloqueos externos: «Revisión de la dueña de los textos del tarot (`docs/TAROT/fuente/revision.json` en `pendiente`): bloquea la release del tarot».
- Actualizar el conteo de tests unit con el número real de `npx vitest run` (no estimarlo).

- [ ] **Step 5: Verificación final**

```bash
cd webApp && npx tsc --noEmit && npm run lint && npx vitest run
cd supabase && npm test
```
Expected: todo PASS. Anotar los totales reales.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/tarot/exposicion.test.ts webApp/src/content/forbidden-terms.test.ts webApp/e2e/tarot.spec.ts CLAUDE.md
git commit -m "test(tarot): no exposición del método, invertidas atenuadas, e2e y CLAUDE.md"
```

---

## Release (fuera de este plan, lo hace el orquestador con el PO)

1. `revision.json` en `aprobado` tras la revisión de Patricia.
2. Aplicar `0079` en la nube; `bash webApp/supabase/harness/cloud-parity.sh` sin líneas `<`.
3. `git checkout main && git merge --no-ff dev && git push origin main && git push escuela main`.

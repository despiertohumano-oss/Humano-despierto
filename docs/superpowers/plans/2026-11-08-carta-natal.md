# Carta natal (T-024, proyecto 1 de 2) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una sección pública `/carta-natal` que calcula la carta natal con un motor propio (sin Swiss Ephemeris), la guarda para usuarias con sesión, la exige a toda docente antes de entrar a su panel y publica fichas indexables de signos, planetas y casas.

**Architecture:** Motor puro y determinista en `webApp/src/lib/astro/` (astronomy-engine 2.1.19 para Sol..Plutón; ángulos, casas, nodos, Lilith y Quirón propios; hora local a UTC solo en `time.ts`). El servidor (`src/lib/server/natal-chart.ts` + Server Actions con rate limit) resuelve lugar y huso, compone `ChartFacts` y la prosa por plantillas. La base suma `places` (GeoNames, lectura pública), `natal_charts` (solo el input; INSERT solo por `service_role` vía función) y tres columnas públicas de signos en `profiles`. ADR-017.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Tailwind 4 con tokens Brote, zod 4 (`@/lib/validation/zod`), `astronomy-engine` 2.1.19, `@js-temporal/polyfill` 0.5.1, Supabase (Postgres + RLS, `pg_trgm`, `unaccent`), Vitest, PGlite 0.5.4 (tests de schema), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-07-carta-natal-design.md` (leerla entera antes de empezar; las «Decisiones del PO» no se discuten). Investigación: `docs/superpowers/research/astrologia/` — sobre todo `motor-de-calculo.md` (fórmulas y errores medidos), `lugar-y-hora.md` (§6 casos de test, §3.3 carga de GeoNames) y `fundamentos-interpretativos.md` (textos). ADR-017 en `engram/02_architecture.md`.

## Global Constraints

- Rama `feature/carta-natal`, nacida de `dev`. Se mergea a `dev` en local (sin push, sin PR), según `CLAUDE.md` «Git workflow».
- Rango de fechas aceptado: **1900-01-01 a 2100-12-31**, en el formulario, en el servidor, en el motor y en un CHECK de la base.
- Casas: **Placidus** por defecto, **Whole Sign** a elección. Por encima de **±66°** Placidus no existe: se calcula Whole Sign y se informa (`houseSystemFallback`).
- Puntos: **Quirón** y **Lilith = Luna Negra media**, rotulada exactamente **«Lilith (Luna Negra media)»**. Nodo = **verdadero** («Nodo Norte»).
- Orbes **Urania Trust**: conjunción y oposición **8°**, trígono y cuadratura **5°**, sextil **4°**. Solo esos cinco aspectos.
- **Hora opcional**. Sin hora: se calcula a las **12:00 locales**, sin Ascendente, Medio Cielo ni casas, y la pantalla dice **«Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas»**.
- **Fecha, hora y lugar nunca viajan en la URL** (ni query string ni path). Todo pasa por Server Actions (POST).
- `time.ts` es el **único** lugar que convierte hora local; `disambiguation: 'reject'`; hora ambigua → se pregunta; hora inexistente → se avisa y se pide revisar. **Nunca se elige en silencio.**
- Zona IANA **tal como viene de GeoNames**; nunca normalizar con `resolvedOptions()`.
- Perfil público de la docente: **solo los signos** de Sol, Luna y Ascendente. Sin grados, rueda ni lugar.
- Datos de nacimiento = **dato reforzado**: privados (sin grant a `anon`), consentimiento explícito al guardar (`consented_at`), borrado inmediato. **Sin link público** para compartir. Sin imagen OG por carta.
- Una sola carta `is_self = true` por usuaria; tope **100** cartas por usuaria.
- `astronomy-engine` **2.1.19 exacto** (sin `^`). `@js-temporal/polyfill` **0.5.1 exacto** (la versión medida en `lugar-y-hora.md` §2.3).
- Longitud de cada cuerpo = geocéntrica **aparente de la fecha**: `Ecliptic(GeoVector(b, t, true))` (Luna: `EclipticGeoMoon`). Nunca `EclipticLongitude` ni J2000.
- Tolerancias de los tests: planetas **≤30″** contra JPL, Luna **≤10″**, ángulos y cúspides Placidus **≤10″**, nodo medio y Lilith media **≤10″**, Quirón **≤5″**, nodo verdadero **≤15″** (ver «Desvíos», D-1).
- Swiss Ephemeris: **prohibido** leer, copiar o portar su código. `pyswisseph` solo como oráculo ejecutado **fuera del repo**; al repo entran números (JSON). Nunca `sweph`/`pyswisseph` en un `package.json`.
- Aviso de marco al pie de toda carta: herramienta de reflexión, no reemplaza atención médica ni psicológica.
- Diseño «Brote» (ADR-015): tokens semánticos, Plus Jakarta Sans, contraste ≥ 4,5:1, sin emojis, **sin glifos Unicode astrológicos**: en la rueda los cuerpos y signos van con abreviaturas de texto (D-63 de `CLAUDE.md`).
- Seguridad de `CLAUDE.md` reglas 1-11: `REVOKE ALL` + `GRANT` por columna; RLS lee `profiles.role`, nunca el claim; `service_role` solo tras verificar al usuario; toda Server Action exportada en `RATE_LIMITS`.
- TypeScript strict, sin comentarios salvo el porqué no obvio, `cn()` de `@/lib/utils/cn`, Server Components por defecto.
- Commits en español, `feat(carta-natal): …` / `test(carta-natal): …` / `docs(carta-natal): …`, con la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verificadores: `cd webApp && npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` · `cd webApp/supabase && npm test` · `bash webApp/scripts/check-seo.sh <url>`.

## Paralelismo (P-24)

- **Serie obligatoria (primitivas compartidas):** Task 1 → Task 2 → Task 4 (fixtures) → Task 3.
- **Independientes entre sí después de Task 4:** Tasks 5, 6, 8, 9, 10 (cada módulo del motor tiene su test propio). Task 7 depende de 6. Task 11 depende de 3, 5-10.
- **Rama de base, independiente del motor:** Task 12 (migración) y Task 13 (cargador de `places`, depende de 12) pueden correr en paralelo con Tasks 5-11.
- Task 14 (textos) depende solo de Task 2 y 10 (tipos); Task 15 necesita 11, 12, 14. Tasks 16-21 son en serie (UI y rutas sobre el server). Task 22 (e2e) y 23 (docs) cierran.

## Mapa de archivos

```
webApp/package.json                                   + astronomy-engine 2.1.19, @js-temporal/polyfill 0.5.1 (exactas)
webApp/src/lib/astro/
  deps.test.ts                 versiones exactas en package.json
  zodiac.ts (+test)            ids de signos/cuerpos, elemento, modalidad, regente tradicional, nombres, signOf, grados
  time.ts (+test)              hora local + IANA → UTC (Temporal, reject), LMT por longitud, offsets
  ephemeris.ts (+test)         Sol..Plutón aparentes de la fecha + velocidad
  angles.ts (+test)            oblicuidad verdadera, RAMC, ASC (hemisferio este), MC
  houses.ts (+test)            Placidus iterativo, Whole Sign, fallback ±66°, casa de un punto
  points.ts (+test)            nodo medio, nodo verdadero, Lilith media proyectada
  chiron.ts (+test)            tabla de Horizons + Lagrange + tiempo de luz + aberración
  aspects.ts (+test)           5 aspectos mayores, orbes UT, aplicativo/separativo
  chart.ts (+test)             computeChart → ChartFacts
  prose.ts (+test)             renderChart → ChartText (plantillas)
  data/chiron.json             generado por webApp/scripts/astro-chiron-table.mjs
  data/templates.json          78 textos (borrador; los revisa la dueña)
  __fixtures__/horizons.json   generado por webApp/scripts/astro-horizons-fixtures.mjs
  __fixtures__/swe.json        generado FUERA del repo con pyswisseph (oráculo)
  __fixtures__/fixtures.test.ts  forma de los fixtures
  CREDITS.md                   astronomy-engine (MIT), JPL Horizons, GeoNames (CC BY 4.0)
webApp/scripts/astro-horizons-fixtures.mjs           baja los fixtures de Horizons (a mano, no en CI)
webApp/scripts/astro-chiron-table.mjs                baja la tabla de Quirón (a mano, no en CI)
webApp/supabase/migrations/20261108100000_0072_carta_natal.sql
webApp/supabase/harness/db.mjs                       carga pg_trgm y unaccent en PGlite
webApp/supabase/harness/00_supabase_baseline.sql     esquema `extensions`
webApp/supabase/tests/natal-charts.test.mjs          natal_charts + profiles.*_sign
webApp/supabase/tests/places.test.mjs                places + search_places
webApp/supabase/tests/guard-reachability.test.mjs    (modificar) casos de los dos triggers nuevos
webApp/supabase/tests/rls-mutation.test.mjs          (modificar) search_places en ESPERADO_ANON
webApp/supabase/scripts/places-lib.mjs               parseo y filtro de GeoNames (puro)
webApp/supabase/scripts/load-places.mjs              descarga + CSV + carga por psql
webApp/supabase/tests/places-loader.test.mjs         test del parseo
webApp/supabase/seed.fixtures.sql                    (modificar) carta propia de las docentes del seed
webApp/src/lib/server/natal-chart.ts (+test)         form → lugar/huso → carta; lecturas y escrituras
webApp/src/lib/rate-limit/limits.ts                  (modificar) 5 entradas
webApp/src/app/(marketing)/carta-natal/
  actions.ts (+actions.test.ts)  calcularCarta, guardarCarta, buscarLugar, borrarCarta, marcarMiCarta
  page.tsx                       formulario + resultado + índice de fichas
  [id]/page.tsx                  carta guardada (noindex, recalculada)
  signos/[slug]/page.tsx · planetas/[slug]/page.tsx · casas/[n]/page.tsx   fichas indexables
webApp/src/components/carta-natal/
  ChartWheel.tsx · PositionsTable.tsx · AspectsTable.tsx · ChartResult.tsx · AstroEthicsNote.tsx
  ChartForm.tsx ('use client') · PlaceSearch.tsx ('use client')
  ChartListActions.tsx ('use client') · TeacherChartGate.tsx · FichaLayout.tsx
  carta-natal.test.tsx
webApp/src/app/(app)/panel/carta-natal/page.tsx      mis cartas
webApp/src/app/(app)/panel/page.tsx                  (modificar) enlace «Mis cartas natales»
webApp/src/app/(app)/panel/docente/layout.tsx (+layout.test.ts)   bloqueo
webApp/src/lib/server/guias.ts (+test) · src/app/(marketing)/guias/[slug]/page.tsx   signos públicos
webApp/src/app/sitemap.ts                            (modificar) fichas
webApp/e2e/carta-natal.spec.ts
CLAUDE.md                                            rutas, tablas, migraciones, comandos
```

---

### Task 1: Dependencias exactas del motor

**Files:**
- Modify: `webApp/package.json`, `webApp/package-lock.json`
- Test: `webApp/src/lib/astro/deps.test.ts`

**Interfaces:**
- Produces: los paquetes `astronomy-engine` (2.1.19) y `@js-temporal/polyfill` (0.5.1) importables desde `src/`.

- [ ] **Step 1: Crear la rama y escribir el test que falla**

```bash
cd /Users/gabrielsk/Documents/Proyects/Humano-despierto && git checkout dev && git checkout -b feature/carta-natal
```

```ts
// webApp/src/lib/astro/deps.test.ts
import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";

// ADR-017: el motor depende de una sola biblioteca de efemérides y de una versión medida del
// polyfill. Un `^` dejaría entrar una versión que nadie midió contra JPL.
describe("dependencias del motor de carta natal", () => {
  it("fija astronomy-engine 2.1.19 y @js-temporal/polyfill 0.5.1 sin rango", () => {
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps["astronomy-engine"]).toBe("2.1.19");
    expect(deps["@js-temporal/polyfill"]).toBe("0.5.1");
  });

  it("no trae Swiss Ephemeris de ninguna forma", () => {
    const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
    expect(Object.keys(all).filter((d) => /swe(ph|isseph)|swisseph/i.test(d))).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/deps.test.ts`
Expected: FAIL — `expected undefined to be '2.1.19'`.

- [ ] **Step 3: Instalar con versión exacta**

```bash
cd webApp && npm install --save-exact astronomy-engine@2.1.19 @js-temporal/polyfill@0.5.1
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/deps.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add webApp/package.json webApp/package-lock.json webApp/src/lib/astro/deps.test.ts
git commit -m "feat(carta-natal): dependencias exactas del motor (astronomy-engine 2.1.19, polyfill de Temporal 0.5.1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Vocabulario del zodíaco (`zodiac.ts`)

**Files:**
- Create: `webApp/src/lib/astro/zodiac.ts`
- Test: `webApp/src/lib/astro/zodiac.test.ts`

**Interfaces:**
- Produces:
  - `SIGN_IDS` (12, de `aries` a `piscis`, ids de `astrologia-base.json`), `type SignId`.
  - `PLANET_IDS` (`sol`..`pluton`, 10), `type PlanetId`; `BODY_IDS` (13: los 10 + `quiron`, `nodo_norte`, `lilith_media`), `type BodyId`; `type AngleId = "asc" | "mc"`; `type PointId = BodyId | AngleId`.
  - `type Element = "fuego" | "tierra" | "aire" | "agua"`, `type Modality = "cardinal" | "fijo" | "mutable"`, `type HouseSystem = "placidus" | "whole_sign"`.
  - `SIGNS: Record<SignId, { nombre: string; abbr: string; elemento: Element; modalidad: Modality; regente: PlanetId }>`.
  - `BODY_NAMES: Record<BodyId, string>`, `BODY_ABBR: Record<BodyId, string>`, `ANGLE_NAMES: Record<AngleId, string>`, `pointName(id: PointId): string`.
  - `norm360(x: number): number`, `arcsecBetween(a: number, b: number): number`, `signOf(lon: number): SignId`, `degreeInSign(lon: number): number`, `formatDegree(lon: number): string`, `bodySlug(id: BodyId): string`, `bodyBySlug(slug: string): BodyId | undefined`, `isSignId(s: string): s is SignId`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/zodiac.test.ts
import { describe, expect, it } from "vitest";
import {
  BODY_IDS, BODY_NAMES, PLANET_IDS, SIGNS, SIGN_IDS, arcsecBetween, bodyBySlug, bodySlug,
  degreeInSign, formatDegree, isSignId, norm360, pointName, signOf,
} from "./zodiac";

describe("zodiac", () => {
  it("12 signos en orden y 13 cuerpos con los nombres de la spec", () => {
    expect(SIGN_IDS).toEqual(["aries", "tauro", "geminis", "cancer", "leo", "virgo", "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis"]);
    expect(BODY_IDS).toHaveLength(13);
    expect(PLANET_IDS).toHaveLength(10);
    expect(BODY_NAMES.lilith_media).toBe("Lilith (Luna Negra media)");
    expect(BODY_NAMES.nodo_norte).toBe("Nodo Norte");
    expect(pointName("asc")).toBe("Ascendente");
  });

  it("elemento, modalidad y regente tradicional (fundamentos-interpretativos.md §1.1)", () => {
    expect(SIGNS.aries).toMatchObject({ elemento: "fuego", modalidad: "cardinal", regente: "marte" });
    expect(SIGNS.escorpio).toMatchObject({ elemento: "agua", modalidad: "fijo", regente: "marte" });
    expect(SIGNS.acuario).toMatchObject({ elemento: "aire", modalidad: "fijo", regente: "saturno" });
    expect(SIGNS.piscis).toMatchObject({ elemento: "agua", modalidad: "mutable", regente: "jupiter" });
    const porElemento = SIGN_IDS.reduce<Record<string, number>>((acc, s) => ({ ...acc, [SIGNS[s].elemento]: (acc[SIGNS[s].elemento] ?? 0) + 1 }), {});
    expect(porElemento).toEqual({ fuego: 3, tierra: 3, aire: 3, agua: 3 });
  });

  it("signOf, degreeInSign y formatDegree en los bordes", () => {
    expect(signOf(0)).toBe("aries");
    expect(signOf(29.9999)).toBe("aries");
    expect(signOf(30)).toBe("tauro");
    expect(signOf(359.99)).toBe("piscis");
    expect(signOf(-0.5)).toBe("piscis");
    expect(degreeInSign(84.5)).toBeCloseTo(24.5, 10);
    expect(formatDegree(84.5)).toBe("24°30′");
    expect(formatDegree(30.9999)).toBe("0°59′");
  });

  it("norm360 y arcsecBetween cruzan el 0", () => {
    expect(norm360(-10)).toBe(350);
    expect(norm360(725)).toBe(5);
    expect(arcsecBetween(359.999, 0.001)).toBeCloseTo(7.2, 6);
  });

  it("slugs de cuerpos ida y vuelta", () => {
    for (const b of BODY_IDS) expect(bodyBySlug(bodySlug(b))).toBe(b);
    expect(bodySlug("nodo_norte")).toBe("nodo-norte");
    expect(bodyBySlug("asc")).toBeUndefined();
    expect(isSignId("tauro")).toBe(true);
    expect(isSignId("ofiuco")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/zodiac.test.ts`
Expected: FAIL (no se puede resolver `./zodiac`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/zodiac.ts
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

export const BODY_ABBR: Record<BodyId, string> = {
  sol: "So", luna: "Lu", mercurio: "Me", venus: "Ve", marte: "Ma", jupiter: "Ju", saturno: "Sa",
  urano: "Ur", neptuno: "Ne", pluton: "Pl", quiron: "Qu", nodo_norte: "NN", lilith_media: "Li",
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
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/zodiac.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/zodiac.ts webApp/src/lib/astro/zodiac.test.ts
git commit -m "feat(carta-natal): vocabulario del zodíaco (signos, cuerpos, regentes tradicionales)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Hora local → UTC (`time.ts`)

**Files:**
- Create: `webApp/src/lib/astro/time.ts`
- Test: `webApp/src/lib/astro/time.test.ts`

**Interfaces:**
- Consumes: nada del repo (solo `@js-temporal/polyfill`).
- Produces:
  - `type ClockChoice = "earlier" | "later"`, `type OffsetOption = { utc: Date; offsetSeconds: number }`, `type LocalBirth = { date: string; time: string; timeZone: string; lon: number }`.
  - `type TimeResolution = { kind: "ok"; utc: Date; offsetSeconds: number; source: "tzdb" | "lmt" } | { kind: "ambigua"; earlier: OffsetOption; later: OffsetOption } | { kind: "inexistente" } | { kind: "zona-invalida" } | { kind: "fecha-invalida" }`.
  - `NOON = "12:00"`, `isValidTimeZone(tz: string): boolean`, `localToUtc(b: LocalBirth, choice: ClockChoice | null): TimeResolution`, `tzdbOffsetSeconds(date: string, time: string, timeZone: string): number`, `utcFromOffset(date: string, time: string, offsetSeconds: number): Date`, `formatOffset(offsetSeconds: number): string`, `tzdataVersion(): string`.

Regla de LMT (`lugar-y-hora.md` §5): si el instante cae antes de la **primera** transición de la zona (`getTimeZoneTransition("previous") === null` y la zona tiene alguna transición posterior), el offset es la hora media local del lugar, `round(lon × 240)` segundos. No se usa «el offset tiene segundos», porque la CMT argentina 1894-1920 (−4:16:48) es hora legal y tiene segundos (caso 10).

- [ ] **Step 1: Escribir el test que falla** (valores: `lugar-y-hora.md` §6, casos 1-14, y §5 para Rosario)

```ts
// webApp/src/lib/astro/time.test.ts
import { describe, expect, it } from "vitest";
import { formatOffset, isValidTimeZone, localToUtc, tzdbOffsetSeconds, utcFromOffset } from "./time";

const BA = "America/Argentina/Buenos_Aires";
const BA_LON = -58.38159;

function ok(date: string, time: string, timeZone: string, lon = BA_LON) {
  const r = localToUtc({ date, time, timeZone, lon }, null);
  if (r.kind !== "ok") throw new Error(`esperaba ok y vino ${r.kind}`);
  return r;
}

describe("lugar-y-hora.md §6 · offsets históricos", () => {
  it.each([
    ["1 · Buenos Aires, DST 1989", "1989-01-15", "12:00", BA, -7200, "1989-01-15T14:00:00.000Z"],
    ["2 · Buenos Aires, 1974", "1974-02-15", "12:00", BA, -7200, "1974-02-15T14:00:00.000Z"],
    ["5 · Mendoza 2008-12", "2008-12-15", "12:00", "America/Argentina/Mendoza", -10800, "2008-12-15T15:00:00.000Z"],
    ["5 · Buenos Aires 2008-12", "2008-12-15", "12:00", BA, -7200, "2008-12-15T14:00:00.000Z"],
    ["6 · Mendoza 2004-07", "2004-07-01", "12:00", "America/Argentina/Mendoza", -14400, "2004-07-01T16:00:00.000Z"],
    ["6 · Buenos Aires 2004-07", "2004-07-01", "12:00", BA, -10800, "2004-07-01T15:00:00.000Z"],
    ["7 · San Luis 2009", "2009-06-15", "12:00", "America/Argentina/San_Luis", -14400, "2009-06-15T16:00:00.000Z"],
    ["8 · Jujuy 1991", "1991-01-15", "12:00", "America/Argentina/Jujuy", -10800, "1991-01-15T15:00:00.000Z"],
    ["8 · Buenos Aires 1991", "1991-01-15", "12:00", BA, -7200, "1991-01-15T14:00:00.000Z"],
    ["9 · Buenos Aires 1999 (marca DST, mismo offset)", "1999-12-15", "12:00", BA, -10800, "1999-12-15T15:00:00.000Z"],
    ["10 · CMT 1910 (hora legal con segundos, NO es LMT)", "1910-05-25", "12:00", BA, -15408, "1910-05-25T16:16:48.000Z"],
    ["14 · Ciudad de México 2023, sin DST", "2023-06-15", "12:00", "America/Mexico_City", -21600, "2023-06-15T18:00:00.000Z"],
  ])("%s", (_n, date, time, tz, offset, utc) => {
    const r = ok(date, time, tz);
    expect(r.offsetSeconds).toBe(offset);
    expect(r.utc.toISOString()).toBe(utc);
    expect(r.source).toBe("tzdb");
  });
});

describe("lugar-y-hora.md §6 · horas ambiguas: se pregunta, nunca se elige", () => {
  it.each([
    ["3 · Buenos Aires 2008-03-15 23:30", "2008-03-15", "23:30", BA, -7200, "2008-03-16T01:30:00.000Z", -10800, "2008-03-16T02:30:00.000Z"],
    ["12 · Montevideo 2014-03-09 01:30", "2014-03-09", "01:30", "America/Montevideo", -7200, "2014-03-09T03:30:00.000Z", -10800, "2014-03-09T04:30:00.000Z"],
    ["13 · Santiago 2024-04-06 23:30", "2024-04-06", "23:30", "America/Santiago", -10800, "2024-04-07T02:30:00.000Z", -14400, "2024-04-07T03:30:00.000Z"],
    ["14 · Ciudad de México 2022-10-30 01:30", "2022-10-30", "01:30", "America/Mexico_City", -18000, "2022-10-30T06:30:00.000Z", -21600, "2022-10-30T07:30:00.000Z"],
  ])("%s", (_n, date, time, tz, offE, utcE, offL, utcL) => {
    const r = localToUtc({ date, time, timeZone: tz, lon: 0 }, null);
    expect(r.kind).toBe("ambigua");
    if (r.kind !== "ambigua") return;
    expect([r.earlier.offsetSeconds, r.earlier.utc.toISOString()]).toEqual([offE, utcE]);
    expect([r.later.offsetSeconds, r.later.utc.toISOString()]).toEqual([offL, utcL]);
    const elegida = localToUtc({ date, time, timeZone: tz, lon: 0 }, "later");
    expect(elegida.kind === "ok" && elegida.utc.toISOString()).toBe(utcL);
  });

  it("4 · Buenos Aires 2007-12-30 00:30 no existió: se informa, aunque venga una elección", () => {
    expect(localToUtc({ date: "2007-12-30", time: "00:30", timeZone: BA, lon: BA_LON }, null).kind).toBe("inexistente");
    expect(localToUtc({ date: "2007-12-30", time: "00:30", timeZone: BA, lon: BA_LON }, "later").kind).toBe("inexistente");
  });
});

describe("LMT (lugar-y-hora.md §5)", () => {
  it("11 · el tzdb da el LMT de la ciudad cabecera: −3:53:48", () => {
    expect(tzdbOffsetSeconds("1880-01-01", "12:00", BA)).toBe(-14028);
  });

  it("antes de la primera transición usa la hora media del LUGAR: Rosario (−60,64°) = −4:02:34", () => {
    const r = ok("1880-01-01", "12:00", BA, -60.64);
    expect(r.source).toBe("lmt");
    expect(r.offsetSeconds).toBe(-14554);
    expect(r.utc.toISOString()).toBe("1880-01-01T16:02:34.000Z");
  });

  it("una zona fija sin transiciones no es LMT", () => {
    const r = ok("1880-01-01", "12:00", "Etc/GMT+3", -60.64);
    expect(r.source).toBe("tzdb");
    expect(r.offsetSeconds).toBe(-10800);
  });
});

describe("entradas inválidas y utilidades", () => {
  it("zona inexistente y fecha imposible", () => {
    expect(localToUtc({ date: "1990-01-01", time: "12:00", timeZone: "Marte/Olympus", lon: 0 }, null).kind).toBe("zona-invalida");
    expect(localToUtc({ date: "2023-02-30", time: "12:00", timeZone: BA, lon: 0 }, null).kind).toBe("fecha-invalida");
    expect(isValidTimeZone(BA)).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("utcFromOffset y formatOffset", () => {
    expect(utcFromOffset("1990-06-15", "09:00", -10800).toISOString()).toBe("1990-06-15T12:00:00.000Z");
    expect(formatOffset(-10800)).toBe("UTC−3");
    expect(formatOffset(-12600)).toBe("UTC−3:30");
    expect(formatOffset(-15408)).toBe("UTC−4:16:48");
    expect(formatOffset(19800)).toBe("UTC+5:30");
    expect(formatOffset(0)).toBe("UTC+0");
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/time.test.ts`
Expected: FAIL (no se puede resolver `./time`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/time.ts
import { Temporal } from "@js-temporal/polyfill";

export type ClockChoice = "earlier" | "later";
export type OffsetOption = { utc: Date; offsetSeconds: number };
export type LocalBirth = { date: string; time: string; timeZone: string; lon: number };
export type TimeResolution =
  | { kind: "ok"; utc: Date; offsetSeconds: number; source: "tzdb" | "lmt" }
  | { kind: "ambigua"; earlier: OffsetOption; later: OffsetOption }
  | { kind: "inexistente" }
  | { kind: "zona-invalida" }
  | { kind: "fecha-invalida" };

export const NOON = "12:00";

export function isValidTimeZone(timeZone: string): boolean {
  if (!/^[A-Za-z0-9_+./-]{1,64}$/.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function plain(date: string, time: string): Temporal.PlainDateTime | null {
  try {
    return Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: "reject" });
  } catch {
    return null;
  }
}

function option(z: Temporal.ZonedDateTime): OffsetOption {
  return { utc: new Date(z.epochMilliseconds), offsetSeconds: z.offsetNanoseconds / 1e9 };
}

export function utcFromOffset(date: string, time: string, offsetSeconds: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hh!, mm!) - offsetSeconds * 1000);
}

export function tzdbOffsetSeconds(date: string, time: string, timeZone: string): number {
  const p = plain(date, time);
  if (!p) throw new RangeError("fecha inválida");
  return p.toZonedDateTime(timeZone, { disambiguation: "compatible" }).offsetNanoseconds / 1e9;
}

export function localToUtc(b: LocalBirth, choice: ClockChoice | null): TimeResolution {
  if (!isValidTimeZone(b.timeZone)) return { kind: "zona-invalida" };
  const p = plain(b.date, b.time);
  if (!p) return { kind: "fecha-invalida" };

  let z: Temporal.ZonedDateTime;
  try {
    z = p.toZonedDateTime(b.timeZone, { disambiguation: "reject" });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const a = p.toZonedDateTime(b.timeZone, { disambiguation: "earlier" });
    const l = p.toZonedDateTime(b.timeZone, { disambiguation: "later" });
    // En un salto hacia adelante, earlier/later caen a los lados del hueco y ninguno vuelve a la
    // hora pedida; en un atraso los dos la repiten.
    if (!a.toPlainDateTime().equals(p) || !l.toPlainDateTime().equals(p)) return { kind: "inexistente" };
    const earlier = option(a);
    const later = option(l);
    if (choice === null) return { kind: "ambigua", earlier, later };
    return { kind: "ok", ...(choice === "earlier" ? earlier : later), source: "tzdb" };
  }

  const antesDeLaPrimera = z.getTimeZoneTransition("previous") === null && z.getTimeZoneTransition("next") !== null;
  if (antesDeLaPrimera) {
    const offsetSeconds = Math.round(b.lon * 240);
    return { kind: "ok", utc: utcFromOffset(b.date, b.time, offsetSeconds), offsetSeconds, source: "lmt" };
  }
  return { kind: "ok", ...option(z), source: "tzdb" };
}

export function formatOffset(offsetSeconds: number): string {
  if (offsetSeconds === 0) return "UTC+0";
  const sign = offsetSeconds < 0 ? "−" : "+";
  const abs = Math.abs(offsetSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `UTC${sign}${h}${m || s ? `:${pad(m)}` : ""}${s ? `:${pad(s)}` : ""}`;
}

export function tzdataVersion(): string {
  return process.versions.tz ?? "desconocida";
}
```

- [ ] **Step 4: Correr y ver que pasa, también en Node 22**

Run: `cd webApp && npx vitest run src/lib/astro/time.test.ts`
Expected: PASS (22 tests). Si algún offset no coincide, imprimir `process.versions.tz`: los casos se midieron con tzdata 2026e (Node 22.23.4); no cambiar el valor esperado sin citar la línea del tzdb que lo justifica.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/time.ts webApp/src/lib/astro/time.test.ts
git commit -m "feat(carta-natal): hora local a UTC con Temporal en modo reject, ambiguas, inexistentes y LMT por longitud

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fixtures de referencia (JPL Horizons y oráculo Swiss Ephemeris)

Los números de referencia no se escriben a mano: salen de dos fuentes reproducibles. Los dos JSON se commitean; CI nunca consulta la red (`motor-de-calculo.md` §8.1).

**Files:**
- Create: `webApp/scripts/astro-horizons-fixtures.mjs`
- Create: `webApp/src/lib/astro/__fixtures__/horizons.json` (generado)
- Create: `webApp/src/lib/astro/__fixtures__/swe.json` (generado fuera del repo)
- Test: `webApp/src/lib/astro/__fixtures__/fixtures.test.ts`

**Interfaces:**
- Produces:
  - `horizons.json`: `{ _meta: { fuente, consultado, url }, jdsTT: number[], bodies: Record<"sol"|"luna"|"mercurio"|"venus"|"marte"|"jupiter"|"saturno"|"urano"|"neptuno"|"pluton"|"quiron", { jdTT: number; lon: number }[]>, moonNode: { jdTDB: number; om: number }[] }` — longitud q31 en grados (5 fechas: 1900-01-01, 1950-01-01, 1990-06-15 12:00, 2026-11-07, 2100-01-01, en TT) y longitud del nodo ascendente osculante de la Luna en la eclíptica J2000.
  - `swe.json`: `{ _meta: {...}, houses: { armc: number; eps: number; lat: number; cusps: number[] }[], angles: { jdUT: number; lat: number; lon: number; asc: number; mc: number }[], points: { jdUT: number; meanNode: number; meanLilith: number }[] }` — 120 casos de cada uno, semilla 20261108; los tres primeros de `angles` son Buenos Aires, Mendoza y Madrid.

- [ ] **Step 1: Escribir el test de forma que falla**

```ts
// webApp/src/lib/astro/__fixtures__/fixtures.test.ts
import { describe, expect, it } from "vitest";
import horizons from "./horizons.json";
import swe from "./swe.json";

describe("fixtures del motor", () => {
  it("horizons.json: 11 cuerpos × 5 fechas TT y el nodo de la Luna en las mismas 5", () => {
    expect(horizons.jdsTT).toEqual([2415020.5, 2433282.5, 2448058.0, 2461351.5, 2488069.5]);
    expect(Object.keys(horizons.bodies).sort()).toEqual(["jupiter", "luna", "marte", "mercurio", "neptuno", "pluton", "quiron", "saturno", "sol", "urano", "venus"]);
    for (const rows of Object.values(horizons.bodies)) {
      expect(rows.map((r) => r.jdTT)).toEqual(horizons.jdsTT);
      for (const r of rows) {
        expect(r.lon).toBeGreaterThanOrEqual(0);
        expect(r.lon).toBeLessThan(360);
      }
    }
    expect(horizons.moonNode).toHaveLength(5);
    expect(horizons._meta.fuente).toMatch(/Horizons/);
  });

  it("swe.json: 120 casos por grupo, 12 cúspides, latitudes hasta ±66° y la nota de licencia", () => {
    expect(swe.houses).toHaveLength(120);
    expect(swe.angles).toHaveLength(120);
    expect(swe.points).toHaveLength(120);
    for (const h of swe.houses) expect(h.cusps).toHaveLength(12);
    expect(Math.max(...swe.angles.map((a) => Math.abs(a.lat)))).toBeLessThanOrEqual(66);
    expect(swe._meta.fuente).toMatch(/ningun codigo de Swiss Ephemeris en este repo/);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/__fixtures__/fixtures.test.ts`
Expected: FAIL (no se puede resolver `./horizons.json`).

- [ ] **Step 3: Script de Horizons** (consulta documentada en `motor-de-calculo.md` §8.1: quantity 31, `TIME_TYPE='TT'`; los elementos osculantes solo aceptan TDB, así que esa consulta no lleva `TIME_TYPE`)

```js
// webApp/scripts/astro-horizons-fixtures.mjs
// Uso (a mano, nunca en CI): node scripts/astro-horizons-fixtures.mjs src/lib/astro/__fixtures__/horizons.json
import { writeFile } from "node:fs/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
// 1900-01-01, 1950-01-01, 1990-06-15 12:00, 2026-11-07, 2100-01-01 (TT)
const JDS_TT = [2415020.5, 2433282.5, 2448058.0, 2461351.5, 2488069.5];
const BODIES = {
  sol: "10", luna: "301", mercurio: "199", venus: "299", marte: "499", jupiter: "599",
  saturno: "699", urano: "799", neptuno: "899", pluton: "999", quiron: "2060;",
};

async function horizons(params) {
  const res = await fetch(`${API}?${new URLSearchParams({ format: "json", OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", ...params })}`);
  if (!res.ok) throw new Error(`Horizons respondió ${res.status}`);
  const { result } = await res.json();
  const block = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!block) throw new Error(`sin $$SOE:\n${result.slice(0, 2000)}`);
  return { result, lines: block.trim().split("\n") };
}

async function q31(command) {
  const { lines } = await horizons({
    COMMAND: `'${command}'`, EPHEM_TYPE: "'OBSERVER'", CENTER: "'500@399'", QUANTITIES: "'31'",
    ANG_FORMAT: "'DEG'", EXTRA_PREC: "'YES'", TIME_TYPE: "'TT'", TLIST_TYPE: "'JD'",
    TLIST: `'${JDS_TT.join(" ")}'`, CAL_FORMAT: "'JD'",
  });
  const rows = lines.map((l) => l.trim().split(/\s+/).map(Number)).map(([jdTT, lon]) => ({ jdTT, lon }));
  if (rows.length !== JDS_TT.length) throw new Error(`${command}: ${rows.length} filas`);
  return rows;
}

async function moonNode() {
  const { result, lines } = await horizons({
    COMMAND: "'301'", EPHEM_TYPE: "'ELEMENTS'", CENTER: "'500@399'", REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'J2000'", TLIST_TYPE: "'JD'", TLIST: `'${JDS_TT.join(" ")}'`, CSV_FORMAT: "'YES'",
  });
  const header = result.split("$$SOE")[0].split("\n").filter((l) => l.includes("JDTDB")).pop();
  const cols = header.split(",").map((s) => s.trim());
  const iOM = cols.indexOf("OM");
  if (iOM < 0) throw new Error("sin columna OM");
  return lines.map((l) => l.split(",").map((s) => s.trim())).map((c) => ({ jdTDB: Number(c[0]), om: Number(c[iOM]) }));
}

const bodies = {};
for (const [id, cmd] of Object.entries(BODIES)) bodies[id] = await q31(cmd);
const out = {
  _meta: {
    fuente: "JPL Horizons API (DE441). Cuerpos: QUANTITIES=31, CENTER=500@399, TIME_TYPE=TT. moonNode: ELEMENTS de 301, eclíptica J2000, TDB.",
    consultado: new Date().toISOString().slice(0, 10),
    url: API,
  },
  jdsTT: JDS_TT,
  bodies,
  moonNode: await moonNode(),
};
await writeFile(process.argv[2], JSON.stringify(out, null, 2) + "\n");
console.log("ok", Object.keys(bodies).length, "cuerpos");
```

Run: `cd webApp && node scripts/astro-horizons-fixtures.mjs src/lib/astro/__fixtures__/horizons.json`
Expected: `ok 11 cuerpos`. (Medido al escribir este plan: Sol en JD 2448058.0 TT da 84.1289103; si el número difiere en más de 0,001°, revisar la consulta antes de seguir.)

- [ ] **Step 4: Oráculo de Swiss Ephemeris, FUERA del repo** (`motor-de-calculo.md` §4.5 y §8.3: ejecutarla en privado es legítimo; al repo entran solo números). Confirmar D-2 con el PO antes de commitear este archivo.

```bash
ORACULO=$(mktemp -d) && cd "$ORACULO" && python3 -m venv venv && ./venv/bin/pip install -q pyswisseph==2.10.3.2
cat > "$ORACULO/swe-fixtures.py" <<'PY'
import json, random, sys
import swisseph as swe
rnd = random.Random(20261108)
J1900, J2100 = 2415020.5, 2488433.5
named = [(-34.60372, -58.38159), (-32.89084, -68.82717), (40.41650, -3.70256)]
houses, angles, points = [], [], []
for k in range(120):
    jd = rnd.uniform(J1900, J2100)
    lat, lon = named[k] if k < len(named) else (rnd.uniform(-66, 66), rnd.uniform(-180, 180))
    _, ascmc = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_MOSEPH)
    angles.append({"jdUT": jd, "lat": lat, "lon": lon, "asc": ascmc[0], "mc": ascmc[1]})
    armc, eps = rnd.uniform(0, 360), rnd.uniform(23.42, 23.46)
    cusps, _ = swe.houses_armc(armc, lat, eps, b'P')
    houses.append({"armc": armc, "eps": eps, "lat": lat, "cusps": list(cusps[:12])})
    points.append({"jdUT": jd,
                   "meanNode": swe.calc_ut(jd, swe.MEAN_NODE, swe.FLG_MOSEPH)[0][0],
                   "meanLilith": swe.calc_ut(jd, swe.MEAN_APOG, swe.FLG_MOSEPH)[0][0]})
meta = {"fuente": "Swiss Ephemeris %s (pyswisseph, modo Moshier) como oraculo; ningun codigo de Swiss Ephemeris en este repo" % swe.version,
        "semilla": 20261108, "generado": "fuera del repo, ver docs/superpowers/plans/2026-11-08-carta-natal.md Task 4"}
json.dump({"_meta": meta, "houses": houses, "angles": angles, "points": points}, open(sys.argv[1], "w"), indent=1)
print("ok", len(houses), len(angles), len(points))
PY
./venv/bin/python -I "$ORACULO/swe-fixtures.py" /Users/gabrielsk/Documents/Proyects/Humano-despierto/webApp/src/lib/astro/__fixtures__/swe.json
```

Expected: `ok 120 120 120`. (El path de salida es el del worktree donde se implementa; ajustarlo si es otro.) No copiar `swe-fixtures.py` al repo.

**Si el PO rechaza D-2:** reemplazar `swe.json` por casos cargados a mano en astro.com (en el navegador, datos propios, `motor-de-calculo.md` §8.3) con la misma forma: 10 entradas en `angles` y 10 en `houses` (con `armc` y `eps` tomados de la tabla de la carta de astro.com), 10 en `points`; ajustar los `toHaveLength(120)` del test a 10.

- [ ] **Step 5: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/__fixtures__/fixtures.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add webApp/scripts/astro-horizons-fixtures.mjs webApp/src/lib/astro/__fixtures__/
git commit -m "test(carta-natal): fixtures de JPL Horizons y del oráculo Swiss Ephemeris (solo números)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Efemérides de Sol a Plutón (`ephemeris.ts`)

**Files:**
- Create: `webApp/src/lib/astro/ephemeris.ts`
- Test: `webApp/src/lib/astro/ephemeris.test.ts`

**Interfaces:**
- Consumes: `norm360`, `arcsecBetween`, `PlanetId` (Task 2); `horizons.json` (Task 4).
- Produces: `apparentLongitude(body: PlanetId, t: AstroTime): number` (grados, [0,360)), `speedOf(f: (t: AstroTime) => number, t: AstroTime): number` (grados/día, diferencia central de ±0,5 días), `J2000_JD = 2451545.0`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/ephemeris.test.ts
import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import { J2000_JD, apparentLongitude, speedOf } from "./ephemeris";
import { PLANET_IDS, arcsecBetween } from "./zodiac";

// Spec §2: planetas ≤30″, Luna ≤10″ contra JPL (medido: ≤15″ y ≤3,2″, motor-de-calculo.md §1.3).
const TOLERANCIA = (b: string) => (b === "luna" ? 10 : 30);

describe("longitud geocéntrica aparente de la fecha contra JPL Horizons q31", () => {
  for (const body of PLANET_IDS) {
    it(`${body} en 1900, 1950, 1990, 2026 y 2100`, () => {
      for (const row of horizons.bodies[body]) {
        const t = AstroTime.FromTerrestrialTime(row.jdTT - J2000_JD);
        expect(arcsecBetween(apparentLongitude(body, t), row.lon), `${body} JD ${row.jdTT}`).toBeLessThanOrEqual(TOLERANCIA(body));
      }
    });
  }
});

describe("velocidad", () => {
  it("la Luna anda entre 11,8° y 15,3° por día (motor-de-calculo.md §9.1)", () => {
    for (const jd of horizons.jdsTT) {
      const v = speedOf((t) => apparentLongitude("luna", t), AstroTime.FromTerrestrialTime(jd - J2000_JD));
      expect(v).toBeGreaterThan(11.5);
      expect(v).toBeLessThan(15.5);
    }
  });

  it("Mercurio se vuelve retrógrado al menos una vez en 1990 y el Sol nunca", () => {
    const inicio = AstroTime.FromTerrestrialTime(2447892.5 - J2000_JD);
    const dias = [...Array(365).keys()].map((d) => inicio.AddDays(d));
    expect(dias.some((t) => speedOf((x) => apparentLongitude("mercurio", x), t) < 0)).toBe(true);
    expect(dias.every((t) => speedOf((x) => apparentLongitude("sol", x), t) > 0.9)).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/ephemeris.test.ts`
Expected: FAIL (no se puede resolver `./ephemeris`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/ephemeris.ts
import { type AstroTime, Body, Ecliptic, EclipticGeoMoon, GeoVector } from "astronomy-engine";
import { type PlanetId, norm360 } from "./zodiac";

export const J2000_JD = 2451545.0;

const AE_BODY: Record<Exclude<PlanetId, "luna">, Body> = {
  sol: Body.Sun, mercurio: Body.Mercury, venus: Body.Venus, marte: Body.Mars, jupiter: Body.Jupiter,
  saturno: Body.Saturn, urano: Body.Uranus, neptuno: Body.Neptune, pluton: Body.Pluto,
};

// Ecliptic() aplica precesión + nutación y rota con la oblicuidad VERDADERA: es la longitud de la
// fecha. EclipticLongitude() es heliocéntrica y Rotation_EQJ_ECL es J2000: las dos dan cartas mal.
export function apparentLongitude(body: PlanetId, t: AstroTime): number {
  if (body === "luna") return norm360(EclipticGeoMoon(t).lon);
  return norm360(Ecliptic(GeoVector(AE_BODY[body], t, true)).elon);
}

export function speedOf(f: (t: AstroTime) => number, t: AstroTime): number {
  const delta = f(t.AddDays(0.5)) - f(t.AddDays(-0.5));
  return norm360(delta + 180) - 180;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/ephemeris.test.ts`
Expected: PASS (12 tests). Medido con este código al escribir el plan: Sol 1,2″, Luna 3,2″, Venus 14,8″, Neptuno 14,8″.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/ephemeris.ts webApp/src/lib/astro/ephemeris.test.ts
git commit -m "feat(carta-natal): efemérides aparentes de la fecha sobre astronomy-engine, contra JPL Horizons

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ascendente y Medio Cielo (`angles.ts`)

**Files:**
- Create: `webApp/src/lib/astro/angles.ts`
- Test: `webApp/src/lib/astro/angles.test.ts`

**Interfaces:**
- Consumes: `norm360`, `arcsecBetween` (Task 2); `J2000_JD` (Task 5); `swe.json` (Task 4).
- Produces: `type Angles = { asc: number; mc: number; ramc: number; eps: number }`, `trueObliquity(t: AstroTime): number`, `localSiderealDegrees(t: AstroTime, lon: number): number`, `midheaven(ramc: number, eps: number): number`, `ascendant(ramc: number, eps: number, lat: number): number`, `eclipticToEquatorial(lon: number, eps: number): { ra: number; dec: number }` (grados), `computeAngles(t: AstroTime, lat: number, lon: number): Angles`.

Fórmulas (`motor-de-calculo.md` §3.1): `MC = atan2(sin θ, cos θ·cos ε)`, `ASC = atan2(cos θ, −(sin θ·cos ε + tan φ·sin ε))`. Convención de latitudes altas (§3.2, la de Swiss Ephemeris/astro.com): el ASC queda **siempre en el hemisferio este**; si el ángulo horario del punto da oeste, se suma 180°.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/angles.test.ts
import { describe, expect, it } from "vitest";
import { AstroTime, Horizon, Observer } from "astronomy-engine";
import swe from "./__fixtures__/swe.json";
import { ascendant, computeAngles, eclipticToEquatorial, midheaven } from "./angles";
import { J2000_JD } from "./ephemeris";
import { arcsecBetween, norm360 } from "./zodiac";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("ángulos", () => {
  it("regresión de cuadrante: θ=100°, φ=−34,6° ⇒ ASC 195,43°, no el Descendente 15,43° (§3.1, §10)", () => {
    expect(ascendant(100, 23.4392911, -34.6)).toBeCloseTo(195.43, 2);
  });

  it("ASC y MC contra el oráculo, ≤10″ (incluye Buenos Aires, Mendoza y Madrid)", () => {
    for (const c of swe.angles) {
      const a = computeAngles(new AstroTime(c.jdUT - J2000_JD), c.lat, c.lon);
      expect(arcsecBetween(a.asc, c.asc), `ASC ${c.jdUT} ${c.lat}`).toBeLessThanOrEqual(10);
      expect(arcsecBetween(a.mc, c.mc), `MC ${c.jdUT} ${c.lat}`).toBeLessThanOrEqual(10);
    }
  });

  it("el ASC sale por el este a cualquier latitud, incluso pasado el círculo polar", () => {
    const rnd = mulberry32(20261108);
    for (let i = 0; i < 500; i++) {
      const t = new AstroTime(-36524 + rnd() * 73048);
      const lat = (rnd() * 2 - 1) * 89.9;
      const lon = rnd() * 360 - 180;
      const a = computeAngles(t, lat, lon);
      const { ra, dec } = eclipticToEquatorial(a.asc, a.eps);
      const h = Horizon(t, new Observer(lat, lon, 0), ra / 15, dec, undefined);
      expect(h.azimuth, `lat ${lat}`).toBeGreaterThan(0);
      expect(h.azimuth, `lat ${lat}`).toBeLessThan(180);
    }
  });

  it("el MC tiene ascensión recta igual al RAMC", () => {
    for (const ramc of [0, 45, 100, 200, 359]) {
      const mc = midheaven(ramc, 23.44);
      expect(eclipticToEquatorial(mc, 23.44).ra).toBeCloseTo(norm360(ramc), 9);
    }
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/angles.test.ts`
Expected: FAIL (no se puede resolver `./angles`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/angles.ts
import { type AstroTime, SiderealTime, e_tilt } from "astronomy-engine";
import { norm360 } from "./zodiac";

const RAD = Math.PI / 180;

export type Angles = { asc: number; mc: number; ramc: number; eps: number };

export function trueObliquity(t: AstroTime): number {
  return e_tilt(t).tobl;
}

// SiderealTime es GAST (incluye la ecuación de los equinoccios), en horas.
export function localSiderealDegrees(t: AstroTime, lon: number): number {
  return norm360(SiderealTime(t) * 15 + lon);
}

export function eclipticToEquatorial(lon: number, eps: number): { ra: number; dec: number } {
  const l = lon * RAD;
  const e = eps * RAD;
  return {
    ra: norm360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) / RAD),
    dec: Math.asin(Math.sin(e) * Math.sin(l)) / RAD,
  };
}

export function midheaven(ramc: number, eps: number): number {
  const th = ramc * RAD;
  return norm360(Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps * RAD)) / RAD);
}

export function ascendant(ramc: number, eps: number, lat: number): number {
  const th = ramc * RAD;
  const e = eps * RAD;
  let asc = norm360(Math.atan2(Math.cos(th), -(Math.sin(th) * Math.cos(e) + Math.tan(lat * RAD) * Math.sin(e))) / RAD);
  // Ángulo horario en [0,180) = el punto está al oeste: pasado el círculo polar la fórmula puede
  // devolver el punto que se pone. Convención de Swiss Ephemeris: el ASC siempre al este.
  if (norm360(ramc - eclipticToEquatorial(asc, eps).ra) < 180) asc = norm360(asc + 180);
  return asc;
}

export function computeAngles(t: AstroTime, lat: number, lon: number): Angles {
  const eps = trueObliquity(t);
  const ramc = localSiderealDegrees(t, lon);
  return { asc: ascendant(ramc, eps, lat), mc: midheaven(ramc, eps), ramc, eps };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/angles.test.ts`
Expected: PASS (4 tests). Medido al escribir el plan: ASC ≤3,2″ y MC ≤2,1″ contra el oráculo; 0 de 5.000 casos al oeste con la regla, 409 sin ella.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/angles.ts webApp/src/lib/astro/angles.test.ts
git commit -m "feat(carta-natal): Ascendente y Medio Cielo con la convención del hemisferio este

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Casas Placidus y Whole Sign (`houses.ts`)

**Files:**
- Create: `webApp/src/lib/astro/houses.ts`
- Test: `webApp/src/lib/astro/houses.test.ts`

**Interfaces:**
- Consumes: `ascendant`, `midheaven`, `Angles` (Task 6); `norm360`, `arcsecBetween`, `HouseSystem` (Task 2); `swe.json`.
- Produces: `PLACIDUS_MAX_LAT = 66`, `type Houses = { system: HouseSystem; cusps: number[]; fallback: boolean }` (`cusps[0]` = casa 1), `placidusCusps(ramc: number, eps: number, lat: number): number[] | null`, `wholeSignCusps(asc: number): number[]`, `computeHouses(requested: HouseSystem, a: Angles, lat: number): Houses`, `houseOf(lon: number, cusps: readonly number[]): number` (1..12).

Algoritmo (`motor-de-calculo.md` §4.2, derivado de la definición, no de código ajeno): trisección en tiempo del semiarco; iterar hasta `|Δα| < 1e-9°`, máximo 100 vueltas; si `|tan φ · tan δ| > 1` o no converge, `null`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/houses.test.ts
import { describe, expect, it } from "vitest";
import swe from "./__fixtures__/swe.json";
import { ascendant, midheaven } from "./angles";
import { computeHouses, houseOf, placidusCusps, wholeSignCusps } from "./houses";
import { arcsecBetween, norm360 } from "./zodiac";

describe("Placidus", () => {
  it("las 12 cúspides contra el oráculo, ≤10″", () => {
    for (const h of swe.houses) {
      const c = placidusCusps(h.armc, h.eps, h.lat);
      expect(c, `lat ${h.lat}`).not.toBeNull();
      c!.forEach((x, i) => expect(arcsecBetween(x, h.cusps[i]!), `casa ${i + 1} lat ${h.lat}`).toBeLessThanOrEqual(10));
    }
  });

  it("las opuestas difieren 180° y 1/10 son ASC/MC", () => {
    const c = placidusCusps(100, 23.44, -34.6)!;
    for (let i = 0; i < 6; i++) expect(norm360(c[i + 6]! - c[i]!)).toBeCloseTo(180, 9);
    expect(c[0]).toBeCloseTo(ascendant(100, 23.44, -34.6), 9);
    expect(c[9]).toBeCloseTo(midheaven(100, 23.44), 9);
  });

  it("a 70° no existe: computeHouses cae a Whole Sign y lo informa", () => {
    const a = { asc: ascendant(100, 23.44, 70), mc: midheaven(100, 23.44), ramc: 100, eps: 23.44 };
    const h = computeHouses("placidus", a, 70);
    expect(h).toMatchObject({ system: "whole_sign", fallback: true });
    expect(h.cusps).toEqual(wholeSignCusps(a.asc));
  });
});

describe("Whole Sign y casa de un punto", () => {
  it("cúspides múltiplos de 30 y la 1 contiene al ASC", () => {
    const c = wholeSignCusps(97.25);
    expect(c[0]).toBe(90);
    expect(c.every((x) => x % 30 === 0)).toBe(true);
    expect(c[11]).toBe(60);
  });

  it("elegido a mano no es fallback", () => {
    const a = { asc: 97.25, mc: 10, ramc: 12, eps: 23.44 };
    expect(computeHouses("whole_sign", a, -34.6)).toMatchObject({ system: "whole_sign", fallback: false });
  });

  it("houseOf respeta el cruce por 0° y los bordes", () => {
    const c = wholeSignCusps(345);
    expect(houseOf(330, c)).toBe(1);
    expect(houseOf(359.99, c)).toBe(1);
    expect(houseOf(0, c)).toBe(2);
    expect(houseOf(329.99, c)).toBe(12);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/houses.test.ts`
Expected: FAIL (no se puede resolver `./houses`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/houses.ts
import { type Angles, ascendant, midheaven } from "./angles";
import { type HouseSystem, norm360 } from "./zodiac";

const RAD = Math.PI / 180;
export const PLACIDUS_MAX_LAT = 66;

export type Houses = { system: HouseSystem; cusps: number[]; fallback: boolean };

function placidusCusp(ramc: number, eps: number, lat: number, f: number, aboveHorizon: boolean): number | null {
  const e = eps * RAD;
  const lambdaOf = (alpha: number) => norm360(Math.atan2(Math.sin(alpha * RAD), Math.cos(alpha * RAD) * Math.cos(e)) / RAD);
  const decOf = (lambda: number) => Math.asin(Math.sin(e) * Math.sin(lambda * RAD));
  let alpha = ramc + (aboveHorizon ? f * 90 : 180 - f * 90);
  for (let i = 0; i < 100; i++) {
    const x = -Math.tan(lat * RAD) * Math.tan(decOf(lambdaOf(alpha)));
    if (Math.abs(x) > 1) return null;
    const sda = Math.acos(x) / RAD;
    const next = aboveHorizon ? ramc + f * sda : ramc + 180 - f * (180 - sda);
    const delta = Math.abs(norm360(next - alpha + 180) - 180);
    alpha = next;
    if (delta < 1e-9) return lambdaOf(alpha);
  }
  return null;
}

export function placidusCusps(ramc: number, eps: number, lat: number): number[] | null {
  const c11 = placidusCusp(ramc, eps, lat, 1 / 3, true);
  const c12 = placidusCusp(ramc, eps, lat, 2 / 3, true);
  const c2 = placidusCusp(ramc, eps, lat, 2 / 3, false);
  const c3 = placidusCusp(ramc, eps, lat, 1 / 3, false);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  const asc = ascendant(ramc, eps, lat);
  const mc = midheaven(ramc, eps);
  const first = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180)];
  return [...first, ...first.map((x) => norm360(x + 180))];
}

export function wholeSignCusps(asc: number): number[] {
  const first = Math.floor(norm360(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(first + 30 * i));
}

export function computeHouses(requested: HouseSystem, a: Angles, lat: number): Houses {
  if (requested === "whole_sign") return { system: "whole_sign", cusps: wholeSignCusps(a.asc), fallback: false };
  const cusps = Math.abs(lat) > PLACIDUS_MAX_LAT ? null : placidusCusps(a.ramc, a.eps, lat);
  if (cusps === null) return { system: "whole_sign", cusps: wholeSignCusps(a.asc), fallback: true };
  return { system: "placidus", cusps, fallback: false };
}

export function houseOf(lon: number, cusps: readonly number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i]!;
    const span = norm360(cusps[(i + 1) % 12]! - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 12;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/houses.test.ts`
Expected: PASS (6 tests). Medido al escribir el plan: máximo 0,001″ contra `houses_armc` (misma geometría, sin ΔT).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/houses.ts webApp/src/lib/astro/houses.test.ts
git commit -m "feat(carta-natal): casas Placidus iterativas y Whole Sign, con fallback por encima de 66°

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Nodos y Lilith (`points.ts`)

**Files:**
- Create: `webApp/src/lib/astro/points.ts`
- Test: `webApp/src/lib/astro/points.test.ts`

**Interfaces:**
- Consumes: `norm360`, `arcsecBetween` (Task 2); `J2000_JD` (Task 5); `swe.json`, `horizons.json`.
- Produces: `meanNodeLongitude(t: AstroTime): number`, `trueNodeLongitude(t: AstroTime, frame?: "date" | "j2000"): number` (por defecto `"date"`), `meanLilithLongitude(t: AstroTime, projected?: boolean): number` (por defecto `true`; `false` existe solo para el test de regresión).

Fórmulas (`motor-de-calculo.md` §5.1, §5.2, §6.1; Meeus cap. 47): `T = tt/36525`; `Ω = 125.0445479 − 1934.1362891T + 0.0020754T² + T³/467441 − T⁴/60616000`; `Π = 83.3532465 + 4069.0137287T − 0.0103200T² − T³/80053 + T⁴/18999000`; `i = 5.1453964°`; Lilith = `Ω + atan2(cos i · sin u, cos u) + Δψ` con `u = Π + 180° − Ω`; nodo medio = `Ω + Δψ`; nodo verdadero = dirección de `ẑ × h` con `h = r × v` del estado geocéntrico de la Luna rotado a la eclíptica.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/points.test.ts
import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import swe from "./__fixtures__/swe.json";
import { J2000_JD } from "./ephemeris";
import { meanLilithLongitude, meanNodeLongitude, trueNodeLongitude } from "./points";
import { arcsecBetween } from "./zodiac";

const at = (jdUT: number) => new AstroTime(jdUT - J2000_JD);

describe("puntos lunares", () => {
  it("nodo medio y Lilith media contra el oráculo, ≤10″ (medido 0,3″ y 1,1″)", () => {
    for (const p of swe.points) {
      expect(arcsecBetween(meanNodeLongitude(at(p.jdUT)), p.meanNode), `nodo ${p.jdUT}`).toBeLessThanOrEqual(10);
      expect(arcsecBetween(meanLilithLongitude(at(p.jdUT)), p.meanLilith), `lilith ${p.jdUT}`).toBeLessThanOrEqual(10);
    }
  });

  it("regresión: Lilith SIN proyectar a la eclíptica se aparta minutos (§6.1, hasta 417″)", () => {
    const peor = Math.max(...swe.points.map((p) => arcsecBetween(meanLilithLongitude(at(p.jdUT), false), p.meanLilith)));
    expect(peor).toBeGreaterThan(60);
  });

  it("nodo verdadero en J2000 contra los elementos osculantes de Horizons, ≤15″ (§8.2)", () => {
    for (const n of horizons.moonNode) {
      const t = AstroTime.FromTerrestrialTime(n.jdTDB - J2000_JD);
      expect(arcsecBetween(trueNodeLongitude(t, "j2000"), n.om), `JD ${n.jdTDB}`).toBeLessThanOrEqual(15);
    }
  });

  it("el nodo verdadero de la fecha oscila a menos de 2° del medio (§5.2: máx 1,74°)", () => {
    for (const p of swe.points) {
      expect(arcsecBetween(trueNodeLongitude(at(p.jdUT)), meanNodeLongitude(at(p.jdUT))) / 3600).toBeLessThan(2);
    }
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/points.test.ts`
Expected: FAIL (no se puede resolver `./points`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/points.ts
import { type AstroTime, GeoMoonState, RotateState, Rotation_EQJ_ECL, Rotation_EQJ_ECT, e_tilt } from "astronomy-engine";
import { norm360 } from "./zodiac";

const RAD = Math.PI / 180;
const MOON_INCLINATION = 5.1453964;

function meanElements(t: AstroTime) {
  const T = t.tt / 36525;
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000;
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T ** 3 / 80053 + T ** 4 / 18999000;
  return { omega, perigee, dpsi: e_tilt(t).dpsi / 3600 };
}

export function meanNodeLongitude(t: AstroTime): number {
  const { omega, dpsi } = meanElements(t);
  return norm360(omega + dpsi);
}

// El apogeo medio se mueve sobre la órbita lunar media, inclinada 5°: sin proyectarlo a la
// eclíptica el error llega a 7′ (motor-de-calculo.md §6.1).
export function meanLilithLongitude(t: AstroTime, projected = true): number {
  const { omega, perigee, dpsi } = meanElements(t);
  const apogee = perigee + 180;
  if (!projected) return norm360(apogee + dpsi);
  const u = (apogee - omega) * RAD;
  const i = MOON_INCLINATION * RAD;
  return norm360(omega + Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) / RAD + dpsi);
}

export function trueNodeLongitude(t: AstroTime, frame: "date" | "j2000" = "date"): number {
  const s = RotateState(frame === "date" ? Rotation_EQJ_ECT(t) : Rotation_EQJ_ECL(), GeoMoonState(t));
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  return norm360(Math.atan2(hx, -hy) / RAD);
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/points.test.ts`
Expected: PASS (4 tests). Medido al escribir el plan: nodo medio 0,23″, Lilith 1,08″, nodo verdadero 0,2″-10,8″ (el peor, 2100).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/points.ts webApp/src/lib/astro/points.test.ts
git commit -m "feat(carta-natal): nodo verdadero, nodo medio y Lilith media proyectada a la eclíptica

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Quirón (`chiron.ts` + tabla de Horizons)

**Files:**
- Create: `webApp/scripts/astro-chiron-table.mjs`
- Create: `webApp/src/lib/astro/data/chiron.json` (generado)
- Create: `webApp/src/lib/astro/chiron.ts`
- Create: `webApp/src/lib/astro/CREDITS.md`
- Test: `webApp/src/lib/astro/chiron.test.ts`

**Interfaces:**
- Consumes: `norm360`, `arcsecBetween` (Task 2); `J2000_JD` (Task 5); `horizons.json`.
- Produces: `chironLongitude(t: AstroTime): number` (lanza `RangeError` fuera de la tabla), `CHIRON_TABLE_RANGE_JD_TT: readonly [number, number]`.

Pipeline (`motor-de-calculo.md` §7.2): tabla heliocéntrica ICRF cada 30 días (JD TT 2414900.5 a 2488580.5: cubre 1900-01-01 a 2100-12-31 con más de 60 días de margen a cada lado) → Lagrange de 4 puntos → tiempo de luz iterado con la Tierra de `HelioState` → aberración anual de primer orden → `Ecliptic()`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/chiron.test.ts
import { describe, expect, it } from "vitest";
import { AstroTime } from "astronomy-engine";
import horizons from "./__fixtures__/horizons.json";
import { CHIRON_TABLE_RANGE_JD_TT, chironLongitude } from "./chiron";
import { J2000_JD } from "./ephemeris";
import { arcsecBetween } from "./zodiac";

describe("Quirón", () => {
  it("contra Horizons q31 en 1900, 1950, 1990, 2026 y 2100: ≤5″ (medido 0,35″)", () => {
    for (const r of horizons.bodies.quiron) {
      const t = AstroTime.FromTerrestrialTime(r.jdTT - J2000_JD);
      expect(arcsecBetween(chironLongitude(t), r.lon), `JD ${r.jdTT}`).toBeLessThanOrEqual(5);
    }
  });

  it("la tabla cubre 1900-01-01 y 2100-12-31 con margen, y fuera de ella lanza", () => {
    const [desde, hasta] = CHIRON_TABLE_RANGE_JD_TT;
    expect(desde).toBeLessThan(2415020.5 - 60);
    expect(hasta).toBeGreaterThan(2488433.5 + 60);
    expect(() => chironLongitude(AstroTime.FromTerrestrialTime(2414000.5 - J2000_JD))).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/chiron.test.ts`
Expected: FAIL (no se puede resolver `./chiron`).

- [ ] **Step 3: Script de la tabla y generación**

```js
// webApp/scripts/astro-chiron-table.mjs
// Uso (a mano, nunca en CI): node scripts/astro-chiron-table.mjs src/lib/astro/data/chiron.json
import { writeFile } from "node:fs/promises";

const API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const params = new URLSearchParams({
  format: "json", COMMAND: "'2060;'", OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'VECTORS'",
  CENTER: "'500@10'", REF_PLANE: "'FRAME'", REF_SYSTEM: "'ICRF'", OUT_UNITS: "'AU-D'", VEC_TABLE: "'1'",
  VEC_CORR: "'NONE'", CSV_FORMAT: "'YES'", TIME_TYPE: "'TT'",
  START_TIME: "'JD 2414900.5'", STOP_TIME: "'JD 2488580.5'", STEP_SIZE: "'30 d'",
});
const res = await fetch(`${API}?${params}`);
if (!res.ok) throw new Error(`Horizons respondió ${res.status}`);
const { result } = await res.json();
const block = result.split("$$SOE")[1]?.split("$$EOE")[0];
if (!block) throw new Error(result.slice(0, 3000));
const rows = block.trim().split("\n").map((l) => l.split(",").map((s) => s.trim()));
const jd0TT = Number(rows[0][0]);
rows.forEach((r, i) => {
  if (Math.abs(Number(r[0]) - (jd0TT + 30 * i)) > 1e-6) throw new Error(`paso irregular en la fila ${i}`);
});
const out = {
  _meta: {
    fuente: "JPL Horizons API, 2060 Chiron, VECTORS heliocéntricos, REF_SYSTEM=ICRF, REF_PLANE=FRAME, VEC_CORR=NONE, TT, paso 30 d",
    consultado: new Date().toISOString().slice(0, 10),
  },
  jd0TT,
  stepDays: 30,
  xyz: rows.map((r) => [2, 3, 4].map((k) => Number(Number(r[k]).toPrecision(12)))),
};
await writeFile(process.argv[2], JSON.stringify(out) + "\n");
console.log("ok", out.xyz.length, "filas desde JD", jd0TT);
```

Run: `cd webApp && mkdir -p src/lib/astro/data && node scripts/astro-chiron-table.mjs src/lib/astro/data/chiron.json`
Expected: `ok 2457 filas desde JD 2414900.5` (≈110 KB).

- [ ] **Step 4: Implementar `chiron.ts` y `CREDITS.md`**

```ts
// webApp/src/lib/astro/chiron.ts
import { type AstroTime, Body, C_AUDAY, Ecliptic, HelioState, Vector } from "astronomy-engine";
import { z } from "@/lib/validation/zod";
import raw from "./data/chiron.json";
import { J2000_JD } from "./ephemeris";
import { norm360 } from "./zodiac";

const table = z
  .object({ jd0TT: z.number(), stepDays: z.literal(30), xyz: z.array(z.tuple([z.number(), z.number(), z.number()])).min(2400) })
  .parse(raw);

export const CHIRON_TABLE_RANGE_JD_TT = [table.jd0TT, table.jd0TT + table.stepDays * (table.xyz.length - 1)] as const;

function helio(jdTT: number): [number, number, number] {
  const s = (jdTT - table.jd0TT) / table.stepDays;
  const i = Math.min(Math.max(Math.floor(s) - 1, 0), table.xyz.length - 4);
  const u = s - i;
  if (s < 1 || s > table.xyz.length - 2) throw new RangeError("Quirón fuera de la tabla 1900-2100");
  const w = [-(u - 1) * (u - 2) * (u - 3) / 6, (u * (u - 2) * (u - 3)) / 2, -(u * (u - 1) * (u - 3)) / 2, (u * (u - 1) * (u - 2)) / 6];
  return [0, 1, 2].map((k) => w.reduce((acc, wj, j) => acc + wj * table.xyz[i + j]![k]!, 0)) as [number, number, number];
}

export function chironLongitude(t: AstroTime): number {
  const earth = HelioState(Body.Earth, t);
  const jdTT = t.tt + J2000_JD;
  let tau = 0;
  let g: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const c = helio(jdTT - tau);
    g = [c[0] - earth.x, c[1] - earth.y, c[2] - earth.z];
    tau = Math.hypot(...g) / C_AUDAY;
  }
  const n = Math.hypot(...g);
  const u = g.map((x) => x / n);
  const beta = [earth.vx / C_AUDAY, earth.vy / C_AUDAY, earth.vz / C_AUDAY];
  const ub = u[0]! * beta[0]! + u[1]! * beta[1]! + u[2]! * beta[2]!;
  const up = u.map((x, k) => x + beta[k]! - x * ub);
  return norm360(Ecliptic(new Vector(up[0]!, up[1]!, up[2]!, t)).elon);
}
```

```markdown
<!-- webApp/src/lib/astro/CREDITS.md -->
# Créditos del motor de carta natal

- **astronomy-engine 2.1.19** — Copyright (c) 2019-2025 Don Cross, licencia MIT. Posiciones de Sol a Plutón,
  precesión, nutación, oblicuidad y tiempo sidéreo. https://github.com/cosinekitty/astronomy
- **Tabla de Quirón** (`data/chiron.json`) — Solar System Dynamics, JPL Horizons (DE441), vectores heliocéntricos de
  2060 Chiron cada 30 días, consultados en la fecha de `_meta.consultado`. Generada con `webApp/scripts/astro-chiron-table.mjs`.
- **Lugares** (tabla `places`) — GeoNames, https://www.geonames.org, licencia Creative Commons Attribution 4.0.
- Fórmulas de ángulos, casas y puntos lunares: Meeus, *Astronomical Algorithms* (2.ª ed.), y la definición de Placidus
  de la documentación pública de Swiss Ephemeris. Ningún código de Swiss Ephemeris está en este repositorio (ADR-017).
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/chiron.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add webApp/scripts/astro-chiron-table.mjs webApp/src/lib/astro/data/chiron.json webApp/src/lib/astro/chiron.ts webApp/src/lib/astro/chiron.test.ts webApp/src/lib/astro/CREDITS.md
git commit -m "feat(carta-natal): Quirón por tabla de JPL Horizons con tiempo de luz y aberración

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Aspectos (`aspects.ts`)

**Files:**
- Create: `webApp/src/lib/astro/aspects.ts`
- Test: `webApp/src/lib/astro/aspects.test.ts`

**Interfaces:**
- Consumes: `PointId`, `norm360` (Task 2).
- Produces: `ASPECTS: readonly { id: AspectId; angle: number; orb: number }[]`, `type AspectId = "conjuncion" | "sextil" | "cuadratura" | "trigono" | "oposicion"`, `type AspectPoint = { id: PointId; lon: number; speed: number }`, `type Aspect = { a: PointId; b: PointId; type: AspectId; orb: number; applying: boolean }`, `separation(a: number, b: number): number` (0..180), `findAspects(points: readonly AspectPoint[]): Aspect[]` (ordenados por orbe creciente; `a` precede a `b` en el orden de entrada).

Reglas: orbes Urania Trust con límite inclusivo; ningún par ángulo-ángulo (ASC-MC); los ángulos natales tienen velocidad 0; aplicativo = el orbe dentro de una hora es menor que el actual.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/aspects.test.ts
import { describe, expect, it } from "vitest";
import { ASPECTS, findAspects, separation } from "./aspects";

describe("aspectos mayores con orbes Urania Trust", () => {
  it("orbes exactos de la spec", () => {
    expect(ASPECTS.map((a) => [a.id, a.angle, a.orb])).toEqual([
      ["conjuncion", 0, 8], ["sextil", 60, 4], ["cuadratura", 90, 5], ["trigono", 120, 5], ["oposicion", 180, 8],
    ]);
  });

  it("separación por el camino corto", () => {
    expect(separation(350, 10)).toBeCloseTo(20, 10);
    expect(separation(10, 190)).toBeCloseTo(180, 10);
  });

  it("límites inclusivos de orbe", () => {
    const at = (b: number) => findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "marte", lon: b, speed: 0.5 }]).map((a) => a.type);
    expect(at(18)).toEqual(["conjuncion"]);
    expect(at(18.01)).toEqual([]);
    expect(at(74)).toEqual(["sextil"]);
    expect(at(74.01)).toEqual([]);
    expect(at(105)).toEqual(["cuadratura"]);
    expect(at(135)).toEqual(["trigono"]);
    expect(at(198)).toEqual(["oposicion"]);
  });

  it("aplicativo y separativo según velocidades, también con un retrógrado", () => {
    const [sep] = findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "luna", lon: 17, speed: 13 }]);
    expect(sep).toMatchObject({ type: "conjuncion", applying: false });
    expect(sep!.orb).toBeCloseTo(7, 10);
    const [apl] = findAspects([{ id: "sol", lon: 10, speed: 1 }, { id: "luna", lon: 3, speed: 13 }]);
    expect(apl).toMatchObject({ applying: true });
    const [retro] = findAspects([{ id: "venus", lon: 100, speed: 0 }, { id: "mercurio", lon: 192, speed: -0.5 }]);
    expect(retro).toMatchObject({ type: "cuadratura", applying: true });
  });

  it("no aspecta ASC con MC y ordena por orbe", () => {
    const r = findAspects([
      { id: "asc", lon: 0, speed: 0 }, { id: "mc", lon: 90, speed: 0 },
      { id: "sol", lon: 92, speed: 1 }, { id: "luna", lon: 181, speed: 13 },
    ]);
    expect(r.some((a) => a.a === "asc" && a.b === "mc")).toBe(false);
    expect(r.map((a) => a.orb)).toEqual([...r.map((a) => a.orb)].sort((x, y) => x - y));
    expect(r[0]).toMatchObject({ a: "asc", b: "luna", type: "oposicion" });
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/aspects.test.ts`
Expected: FAIL (no se puede resolver `./aspects`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/aspects.ts
import { type PointId, norm360 } from "./zodiac";

export const ASPECTS = [
  { id: "conjuncion", angle: 0, orb: 8 },
  { id: "sextil", angle: 60, orb: 4 },
  { id: "cuadratura", angle: 90, orb: 5 },
  { id: "trigono", angle: 120, orb: 5 },
  { id: "oposicion", angle: 180, orb: 8 },
] as const;
export type AspectId = (typeof ASPECTS)[number]["id"];
export type AspectPoint = { id: PointId; lon: number; speed: number };
export type Aspect = { a: PointId; b: PointId; type: AspectId; orb: number; applying: boolean };

const ONE_HOUR = 1 / 24;
const isAngle = (id: PointId) => id === "asc" || id === "mc";

export function separation(a: number, b: number): number {
  return Math.abs(norm360(a - b + 180) - 180);
}

export function findAspects(points: readonly AspectPoint[]): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i]!;
      const q = points[j]!;
      if (isAngle(p.id) && isAngle(q.id)) continue;
      const sep = separation(p.lon, q.lon);
      const match = ASPECTS.find((asp) => Math.abs(sep - asp.angle) <= asp.orb);
      if (!match) continue;
      const orb = Math.abs(sep - match.angle);
      const later = Math.abs(separation(p.lon + p.speed * ONE_HOUR, q.lon + q.speed * ONE_HOUR) - match.angle);
      out.push({ a: p.id, b: q.id, type: match.id, orb, applying: later < orb });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/aspects.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/aspects.ts webApp/src/lib/astro/aspects.test.ts
git commit -m "feat(carta-natal): aspectos mayores con orbes Urania Trust, aplicativos y separativos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Composición de la carta (`chart.ts`)

**Files:**
- Create: `webApp/src/lib/astro/chart.ts`
- Test: `webApp/src/lib/astro/chart.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 5, 6, 7, 8, 9, 10.
- Produces:
  - `type ChartInput = { utc: Date; lat: number; lon: number; houseSystem: HouseSystem; hasTime: boolean }`.
  - `type BodyPosition = { id: BodyId; lon: number; sign: SignId; house: number | null; retrograde: boolean; speed: number }`.
  - `type Balance<K extends string> = { counts: Record<K, number>; dominant: K[] }`.
  - `type Stellium = { kind: "signo"; sign: SignId; bodies: PlanetId[] } | { kind: "casa"; house: number; bodies: PlanetId[] }`.
  - `type ChartFacts = { utcIso: string; lat: number; lon: number; requestedHouseSystem: HouseSystem; bodies: BodyPosition[]; angles: { asc: number; mc: number } | null; houses: Houses | null; aspects: Aspect[]; elements: Balance<Element>; modalities: Balance<Modality>; stelliums: Stellium[]; chartRuler: PlanetId | null; big3: { sun: SignId; moon: SignId; asc: SignId | null }; flags: { sinHora: boolean; houseSystemFallback: boolean; moonSignUncertain: boolean } }`.
  - `MIN_UTC = Date.UTC(1899, 11, 31)`, `MAX_UTC = Date.UTC(2101, 0, 2)` (bordes del motor; el rango de producto lo valida el servidor en hora local), `computeChart(input: ChartInput): ChartFacts` (lanza `RangeError` fuera de rango).

Reglas: elementos y modalidades sobre los 10 planetas (Sol a Plutón, `fundamentos-interpretativos.md` §5.2); stellium = 3 o más planetas en un signo o en una casa (§5.1; los puntos no cuentan); regente de la carta = regente tradicional del signo del ASC; `retrograde` solo para Mercurio..Plutón y Quirón; sin hora: sin ángulos, casas ni aspectos a ángulos, y `moonSignUncertain` si la Luna cambia de signo entre ±12 h (`lugar-y-hora.md` §4).

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/chart.test.ts
import { describe, expect, it } from "vitest";
import horizons from "./__fixtures__/horizons.json";
import { computeChart } from "./chart";
import { BODY_IDS, signOf } from "./zodiac";

// 1990-06-15 12:00 UTC: Horizons da esas longitudes a las 12:00 TT (57 s después); a esa distancia
// ningún cuerpo de la fecha cambia de signo.
const BA = { lat: -34.60372, lon: -58.38159 };
const UTC_1990 = new Date("1990-06-15T12:00:00Z");

describe("computeChart", () => {
  it("13 cuerpos en orden, Big 3 coherente con JPL, casas y aspectos con hora", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "placidus", hasTime: true });
    expect(f.bodies.map((b) => b.id)).toEqual([...BODY_IDS]);
    expect(f.big3.sun).toBe(signOf(horizons.bodies.sol[2]!.lon));
    expect(f.big3.moon).toBe(signOf(horizons.bodies.luna[2]!.lon));
    expect(f.angles).not.toBeNull();
    expect(f.big3.asc).toBe(signOf(f.angles!.asc));
    expect(f.houses).toMatchObject({ system: "placidus", fallback: false });
    expect(f.bodies.every((b) => b.house !== null && b.house >= 1 && b.house <= 12)).toBe(true);
    expect(f.chartRuler).not.toBeNull();
    expect(Object.values(f.elements.counts).reduce((a, b) => a + b, 0)).toBe(10);
    expect(Object.values(f.modalities.counts).reduce((a, b) => a + b, 0)).toBe(10);
    expect(f.flags).toEqual({ sinHora: false, houseSystemFallback: false, moonSignUncertain: false });
    expect(f.bodies.find((b) => b.id === "sol")!.retrograde).toBe(false);
  });

  it("sin hora: sin ángulos, casas ni aspectos a ángulos", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "placidus", hasTime: false });
    expect(f.angles).toBeNull();
    expect(f.houses).toBeNull();
    expect(f.big3.asc).toBeNull();
    expect(f.chartRuler).toBeNull();
    expect(f.bodies.every((b) => b.house === null)).toBe(true);
    expect(f.aspects.some((a) => a.a === "asc" || a.b === "asc" || a.a === "mc" || a.b === "mc")).toBe(false);
    expect(f.flags.sinHora).toBe(true);
    expect(f.stelliums.every((s) => s.kind === "signo")).toBe(true);
  });

  it("a 70° de latitud Placidus cae a Whole Sign y lo marca", () => {
    const f = computeChart({ utc: UTC_1990, lat: 70, lon: 25, houseSystem: "placidus", hasTime: true });
    expect(f.houses).toMatchObject({ system: "whole_sign", fallback: true });
    expect(f.flags.houseSystemFallback).toBe(true);
  });

  it("dominantes = los de conteo máximo", () => {
    const f = computeChart({ utc: UTC_1990, ...BA, houseSystem: "whole_sign", hasTime: true });
    const max = Math.max(...Object.values(f.elements.counts));
    expect(f.elements.dominant.every((e) => f.elements.counts[e] === max)).toBe(true);
  });

  it("fuera de 1900-2100 o con latitud imposible lanza RangeError", () => {
    expect(() => computeChart({ utc: new Date("1899-06-01T00:00:00Z"), ...BA, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
    expect(() => computeChart({ utc: UTC_1990, lat: 90, lon: 0, houseSystem: "placidus", hasTime: true })).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/chart.test.ts`
Expected: FAIL (no se puede resolver `./chart`).

- [ ] **Step 3: Implementar**

```ts
// webApp/src/lib/astro/chart.ts
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
  if (!(Math.abs(input.lat) <= 89.99) || !(input.lon > -180 && input.lon <= 180)) throw new RangeError("coordenadas fuera de rango");

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
```

- [ ] **Step 4: Correr el test y toda la capa del motor**

Run: `cd webApp && npx vitest run src/lib/astro && npx tsc --noEmit`
Expected: PASS en todos los archivos de `src/lib/astro/`; `tsc` sin errores.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/astro/chart.ts webApp/src/lib/astro/chart.test.ts
git commit -m "feat(carta-natal): composición de ChartFacts (cuerpos, ángulos, casas, aspectos, balances, regente)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Migración 0072 — `places`, `natal_charts` y signos públicos en `profiles`

**Files:**
- Create: `webApp/supabase/migrations/20261108100000_0072_carta_natal.sql` (si al implementar ya existe un `0072`, usar el siguiente número libre y un timestamp posterior al último, y ajustar el nombre en todo el plan)
- Modify: `webApp/supabase/harness/db.mjs` (cargar `pg_trgm` y `unaccent` en PGlite)
- Modify: `webApp/supabase/harness/00_supabase_baseline.sql` (esquema `extensions`, como en Supabase)
- Modify: `webApp/supabase/tests/guard-reachability.test.mjs` (dos casos nuevos)
- Modify: `webApp/supabase/tests/rls-mutation.test.mjs` (`search_places` en `ESPERADO_ANON`)
- Test: `webApp/supabase/tests/natal-charts.test.mjs`, `webApp/supabase/tests/places.test.mjs`

**Interfaces:**
- Produces (SQL):
  - `type public.zodiac_sign` = enum de los 12 `SignId` de Task 2.
  - `public.places (id bigint pk, name, ascii_name, admin1, country_code, lat, lon, timezone, population)`; SELECT por columna a `anon` y `authenticated`; sin escritura de cliente.
  - `public.search_places(p_q text) returns table (id bigint, name text, admin1 text, country_code text, lat double precision, lon double precision, timezone text)`: mínimo 3 caracteres, máximo 10 filas; EXECUTE para `anon` y `authenticated`.
  - `public.natal_charts` (columnas de la spec §3); SELECT y DELETE de la dueña; sin INSERT ni UPDATE de cliente; sin nada para `anon`.
  - `public.save_natal_chart(p_user_id uuid, p_label text, p_birth_date date, p_birth_time time, p_place_id bigint, p_lat double precision, p_lon double precision, p_timezone text, p_utc_offset_seconds integer, p_ambiguity_choice text, p_tzdata_version text, p_house_system text, p_is_self boolean, p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign) returns uuid` — solo `service_role`.
  - `public.set_self_natal_chart(p_user_id uuid, p_chart_id uuid, p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign) returns void` — solo `service_role`.
  - `profiles.sun_sign`, `profiles.moon_sign`, `profiles.asc_sign` (`public.zodiac_sign`, null): SELECT para `anon`/`authenticated`, escritura solo `service_role` (las dos funciones) y el trigger que los limpia al borrar la carta propia.

Decisiones de esquema que el implementador no debe «simplificar»:
- **Por qué funciones y no INSERT directo de `service_role`:** marcar `is_self` toca dos filas de `natal_charts` y una de `profiles`. En una función van en una transacción y con `for update` sobre el perfil, así dos guardados simultáneos no dejan dos «mi carta» ni pasan el tope de 100.
- **Por qué el cliente sí borra (y no una función):** la spec dice «la dueña lee y borra lo suyo». El trigger `natal_charts_clear_self_signs` (SECURITY DEFINER) limpia los signos del perfil aunque el borrado llegue por PostgREST directo.
- **Los grants de los signos van en esta migración, no en `0003_privileges.sql`:** una migración aplicada no se edita (el cloud no la vuelve a correr). Mismo criterio que `0011` y `0028` (D-4).

- [ ] **Step 1: Cargar las extensiones en el harness**

En `webApp/supabase/harness/00_supabase_baseline.sql`, después de `grant usage on schema auth ...`, agregar:

```sql
-- Supabase instala las extensiones en el esquema `extensions` y da USAGE a los roles de la API.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
```

En `webApp/supabase/harness/db.mjs`, reemplazar el import y la creación:

```js
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
```

```js
export async function bootDatabase({ afterMigrations = [], until = null } = {}) {
  // 0072 usa pg_trgm y unaccent (búsqueda de lugares). PGlite las trae como contrib cargables.
  const db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
```

Run: `cd webApp/supabase && npm test`
Expected: PASS igual que antes (881 tests): el cambio de harness no altera nada todavía.

- [ ] **Step 2: Escribir los tests de schema que fallan**

```js
// webApp/supabase/tests/natal-charts.test.mjs
// Carta natal (T-024) · natal_charts y profiles.*_sign. Dato reforzado: la dueña lee y borra;
// nadie más ve nada; escribir es solo de service_role vía save_natal_chart/set_self_natal_chart.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, asService, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const PRIV_DENIED = '42501';
const CHECK_VIOLATION = '23514';
const asStudent = (db, fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn);
const asOtra = (db, fn) => asUser(db, { sub: ID.otro, userRole: 'student' }, fn);

const SAVE = `select public.save_natal_chart(
  p_user_id => $1, p_label => $2, p_birth_date => '1990-06-15', p_birth_time => $3::time,
  p_place_id => null, p_lat => -34.60372, p_lon => -58.38159,
  p_timezone => 'America/Argentina/Buenos_Aires', p_utc_offset_seconds => -10800,
  p_ambiguity_choice => null, p_tzdata_version => '2026e', p_house_system => 'placidus',
  p_is_self => $4, p_sun => $5::public.zodiac_sign, p_moon => $6::public.zodiac_sign,
  p_asc => $7::public.zodiac_sign) as id`;

const guardar = (db, { user = ID.student, label = 'Mi carta', time = '09:30', isSelf = false, signos = ['geminis', 'piscis', 'leo'] } = {}) =>
  asService(db, () => attempt(db, SAVE, [user, label, time, isSelf, ...signos]));

const signosDe = async (db, id) =>
  (await db.query(`select sun_sign, moon_sign, asc_sign from public.profiles where id = $1`, [id])).rows[0];

describe('natal_charts', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  test('anon no tiene ningún privilegio sobre natal_charts', async () => {
    const r = await asAnon(db, () => attempt(db, `select id from public.natal_charts`));
    assert.equal(r.ok, false);
    assert.equal(r.code, PRIV_DENIED);
  });

  test('authenticated no tiene INSERT ni UPDATE en ninguna columna', async () => {
    const [p] = (await db.query(`
      select bool_or(has_column_privilege('authenticated', 'public.natal_charts', attname, 'INSERT')) as ins,
             bool_or(has_column_privilege('authenticated', 'public.natal_charts', attname, 'UPDATE')) as upd
        from pg_attribute where attrelid = 'public.natal_charts'::regclass and attnum > 0 and not attisdropped`)).rows;
    assert.deepEqual(p, { ins: false, upd: false });
    const ins = await asStudent(db, () => attempt(db,
      `insert into public.natal_charts (user_id, label, birth_date, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
       values ($1, 'x', '1990-01-01', 0, 0, 'UTC', 0, '2026e', 'placidus', now())`, [ID.student]));
    assert.equal(ins.code, PRIV_DENIED);
  });

  test('el cliente no ejecuta las funciones de escritura', async () => {
    const r = await asStudent(db, () => attempt(db, SAVE, [ID.student, 'x', '09:30', false, 'geminis', 'piscis', 'leo']));
    assert.equal(r.code, PRIV_DENIED);
  });

  test('service_role guarda; la dueña la lee; otra lee 0 filas y no la borra ni la cambia', async () => {
    const g = await guardar(db);
    assert.equal(g.ok, true, g.message);
    const id = g.rows[0].id;
    const propia = await asStudent(db, () => attempt(db, `select id, is_self, consented_at from public.natal_charts where id = $1`, [id]));
    assert.equal(propia.rows.length, 1);
    assert.notEqual(propia.rows[0].consented_at, null);
    const ajena = await asOtra(db, () => attempt(db, `select id from public.natal_charts where id = $1`, [id]));
    assert.equal(ajena.rows.length, 0);
    const borrar = await asOtra(db, () => attempt(db, `delete from public.natal_charts where id = $1 returning id`, [id]));
    assert.equal(borrar.rows.length, 0);
    const upd = await asStudent(db, () => attempt(db, `update public.natal_charts set label = 'y' where id = $1`, [id]));
    assert.equal(upd.code, PRIV_DENIED);
  });

  test('una sola carta propia: la segunda desmarca la primera y pisa los signos', async () => {
    assert.equal((await guardar(db, { isSelf: true })).ok, true);
    assert.equal((await guardar(db, { isSelf: true, signos: ['aries', 'tauro', 'cancer'] })).ok, true);
    const n = (await db.query(`select count(*)::int as n from public.natal_charts where user_id = $1 and is_self`, [ID.student])).rows[0].n;
    assert.equal(n, 1);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'aries', moon_sign: 'tauro', asc_sign: 'cancer' });
  });

  test('el índice único rechaza dos propias aunque se saltee la función', async () => {
    const r = await attempt(db, `update public.natal_charts set is_self = true where user_id = $1`, [ID.student]);
    assert.equal(r.ok, false);
    assert.equal(r.code, '23505');
  });

  test('signos inconsistentes con la carta propia: rechazado', async () => {
    const sinHoraConAsc = await guardar(db, { isSelf: true, time: null });
    assert.equal(sinHoraConAsc.code, CHECK_VIOLATION);
    const sinLuna = await guardar(db, { isSelf: true, signos: ['aries', null, 'leo'] });
    assert.equal(sinLuna.ok, false);
    const sinHoraOk = await guardar(db, { isSelf: true, time: null, signos: ['aries', 'tauro', null] });
    assert.equal(sinHoraOk.ok, true, sinHoraOk.message);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'aries', moon_sign: 'tauro', asc_sign: null });
  });

  test('CHECKs de forma: fecha fuera de 1900-2100, ambigüedad sin hora, segundos en la hora', async () => {
    const base = `insert into public.natal_charts (user_id, label, birth_date, birth_time, ambiguity_choice, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
                  values ($1, 'x', $2, $3::time, $4, 0, 0, 'UTC', 0, '2026e', 'placidus', now())`;
    for (const [nombre, params] of [
      ['1899-12-31', [ID.student, '1899-12-31', '10:00', null]],
      ['2101-01-01', [ID.student, '2101-01-01', '10:00', null]],
      ['ambigüedad sin hora', [ID.student, '1990-01-01', null, 'earlier']],
      ['hora con segundos', [ID.student, '1990-01-01', '10:00:30', null]],
    ]) {
      const r = await attempt(db, base, params);
      assert.equal(r.code, CHECK_VIOLATION, nombre);
    }
  });

  test('tope de 100 cartas por usuaria', async () => {
    await db.exec(`do $$ begin for i in 1..100 loop
      insert into public.natal_charts (user_id, label, birth_date, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, consented_at)
      values ('${ID.teacherB}', 'c' || i, '1990-01-01', 0, 0, 'UTC', 0, '2026e', 'placidus', now());
    end loop; end $$;`);
    const r = await guardar(db, { user: ID.teacherB });
    assert.equal(r.code, CHECK_VIOLATION);
    await db.query(`delete from public.natal_charts where user_id = $1`, [ID.teacherB]);
  });

  test('set_self_natal_chart: con carta ajena falla y no cambia nada; con la propia marca y pisa signos', async () => {
    const ajena = (await guardar(db, { user: ID.otro })).rows[0].id;
    const antes = await signosDe(db, ID.student);
    const r = await asService(db, () => attempt(db,
      `select public.set_self_natal_chart($1, $2, 'leo', 'leo', 'leo')`, [ID.student, ajena]));
    assert.equal(r.ok, false);
    assert.equal(r.code, 'P0002');
    assert.deepEqual(await signosDe(db, ID.student), antes);

    const mia = (await guardar(db)).rows[0].id;
    const ok = await asService(db, () => attempt(db,
      `select public.set_self_natal_chart($1, $2, 'virgo', 'libra', 'escorpio')`, [ID.student, mia]));
    assert.equal(ok.ok, true, ok.message);
    const propias = (await db.query(`select id from public.natal_charts where user_id = $1 and is_self`, [ID.student])).rows;
    assert.deepEqual(propias.map((x) => x.id), [mia]);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: 'virgo', moon_sign: 'libra', asc_sign: 'escorpio' });
  });

  test('la dueña borra su carta propia y los signos del perfil se limpian', async () => {
    const r = await asStudent(db, () => attempt(db, `delete from public.natal_charts where user_id = $1 and is_self returning id`, [ID.student]));
    assert.equal(r.rows.length, 1);
    assert.deepEqual(await signosDe(db, ID.student), { sun_sign: null, moon_sign: null, asc_sign: null });
  });

  test('profiles: el cliente no escribe *_sign y anon lee los signos de una docente', async () => {
    const upd = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `update public.profiles set sun_sign = 'aries' where id = $1`, [ID.teacherA]));
    assert.equal(upd.code, PRIV_DENIED);
    const lee = await asAnon(db, () => attempt(db, `select sun_sign, moon_sign, asc_sign from public.profiles where id = $1`, [ID.teacherA]));
    assert.equal(lee.ok, true, lee.message);
  });

  test('borrar la cuenta borra sus cartas (cascada)', async () => {
    await guardar(db, { user: ID.otro, isSelf: true });
    const r = await attempt(db, `delete from auth.users where id = $1`, [ID.otro]);
    assert.equal(r.ok, true, r.message);
    const n = (await db.query(`select count(*)::int as n from public.natal_charts where user_id = $1`, [ID.otro])).rows[0].n;
    assert.equal(n, 0);
  });
});
```

```js
// webApp/supabase/tests/places.test.mjs
// Carta natal (T-024) · places es dato abierto (GeoNames, CC BY 4.0): lectura pública, escritura de nadie.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { bootDatabase, asUser, asAnon, attempt } from '../harness/db.mjs';
import { seed, ID } from './seed.mjs';

const buscar = (db, q) => asAnon(db, () => attempt(db, `select id, name, admin1, country_code from public.search_places($1)`, [q]));

describe('places', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
    await db.exec(`
      insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population) values
        (1, 'Córdoba', 'Cordoba', 'Córdoba', 'AR', -31.4135, -64.18105, 'America/Argentina/Cordoba', 1428214),
        (2, 'Córdoba', 'Cordoba', 'Andalucía', 'ES', 37.89155, -4.77275, 'Europe/Madrid', 328428),
        (3, 'San Martín de los Andes', 'San Martin de los Andes', 'Neuquén', 'AR', -40.15, -71.35, 'America/Argentina/Salta', 28000);
      insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
        select 100 + g, 'Villa Prueba ' || g, 'Villa Prueba ' || g, null, 'AR', -34, -58, 'America/Argentina/Buenos_Aires', g
          from generate_series(1, 15) g;`);
  });
  after(async () => db?.close());

  test('anon lee; nadie del cliente escribe', async () => {
    const lee = await asAnon(db, () => attempt(db, `select id, name, timezone from public.places where id = 1`));
    assert.equal(lee.rows.length, 1);
    for (const sql of [
      `insert into public.places (id, name, ascii_name, country_code, lat, lon, timezone) values (9, 'x', 'x', 'AR', 0, 0, 'UTC')`,
      `update public.places set name = 'x' where id = 1`,
      `delete from public.places where id = 1`,
    ]) {
      for (const who of [(fn) => asAnon(db, fn), (fn) => asUser(db, { sub: ID.student, userRole: 'student' }, fn)]) {
        const r = await who(() => attempt(db, sql));
        assert.equal(r.code, '42501', sql);
      }
    }
  });

  test('búsqueda sin tildes, primero los que empiezan así, por población', async () => {
    const r = await buscar(db, 'córdoba');
    assert.deepEqual(r.rows.map((x) => [x.id, x.country_code]), [['1', 'AR'], ['2', 'ES']].map(([i, c]) => [Number(i), c]));
    assert.equal((await buscar(db, 'san mart')).rows[0].id, 3);
  });

  test('tolera un error de tipeo (trigramas)', async () => {
    assert.ok((await buscar(db, 'cordova')).rows.some((x) => Number(x.id) === 1));
  });

  test('menos de 3 caracteres no busca; nunca más de 10 filas; los comodines son literales', async () => {
    assert.equal((await buscar(db, 'co')).rows.length, 0);
    assert.equal((await buscar(db, 'villa prueba')).rows.length, 10);
    assert.equal((await buscar(db, '%%%')).rows.length, 0);
  });
});
```

En `guard-reachability.test.mjs`, dentro de `const CASOS = {`, después de `tarot_readings_guard: ...,` agregar:

```js
  // --- carta natal (T-024)
  natal_charts_guard: 'service_role guarda la carta de una usuaria con menos de 100',
  natal_charts_clear_self_signs: 'la duena borra su carta propia; borrar la cuenta con carta propia no queda bloqueado',
```

y al final del archivo:

```js
// T-024 · la cadena de 0017 sobre natal_charts: el trigger AFTER DELETE actualiza `profiles`, y el
// borrado de la cuenta llega por cascada desde ese mismo perfil.
describe('ADR-011 · carta natal: guardar y borrar siguen siendo posibles', () => {
  let db;
  before(async () => {
    ({ db } = await bootDatabase());
    await seed(db);
  });
  after(async () => db?.close());

  const guardarPropia = (user) =>
    asService(db, () => attempt(db,
      `select public.save_natal_chart($1, 'Mi carta', '1990-06-15', '09:30', null, -34.6, -58.4,
         'America/Argentina/Buenos_Aires', -10800, null, '2026e', 'placidus', true, 'geminis', 'piscis', 'leo') as id`, [user]));

  test(`natal_charts_guard · ${CASOS.natal_charts_guard}`, async () => {
    const r = await guardarPropia(ID.teacherA);
    assert.equal(r.ok, true, `el guard bloqueo una carta legitima: ${r.message}`);
  });

  test(`natal_charts_clear_self_signs · ${CASOS.natal_charts_clear_self_signs}`, async () => {
    const borrar = await asUser(db, { sub: ID.teacherA, userRole: 'teacher' }, () =>
      attempt(db, `delete from public.natal_charts where user_id = $1 returning id`, [ID.teacherA]));
    assert.equal(borrar.rows.length, 1, borrar.message);
    // `otro` y no una docente: los cursos de una docente bloquean el borrado de su cuenta (RESTRICT).
    await guardarPropia(ID.otro);
    await db.exec(`reset role;`);
    const cuenta = await attempt(db, `delete from auth.users where id = $1`, [ID.otro]);
    assert.equal(cuenta.ok, true, `la cuenta con carta propia quedo imborrable: ${cuenta.message}`);
  });
});
```


En `rls-mutation.test.mjs`, reemplazar `ESPERADO_ANON` por:

```js
      // T-024 suma `search_places`: SECURITY INVOKER sobre `places`, que es dato abierto (GeoNames)
      // con SELECT para `anon`. No lee nada que `anon` no pueda leer por select directo.
      const ESPERADO_ANON = [
        'can_read_course', 'course_student_count', 'current_app_role', 'is_admin',
        'lesson_is_preview', 'owns_course', 'search_places',
      ];
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `cd webApp/supabase && node --test tests/natal-charts.test.mjs tests/places.test.mjs`
Expected: FAIL (`relation "public.natal_charts" does not exist`, `function public.search_places(text) does not exist`).

- [ ] **Step 4: Escribir la migración**

```sql
-- 0072 · Carta natal (T-024, ADR-017): lugares, cartas guardadas y signos públicos del perfil.
--
-- DATO REFORZADO. Fecha, hora y lugar de nacimiento son privados: `natal_charts` no tiene ningún
-- grant para `anon`, la dueña lee y borra lo suyo, y NADIE del cliente inserta ni modifica. Escribir
-- es de service_role, por save_natal_chart/set_self_natal_chart, después de que la Server Action
-- validó la sesión y el consentimiento. Se guarda SOLO el input: la carta se recalcula al abrirla.
--
-- POR QUÉ FUNCIONES. Marcar «mi carta» toca dos filas de natal_charts y una de profiles. En una
-- función van en una transacción con `for update` sobre el perfil: dos guardados simultáneos no
-- dejan dos cartas propias ni pasan el tope de 100.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create type public.zodiac_sign as enum (
  'aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo',
  'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'
);

-- ---------------------------------------------------------------- places (GeoNames, CC BY 4.0)
-- `timezone` es el id IANA TAL COMO VIENE de GeoNames (America/Argentina/Mendoza). Normalizarlo
-- con Intl.resolvedOptions() en Node 22 lo cambia por America/Mendoza (lugar-y-hora.md §2.1).
create table public.places (
  id           bigint           primary key,
  name         text             not null check (char_length(name) between 1 and 200),
  ascii_name   text             not null check (char_length(ascii_name) between 1 and 200),
  admin1       text             check (admin1 is null or char_length(admin1) between 1 and 200),
  country_code text             not null check (country_code ~ '^[A-Z]{2}$'),
  lat          double precision not null check (lat between -90 and 90),
  lon          double precision not null check (lon between -180 and 180),
  timezone     text             not null check (timezone ~ '^[A-Za-z0-9_+./-]{1,64}$'),
  population   bigint           not null default 0 check (population >= 0)
);

create index places_ascii_name_trgm on public.places using gin (lower(ascii_name) extensions.gin_trgm_ops);

alter table public.places enable row level security;
revoke all on public.places from public, anon, authenticated;
grant select (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
  on public.places to anon, authenticated;
create policy places_read_all on public.places for select to anon, authenticated using (true);

create or replace function public.search_places(p_q text)
returns table (id bigint, name text, admin1 text, country_code text, lat double precision, lon double precision, timezone text)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(coalesce(p_q, '')))) as s
  ), pat as (
    select s, replace(replace(replace(s, '\', '\\'), '%', '\%'), '_', '\_') || '%' as prefix from q
  )
  select p.id, p.name, p.admin1, p.country_code, p.lat, p.lon, p.timezone
    from public.places p, pat
   where char_length(pat.s) between 3 and 80
     and (lower(p.ascii_name) like pat.prefix or lower(p.ascii_name) operator(extensions.%) pat.s)
   order by (lower(p.ascii_name) like pat.prefix) desc,
            extensions.similarity(lower(p.ascii_name), pat.s) desc,
            p.population desc,
            p.id
   limit 10
$$;

-- ---------------------------------------------------------------- natal_charts
create table public.natal_charts (
  id                 uuid             primary key default gen_random_uuid(),
  user_id            uuid             not null references public.profiles (id) on delete cascade,
  label              text             not null check (char_length(label) between 1 and 60 and label !~ '[\n\r]'),
  birth_date         date             not null check (birth_date between date '1900-01-01' and date '2100-12-31'),
  birth_time         time             check (birth_time is null or extract(second from birth_time) = 0),
  place_id           bigint           references public.places (id) on delete set null,
  lat                double precision not null check (lat between -89.99 and 89.99),
  lon                double precision not null check (lon > -180 and lon <= 180),
  timezone           text             not null check (timezone ~ '^[A-Za-z0-9_+./-]{1,64}$'),
  utc_offset_seconds integer          not null check (utc_offset_seconds between -50400 and 50400),
  ambiguity_choice   text             check (ambiguity_choice in ('earlier', 'later')),
  tzdata_version     text             not null check (tzdata_version ~ '^[0-9a-z.-]{1,16}$'),
  house_system       text             not null check (house_system in ('placidus', 'whole_sign')),
  is_self            boolean          not null default false,
  consented_at       timestamptz      not null,
  created_at         timestamptz      not null default now(),
  constraint natal_charts_ambiguity_needs_time check (ambiguity_choice is null or birth_time is not null)
);

create unique index natal_charts_one_self on public.natal_charts (user_id) where is_self;
create index natal_charts_user_idx on public.natal_charts (user_id, created_at desc);

alter table public.natal_charts enable row level security;
revoke all on public.natal_charts from public, anon, authenticated;
grant select (id, user_id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds,
              ambiguity_choice, tzdata_version, house_system, is_self, consented_at, created_at)
  on public.natal_charts to authenticated;
grant delete on public.natal_charts to authenticated;

create policy natal_charts_read_own on public.natal_charts
  for select to authenticated using (user_id = (select auth.uid()));
create policy natal_charts_delete_own on public.natal_charts
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.guard_natal_charts_insert()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select count(*) from public.natal_charts where user_id = new.user_id) >= 100 then
    raise exception 'tope de 100 cartas guardadas' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger natal_charts_guard
  before insert on public.natal_charts
  for each row execute function public.guard_natal_charts_insert();

-- ---------------------------------------------------------------- profiles: signos públicos
-- Solo los signos (spec, decisión 7): sin grados, rueda ni lugar. Los escribe service_role al
-- guardar o marcar la carta propia, y este trigger al borrarla.
alter table public.profiles
  add column sun_sign  public.zodiac_sign,
  add column moon_sign public.zodiac_sign,
  add column asc_sign  public.zodiac_sign,
  add constraint profiles_signs_consistent
    check ((sun_sign is null) = (moon_sign is null) and (asc_sign is null or sun_sign is not null));

grant select (sun_sign, moon_sign, asc_sign) on public.profiles to anon, authenticated;

-- SECURITY DEFINER: la dueña borra por su sesión y no tiene UPDATE sobre *_sign. Si la cuenta se
-- borra, el perfil ya no está y el UPDATE no toca ninguna fila.
create or replace function public.natal_charts_clear_self_signs()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.is_self then
    update public.profiles set sun_sign = null, moon_sign = null, asc_sign = null where id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger natal_charts_clear_self_signs
  after delete on public.natal_charts
  for each row execute function public.natal_charts_clear_self_signs();

-- ---------------------------------------------------------------- escrituras de servidor
create or replace function public.save_natal_chart(
  p_user_id uuid, p_label text, p_birth_date date, p_birth_time time, p_place_id bigint,
  p_lat double precision, p_lon double precision, p_timezone text, p_utc_offset_seconds integer,
  p_ambiguity_choice text, p_tzdata_version text, p_house_system text, p_is_self boolean,
  p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_is_self and (p_sun is null or p_moon is null or (p_birth_time is null) <> (p_asc is null)) then
    raise exception 'signos inconsistentes con la carta' using errcode = '23514';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'perfil inexistente' using errcode = '23503';
  end if;
  if p_is_self then
    update public.natal_charts set is_self = false where user_id = p_user_id and is_self;
  end if;
  insert into public.natal_charts (user_id, label, birth_date, birth_time, place_id, lat, lon, timezone,
                                   utc_offset_seconds, ambiguity_choice, tzdata_version, house_system,
                                   is_self, consented_at)
  values (p_user_id, p_label, p_birth_date, p_birth_time, p_place_id, p_lat, p_lon, p_timezone,
          p_utc_offset_seconds, p_ambiguity_choice, p_tzdata_version, p_house_system, p_is_self, now())
  returning id into v_id;
  if p_is_self then
    update public.profiles set sun_sign = p_sun, moon_sign = p_moon, asc_sign = p_asc where id = p_user_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.set_self_natal_chart(
  p_user_id uuid, p_chart_id uuid, p_sun public.zodiac_sign, p_moon public.zodiac_sign, p_asc public.zodiac_sign)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_sin_hora boolean;
begin
  perform 1 from public.profiles where id = p_user_id for update;
  select birth_time is null into v_sin_hora
    from public.natal_charts where id = p_chart_id and user_id = p_user_id;
  if not found then
    raise exception 'carta inexistente' using errcode = 'P0002';
  end if;
  if p_sun is null or p_moon is null or v_sin_hora <> (p_asc is null) then
    raise exception 'signos inconsistentes con la carta' using errcode = '23514';
  end if;
  update public.natal_charts set is_self = false where user_id = p_user_id and is_self and id <> p_chart_id;
  update public.natal_charts set is_self = true where id = p_chart_id;
  update public.profiles set sun_sign = p_sun, moon_sign = p_moon, asc_sign = p_asc where id = p_user_id;
end;
$$;

revoke execute on all functions in schema public from public;
grant execute on function public.search_places(text) to anon, authenticated;
grant execute on function public.save_natal_chart(uuid, text, date, time, bigint, double precision, double precision,
  text, integer, text, text, text, boolean, public.zodiac_sign, public.zodiac_sign, public.zodiac_sign) to service_role;
grant execute on function public.set_self_natal_chart(uuid, uuid, public.zodiac_sign, public.zodiac_sign, public.zodiac_sign) to service_role;
```

- [ ] **Step 5: Correr los tests nuevos y toda la suite de schema**

Run: `cd webApp/supabase && node --test tests/natal-charts.test.mjs tests/places.test.mjs && npm test`
Expected: PASS. Si falla `locator-*`, `insert-guards` o `rls-mutation` por una columna o función nueva, leer el mensaje: cada uno pide una decisión explícita. `natal_charts` y `places` no tienen grant de escritura de cliente, así que no entran en `INSERT_ESPERADO` ni en la clase de ADR-009; `search_places` ya quedó en `ESPERADO_ANON`. No relajar ningún invariante para que pase.

- [ ] **Step 6: Aplicar en la base local**

Run: `cd webApp && npx supabase migration up && docker exec supabase_db_webApp psql -U postgres -tAc "select count(*) from public.natal_charts"`
Expected: `0`.

- [ ] **Step 7: Commit**

```bash
git add webApp/supabase/migrations/20261108100000_0072_carta_natal.sql webApp/supabase/harness/db.mjs webApp/supabase/harness/00_supabase_baseline.sql webApp/supabase/tests/natal-charts.test.mjs webApp/supabase/tests/places.test.mjs webApp/supabase/tests/guard-reachability.test.mjs webApp/supabase/tests/rls-mutation.test.mjs
git commit -m "feat(carta-natal): migración 0072 con places, natal_charts privadas y signos públicos en profiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Carga reproducible de `places` desde GeoNames

**Files:**
- Create: `webApp/supabase/scripts/places-lib.mjs`
- Create: `webApp/supabase/scripts/load-places.mjs`
- Modify: `webApp/supabase/package.json` (script `places:load`)
- Test: `webApp/supabase/tests/places-loader.test.mjs`

**Interfaces:**
- Consumes: tabla `public.places` (Task 12).
- Produces: `parseGeonamesLine(line: string): GeonamesRow | null`, `parseAdmin1(text: string): Map<string, string>`, `keep(row: GeonamesRow | null, source: "AR" | "cities1000" | "cities15000"): boolean`, `toCsvRow(row: GeonamesRow, admin1: Map<string, string>): string`, `CSV_HEADER`, `COUNTRIES_CITIES1000`; el comando `npm run places:load` (en `webApp/supabase`).

Qué se carga (`lugar-y-hora.md` §3.3): `AR.zip` clase P completo + `cities1000` de los países de habla hispana, Brasil y EE. UU. + `cities15000` del resto; ≈86.600 filas. Columnas de GeoNames (readme): 0 `geonameid`, 1 `name`, 2 `asciiname`, 4 `latitude`, 5 `longitude`, 6 `feature class`, 8 `country code`, 10 `admin1 code`, 14 `population`, 17 `timezone`.

- [ ] **Step 1: Escribir el test que falla** (líneas sintéticas con la forma de GeoNames)

```js
// webApp/supabase/tests/places-loader.test.mjs
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_HEADER, keep, parseAdmin1, parseGeonamesLine, toCsvRow } from '../scripts/places-lib.mjs';

const linea = (o) => {
  const c = Array(19).fill('');
  Object.assign(c, { 0: o.id, 1: o.name, 2: o.ascii ?? '', 4: o.lat ?? '-24.18', 5: o.lon ?? '-65.33', 6: o.fc ?? 'P', 8: o.cc, 10: o.a1 ?? '10', 14: o.pop ?? '0', 17: o.tz ?? 'America/Argentina/Jujuy' });
  return c.join('\t');
};

describe('places-lib', () => {
  test('parsea una fila y usa la provincia de admin1CodesASCII', () => {
    const row = parseGeonamesLine(linea({ id: '3841500', name: 'Purmamarca', ascii: 'Purmamarca', cc: 'AR', pop: '388' }));
    assert.deepEqual([row.id, row.name, row.countryCode, row.population, row.timezone], [3841500, 'Purmamarca', 'AR', 388, 'America/Argentina/Jujuy']);
    const admin1 = parseAdmin1('AR.10\tJujuy\tJujuy\t3853404\n');
    assert.equal(toCsvRow(row, admin1), '3841500,Purmamarca,Purmamarca,Jujuy,AR,-24.18,-65.33,America/Argentina/Jujuy,388');
  });

  test('filtra por fuente: AR solo clase P, cities1000 hispanos+BR+US, cities15000 el resto, nunca AR fuera de AR.zip', () => {
    const p = (o) => parseGeonamesLine(linea(o));
    assert.equal(keep(p({ id: '1', name: 'X', cc: 'AR' }), 'AR'), true);
    assert.equal(keep(p({ id: '2', name: 'Cerro', cc: 'AR', fc: 'T' }), 'AR'), false);
    assert.equal(keep(p({ id: '3', name: 'Y', cc: 'UY' }), 'cities1000'), true);
    assert.equal(keep(p({ id: '4', name: 'Z', cc: 'FR' }), 'cities1000'), false);
    assert.equal(keep(p({ id: '5', name: 'Z', cc: 'FR' }), 'cities15000'), true);
    assert.equal(keep(p({ id: '6', name: 'Y', cc: 'UY' }), 'cities15000'), false);
    assert.equal(keep(p({ id: '7', name: 'X', cc: 'AR' }), 'cities1000'), false);
    assert.equal(keep(p({ id: '8', name: 'Sin zona', cc: 'AR', tz: '' }), 'AR'), false);
    assert.equal(keep(parseGeonamesLine('basura'), 'AR'), false);
  });

  test('CSV: comillas para comas y comillas; sin asciiname usa el nombre sin tildes; provincia vacía = NULL', () => {
    const row = parseGeonamesLine(linea({ id: '9', name: 'Villa "La" Angostura, Sur', ascii: '', cc: 'AR', a1: '99' }));
    assert.equal(row.asciiName, 'Villa "La" Angostura, Sur');
    const sinTilde = parseGeonamesLine(linea({ id: '10', name: 'Tafí del Valle', ascii: '', cc: 'AR' }));
    assert.equal(sinTilde.asciiName, 'Tafi del Valle');
    assert.match(toCsvRow(row, new Map()), /^9,"Villa ""La"" Angostura, Sur","Villa ""La"" Angostura, Sur",,AR,/);
    assert.equal(CSV_HEADER, 'id,name,ascii_name,admin1,country_code,lat,lon,timezone,population');
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp/supabase && node --test tests/places-loader.test.mjs`
Expected: FAIL (`Cannot find module '../scripts/places-lib.mjs'`).

- [ ] **Step 3: Implementar la biblioteca y el script**

```js
// webApp/supabase/scripts/places-lib.mjs
// Parseo y filtro de los dumps de GeoNames (CC BY 4.0) para public.places. Puro: sin red ni base.

export const COUNTRIES_CITIES1000 = new Set([
  'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE',
  'PR', 'PY', 'SV', 'US', 'UY', 'VE',
]);

export const CSV_HEADER = 'id,name,ascii_name,admin1,country_code,lat,lon,timezone,population';

export function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function parseGeonamesLine(line) {
  const c = line.split('\t');
  if (c.length < 18) return null;
  const id = Number(c[0]);
  if (!Number.isInteger(id) || id <= 0 || !c[1]) return null;
  return {
    id,
    name: c[1],
    asciiName: c[2] || stripAccents(c[1]),
    lat: Number(c[4]),
    lon: Number(c[5]),
    featureClass: c[6],
    countryCode: c[8],
    admin1Code: c[10],
    population: Number(c[14]) || 0,
    timezone: c[17],
  };
}

export function parseAdmin1(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const [code, name] = line.split('\t');
    if (code && name) map.set(code, name);
  }
  return map;
}

export function keep(row, source) {
  if (!row || !row.timezone || !Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return false;
  if (source === 'AR') return row.countryCode === 'AR' && row.featureClass === 'P';
  if (row.countryCode === 'AR') return false;
  if (source === 'cities1000') return COUNTRIES_CITIES1000.has(row.countryCode);
  if (source === 'cities15000') return !COUNTRIES_CITIES1000.has(row.countryCode);
  return false;
}

function csvField(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsvRow(row, admin1) {
  const provincia = admin1.get(`${row.countryCode}.${row.admin1Code}`) ?? '';
  return [row.id, row.name, row.asciiName, provincia, row.countryCode, row.lat, row.lon, row.timezone, row.population]
    .map(csvField)
    .join(',');
}
```

```js
// webApp/supabase/scripts/load-places.mjs
// Carga public.places desde GeoNames. Reproducible e idempotente (upsert + borra lo que ya no está).
// Local:  cd webApp/supabase && npm run places:load            (usa docker exec sobre supabase_db_webApp)
// Cloud:  DATABASE_URL='postgresql://...' npm run places:load  (necesita psql en el PATH)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CSV_HEADER, keep, parseAdmin1, parseGeonamesLine, toCsvRow } from './places-lib.mjs';

const BASE = 'https://download.geonames.org/export/dump/';
const dir = await mkdtemp(join(tmpdir(), 'geonames-'));

async function fetchOk(name) {
  const res = await fetch(BASE + name);
  if (!res.ok) throw new Error(`GeoNames ${name}: ${res.status}`);
  return res;
}

async function download(name) {
  const path = join(dir, name);
  await writeFile(path, Buffer.from(await (await fetchOk(name)).arrayBuffer()));
  return path;
}

const unzipText = (zip, entry) => execFileSync('unzip', ['-p', zip, entry], { maxBuffer: 1 << 30, encoding: 'utf8' });

const admin1 = parseAdmin1(await (await fetchOk('admin1CodesASCII.txt')).text());
const sources = [
  ['AR', await download('AR.zip'), 'AR.txt'],
  ['cities1000', await download('cities1000.zip'), 'cities1000.txt'],
  ['cities15000', await download('cities15000.zip'), 'cities15000.txt'],
];

const seen = new Set();
const lines = [CSV_HEADER];
const counts = {};
for (const [source, zip, entry] of sources) {
  for (const line of unzipText(zip, entry).split('\n')) {
    const row = parseGeonamesLine(line);
    if (!keep(row, source) || seen.has(row.id)) continue;
    seen.add(row.id);
    lines.push(toCsvRow(row, admin1));
    counts[source] = (counts[source] ?? 0) + 1;
  }
}
const total = lines.length - 1;
console.log(counts, 'total', total);
if (total < 80000 || total > 95000) throw new Error(`total ${total} fuera de lo esperado (~86.600, lugar-y-hora.md §3.3)`);

const [cmd, base] = process.env.DATABASE_URL
  ? ['psql', [process.env.DATABASE_URL]]
  : ['docker', ['exec', '-i', process.env.DBC ?? 'supabase_db_webApp', 'psql', '-U', 'postgres', '-d', 'postgres']];
const sql = [
  'create temp table places_stage (like public.places including defaults) on commit drop',
  '\\copy places_stage (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population) from pstdin with (format csv, header true)',
  `insert into public.places select * from places_stage
     on conflict (id) do update set name = excluded.name, ascii_name = excluded.ascii_name, admin1 = excluded.admin1,
       country_code = excluded.country_code, lat = excluded.lat, lon = excluded.lon, timezone = excluded.timezone,
       population = excluded.population`,
  'delete from public.places p where not exists (select 1 from places_stage s where s.id = p.id)',
  'select count(*) as places from public.places',
];
const r = spawnSync(cmd, [...base, '-v', 'ON_ERROR_STOP=1', '--single-transaction', ...sql.flatMap((c) => ['-c', c])], {
  input: lines.join('\n') + '\n',
  encoding: 'utf8',
  maxBuffer: 1 << 26,
});
process.stdout.write(r.stdout ?? '');
process.stderr.write(r.stderr ?? '');
if (r.status !== 0) process.exit(r.status ?? 1);
```

En `webApp/supabase/package.json`, dentro de `"scripts"`:

```json
    "test": "node --test tests/*.test.mjs",
    "places:load": "node scripts/load-places.mjs"
```

- [ ] **Step 4: Correr el test y la carga local**

Run: `cd webApp/supabase && node --test tests/places-loader.test.mjs`
Expected: PASS (3 tests).

Run (con `npx supabase start` arriba y 0072 aplicada): `cd webApp/supabase && npm run places:load`
Expected: conteos por fuente cercanos a 14.889 / 46.476 / 25.198 y `places` ≈ 86.600. Comprobar: `docker exec supabase_db_webApp psql -U postgres -tAc "select name, admin1, timezone from public.search_places('purmamarca')"` → `Purmamarca|Jujuy|America/Argentina/Jujuy`.

- [ ] **Step 5: Commit**

```bash
git add webApp/supabase/scripts/places-lib.mjs webApp/supabase/scripts/load-places.mjs webApp/supabase/package.json webApp/supabase/tests/places-loader.test.mjs
git commit -m "feat(carta-natal): carga reproducible de places desde GeoNames (AR completo, hispanos, resto del mundo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Textos v1 (`templates.json`) y prosa (`prose.ts`)

**Files:**
- Create: `webApp/src/lib/astro/data/templates.json`
- Create: `webApp/src/lib/astro/prose.ts`
- Test: `webApp/src/lib/astro/prose.test.ts`

**Interfaces:**
- Consumes: `ChartFacts`, `computeChart` (Task 11); `AspectId` (Task 10); `SIGNS`, `BODY_IDS`, `SIGN_IDS`, `BODY_NAMES`, `pointName`, `formatDegree` (Task 2).
- Produces:
  - `type TextEntry = { nombre: string; palabras_clave: string[]; frase: string; ficha: string[] }`.
  - `TEMPLATES` (validado con zod al importar): `{ _meta: { estado: "borrador" | "aprobado"; revision: string | null }; cuerpos: Record<BodyId, TextEntry>; signos: Record<SignId, TextEntry>; casas: Record<HouseKey, TextEntry>; aspectos: Record<AspectId, TextEntry>; sol_en: Record<SignId, string>; luna_en: Record<SignId, string>; asc_en: Record<SignId, string> }`, `type HouseKey = "1" | … | "12"`, `HOUSE_KEYS`.
  - `AVISO_MARCO`, `AVISO_SIN_HORA`, `AVISO_FALLBACK`, `AVISO_LUNA` (strings).
  - `type Paragraph = { titulo: string; texto: string; porQue: string }`, `type ChartText = { big3: Paragraph[]; regente: Paragraph | null; cuerpos: Paragraph[]; aspectos: Paragraph[]; balance: string; avisos: string[]; marco: string }`, `renderChart(f: ChartFacts): ChartText` (determinista, sin azar).

Contrato de composición (por eso las frases tienen forma fija): el párrafo de un cuerpo es `cuerpos[id].frase + " " + signos[signo].frase + " " + casas[n].frase`. Entonces:
- `cuerpos.*.frase` empieza con el nombre del cuerpo y dice qué representa («Venus habla de…»).
- `signos.*.frase` empieza con `En <Signo>,` y habla de «esa energía» sin nombrar un cuerpo.
- `casas.*.frase` empieza con `En la casa <n>` y nombra el ámbito.
- `aspectos.*.frase` usa exactamente `{a}` y `{b}` (nombres de los dos puntos) y ningún otro marcador.
- `ficha`: 2 a 4 párrafos de ≥200 caracteres; es el texto de la ficha indexable (Task 19).
- `sol_en`, `luna_en`, `asc_en`: un párrafo de ≥120 caracteres cada uno (36 en total).
Total: 13 + 12 + 12 + 5 + 36 = **78 textos** (spec §5).

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/lib/astro/prose.test.ts
import { describe, expect, it } from "vitest";
import { computeChart } from "./chart";
import { AVISO_MARCO, AVISO_SIN_HORA, HOUSE_KEYS, TEMPLATES, renderChart } from "./prose";
import { BODY_IDS, SIGNS, SIGN_IDS } from "./zodiac";

const todos = (): string[] => [
  ...Object.values(TEMPLATES.cuerpos), ...Object.values(TEMPLATES.signos),
  ...Object.values(TEMPLATES.casas), ...Object.values(TEMPLATES.aspectos),
].flatMap((e) => [e.nombre, e.frase, ...e.ficha, ...e.palabras_clave])
  .concat(Object.values(TEMPLATES.sol_en), Object.values(TEMPLATES.luna_en), Object.values(TEMPLATES.asc_en));

describe("templates.json", () => {
  it("cubre los 78 textos sin huecos", () => {
    expect(Object.keys(TEMPLATES.cuerpos).sort()).toEqual([...BODY_IDS].sort());
    expect(Object.keys(TEMPLATES.signos).sort()).toEqual([...SIGN_IDS].sort());
    expect(Object.keys(TEMPLATES.casas).sort()).toEqual([...HOUSE_KEYS].sort());
    expect(Object.keys(TEMPLATES.aspectos).sort()).toEqual(["conjuncion", "cuadratura", "oposicion", "sextil", "trigono"]);
    for (const k of ["sol_en", "luna_en", "asc_en"] as const) expect(Object.keys(TEMPLATES[k]).sort()).toEqual([...SIGN_IDS].sort());
    const n = [TEMPLATES.cuerpos, TEMPLATES.signos, TEMPLATES.casas, TEMPLATES.aspectos, TEMPLATES.sol_en, TEMPLATES.luna_en, TEMPLATES.asc_en]
      .reduce((acc, r) => acc + Object.keys(r).length, 0);
    expect(n).toBe(78);
  });

  it("las frases tienen la forma que exige la composición", () => {
    for (const s of SIGN_IDS) expect(TEMPLATES.signos[s].frase.startsWith(`En ${SIGNS[s].nombre},`), s).toBe(true);
    for (const h of HOUSE_KEYS) expect(TEMPLATES.casas[h].frase.startsWith(`En la casa ${h}`), h).toBe(true);
    for (const b of BODY_IDS) expect(TEMPLATES.cuerpos[b].frase.startsWith(TEMPLATES.cuerpos[b].nombre), b).toBe(true);
    for (const a of Object.values(TEMPLATES.aspectos)) {
      expect(a.frase.match(/\{(\w+)\}/g)?.sort()).toEqual(["{a}", "{b}"]);
    }
  });

  it("ningún marcador suelto fuera de los aspectos y ningún texto determinista o de salud (fundamentos §7.3)", () => {
    const sinAspectos = todos().filter((t) => !Object.values(TEMPLATES.aspectos).some((a) => a.frase === t));
    for (const t of sinAspectos) expect(t, t).not.toMatch(/[{}]/);
    for (const t of todos()) {
      expect(t, t).not.toMatch(/\bvas a\b/i);
      expect(t, t).not.toMatch(/\b(enfermedad|muerte|accidente|embarazo)/i);
    }
  });
});

describe("renderChart", () => {
  const conHora = computeChart({ utc: new Date("1990-06-15T12:00:00Z"), lat: -34.60372, lon: -58.38159, houseSystem: "placidus", hasTime: true });
  const sinHora = computeChart({ utc: new Date("1990-06-15T15:00:00Z"), lat: -34.60372, lon: -58.38159, houseSystem: "placidus", hasTime: false });

  it("con hora: Big 3, regente, 13 cuerpos con casa, hasta 8 aspectos, sin huecos", () => {
    const t = renderChart(conHora);
    expect(t.big3).toHaveLength(3);
    expect(t.regente).not.toBeNull();
    expect(t.cuerpos).toHaveLength(13);
    expect(t.cuerpos[0]!.titulo).toMatch(/^Sol en \S+, casa \d+/);
    expect(t.aspectos.length).toBeLessThanOrEqual(8);
    expect(t.marco).toBe(AVISO_MARCO);
    expect(JSON.stringify(t)).not.toMatch(/[{}]\w|undefined|null|NaN/);
  });

  it("sin hora: sin Ascendente ni regente, sin casas y con el aviso de la spec", () => {
    const t = renderChart(sinHora);
    expect(t.big3).toHaveLength(2);
    expect(t.regente).toBeNull();
    expect(t.cuerpos.every((c) => !/casa \d/.test(c.titulo))).toBe(true);
    expect(t.avisos).toContain(AVISO_SIN_HORA);
    expect(AVISO_SIN_HORA).toBe("Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.");
  });

  it("es determinista", () => {
    expect(renderChart(conHora)).toEqual(renderChart(conHora));
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/lib/astro/prose.test.ts`
Expected: FAIL (no se puede resolver `./prose`).

- [ ] **Step 3: Escribir el borrador de `templates.json`**

Procedimiento (el texto es nuestro, de cero):
1. Para cada id, leer en `docs/superpowers/research/astrologia/astrologia-base.json` las palabras clave (`signos[].palabras_clave_consenso` con `src` de 3 o más fuentes; `planetas[].palabras_clave`; `puntos[].palabras_clave`; `casas[].palabras_clave`; `aspectos[]`), y en `fundamentos-interpretativos.md` §1.3 (signos), §2.1-§2.4 (planetas, nodos, Lilith, Quirón), §3.1 (casas), §4.1 (aspectos) y §7.3 (marco).
2. `palabras_clave`: 3 a 6, en castellano, solo de consenso.
3. Redactar en rioplatense con voseo («podés», «te»), cálido y **no determinista** («puede expresarse como…», «muchas personas con…»; nunca «vas a…»). Casas 6, 8 y 12 en clave de hábitos, transformación y vida interior; nada predictivo sobre salud, muerte, accidentes, embarazo ni dinero (§7.3.2).
4. **Prohibido** copiar o traducir frases de Urania Trust, Astrotheme, Astrostyle, Cafe Astrology, astro.com u otras fuentes con copyright: se usan como contraste de conceptos, no como texto.
5. `_meta`: `{ "estado": "borrador", "revision": null }`. **La dueña revisa y aprueba los 78 textos antes del release** (mismo circuito que F-T3 del tarot); al aprobar, `estado: "aprobado"` y `revision: "<nombre> AAAA-MM-DD"`.

Forma y tono (estas cinco entradas son las primeras del archivo; las 73 restantes siguen el mismo molde):

```json
{
  "_meta": { "estado": "borrador", "revision": null },
  "cuerpos": {
    "sol": {
      "nombre": "Sol",
      "palabras_clave": ["identidad", "vitalidad", "propósito consciente"],
      "frase": "Sol habla de tu centro: lo que te da energía y el propósito que querés poner en el mundo.",
      "ficha": [
        "El Sol es el punto de partida de casi toda lectura. Representa la identidad que vas construyendo a lo largo de la vida: aquello que te enciende, lo que querés expresar y el modo en que buscás reconocerte en lo que hacés. No es todo lo que sos, pero sí el hilo que ordena el resto.",
        "En la carta, el signo del Sol muestra el estilo de esa energía y la casa, el ámbito donde más se juega. Muchas personas sienten que su Sol describe más una meta que un punto de llegada: algo que se despliega con los años y con las experiencias."
      ]
    }
  },
  "signos": {
    "aries": {
      "nombre": "Aries",
      "palabras_clave": ["afirmación del yo", "coraje", "iniciativa"],
      "frase": "En Aries, esa energía puede expresarse de forma directa, con ganas de empezar y de animarse primero.",
      "ficha": [
        "Aries abre el zodíaco: es el signo de fuego cardinal, el impulso que inaugura. Se lo asocia con la afirmación de uno mismo, el coraje y la iniciativa, con esa chispa que empuja a hacer antes de dudar demasiado.",
        "Cuando un planeta está en Aries, su forma de manifestarse suele ser franca y rápida. Puede aparecer como valentía y entusiasmo, y también como impaciencia; la tarea, muchas veces, es encauzar ese fuego sin apagarlo."
      ]
    }
  },
  "casas": {
    "1": {
      "nombre": "Casa 1",
      "palabras_clave": ["identidad", "cuerpo", "imagen de sí", "comienzos"],
      "frase": "En la casa 1 se pone en juego en tu manera de presentarte, en el cuerpo y en cómo empezás las cosas.",
      "ficha": [
        "La casa 1 comienza en el Ascendente y habla de la forma en que te mostrás y entrás en contacto con el mundo: la primera impresión, el cuerpo, el impulso con el que iniciás algo nuevo.",
        "Los planetas que caen en la casa 1 suelen ser muy visibles en la personalidad. Sin hora de nacimiento esta casa no se puede calcular, porque depende de la hora exacta."
      ]
    }
  },
  "aspectos": {
    "conjuncion": {
      "nombre": "conjunción",
      "palabras_clave": ["fusión", "intensidad", "foco"],
      "frase": "{a} y {b} están en conjunción: sus temas tienden a mezclarse y a expresarse juntos, como una sola voz.",
      "ficha": [
        "La conjunción une dos puntos que están en el mismo lugar del cielo, a 0° de distancia con un orbe de hasta 8°. Sus significados se funden: lo que representa uno tiñe al otro, para bien y para lo que cuesta.",
        "Es el aspecto más intenso y el más difícil de separar en partes. Para leerla conviene preguntarse cómo conviven las dos funciones y cuál tiende a llevar la delantera."
      ]
    }
  },
  "sol_en": {
    "aries": "Con el Sol en Aries, tu identidad puede crecer al animarte a empezar, a decir lo que querés y a poner el cuerpo en lo que te importa. Muchas personas con esta posición encuentran su fuerza en la iniciativa y aprenden, con el tiempo, a darle lugar también a la pausa."
  },
  "luna_en": {},
  "asc_en": {}
}
```

Completar las 78 entradas en ese archivo (13 `cuerpos`: `sol` a `pluton`, `quiron`, `nodo_norte` con nombre «Nodo Norte», `lilith_media` con nombre «Lilith (Luna Negra media)»; 12 `signos`; `casas` "1" a "12" con nombre «Casa n»; 5 `aspectos`; 12 + 12 + 12 de `sol_en`, `luna_en`, `asc_en`). El test del Step 1 es el criterio de completitud.

- [ ] **Step 4: Implementar `prose.ts`**

```ts
// webApp/src/lib/astro/prose.ts
import { z } from "@/lib/validation/zod";
import raw from "./data/templates.json";
import type { AspectId } from "./aspects";
import type { BodyPosition, ChartFacts } from "./chart";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, formatDegree, pointName } from "./zodiac";

export const HOUSE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;
export type HouseKey = (typeof HOUSE_KEYS)[number];
const ASPECT_KEYS = ["conjuncion", "sextil", "cuadratura", "trigono", "oposicion"] as const satisfies readonly AspectId[];

const entry = z.object({
  nombre: z.string().min(1),
  palabras_clave: z.array(z.string().min(1)).min(3).max(6),
  frase: z.string().min(40),
  ficha: z.array(z.string().min(200)).min(2).max(4),
});
const paragraph = z.string().min(120);

const schema = z.object({
  _meta: z.object({ estado: z.enum(["borrador", "aprobado"]), revision: z.string().nullable() }),
  cuerpos: z.record(z.enum(BODY_IDS), entry),
  signos: z.record(z.enum(SIGN_IDS), entry),
  casas: z.record(z.enum(HOUSE_KEYS), entry),
  aspectos: z.record(z.enum(ASPECT_KEYS), entry),
  sol_en: z.record(z.enum(SIGN_IDS), paragraph),
  luna_en: z.record(z.enum(SIGN_IDS), paragraph),
  asc_en: z.record(z.enum(SIGN_IDS), paragraph),
});

export type TextEntry = z.infer<typeof entry>;
// Se valida al importar: un hueco en los textos tiene que romper el build, no una carta.
export const TEMPLATES = schema.parse(raw);

export const AVISO_MARCO =
  "La astrología es un lenguaje simbólico con más de dos mil años de tradición, no una ciencia. Te ofrecemos esta carta como herramienta de reflexión y conversación, no de predicción: no reemplaza la atención médica ni psicológica. Si estás atravesando una situación de salud física o mental, consultá a una profesional.";
export const AVISO_SIN_HORA = "Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.";
export const AVISO_FALLBACK =
  "En esta latitud las casas Placidus no se pueden calcular: te mostramos casas de signo entero (Whole Sign).";
export const AVISO_LUNA =
  "Sin la hora, la Luna puede estar unos grados antes o después de lo que ves, y ese día cambió de signo: tomá su signo con cautela.";

export type Paragraph = { titulo: string; texto: string; porQue: string };
export type ChartText = {
  big3: Paragraph[];
  regente: Paragraph | null;
  cuerpos: Paragraph[];
  aspectos: Paragraph[];
  balance: string;
  avisos: string[];
  marco: string;
};

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`plantilla sin valor para {${k}}`);
    return v;
  });
}

function lista(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function ubicacion(b: BodyPosition): string {
  return `${BODY_NAMES[b.id]} a ${formatDegree(b.lon)} de ${SIGNS[b.sign].nombre}${b.house ? `, casa ${b.house}` : ""}`;
}

function bodyParagraph(b: BodyPosition): Paragraph {
  const partes = [TEMPLATES.cuerpos[b.id].frase, TEMPLATES.signos[b.sign].frase];
  if (b.house) partes.push(TEMPLATES.casas[String(b.house) as HouseKey].frase);
  return {
    titulo: `${BODY_NAMES[b.id]} en ${SIGNS[b.sign].nombre}${b.house ? `, casa ${b.house}` : ""}${b.retrograde ? " (retrógrado)" : ""}`,
    texto: partes.join(" "),
    porQue: ubicacion(b),
  };
}

export function renderChart(f: ChartFacts): ChartText {
  const byId = new Map(f.bodies.map((b) => [b.id, b]));
  const sol = byId.get("sol")!;
  const luna = byId.get("luna")!;

  const big3: Paragraph[] = [
    { titulo: `Sol en ${SIGNS[sol.sign].nombre}`, texto: TEMPLATES.sol_en[sol.sign], porQue: ubicacion(sol) },
    { titulo: `Luna en ${SIGNS[luna.sign].nombre}`, texto: TEMPLATES.luna_en[luna.sign], porQue: ubicacion(luna) },
  ];
  if (f.angles && f.big3.asc) {
    big3.push({ titulo: `Ascendente en ${SIGNS[f.big3.asc].nombre}`, texto: TEMPLATES.asc_en[f.big3.asc], porQue: `Ascendente a ${formatDegree(f.angles.asc)} de ${SIGNS[f.big3.asc].nombre}` });
  }

  let regente: Paragraph | null = null;
  if (f.chartRuler && f.big3.asc) {
    const r = byId.get(f.chartRuler)!;
    regente = {
      titulo: `Regente de la carta: ${BODY_NAMES[r.id]}`,
      texto: `${BODY_NAMES[r.id]} rige tu Ascendente en ${SIGNS[f.big3.asc].nombre}, así que sus temas tiñen toda la carta. ${TEMPLATES.cuerpos[r.id].frase}`,
      porQue: `${SIGNS[f.big3.asc].nombre} tiene como regente tradicional a ${BODY_NAMES[r.id]}; está en ${ubicacion(r)}`,
    };
  }

  const aspectos = f.aspects.slice(0, 8).map((a) => ({
    titulo: `${pointName(a.a)} en ${TEMPLATES.aspectos[a.type].nombre} con ${pointName(a.b)}`,
    texto: fill(TEMPLATES.aspectos[a.type].frase, { a: pointName(a.a), b: pointName(a.b) }),
    porQue: `orbe de ${a.orb.toFixed(1).replace(".", ",")}°, ${a.applying ? "aplicativo (se está formando)" : "separativo (se está disipando)"}`,
  }));

  const stelliums = f.stelliums.map((s) =>
    s.kind === "signo"
      ? `Hay un stellium en ${SIGNS[s.sign].nombre}: ${lista(s.bodies.map((b) => BODY_NAMES[b]))}.`
      : `Hay un stellium en la casa ${s.house}: ${lista(s.bodies.map((b) => BODY_NAMES[b]))}.`,
  );
  const balance = [
    `Entre los diez planetas predomina ${f.elements.dominant.length > 1 ? "los elementos" : "el elemento"} ${lista(f.elements.dominant)} y ${f.modalities.dominant.length > 1 ? "las modalidades" : "la modalidad"} ${lista(f.modalities.dominant)}.`,
    ...stelliums,
  ].join(" ");

  const avisos: string[] = [];
  if (f.flags.sinHora) avisos.push(AVISO_SIN_HORA);
  if (f.flags.houseSystemFallback) avisos.push(AVISO_FALLBACK);
  if (f.flags.moonSignUncertain) avisos.push(AVISO_LUNA);

  return { big3, regente, cuerpos: f.bodies.map(bodyParagraph), aspectos, balance, avisos, marco: AVISO_MARCO };
}
```

- [ ] **Step 5: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/astro/prose.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests) y `tsc` limpio. Un fallo de «cubre los 78 textos» lista la clave que falta.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/astro/data/templates.json webApp/src/lib/astro/prose.ts webApp/src/lib/astro/prose.test.ts
git commit -m "feat(carta-natal): 78 textos v1 en borrador y prosa por plantillas (pendiente revisión de la dueña)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Servidor y Server Actions con rate limit

**Files:**
- Create: `webApp/src/lib/server/natal-chart.ts`
- Test: `webApp/src/lib/server/natal-chart.test.ts`
- Create: `webApp/src/app/(marketing)/carta-natal/actions.ts`
- Test: `webApp/src/app/(marketing)/carta-natal/actions.test.ts`
- Modify: `webApp/src/lib/rate-limit/limits.ts` (5 entradas)
- Modify: `webApp/src/lib/supabase/service.ts` (documentar el uso nuevo en la cabecera)

**Interfaces:**
- Consumes: `computeChart`, `ChartFacts` (Task 11); `renderChart`, `ChartText` (Task 14); `localToUtc`, `utcFromOffset`, `formatOffset`, `isValidTimeZone`, `tzdataVersion`, `NOON`, `ClockChoice` (Task 3); funciones SQL de Task 12; `withRateLimit`, `limitedState`, `rateLimitMessage`, `ActionState`.
- Produces (`src/lib/server/natal-chart.ts`, `import "server-only"`):
  - `type ChartFormInput = { date: string; time: string | null; placeId: number | null; lat: number | null; lon: number | null; timeZone: string | null; houseSystem: HouseSystem; clock: ClockChoice | null }`.
  - `type PlaceOption = { id: number; label: string; lat: number; lon: number; timeZone: string }`.
  - `type ResolvedBirth = { date: string; time: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem }`.
  - `type ChartView = { facts: ChartFacts; text: ChartText; placeLabel: string; zoneLabel: string }`.
  - `type PrepareResult = { kind: "ok"; birth: ResolvedBirth; view: ChartView } | { kind: "ambigua"; earlier: string; later: string } | { kind: "error"; error: string }`.
  - `type SavedChart = { id: string; label: string; birthDate: string; birthTime: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem; isSelf: boolean; createdAt: string }`.
  - `parseChartForm(fd: FormData): { ok: true; input: ChartFormInput } | { ok: false; error: string }`, `prepareChart(input: ChartFormInput): Promise<PrepareResult>`, `searchPlaces(q: string): Promise<PlaceOption[]>`, `getNatalChart(id: string): Promise<SavedChart | null>`, `listNatalCharts(): Promise<SavedChart[]>`, `hasSelfChart(): Promise<boolean>`, `viewFromSaved(s: SavedChart): Promise<ChartView>`, `insertNatalChart(userId: string, birth: ResolvedBirth, facts: ChartFacts, opts: { label: string; isSelf: boolean }): Promise<string | null>`, `markSelfChart(userId: string, saved: SavedChart): Promise<boolean>`.
- Produces (`actions.ts`, `"use server"`):
  - `type AmbiguaLabels = { earlier: string; later: string }`, `type CalcState = ActionState & { view?: ChartView; ambigua?: AmbiguaLabels }`, `type SaveState = ActionState & { id?: string; ambigua?: AmbiguaLabels }`.
  - `calcularCarta(_prev: CalcState, fd: FormData): Promise<CalcState>`, `guardarCarta(_prev: SaveState, fd: FormData): Promise<SaveState>`, `buscarLugar(q: string): Promise<{ places: PlaceOption[]; error: string | null }>`, `borrarCarta(_prev: ActionState, fd: FormData): Promise<ActionState>`, `marcarMiCarta(_prev: ActionState, fd: FormData): Promise<ActionState>`.
  - Campos del formulario: `fecha` (YYYY-MM-DD), `hora` (HH:MM), `sinHora` (`on`), `lugar` (id de `places`), `lat`, `lon`, `huso` (IANA; con `lugar` corrige el huso del lugar), `casas` (`placidus`|`whole_sign`), `reloj` (`earlier`|`later`), y al guardar `etiqueta`, `propia` (`1`), `consiento` (`on`); `id` para borrar y marcar.

Reglas: nada de esto viaja en la URL (son POST de Server Action). `calcularCarta` nunca escribe. `guardarCarta` exige `consiento=on` **antes** de tocar nada, sesión por `getUser()`, y recién entonces usa `service_role`. La hora ambigua a las 12:00 hipotéticas (sin hora) se resuelve con `earlier` sin preguntar: es una hora inventada y la base exige `ambiguity_choice` solo con hora real.

- [ ] **Step 1: Registrar los límites** en `webApp/src/lib/rate-limit/limits.ts`, dentro de `RATE_LIMITS`, después de las dos del tarot:

```ts
  // Carta natal (T-024). Calcular es público (cuenta por IP sin sesión); buscar lugar va por tecla
  // con espera de 300 ms; guardar escribe con service_role.
  calcularCarta: { max: 30, windowSeconds: 600 },
  guardarCarta: { max: 10, windowSeconds: 3600 },
  buscarLugar: { max: 120, windowSeconds: 600 },
  borrarCarta: { max: 30, windowSeconds: 600 },
  marcarMiCarta: { max: 10, windowSeconds: 600 },
```

- [ ] **Step 2: Escribir los tests que fallan**

```ts
// webApp/src/lib/server/natal-chart.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { insertNatalChart, parseChartForm, prepareChart, type ChartFormInput } from "./natal-chart";

const BA = "America/Argentina/Buenos_Aires";
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const manual = (over: Partial<ChartFormInput> = {}): ChartFormInput => ({
  date: "1990-06-15", time: "09:00", placeId: null, lat: -34.60372, lon: -58.38159, timeZone: BA, houseSystem: "placidus", clock: null, ...over,
});

beforeEach(() => {
  createClient.mockReset();
  createServiceRoleClient.mockReset();
});

describe("parseChartForm", () => {
  it("valida rango, hora y lugar", () => {
    expect(parseChartForm(fd({ fecha: "1899-12-31", hora: "10:00", lat: "0", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", lat: "0", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", sinHora: "on", hora: "10:00", lat: "-34,6", lon: "-58.4", huso: BA }))).toEqual({
      ok: true, input: { date: "1990-06-15", time: null, placeId: null, lat: -34.6, lon: -58.4, timeZone: BA, houseSystem: "placidus", clock: null },
    });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lat: "0", lon: "0" }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lat: "91", lon: "0", huso: BA }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lugar: "3844421", huso: "Marte/Olympus" }))).toMatchObject({ ok: false });
    expect(parseChartForm(fd({ fecha: "1990-06-15", hora: "10:00", lugar: "3844421", casas: "whole_sign", reloj: "later" }))).toEqual({
      ok: true, input: { date: "1990-06-15", time: "10:00", placeId: 3844421, lat: null, lon: null, timeZone: null, houseSystem: "whole_sign", clock: "later" },
    });
  });
});

describe("prepareChart", () => {
  it("coordenadas a mano: resuelve el huso y calcula sin tocar la base", async () => {
    const r = await prepareChart(manual());
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.birth.offsetSeconds).toBe(-10800);
    expect(r.view.zoneLabel).toBe(`Huso ${BA}, UTC−3`);
    expect(r.view.facts.utcIso).toBe("1990-06-15T12:00:00.000Z");
    expect(r.view.text.cuerpos).toHaveLength(13);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("hora ambigua: pregunta; con la elección, la guarda", async () => {
    const q = await prepareChart(manual({ date: "2008-03-15", time: "23:30" }));
    expect(q).toEqual({ kind: "ambigua", earlier: "UTC−2", later: "UTC−3" });
    const r = await prepareChart(manual({ date: "2008-03-15", time: "23:30", clock: "later" }));
    expect(r.kind === "ok" && [r.birth.clock, r.birth.offsetSeconds]).toEqual(["later", -10800]);
  });

  it("una elección vieja sin ambigüedad no se guarda", async () => {
    const r = await prepareChart(manual({ clock: "earlier" }));
    expect(r.kind === "ok" && r.birth.clock).toBeNull();
  });

  it("hora inexistente: error que pide revisar", async () => {
    const r = await prepareChart(manual({ date: "2007-12-30", time: "00:30" }));
    expect(r).toMatchObject({ kind: "error" });
    expect(r.kind === "error" && r.error).toMatch(/no existió/);
  });

  it("lugar de la lista: usa sus coordenadas y su zona, y deja corregir el huso", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1, name: "Mendoza", admin1: "Mendoza", country_code: "AR", lat: -32.89084, lon: -68.82717, timezone: "America/Argentina/Mendoza" }, error: null });
    createClient.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) });
    const r = await prepareChart(manual({ placeId: 1, lat: null, lon: null, timeZone: null, date: "2004-07-01", time: "12:00" }));
    expect(r.kind === "ok" && [r.birth.timeZone, r.birth.offsetSeconds, r.view.zoneLabel]).toEqual(["America/Argentina/Mendoza", -14400, "Hora de Mendoza, UTC−4"]);
    const c = await prepareChart(manual({ placeId: 1, lat: null, lon: null, timeZone: "America/Argentina/Buenos_Aires", date: "2004-07-01", time: "12:00" }));
    expect(c.kind === "ok" && c.birth.offsetSeconds).toBe(-10800);
  });
});

describe("insertNatalChart", () => {
  it("manda signos solo si es la carta propia, y sin Ascendente si no hay hora", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await prepareChart(manual({ time: null }));
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Mi carta", isSelf: true })).toBe("c-1");
    const args = rpc.mock.calls[0]![1];
    expect(args).toMatchObject({ p_user_id: "u-1", p_is_self: true, p_birth_time: null, p_asc: null, p_house_system: "placidus" });
    expect(args.p_sun).toBe(r.view.facts.big3.sun);
    await insertNatalChart("u-1", r.birth, r.view.facts, { label: "Otra", isSelf: false });
    expect(rpc.mock.calls[1]![1]).toMatchObject({ p_is_self: false, p_sun: null, p_moon: null, p_asc: null });
  });
});
```

```ts
// webApp/src/app/(marketing)/carta-natal/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { borrarCarta, buscarLugar, calcularCarta, guardarCarta } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };
const UID = "20000000-0000-4000-8000-00000000000a";
const BASE = { fecha: "1990-06-15", hora: "09:00", lat: "-34.60372", lon: "-58.38159", huso: "America/Argentina/Buenos_Aires", casas: "placidus" };
const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

function session(user: { id: string } | null = { id: UID }) {
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) } });
}

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "ip", ip: "203.0.113.7" });
  createClient.mockReset();
  createServiceRoleClient.mockReset();
});

describe("calcularCarta", () => {
  it("calcula sin sesión y nunca escribe", async () => {
    const r = await calcularCarta(INITIAL, form(BASE));
    expect(r.error).toBeNull();
    expect(r.view?.facts.bodies).toHaveLength(13);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("fecha fuera de rango: error", async () => {
    const r = await calcularCarta(INITIAL, form({ ...BASE, fecha: "2101-01-01" }));
    expect(r.error).toMatch(/1900/);
  });

  it("la 31.ª en 10 minutos queda limitada", async () => {
    for (let i = 0; i < 30; i++) await calcularCarta(INITIAL, form(BASE));
    const r = await calcularCarta(INITIAL, form(BASE));
    expect(r.error).toMatch(/Demasiados intentos/);
  });
});

describe("guardarCarta", () => {
  it("sin consentimiento no toca nada", async () => {
    const r = await guardarCarta(INITIAL, form(BASE));
    expect(r.error).toMatch(/aceptar/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin sesión pide entrar", async () => {
    session(null);
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on" }));
    expect(r.error).toMatch(/sesión/);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("con sesión y consentimiento guarda por service_role con el id de la sesión", async () => {
    session();
    const rpc = vi.fn().mockResolvedValue({ data: "c-1", error: null });
    createServiceRoleClient.mockReturnValue({ rpc });
    const r = await guardarCarta(INITIAL, form({ ...BASE, consiento: "on", propia: "1", etiqueta: "  Mi\ncarta  " }));
    expect(r).toMatchObject({ error: null, id: "c-1" });
    expect(rpc).toHaveBeenCalledWith("save_natal_chart", expect.objectContaining({ p_user_id: UID, p_is_self: true, p_label: "Mi carta", p_utc_offset_seconds: -10800 }));
  });
});

describe("buscarLugar y borrarCarta", () => {
  it("menos de 3 letras no consulta", async () => {
    expect(await buscarLugar("ab")).toEqual({ places: [], error: null });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("borrar exige un uuid", async () => {
    const r = await borrarCarta(INITIAL, form({ id: "x" }));
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `cd webApp && npx vitest run src/lib/server/natal-chart.test.ts "src/app/(marketing)/carta-natal/actions.test.ts" src/lib/rate-limit/coverage.test.ts`
Expected: FAIL — módulos inexistentes, y `coverage.test.ts` falla por las 5 entradas de `RATE_LIMITS` sin action.

- [ ] **Step 4: Implementar `natal-chart.ts`**

```ts
// webApp/src/lib/server/natal-chart.ts
import "server-only";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { type ChartFacts, computeChart } from "@/lib/astro/chart";
import { type ChartText, renderChart } from "@/lib/astro/prose";
import { type ClockChoice, NOON, type TimeResolution, formatOffset, isValidTimeZone, localToUtc, tzdataVersion, utcFromOffset } from "@/lib/astro/time";
import type { HouseSystem, SignId } from "@/lib/astro/zodiac";

export type ChartFormInput = { date: string; time: string | null; placeId: number | null; lat: number | null; lon: number | null; timeZone: string | null; houseSystem: HouseSystem; clock: ClockChoice | null };
export type PlaceOption = { id: number; label: string; lat: number; lon: number; timeZone: string };
export type ResolvedBirth = { date: string; time: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem };
export type ChartView = { facts: ChartFacts; text: ChartText; placeLabel: string; zoneLabel: string };
export type PrepareResult = { kind: "ok"; birth: ResolvedBirth; view: ChartView } | { kind: "ambigua"; earlier: string; later: string } | { kind: "error"; error: string };
export type SavedChart = { id: string; label: string; birthDate: string; birthTime: string | null; placeId: number | null; lat: number; lon: number; timeZone: string; offsetSeconds: number; clock: ClockChoice | null; houseSystem: HouseSystem; isSelf: boolean; createdAt: string };

type PlaceRow = { id: number; name: string; admin1: string | null; country_code: string; lat: number; lon: number; timezone: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const REGION = new Intl.DisplayNames(["es"], { type: "region" });

function text(fd: FormData, name: string): string | null {
  const v = fd.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

function num(fd: FormData, name: string): number | null {
  const t = text(fd, name);
  return t === null ? null : Number(t.replace(",", "."));
}

export function parseChartForm(fd: FormData): { ok: true; input: ChartFormInput } | { ok: false; error: string } {
  const date = text(fd, "fecha");
  if (!date || !DATE_RE.test(date) || date < "1900-01-01" || date > "2100-12-31") {
    return { ok: false, error: "La fecha tiene que estar entre el 1/1/1900 y el 31/12/2100." };
  }
  const sinHora = fd.get("sinHora") === "on";
  const time = sinHora ? null : text(fd, "hora");
  if (!sinHora && (time === null || !TIME_RE.test(time))) return { ok: false, error: "Escribí la hora (HH:MM) o marcá «No sé la hora»." };
  const casas = text(fd, "casas") ?? "placidus";
  if (casas !== "placidus" && casas !== "whole_sign") return { ok: false, error: "Sistema de casas inválido." };
  const reloj = text(fd, "reloj");
  const clock: ClockChoice | null = reloj === "earlier" || reloj === "later" ? reloj : null;
  const lugar = text(fd, "lugar");
  const placeId = lugar !== null && /^\d{1,12}$/.test(lugar) ? Number(lugar) : null;
  const huso = text(fd, "huso");
  if (huso !== null && !isValidTimeZone(huso)) return { ok: false, error: "Ese huso horario no existe. Usá un nombre IANA, por ejemplo America/Argentina/Cordoba." };
  if (placeId !== null) return { ok: true, input: { date, time, placeId, lat: null, lon: null, timeZone: huso, houseSystem: casas, clock } };
  const lat = num(fd, "lat");
  const lon = num(fd, "lon");
  if (lat === null || lon === null || huso === null) return { ok: false, error: "Elegí un lugar de la lista o cargá latitud, longitud y huso." };
  if (!(Math.abs(lat) <= 89.99) || !(lon > -180 && lon <= 180)) return { ok: false, error: "La latitud va de −89,99 a 89,99 y la longitud de −180 a 180." };
  return { ok: true, input: { date, time, placeId: null, lat, lon, timeZone: huso, houseSystem: casas, clock } };
}

export function placeLabel(p: Pick<PlaceRow, "name" | "admin1" | "country_code">): string {
  return [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, REGION.of(p.country_code) ?? p.country_code].filter(Boolean).join(", ");
}

function coordLabel(lat: number, lon: number): string {
  const f = (v: number, neg: string, pos: string) => `${Math.abs(v).toFixed(4).replace(".", ",")}° ${v < 0 ? neg : pos}`;
  return `${f(lat, "S", "N")}, ${f(lon, "O", "E")}`;
}

async function placeById(id: number): Promise<PlaceRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("places").select("id, name, admin1, country_code, lat, lon, timezone").eq("id", id).maybeSingle();
  return (data as PlaceRow | null) ?? null;
}

const MENSAJES: Record<"inexistente" | "zona-invalida" | "fecha-invalida", string> = {
  inexistente: "Esa hora no existió en el reloj oficial de ese lugar: ese día se adelantaron los relojes. Revisá la hora en el acta o la partida.",
  "zona-invalida": "Ese huso horario no existe.",
  "fecha-invalida": "Esa fecha no existe.",
};

export async function prepareChart(input: ChartFormInput): Promise<PrepareResult> {
  let lat: number;
  let lon: number;
  let timeZone: string;
  let label: string;
  let zoneName: string | null = null;
  if (input.placeId !== null) {
    const p = await placeById(input.placeId);
    if (!p) return { kind: "error", error: "No encontramos ese lugar. Buscalo de nuevo." };
    ({ lat, lon } = p);
    timeZone = input.timeZone ?? p.timezone;
    label = placeLabel(p);
    zoneName = input.timeZone && input.timeZone !== p.timezone ? null : (p.admin1 ?? p.name);
  } else {
    lat = input.lat!;
    lon = input.lon!;
    timeZone = input.timeZone!;
    label = coordLabel(lat, lon);
  }

  const local = { date: input.date, time: input.time ?? NOON, timeZone, lon };
  let r: TimeResolution = localToUtc(local, null);
  let clock: ClockChoice | null = null;
  if (r.kind === "ambigua") {
    // Sin hora, las 12:00 son hipotéticas: no hay nada que preguntar ni que guardar.
    if (input.time === null) r = localToUtc(local, "earlier");
    else if (input.clock === null) return { kind: "ambigua", earlier: formatOffset(r.earlier.offsetSeconds), later: formatOffset(r.later.offsetSeconds) };
    else {
      clock = input.clock;
      r = localToUtc(local, clock);
    }
  }
  if (r.kind !== "ok") return { kind: "error", error: MENSAJES[r.kind as keyof typeof MENSAJES] };

  let facts: ChartFacts;
  try {
    facts = computeChart({ utc: r.utc, lat, lon, houseSystem: input.houseSystem, hasTime: input.time !== null });
  } catch {
    return { kind: "error", error: "No pudimos calcular la carta con esos datos. Revisá la fecha y el lugar." };
  }
  const off = formatOffset(r.offsetSeconds);
  const zoneLabel = r.source === "lmt"
    ? `Hora media local del lugar, ${off}: antes de la hora oficial cada lugar usaba la suya`
    : zoneName ? `Hora de ${zoneName}, ${off}` : `Huso ${timeZone}, ${off}`;
  return {
    kind: "ok",
    birth: { date: input.date, time: input.time, placeId: input.placeId, lat, lon, timeZone, offsetSeconds: r.offsetSeconds, clock, houseSystem: input.houseSystem },
    view: { facts, text: renderChart(facts), placeLabel: label, zoneLabel },
  };
}

export async function searchPlaces(q: string): Promise<PlaceOption[]> {
  const query = q.trim();
  if (query.length < 3 || query.length > 80) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_places", { p_q: query });
  if (error || !Array.isArray(data)) return [];
  return (data as PlaceRow[]).map((p) => ({ id: Number(p.id), label: placeLabel(p), lat: p.lat, lon: p.lon, timeZone: p.timezone }));
}

const rowSchema = z.object({
  id: z.string(),
  label: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  place_id: z.number().nullable(),
  lat: z.number(),
  lon: z.number(),
  timezone: z.string(),
  utc_offset_seconds: z.number().int(),
  ambiguity_choice: z.enum(["earlier", "later"]).nullable(),
  house_system: z.enum(["placidus", "whole_sign"]),
  is_self: z.boolean(),
  created_at: z.string(),
});
const COLUMNS = "id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds, ambiguity_choice, house_system, is_self, created_at";

function toSaved(row: unknown): SavedChart | null {
  const p = rowSchema.safeParse(row);
  if (!p.success) return null;
  const d = p.data;
  return {
    id: d.id, label: d.label, birthDate: d.birth_date, birthTime: d.birth_time ? d.birth_time.slice(0, 5) : null,
    placeId: d.place_id, lat: d.lat, lon: d.lon, timeZone: d.timezone, offsetSeconds: d.utc_offset_seconds,
    clock: d.ambiguity_choice, houseSystem: d.house_system, isSelf: d.is_self, createdAt: d.created_at,
  };
}

/** RLS filtra por dueña: una carta ajena simplemente no vuelve. */
export async function getNatalChart(id: string): Promise<SavedChart | null> {
  if (!z.string().uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("natal_charts").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toSaved(data) : null;
}

export async function listNatalCharts(): Promise<SavedChart[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("natal_charts").select(COLUMNS).order("created_at", { ascending: false }).limit(100);
  const rows: unknown[] = data ?? [];
  return rows.map(toSaved).filter((c): c is SavedChart => c !== null);
}

export async function hasSelfChart(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("natal_charts").select("id").eq("is_self", true).limit(1);
  if (error) throw new Error(`No se pudo leer la carta propia: ${error.message}`);
  return (data ?? []).length > 0;
}

// Se recalcula con el offset GUARDADO, no con la tzdata de hoy: el huso que la persona vio y
// confirmó es parte de su input (lugar-y-hora.md §4, «si el usuario lo corrige, queda fijo»).
function factsFromSaved(s: SavedChart): ChartFacts {
  const utc = utcFromOffset(s.birthDate, s.birthTime ?? NOON, s.offsetSeconds);
  return computeChart({ utc, lat: s.lat, lon: s.lon, houseSystem: s.houseSystem, hasTime: s.birthTime !== null });
}

export async function viewFromSaved(s: SavedChart): Promise<ChartView> {
  const facts = factsFromSaved(s);
  const place = s.placeId !== null ? await placeById(s.placeId) : null;
  return { facts, text: renderChart(facts), placeLabel: place ? placeLabel(place) : coordLabel(s.lat, s.lon), zoneLabel: `Huso usado: ${formatOffset(s.offsetSeconds)}` };
}

function signsOf(facts: ChartFacts): { sun: SignId; moon: SignId; asc: SignId | null } {
  return facts.big3;
}

export async function insertNatalChart(userId: string, birth: ResolvedBirth, facts: ChartFacts, opts: { label: string; isSelf: boolean }): Promise<string | null> {
  const s = signsOf(facts);
  const { data, error } = await createServiceRoleClient().rpc("save_natal_chart", {
    p_user_id: userId, p_label: opts.label, p_birth_date: birth.date, p_birth_time: birth.time,
    p_place_id: birth.placeId, p_lat: birth.lat, p_lon: birth.lon, p_timezone: birth.timeZone,
    p_utc_offset_seconds: birth.offsetSeconds, p_ambiguity_choice: birth.clock, p_tzdata_version: tzdataVersion(),
    p_house_system: birth.houseSystem, p_is_self: opts.isSelf,
    p_sun: opts.isSelf ? s.sun : null, p_moon: opts.isSelf ? s.moon : null, p_asc: opts.isSelf ? s.asc : null,
  });
  return error || typeof data !== "string" ? null : data;
}

export async function markSelfChart(userId: string, saved: SavedChart): Promise<boolean> {
  const s = signsOf(factsFromSaved(saved));
  const { error } = await createServiceRoleClient().rpc("set_self_natal_chart", {
    p_user_id: userId, p_chart_id: saved.id, p_sun: s.sun, p_moon: s.moon, p_asc: s.asc,
  });
  return !error;
}
```

- [ ] **Step 5: Implementar `actions.ts` y documentar `service.ts`**

```ts
// webApp/src/app/(marketing)/carta-natal/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "@/lib/validation/zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState, rateLimitMessage } from "@/lib/rate-limit/core";
import {
  type ChartView, type PlaceOption, getNatalChart, insertNatalChart, markSelfChart, parseChartForm, prepareChart, searchPlaces,
} from "@/lib/server/natal-chart";

export type AmbiguaLabels = { earlier: string; later: string };
export type CalcState = ActionState & { view?: ChartView; ambigua?: AmbiguaLabels };
export type SaveState = ActionState & { id?: string; ambigua?: AmbiguaLabels };

const SESSION_EXPIRED = { error: "Tu sesión venció. Volvé a entrar.", success: null };

function cleanLabel(raw: FormDataEntryValue | null, fallback: string): string {
  const s = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  return s === "" ? fallback : s;
}

export const calcularCarta = withRateLimit(
  "calcularCarta",
  async function calcularCarta(_prev: CalcState, fd: FormData): Promise<CalcState> {
    const parsed = parseChartForm(fd);
    if (!parsed.ok) return { error: parsed.error, success: null };
    const r = await prepareChart(parsed.input);
    if (r.kind === "error") return { error: r.error, success: null };
    if (r.kind === "ambigua") return { error: null, success: null, ambigua: { earlier: r.earlier, later: r.later } };
    return { error: null, success: null, view: r.view };
  },
  limitedState,
);

export const guardarCarta = withRateLimit(
  "guardarCarta",
  async function guardarCarta(_prev: SaveState, fd: FormData): Promise<SaveState> {
    if (fd.get("consiento") !== "on") {
      return { error: "Para guardar la carta tenés que aceptar que guardemos tus datos de nacimiento.", success: null };
    }
    const parsed = parseChartForm(fd);
    if (!parsed.ok) return { error: parsed.error, success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;

    const r = await prepareChart(parsed.input);
    if (r.kind === "error") return { error: r.error, success: null };
    if (r.kind === "ambigua") return { error: null, success: null, ambigua: { earlier: r.earlier, later: r.later } };

    const isSelf = fd.get("propia") === "1";
    const [y, m, d] = parsed.input.date.split("-");
    const label = cleanLabel(fd.get("etiqueta"), isSelf ? "Mi carta" : `Carta del ${d}/${m}/${y}`);
    const id = await insertNatalChart(user.id, r.birth, r.view.facts, { label, isSelf });
    if (!id) return { error: "No se pudo guardar la carta. Si ya tenés 100 guardadas, borrá alguna.", success: null };

    revalidatePath("/panel/carta-natal");
    if (isSelf) revalidatePath("/panel/docente", "layout");
    return { error: null, success: "Carta guardada.", id };
  },
  limitedState,
);

export const buscarLugar = withRateLimit(
  "buscarLugar",
  async function buscarLugar(q: string): Promise<{ places: PlaceOption[]; error: string | null }> {
    if (typeof q !== "string") return { places: [], error: null };
    return { places: await searchPlaces(q), error: null };
  },
  (denied) => ({ places: [], error: rateLimitMessage(denied.retryAfter) }),
);

export const borrarCarta = withRateLimit(
  "borrarCarta",
  async function borrarCarta(_prev: ActionState, fd: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(fd.get("id"));
    if (!id.success) return { error: "Carta inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const { data, error } = await supabase.from("natal_charts").delete().eq("id", id.data).select("id");
    if (error) return { error: "No se pudo borrar la carta.", success: null };
    if (!data || data.length === 0) return { error: "No encontramos esa carta.", success: null };
    revalidatePath("/panel/carta-natal");
    return { error: null, success: "Carta borrada." };
  },
  limitedState,
);

export const marcarMiCarta = withRateLimit(
  "marcarMiCarta",
  async function marcarMiCarta(_prev: ActionState, fd: FormData): Promise<ActionState> {
    const id = z.string().uuid().safeParse(fd.get("id"));
    if (!id.success) return { error: "Carta inválida.", success: null };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return SESSION_EXPIRED;
    const saved = await getNatalChart(id.data);
    if (!saved) return { error: "No encontramos esa carta.", success: null };
    if (!(await markSelfChart(user.id, saved))) return { error: "No se pudo marcar la carta.", success: null };
    revalidatePath("/panel/carta-natal");
    return { error: null, success: "Ahora es tu carta." };
  },
  limitedState,
);
```

En `webApp/src/lib/supabase/service.ts`, en el JSDoc de `createServiceRoleClient`, antes de «Cualquier otro uso de este cliente anula RLS», agregar la frase: «Guarda y marca cartas natales (`save_natal_chart`, `set_self_natal_chart`, T-024) después de `getUser()` y del consentimiento, con el `user.id` de la sesión, nunca uno del request.»

- [ ] **Step 6: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/server/natal-chart.test.ts "src/app/(marketing)/carta-natal/actions.test.ts" src/lib/rate-limit && npx tsc --noEmit`
Expected: PASS (incluido `coverage.test.ts`: las 5 actions tienen su entrada) y `tsc` limpio.

- [ ] **Step 7: Commit**

```bash
git add webApp/src/lib/server/natal-chart.ts webApp/src/lib/server/natal-chart.test.ts "webApp/src/app/(marketing)/carta-natal/actions.ts" "webApp/src/app/(marketing)/carta-natal/actions.test.ts" webApp/src/lib/rate-limit/limits.ts webApp/src/lib/supabase/service.ts
git commit -m "feat(carta-natal): servidor y Server Actions (calcular, guardar con consentimiento, buscar lugar, borrar, marcar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Rueda SVG, tablas y bloque de resultado

**Files:**
- Create: `webApp/src/components/carta-natal/ChartWheel.tsx`
- Create: `webApp/src/components/carta-natal/PositionsTable.tsx`
- Create: `webApp/src/components/carta-natal/AspectsTable.tsx`
- Create: `webApp/src/components/carta-natal/AstroEthicsNote.tsx`
- Create: `webApp/src/components/carta-natal/ChartResult.tsx`
- Test: `webApp/src/components/carta-natal/carta-natal.test.tsx`

**Interfaces:**
- Consumes: `ChartFacts` (Task 11), `ChartText`, `Paragraph`, `AVISO_*` (Task 14), `ChartView` (Task 15, solo tipo), `ASPECTS`/`AspectId` (Task 10), helpers de `zodiac.ts`.
- Produces: `ChartWheel({ facts }: { facts: ChartFacts })`, `PositionsTable({ facts })`, `AspectsTable({ facts })`, `AstroEthicsNote({ text }: { text: string })`, `ChartResult({ view }: { view: ChartView })`, `ASPECT_STYLE: Record<Exclude<AspectId, "conjuncion">, { cls: string; dash: string | null; label: string }>`. Todos sin `'use client'` (se pueden renderizar en servidor y dentro del formulario cliente).

Diseño: ASC a la izquierda (λ = ASC en x mínimo), longitudes crecientes en sentido antihorario; sin hora, 0° Aries a la izquierda y ni casas ni ángulos. Aspectos por color **y** por trazo: trígono `musgo` continuo, sextil `musgo` punteado, cuadratura `miel-800` a rayas, oposición `bosque` continuo; la conjunción no se dibuja (está en la tabla). Cuerpos y signos con abreviaturas de texto (`BODY_ABBR`, `SIGNS.*.abbr`), cada uno con `<title>` completo. `musgo` solo en trazos, nunca en texto.

- [ ] **Step 1: Escribir el test que falla**

```tsx
// webApp/src/components/carta-natal/carta-natal.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeChart } from "@/lib/astro/chart";
import { AVISO_MARCO, AVISO_SIN_HORA, renderChart } from "@/lib/astro/prose";
import ChartWheel from "./ChartWheel";
import PositionsTable from "./PositionsTable";
import ChartResult from "./ChartResult";

const BA = { lat: -34.60372, lon: -58.38159 };
const conHora = computeChart({ utc: new Date("1990-06-15T12:00:00Z"), ...BA, houseSystem: "placidus", hasTime: true });
const sinHora = computeChart({ utc: new Date("1990-06-15T15:00:00Z"), ...BA, houseSystem: "placidus", hasTime: false });
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe("ChartWheel", () => {
  it("con hora: 12 signos, 13 cuerpos, 12 casas y el ASC a la izquierda", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={conHora} />);
    expect(count(html, /data-signo=/g)).toBe(12);
    expect(count(html, /data-cuerpo=/g)).toBe(13);
    expect(count(html, /data-casa=/g)).toBe(12);
    const [, x, y] = html.match(/data-angulo="asc" x="([\d.]+)" y="([\d.]+)"/)!;
    expect(Number(x)).toBeLessThan(200);
    expect(Number(y)).toBeCloseTo(300, 0);
    expect(html).toContain('aria-label="Rueda de la carta natal"');
  });

  it("aspectos por trazo: la cuadratura va a rayas y la conjunción no se dibuja", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={conHora} />);
    const tipos = conHora.aspects.map((a) => a.type);
    expect(count(html, /data-aspecto=/g)).toBe(tipos.filter((t) => t !== "conjuncion").length);
    if (tipos.includes("cuadratura")) expect(html).toMatch(/data-aspecto="cuadratura"[^>]*stroke-dasharray="8 4"/);
  });

  it("sin hora: sin casas ni ángulos", () => {
    const html = renderToStaticMarkup(<ChartWheel facts={sinHora} />);
    expect(count(html, /data-casa=/g)).toBe(0);
    expect(html).not.toContain("data-angulo");
  });

  it("sin glifos Unicode astrológicos (D-63)", () => {
    expect(renderToStaticMarkup(<ChartWheel facts={conHora} />)).not.toMatch(/[☀-⛿♃-♓]/);
  });
});

describe("tablas y resultado", () => {
  it("posiciones: 13 cuerpos + ASC y MC con hora; sin hora, casa en blanco y sin ángulos", () => {
    const con = renderToStaticMarkup(<PositionsTable facts={conHora} />);
    expect(count(con, /<th scope="row"/g)).toBe(15);
    const sin = renderToStaticMarkup(<PositionsTable facts={sinHora} />);
    expect(count(sin, /<th scope="row"/g)).toBe(13);
    expect(sin).not.toContain("Ascendente");
  });

  it("el resultado sin hora dice lo que no se calcula y lleva el aviso de marco", () => {
    const view = { facts: sinHora, text: renderChart(sinHora), placeLabel: "Buenos Aires, Argentina", zoneLabel: "Hora de Buenos Aires, UTC−3" };
    const html = renderToStaticMarkup(<ChartResult view={view} />);
    expect(html).toContain(AVISO_SIN_HORA);
    expect(html).toContain(AVISO_MARCO);
    expect(html).toContain("<figure");
    expect(html).toContain("<caption");
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run src/components/carta-natal/carta-natal.test.tsx`
Expected: FAIL (no se puede resolver `./ChartWheel`).

- [ ] **Step 3: Implementar los cinco componentes**

```tsx
// webApp/src/components/carta-natal/ChartWheel.tsx
import type { AspectId } from "@/lib/astro/aspects";
import type { ChartFacts } from "@/lib/astro/chart";
import { BODY_ABBR, BODY_NAMES, SIGNS, SIGN_IDS, formatDegree, norm360, type PointId } from "@/lib/astro/zodiac";

const C = 300;
const R_OUT = 290;
const R_SIGN = 250;
const R_HOUSE = 170;
const R_BODY = 222;

export const ASPECT_STYLE: Record<Exclude<AspectId, "conjuncion">, { cls: string; dash: string | null; label: string }> = {
  trigono: { cls: "stroke-musgo", dash: null, label: "Trígono" },
  sextil: { cls: "stroke-musgo", dash: "2 4", label: "Sextil" },
  cuadratura: { cls: "stroke-miel-800", dash: "8 4", label: "Cuadratura" },
  oposicion: { cls: "stroke-bosque", dash: null, label: "Oposición" },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

function polar(lon: number, r: number, anchor: number) {
  const th = (norm360(lon - anchor) * Math.PI) / 180;
  return { x: r2(C - r * Math.cos(th)), y: r2(C + r * Math.sin(th)) };
}

export default function ChartWheel({ facts }: { facts: ChartFacts }) {
  const anchor = facts.angles?.asc ?? 0;
  const lonOf = new Map<PointId, number>(facts.bodies.map((b) => [b.id, b.lon]));
  if (facts.angles) {
    lonOf.set("asc", facts.angles.asc);
    lonOf.set("mc", facts.angles.mc);
  }

  const ordenados = [...facts.bodies].sort((a, b) => a.lon - b.lon);
  const anillo = new Map<string, number>();
  ordenados.forEach((b, i) => {
    const prev = ordenados[i - 1];
    anillo.set(b.id, prev && norm360(b.lon - prev.lon) < 7 ? Math.min((anillo.get(prev.id) ?? 0) + 1, 3) : 0);
  });

  return (
    <svg viewBox="0 0 600 600" role="img" aria-label="Rueda de la carta natal" className="h-auto w-full max-w-[600px]">
      <circle cx={C} cy={C} r={R_OUT} className="fill-papel stroke-linea" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_SIGN} className="fill-none stroke-linea" strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_HOUSE} className="fill-salvia-100 stroke-linea" strokeWidth={1.5} />

      {SIGN_IDS.map((s, k) => {
        const a = polar(k * 30, R_SIGN, anchor);
        const b = polar(k * 30, R_OUT, anchor);
        const t = polar(k * 30 + 15, (R_SIGN + R_OUT) / 2, anchor);
        return (
          <g key={s}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-linea" />
            <text data-signo={s} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" className="fill-tinta text-[13px] font-semibold">
              <title>{SIGNS[s].nombre}</title>
              {SIGNS[s].abbr}
            </text>
          </g>
        );
      })}

      {facts.houses?.cusps.map((cusp, i) => {
        const next = facts.houses!.cusps[(i + 1) % 12]!;
        const a = polar(cusp, R_HOUSE, anchor);
        const b = polar(cusp, R_SIGN, anchor);
        const n = polar(cusp + norm360(next - cusp) / 2, R_HOUSE + 14, anchor);
        return (
          <g key={i}>
            <line data-casa={i + 1} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-linea" />
            <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" className="fill-suave text-[11px]">{i + 1}</text>
          </g>
        );
      })}

      {facts.aspects.filter((a) => a.type !== "conjuncion").map((a) => {
        const st = ASPECT_STYLE[a.type as Exclude<AspectId, "conjuncion">];
        const p = polar(lonOf.get(a.a)!, R_HOUSE, anchor);
        const q = polar(lonOf.get(a.b)!, R_HOUSE, anchor);
        return (
          <line key={`${a.a}-${a.b}`} data-aspecto={a.type} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            className={st.cls} strokeWidth={1.25} strokeDasharray={st.dash ?? undefined} />
        );
      })}

      {facts.angles && (["asc", "mc"] as const).map((id) => {
        const lon = facts.angles![id];
        const a = polar(lon, R_HOUSE, anchor);
        const b = polar(lon, R_OUT, anchor);
        const t = polar(lon, R_HOUSE - 16, anchor);
        return (
          <g key={id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-bosque" strokeWidth={2} />
            <text data-angulo={id} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" className="fill-bosque text-[12px] font-bold">
              {id === "asc" ? "AC" : "MC"}
            </text>
          </g>
        );
      })}

      {facts.bodies.map((b) => {
        const tick1 = polar(b.lon, R_SIGN, anchor);
        const tick2 = polar(b.lon, R_SIGN - 8, anchor);
        const t = polar(b.lon, R_BODY - 18 * (anillo.get(b.id) ?? 0), anchor);
        return (
          <g key={b.id}>
            <line x1={tick1.x} y1={tick1.y} x2={tick2.x} y2={tick2.y} className="stroke-tinta" />
            <text data-cuerpo={b.id} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central" className="fill-tinta text-[12px] font-semibold">
              <title>{`${BODY_NAMES[b.id]} a ${formatDegree(b.lon)} de ${SIGNS[b.sign].nombre}${b.retrograde ? ", retrógrado" : ""}`}</title>
              {BODY_ABBR[b.id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

```tsx
// webApp/src/components/carta-natal/PositionsTable.tsx
import type { ChartFacts } from "@/lib/astro/chart";
import { ANGLE_NAMES, BODY_NAMES, SIGNS, formatDegree, signOf } from "@/lib/astro/zodiac";

const th = "border-b border-linea px-3 py-2 text-left text-sm font-semibold text-bosque";
const td = "border-b border-linea px-3 py-2 text-sm text-tinta";

export default function PositionsTable({ facts }: { facts: ChartFacts }) {
  const angulos = facts.angles ? (["asc", "mc"] as const).map((id) => ({ id, lon: facts.angles![id] })) : [];
  return (
    <table className="w-full border-collapse">
      <caption className="pb-2 text-left text-lg font-bold text-bosque">Posiciones</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>Cuerpo</th>
          <th scope="col" className={th}>Signo</th>
          <th scope="col" className={th}>Grado</th>
          <th scope="col" className={th}>Casa</th>
          <th scope="col" className={th}>Retrógrado</th>
        </tr>
      </thead>
      <tbody>
        {facts.bodies.map((b) => (
          <tr key={b.id}>
            <th scope="row" className={td}>{BODY_NAMES[b.id]}</th>
            <td className={td}>{SIGNS[b.sign].nombre}</td>
            <td className={td}>{formatDegree(b.lon)}</td>
            <td className={td}>{b.house ?? "—"}</td>
            <td className={td}>{b.retrograde ? "Sí" : "No"}</td>
          </tr>
        ))}
        {angulos.map((a) => (
          <tr key={a.id}>
            <th scope="row" className={td}>{ANGLE_NAMES[a.id]}</th>
            <td className={td}>{SIGNS[signOf(a.lon)].nombre}</td>
            <td className={td}>{formatDegree(a.lon)}</td>
            <td className={td}>—</td>
            <td className={td}>—</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```tsx
// webApp/src/components/carta-natal/AspectsTable.tsx
import type { ChartFacts } from "@/lib/astro/chart";
import { pointName } from "@/lib/astro/zodiac";

const NOMBRE = { conjuncion: "Conjunción", sextil: "Sextil", cuadratura: "Cuadratura", trigono: "Trígono", oposicion: "Oposición" } as const;
const th = "border-b border-linea px-3 py-2 text-left text-sm font-semibold text-bosque";
const td = "border-b border-linea px-3 py-2 text-sm text-tinta";

export default function AspectsTable({ facts }: { facts: ChartFacts }) {
  return (
    <table className="w-full border-collapse">
      <caption className="pb-2 text-left text-lg font-bold text-bosque">Aspectos</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>Aspecto</th>
          <th scope="col" className={th}>Entre</th>
          <th scope="col" className={th}>Orbe</th>
          <th scope="col" className={th}>Fase</th>
        </tr>
      </thead>
      <tbody>
        {facts.aspects.length === 0 ? (
          <tr><td colSpan={4} className={td}>No hay aspectos mayores dentro de los orbes.</td></tr>
        ) : (
          facts.aspects.map((a) => (
            <tr key={`${a.a}-${a.b}`}>
              <th scope="row" className={td}>{NOMBRE[a.type]}</th>
              <td className={td}>{pointName(a.a)} y {pointName(a.b)}</td>
              <td className={td}>{a.orb.toFixed(1).replace(".", ",")}°</td>
              <td className={td}>{a.applying ? "Aplicativo" : "Separativo"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
```

```tsx
// webApp/src/components/carta-natal/AstroEthicsNote.tsx
export default function AstroEthicsNote({ text }: { text: string }) {
  return (
    <aside className="rounded-lg border border-linea bg-salvia-100 p-5 text-sm text-tinta">
      <p className="font-semibold text-bosque">Cómo leer esto</p>
      <p className="mt-2 max-w-[65ch]">{text}</p>
    </aside>
  );
}
```

```tsx
// webApp/src/components/carta-natal/ChartResult.tsx
import type { Paragraph } from "@/lib/astro/prose";
import type { ChartView } from "@/lib/server/natal-chart";
import AspectsTable from "./AspectsTable";
import AstroEthicsNote from "./AstroEthicsNote";
import ChartWheel, { ASPECT_STYLE } from "./ChartWheel";
import PositionsTable from "./PositionsTable";

function Bloque({ p }: { p: Paragraph }) {
  return (
    <article className="space-y-2">
      <h4 className="text-lg font-bold text-bosque">{p.titulo}</h4>
      <p className="max-w-[65ch] text-tinta">{p.texto}</p>
      <p className="text-sm text-suave">Por qué: {p.porQue}.</p>
    </article>
  );
}

export default function ChartResult({ view }: { view: ChartView }) {
  const { facts, text } = view;
  const casas = facts.houses ? (facts.houses.system === "placidus" ? "Placidus" : "signo entero (Whole Sign)") : null;
  return (
    <section aria-labelledby="carta-resultado" className="space-y-10">
      <header className="space-y-2">
        <h2 id="carta-resultado" className="text-3xl font-bold text-bosque">Tu carta natal</h2>
        <p className="text-sm text-suave">
          {view.placeLabel} · {view.zoneLabel}{casas ? ` · casas ${casas}` : ""} · nodo verdadero · Lilith (Luna Negra media) · orbes Urania Trust
        </p>
        {text.avisos.length > 0 && (
          <ul className="space-y-1 rounded-md border border-miel-800 bg-miel-100 p-4 text-sm text-tinta">
            {text.avisos.map((a) => <li key={a}>{a}</li>)}
          </ul>
        )}
      </header>

      <figure aria-labelledby="carta-figura" className="space-y-8">
        <div className="mx-auto max-w-[600px]"><ChartWheel facts={facts} /></div>
        <figcaption id="carta-figura" className="text-sm text-suave">
          Rueda de la carta: {facts.angles ? "el Ascendente (AC) a la izquierda y las casas en sentido antihorario" : "0° de Aries a la izquierda, sin casas ni ángulos"}. Las tablas de abajo muestran lo mismo en texto.
          <span className="mt-2 flex flex-wrap gap-4">
            {Object.values(ASPECT_STYLE).map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2">
                <svg width="28" height="6" aria-hidden="true"><line x1="0" y1="3" x2="28" y2="3" className={s.cls} strokeWidth={2} strokeDasharray={s.dash ?? undefined} /></svg>
                {s.label}
              </span>
            ))}
          </span>
        </figcaption>
        <div className="grid gap-8 lg:grid-cols-2">
          <PositionsTable facts={facts} />
          <AspectsTable facts={facts} />
        </div>
      </figure>

      <div className="space-y-8">
        <h3 className="text-2xl font-bold text-bosque">Interpretación</h3>
        {text.big3.map((p) => <Bloque key={p.titulo} p={p} />)}
        {text.regente && <Bloque p={text.regente} />}
        <h3 className="text-xl font-bold text-bosque">Planetas y puntos</h3>
        {text.cuerpos.map((p) => <Bloque key={p.titulo} p={p} />)}
        {text.aspectos.length > 0 && <h3 className="text-xl font-bold text-bosque">Aspectos más cerrados</h3>}
        {text.aspectos.map((p) => <Bloque key={p.titulo} p={p} />)}
        <p className="max-w-[65ch] text-tinta">{text.balance}</p>
      </div>

      <AstroEthicsNote text={text.marco} />
    </section>
  );
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/components/carta-natal && npx tsc --noEmit && npm run lint`
Expected: PASS (6 tests), `tsc` y lint limpios.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/components/carta-natal/
git commit -m "feat(carta-natal): rueda SVG accesible, tablas de posiciones y aspectos, bloque de resultado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Página `/carta-natal` con formulario, búsqueda de lugar y guardado

**Files:**
- Create: `webApp/src/components/carta-natal/PlaceSearch.tsx`
- Create: `webApp/src/components/carta-natal/ChartForm.tsx`
- Create: `webApp/src/app/(marketing)/carta-natal/page.tsx`

**Interfaces:**
- Consumes: `calcularCarta`, `guardarCarta`, `buscarLugar`, `CalcState`, `SaveState` (Task 15); `PlaceOption` (tipo, Task 15); `ChartResult` (Task 16); `getCurrentUser` (`@/lib/server/auth`); `TEMPLATES`, `HOUSE_KEYS` (Task 14); `SIGN_IDS`, `BODY_IDS`, `BODY_NAMES`, `bodySlug` (Task 2).
- Produces: `ChartForm({ mode, signedIn, isTeacher }: { mode: "libre" | "propia"; signedIn: boolean; isTeacher: boolean })` (`'use client'`), `PlaceSearch({ value, onChange }: { value: PlaceOption | null; onChange: (p: PlaceOption | null) => void })` (`'use client'`), la ruta `/carta-natal`.
- Etiquetas que usa el e2e (Task 22), exactas: «Fecha de nacimiento», «Hora de nacimiento», «No sé la hora», «Lugar de nacimiento», «No encuentro mi localidad», «Latitud», «Longitud», «Huso horario (IANA)», «Sistema de casas», botones «Calcular mi carta», «Guardar en mi panel», «Guardar mi carta», enlace «Guardada. Verla», campo «Nombre para esta carta (opcional)», consentimiento que empieza con «Acepto que guarden mis datos de nacimiento».

Los campos son **controlados** a propósito: React 19 resetea los campos no controlados de un `<form action>` cuando termina la acción, y el botón «Guardar en mi panel» reenvía el mismo formulario (con `formAction`) después de calcular.

- [ ] **Step 1: Implementar `PlaceSearch.tsx`**

```tsx
// webApp/src/components/carta-natal/PlaceSearch.tsx
"use client";

import { useEffect, useId, useState } from "react";
import { buscarLugar } from "@/app/(marketing)/carta-natal/actions";
import type { PlaceOption } from "@/lib/server/natal-chart";

export default function PlaceSearch({ value, onChange }: { value: PlaceOption | null; onChange: (p: PlaceOption | null) => void }) {
  const id = useId();
  const [q, setQ] = useState(value?.label ?? "");
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activa = q.trim().length >= 3 && !(value && value.label === q);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const t = setTimeout(async () => {
      const r = await buscarLugar(q.trim());
      if (vigente) {
        setResults(r.places);
        setError(r.error);
      }
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [q, activa]);

  const visibles = activa ? results : [];
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-semibold text-bosque">Lugar de nacimiento</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={visibles.length > 0}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        placeholder="Escribí al menos 3 letras"
        onChange={(e) => {
          setQ(e.target.value);
          onChange(null);
        }}
        className="mt-1 block min-h-12 w-full rounded-md border border-linea bg-papel px-3 text-tinta"
      />
      {visibles.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-linea bg-papel shadow-lg">
          {visibles.map((p) => (
            <li key={p.id} role="option" aria-selected={value?.id === p.id}>
              <button
                type="button"
                className="block min-h-10 w-full px-3 py-2 text-left text-tinta hover:bg-salvia-100"
                onClick={() => {
                  onChange(p);
                  setQ(p.label);
                }}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
      <p className="mt-1 text-xs text-suave">Lugares: GeoNames (CC BY 4.0).</p>
    </div>
  );
}
```

- [ ] **Step 2: Implementar `ChartForm.tsx`**

```tsx
// webApp/src/components/carta-natal/ChartForm.tsx
"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { calcularCarta, guardarCarta, type CalcState, type SaveState } from "@/app/(marketing)/carta-natal/actions";
import type { PlaceOption } from "@/lib/server/natal-chart";
import ChartResult from "./ChartResult";
import PlaceSearch from "./PlaceSearch";

const CAMPO = "mt-1 block min-h-12 w-full rounded-md border border-linea bg-papel px-3 text-tinta";
const ETIQUETA = "block text-sm font-semibold text-bosque";
const CONSENTIMIENTO = "Acepto que guarden mis datos de nacimiento para mostrarme esta carta. Son privados y puedo borrarlos cuando quiera.";
const CONSENTIMIENTO_GUIA = "Como guía, los signos de mi Sol, mi Luna y mi Ascendente se muestran en mi perfil público.";

type Props = { mode: "libre" | "propia"; signedIn: boolean; isTeacher: boolean };

export default function ChartForm({ mode, signedIn, isTeacher }: Props) {
  const router = useRouter();
  const [calc, calcAction, calculando] = useActionState(calcularCarta, ACTION_INITIAL_STATE as CalcState);
  const [save, saveAction, guardando] = useActionState(guardarCarta, ACTION_INITIAL_STATE as SaveState);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [sinHora, setSinHora] = useState(false);
  const [place, setPlace] = useState<PlaceOption | null>(null);
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [huso, setHuso] = useState("");
  const [corregir, setCorregir] = useState(false);
  const [casas, setCasas] = useState("placidus");
  const [reloj, setReloj] = useState("");
  const zonas = useMemo(() => (manual || corregir ? Intl.supportedValuesOf("timeZone") : []), [manual, corregir]);

  useEffect(() => {
    if (mode === "propia" && save.id) router.replace("/panel/docente");
  }, [mode, save.id, router]);

  const ambigua = mode === "propia" ? save.ambigua : (save.ambigua ?? calc.ambigua);
  const error = mode === "propia" ? save.error : calc.error;
  const consentimiento = `${CONSENTIMIENTO}${isTeacher ? ` ${CONSENTIMIENTO_GUIA}` : ""}`;

  return (
    <form action={mode === "propia" ? saveAction : calcAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={ETIQUETA}>
          Fecha de nacimiento
          <input type="date" name="fecha" required min="1900-01-01" max="2100-12-31" value={fecha} onChange={(e) => setFecha(e.target.value)} className={CAMPO} />
        </label>
        <div>
          <label className={ETIQUETA}>
            Hora de nacimiento
            <input type="time" name="hora" step={60} required={!sinHora} disabled={sinHora} value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} />
          </label>
          <label className="mt-2 flex min-h-10 items-center gap-2 text-sm text-tinta">
            <input type="checkbox" name="sinHora" checked={sinHora} onChange={(e) => setSinHora(e.target.checked)} />
            No sé la hora
          </label>
        </div>
      </div>

      {!manual ? (
        <div className="space-y-2">
          <PlaceSearch value={place} onChange={setPlace} />
          {place && <input type="hidden" name="lugar" value={place.id} />}
          {place && (corregir ? (
            <label className={ETIQUETA}>
              Huso horario (IANA)
              <input name="huso" list="husos" value={huso} onChange={(e) => setHuso(e.target.value)} className={CAMPO} />
            </label>
          ) : (
            <button type="button" className="min-h-10 text-sm font-semibold text-miel-800 underline" onClick={() => { setHuso(place.timeZone); setCorregir(true); }}>
              Corregir el huso horario
            </button>
          ))}
          <button type="button" className="block min-h-10 text-sm font-semibold text-miel-800 underline" onClick={() => { setManual(true); setPlace(null); }}>
            No encuentro mi localidad
          </button>
        </div>
      ) : (
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className={ETIQUETA}>Lugar cargado a mano</legend>
          <label className={ETIQUETA}>
            Latitud
            <input name="lat" inputMode="decimal" required placeholder="-34.6037" value={lat} onChange={(e) => setLat(e.target.value)} className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Longitud
            <input name="lon" inputMode="decimal" required placeholder="-58.3816" value={lon} onChange={(e) => setLon(e.target.value)} className={CAMPO} />
          </label>
          <label className={ETIQUETA}>
            Huso horario (IANA)
            <input name="huso" list="husos" required placeholder="America/Argentina/Buenos_Aires" value={huso} onChange={(e) => setHuso(e.target.value)} className={CAMPO} />
          </label>
          <p className="text-sm text-suave sm:col-span-3">Grados decimales: el sur y el oeste van en negativo.</p>
          <button type="button" className="min-h-10 text-left text-sm font-semibold text-miel-800 underline sm:col-span-3" onClick={() => setManual(false)}>
            Volver a buscar en la lista
          </button>
        </fieldset>
      )}
      <datalist id="husos">{zonas.map((z) => <option key={z} value={z} />)}</datalist>

      <label className={`${ETIQUETA} max-w-sm`}>
        Sistema de casas
        <select name="casas" value={casas} onChange={(e) => setCasas(e.target.value)} className={CAMPO}>
          <option value="placidus">Placidus</option>
          <option value="whole_sign">Signo entero (Whole Sign)</option>
        </select>
      </label>

      {ambigua && (
        <fieldset className="space-y-2 rounded-md border border-miel-800 bg-miel-100 p-4 text-tinta">
          <legend className="font-semibold text-bosque">Esa hora existió dos veces</legend>
          <p className="text-sm">Ese día se atrasaron los relojes. ¿Naciste antes o después del cambio?</p>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="reloj" value="earlier" required checked={reloj === "earlier"} onChange={() => setReloj("earlier")} /> Antes del atraso ({ambigua.earlier})</label>
          <label className="flex min-h-10 items-center gap-2"><input type="radio" name="reloj" value="later" required checked={reloj === "later"} onChange={() => setReloj("later")} /> Después del atraso ({ambigua.later})</label>
        </fieldset>
      )}

      {mode === "propia" ? (
        <div className="space-y-4">
          <input type="hidden" name="propia" value="1" />
          <label className="flex items-start gap-2 text-sm text-tinta">
            <input type="checkbox" name="consiento" required className="mt-1" />
            <span>{consentimiento}</span>
          </label>
          <Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar mi carta"}</Button>
        </div>
      ) : (
        <Button type="submit" disabled={calculando}>{calculando ? "Calculando…" : "Calcular mi carta"}</Button>
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}

      {mode === "libre" && calc.view && (
        <div className="space-y-8 pt-6">
          <ChartResult view={calc.view} />
          {!signedIn ? (
            <p className="text-sm text-tinta">
              Para guardarla, <Link href="/entrar?next=/carta-natal" className="font-semibold text-miel-800 underline">entrá a tu cuenta</Link>. Si no la guardás, tus datos no quedan en ningún lado.
            </p>
          ) : save.id ? (
            <Link href={`/carta-natal/${save.id}`} className="font-semibold text-exito underline">Guardada. Verla</Link>
          ) : (
            <div className="tarjeta space-y-4 p-6">
              <h2 className="text-xl font-bold text-bosque">Guardar esta carta</h2>
              <label className={ETIQUETA}>
                Nombre para esta carta (opcional)
                <input name="etiqueta" maxLength={60} className={CAMPO} />
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm text-tinta">
                <input type="checkbox" name="propia" value="1" /> Es mi carta (si ya tenías una marcada, la reemplaza)
              </label>
              <label className="flex items-start gap-2 text-sm text-tinta">
                <input type="checkbox" name="consiento" className="mt-1" />
                <span>{consentimiento}</span>
              </label>
              <Button type="submit" variant="outline" formAction={saveAction} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar en mi panel"}
              </Button>
              {save.error && <p role="alert" className="text-sm text-error">{save.error}</p>}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Implementar la página**

```tsx
// webApp/src/app/(marketing)/carta-natal/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import ChartForm from "@/components/carta-natal/ChartForm";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { getCurrentUser } from "@/lib/server/auth";
import { HOUSE_KEYS } from "@/lib/astro/prose";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, bodySlug } from "@/lib/astro/zodiac";

export const metadata: Metadata = {
  title: "Carta natal gratis: calculá tu carta astral",
  description: "Calculá tu carta natal con Sol, Luna, Ascendente, casas Placidus o de signo entero, Quirón, Lilith y nodos, y leé una interpretación escrita por la escuela.",
  alternates: { canonical: "/carta-natal" },
  openGraph: { title: "Carta natal gratis", description: "Tu carta natal con rueda, tablas e interpretación.", url: "/carta-natal", type: "website", images: [SITE_OG_IMAGE] },
};

function Indice({ titulo, links }: { titulo: string; links: { href: string; label: string }[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-bosque">{titulo}</h2>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="inline-flex min-h-10 items-center font-semibold text-miel-800 hover:underline">{l.label}</Link></li>
        ))}
      </ul>
    </section>
  );
}

export default async function CartaNatalPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <div className="mx-auto max-w-[1000px] px-6 pb-8 pt-10">
        <p className="text-sm font-semibold text-miel-800">Carta natal</p>
        <h1 className="mt-3 max-w-[20ch] text-display-lg leading-[1.08] tracking-[-0.025em]">Calculá tu carta natal</h1>
        <p className="mt-5 max-w-[60ch] text-lg text-suave">
          Con la fecha, la hora y el lugar de nacimiento armamos tu rueda, las posiciones de los planetas y una lectura para empezar a conocerla. Si no sabés la hora, también se puede: te mostramos lo que se puede calcular sin ella.
        </p>
      </div>
      <main className="mx-auto max-w-[1000px] space-y-16 px-6 pb-20">
        <ChartForm mode="libre" signedIn={user !== null} isTeacher={user?.role === "teacher"} />
        <div className="space-y-8">
          <Indice titulo="Los signos" links={SIGN_IDS.map((s) => ({ href: `/carta-natal/signos/${s}`, label: SIGNS[s].nombre }))} />
          <Indice titulo="Planetas y puntos" links={BODY_IDS.map((b) => ({ href: `/carta-natal/planetas/${bodySlug(b)}`, label: BODY_NAMES[b] }))} />
          <Indice titulo="Las casas" links={HOUSE_KEYS.map((n) => ({ href: `/carta-natal/casas/${n}`, label: `Casa ${n}` }))} />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verificar en el navegador y con los verificadores**

Run: `cd webApp && npx tsc --noEmit && npm run lint && npm test`
Expected: limpio y verde.

Run: `cd webApp && PORT=3102 npm run dev` (no usar el 3000) y abrir `http://localhost:3102/carta-natal`. Comprobar a mano: buscar «purma» (con `places` cargada, Task 13) y elegir Purmamarca; calcular con y sin hora; probar 2008-03-15 23:30 con «No encuentro mi localidad» y huso `America/Argentina/Buenos_Aires` (pregunta antes/después); 2007-12-30 00:30 (dice que no existió); la URL queda en `/carta-natal` en todos los casos; la consola sin violaciones de CSP. Cortar el servidor al terminar.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/components/carta-natal/PlaceSearch.tsx webApp/src/components/carta-natal/ChartForm.tsx "webApp/src/app/(marketing)/carta-natal/page.tsx"
git commit -m "feat(carta-natal): página pública con formulario, búsqueda de lugar, hora ambigua y guardado con consentimiento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Carta guardada y «Mis cartas natales»

**Files:**
- Create: `webApp/src/app/(marketing)/carta-natal/[id]/page.tsx`
- Create: `webApp/src/components/carta-natal/ChartListActions.tsx`
- Create: `webApp/src/app/(app)/panel/carta-natal/page.tsx`
- Modify: `webApp/src/app/(app)/panel/page.tsx` (enlace junto a «Mis tiradas», línea ~91)

**Interfaces:**
- Consumes: `getNatalChart`, `listNatalCharts`, `viewFromSaved`, `SavedChart` (Task 15); `borrarCarta`, `marcarMiCarta` (Task 15); `ChartResult` (Task 16).
- Produces: rutas `/carta-natal/[id]` (`noindex`, solo la dueña; cualquier otra persona ve 404) y `/panel/carta-natal`; `ChartListActions({ id, isSelf }: { id: string; isSelf: boolean })` (`'use client'`, botones «Marcar como mi carta» y «Borrar carta», sin confirmación: la spec pide borrado inmediato).

- [ ] **Step 1: Implementar la carta guardada**

```tsx
// webApp/src/app/(marketing)/carta-natal/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChartResult from "@/components/carta-natal/ChartResult";
import { getNatalChart, viewFromSaved } from "@/lib/server/natal-chart";

export const metadata: Metadata = { title: "Carta guardada", robots: { index: false, follow: false } };

export default async function CartaGuardadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saved = await getNatalChart(id);
  if (!saved) notFound();
  const view = await viewFromSaved(saved);
  const [y, m, d] = saved.birthDate.split("-");
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <main className="mx-auto max-w-[1000px] px-6 py-12">
        <Link href="/panel/carta-natal" className="inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Mis cartas natales</Link>
        <p className="mt-4 text-sm font-semibold text-miel-800">
          {saved.isSelf ? "Mi carta" : "Carta guardada"} · {d}/{m}/{y} · {saved.birthTime ?? "sin hora"}
        </p>
        <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{saved.label}</h1>
        <div className="mt-10"><ChartResult view={view} /></div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Implementar las acciones de la lista y el panel**

```tsx
// webApp/src/components/carta-natal/ChartListActions.tsx
"use client";

import { useActionState } from "react";
import Button from "@/components/atoms/Button";
import { ACTION_INITIAL_STATE } from "@/lib/action-state";
import { borrarCarta, marcarMiCarta } from "@/app/(marketing)/carta-natal/actions";

export default function ChartListActions({ id, isSelf }: { id: string; isSelf: boolean }) {
  const [marcado, marcar, marcando] = useActionState(marcarMiCarta, ACTION_INITIAL_STATE);
  const [borrado, borrar, borrando] = useActionState(borrarCarta, ACTION_INITIAL_STATE);
  const error = marcado.error ?? borrado.error;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isSelf && (
        <form action={marcar}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm" disabled={marcando}>Marcar como mi carta</Button>
        </form>
      )}
      <form action={borrar}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="outline" size="sm" disabled={borrando}>Borrar carta</Button>
      </form>
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}
```

```tsx
// webApp/src/app/(app)/panel/carta-natal/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/atoms/Button";
import AppPageHeader from "@/components/layout/AppPageHeader";
import SiteHeader from "@/components/layout/SiteHeader";
import ChartListActions from "@/components/carta-natal/ChartListActions";
import { listNatalCharts } from "@/lib/server/natal-chart";

export const metadata: Metadata = { title: "Mis cartas natales", robots: { index: false, follow: false } };

export default async function PanelCartaNatalPage() {
  const charts = await listNatalCharts();
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader eyebrow="Carta natal" title="Mis cartas natales" subtitle="Tus datos de nacimiento son privados. Borrar una carta la elimina en el acto." />
      <main className="mx-auto max-w-[1200px] px-6 py-12">
        {charts.length === 0 ? (
          <div className="tarjeta flex flex-col items-start gap-4 p-8">
            <p className="max-w-[46ch]">Todavía no guardaste ninguna carta. Calculala y, al final, tocá «Guardar en mi panel».</p>
            <ButtonLink href="/carta-natal" arrow>Calcular una carta</ButtonLink>
          </div>
        ) : (
          <ul className="space-y-4">
            {charts.map((c) => {
              const [y, m, d] = c.birthDate.split("-");
              return (
                <li key={c.id} className="tarjeta flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-suave">{d}/{m}/{y} · {c.birthTime ?? "sin hora"}{c.isSelf ? " · Mi carta" : ""}</p>
                    <Link href={`/carta-natal/${c.id}`} className="font-semibold text-bosque hover:underline">{c.label}</Link>
                  </div>
                  <ChartListActions id={c.id} isSelf={c.isSelf} />
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
```

En `webApp/src/app/(app)/panel/page.tsx`, después del `ButtonLink` de «Mis tiradas»:

```tsx
          <ButtonLink href="/panel/carta-natal" variant="outline" size="sm">
            Mis cartas natales
          </ButtonLink>
```

- [ ] **Step 3: Verificar**

Run: `cd webApp && npx tsc --noEmit && npm run lint && npm test`
Expected: limpio y verde. A mano (servidor en 3102, con sesión de `alumna@test.local`): guardar una carta, abrirla en `/carta-natal/<id>`, marcarla y borrarla en `/panel/carta-natal`; en otra ventana sin sesión, `/carta-natal/<id>` da 404.

- [ ] **Step 4: Commit**

```bash
git add "webApp/src/app/(marketing)/carta-natal/[id]/page.tsx" webApp/src/components/carta-natal/ChartListActions.tsx "webApp/src/app/(app)/panel/carta-natal/page.tsx" "webApp/src/app/(app)/panel/page.tsx"
git commit -m "feat(carta-natal): carta guardada recalculada al abrir y panel de mis cartas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Fichas indexables y sitemap

**Files:**
- Create: `webApp/src/components/carta-natal/FichaLayout.tsx`
- Create: `webApp/src/app/(marketing)/carta-natal/signos/[slug]/page.tsx`
- Create: `webApp/src/app/(marketing)/carta-natal/planetas/[slug]/page.tsx`
- Create: `webApp/src/app/(marketing)/carta-natal/casas/[n]/page.tsx`
- Modify: `webApp/src/app/sitemap.ts`, `webApp/src/app/sitemap.test.ts`

**Interfaces:**
- Consumes: `TEMPLATES`, `HOUSE_KEYS`, `TextEntry`, `AVISO_MARCO` (Task 14); `SIGNS`, `SIGN_IDS`, `BODY_IDS`, `PLANET_IDS`, `BODY_NAMES`, `bodySlug`, `bodyBySlug`, `isSignId` (Task 2); `getSiteUrl`, `SITE_OG_IMAGE`.
- Produces: 12 + 13 + 12 URLs públicas indexables (`/carta-natal/signos/aries`, `/carta-natal/planetas/nodo-norte`, `/carta-natal/casas/7`…), `FichaLayout({ kicker, entry, datos, path, prev, next })`.

- [ ] **Step 1: Test del sitemap que falla** — agregar al final de `webApp/src/app/sitemap.test.ts`:

```ts
describe("T-024 · fichas de carta natal en el sitemap", () => {
  it("lista la portada y las 37 fichas", async () => {
    connection.mockResolvedValue(undefined);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/carta-natal");
    expect(urls).toContain("http://localhost:3000/carta-natal/signos/aries");
    expect(urls).toContain("http://localhost:3000/carta-natal/planetas/lilith-media");
    expect(urls).toContain("http://localhost:3000/carta-natal/casas/12");
    expect(urls.filter((u) => u.includes("/carta-natal/")).length).toBe(37);
  });
});
```

Run: `cd webApp && npx vitest run src/app/sitemap.test.ts`
Expected: FAIL (`expected [...] to include 'http://localhost:3000/carta-natal'`).

- [ ] **Step 2: Sitemap** — en `webApp/src/app/sitemap.ts`, importar y sumar el bloque:

```ts
import { HOUSE_KEYS } from "@/lib/astro/prose";
import { BODY_IDS, SIGN_IDS, bodySlug } from "@/lib/astro/zodiac";
```

```ts
  const cartaNatal: MetadataRoute.Sitemap = [
    { url: `${site}/carta-natal`, priority: 0.9 },
    ...SIGN_IDS.map((s) => ({ url: `${site}/carta-natal/signos/${s}`, priority: 0.5 })),
    ...BODY_IDS.map((b) => ({ url: `${site}/carta-natal/planetas/${bodySlug(b)}`, priority: 0.5 })),
    ...HOUSE_KEYS.map((n) => ({ url: `${site}/carta-natal/casas/${n}`, priority: 0.5 })),
  ];
```

y en el `return`, `...cartaNatal,` después de `...tarot,`.

- [ ] **Step 3: `FichaLayout` y las tres rutas**

```tsx
// webApp/src/components/carta-natal/FichaLayout.tsx
import Link from "next/link";
import Icon from "@/components/atoms/Icon";
import { ButtonLink } from "@/components/atoms/Button";
import { AVISO_MARCO, type TextEntry } from "@/lib/astro/prose";
import { getSiteUrl } from "@/lib/server/site-url";
import AstroEthicsNote from "./AstroEthicsNote";

type Vecino = { href: string; label: string };
type Props = { kicker: string; entry: TextEntry; datos: [string, string][]; path: string; prev: Vecino; next: Vecino };

export default function FichaLayout({ kicker, entry, datos, path, prev, next }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${entry.nombre} en la carta natal`,
    about: { "@type": "Thing", name: entry.nombre },
    keywords: entry.palabras_clave.join(", "),
    url: `${getSiteUrl()}${path}`,
    inLanguage: "es-AR",
  };
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-[900px] px-6 pt-8">
        <Link href="/carta-natal" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-miel-800 hover:underline">
          <Icon name="arrow-left" />
          Carta natal
        </Link>
      </div>
      <main className="mx-auto max-w-[900px] space-y-10 px-6 pb-20 pt-6">
        <header>
          <p className="text-sm font-semibold text-miel-800">{kicker}</p>
          <h1 className="mt-2 text-display-lg leading-[1.08] tracking-[-0.025em]">{entry.nombre}</h1>
          <ul className="mt-5 flex flex-wrap gap-2">
            {entry.palabras_clave.map((k) => <li key={k} className="rounded-pill bg-miel-100 px-3 py-1 text-sm text-bosque">{k}</li>)}
          </ul>
        </header>
        <article className="space-y-4 text-lg">
          {entry.ficha.map((p) => <p key={p.slice(0, 32)} className="max-w-[65ch]">{p}</p>)}
        </article>
        {datos.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            {datos.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-suave">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <ButtonLink href="/carta-natal" arrow>Calculá tu carta</ButtonLink>
        <nav aria-label="Fichas vecinas" className="flex justify-between gap-4 text-sm font-semibold">
          <Link href={prev.href} className="inline-flex min-h-10 items-center text-miel-800 hover:underline">{prev.label}</Link>
          <Link href={next.href} className="inline-flex min-h-10 items-center text-miel-800 hover:underline">{next.label}</Link>
        </nav>
        <AstroEthicsNote text={AVISO_MARCO} />
      </main>
    </div>
  );
}
```

```tsx
// webApp/src/app/(marketing)/carta-natal/signos/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { TEMPLATES } from "@/lib/astro/prose";
import { BODY_NAMES, SIGNS, SIGN_IDS, isSignId } from "@/lib/astro/zodiac";

export function generateStaticParams() {
  return SIGN_IDS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isSignId(slug)) return { title: "Signo no encontrado" };
  const e = TEMPLATES.signos[slug];
  const title = `${e.nombre} en la carta natal: significado`;
  const description = `${e.nombre}: ${e.palabras_clave.join(", ")}. Signo de ${SIGNS[slug].elemento}, ${SIGNS[slug].modalidad}.`;
  const url = `/carta-natal/signos/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", images: [SITE_OG_IMAGE] } };
}

export default async function SignoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSignId(slug)) notFound();
  const i = SIGN_IDS.indexOf(slug);
  const prev = SIGN_IDS[(i + 11) % 12]!;
  const next = SIGN_IDS[(i + 1) % 12]!;
  const s = SIGNS[slug];
  return (
    <FichaLayout
      kicker="Signo"
      entry={TEMPLATES.signos[slug]}
      datos={[["Elemento", s.elemento], ["Modalidad", s.modalidad], ["Regente tradicional", BODY_NAMES[s.regente]]]}
      path={`/carta-natal/signos/${slug}`}
      prev={{ href: `/carta-natal/signos/${prev}`, label: SIGNS[prev].nombre }}
      next={{ href: `/carta-natal/signos/${next}`, label: SIGNS[next].nombre }}
    />
  );
}
```

```tsx
// webApp/src/app/(marketing)/carta-natal/planetas/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { TEMPLATES } from "@/lib/astro/prose";
import { BODY_IDS, BODY_NAMES, SIGNS, SIGN_IDS, bodyBySlug, bodySlug, type BodyId } from "@/lib/astro/zodiac";

const TIPO: Partial<Record<BodyId, string>> = {
  quiron: "Cuerpo menor (centauro)",
  nodo_norte: "Punto calculado: nodo verdadero de la Luna",
  lilith_media: "Punto calculado: apogeo medio de la Luna",
};

export function generateStaticParams() {
  return BODY_IDS.map((b) => ({ slug: bodySlug(b) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const id = bodyBySlug(slug);
  if (!id) return { title: "Planeta no encontrado" };
  const e = TEMPLATES.cuerpos[id];
  const title = `${e.nombre} en la carta natal: significado`;
  const description = `${e.nombre}: ${e.palabras_clave.join(", ")}.`;
  const url = `/carta-natal/planetas/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", images: [SITE_OG_IMAGE] } };
}

export default async function PlanetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = bodyBySlug(slug);
  if (!id) notFound();
  const i = BODY_IDS.indexOf(id);
  const prev = BODY_IDS[(i + 12) % 13]!;
  const next = BODY_IDS[(i + 1) % 13]!;
  const rige = SIGN_IDS.filter((s) => SIGNS[s].regente === id).map((s) => SIGNS[s].nombre);
  const datos: [string, string][] = [["Tipo", TIPO[id] ?? (id === "sol" || id === "luna" ? "Luminaria" : "Planeta")]];
  if (rige.length > 0) datos.push(["Rige (tradicional)", rige.join(" y ")]);
  return (
    <FichaLayout
      kicker="Planetas y puntos"
      entry={TEMPLATES.cuerpos[id]}
      datos={datos}
      path={`/carta-natal/planetas/${slug}`}
      prev={{ href: `/carta-natal/planetas/${bodySlug(prev)}`, label: BODY_NAMES[prev] }}
      next={{ href: `/carta-natal/planetas/${bodySlug(next)}`, label: BODY_NAMES[next] }}
    />
  );
}
```

```tsx
// webApp/src/app/(marketing)/carta-natal/casas/[n]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaLayout from "@/components/carta-natal/FichaLayout";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { HOUSE_KEYS, TEMPLATES, type HouseKey } from "@/lib/astro/prose";

const isHouse = (n: string): n is HouseKey => (HOUSE_KEYS as readonly string[]).includes(n);
const TIPO = (n: number) => ([1, 4, 7, 10].includes(n) ? "Angular" : [2, 5, 8, 11].includes(n) ? "Sucedente" : "Cadente");

export function generateStaticParams() {
  return HOUSE_KEYS.map((n) => ({ n }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params;
  if (!isHouse(n)) return { title: "Casa no encontrada" };
  const e = TEMPLATES.casas[n];
  const title = `${e.nombre} en la carta natal: significado`;
  const description = `${e.nombre}: ${e.palabras_clave.join(", ")}.`;
  const url = `/carta-natal/casas/${n}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "article", images: [SITE_OG_IMAGE] } };
}

export default async function CasaPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  if (!isHouse(n)) notFound();
  const k = Number(n);
  const prev = String(((k + 10) % 12) + 1) as HouseKey;
  const next = String((k % 12) + 1) as HouseKey;
  return (
    <FichaLayout
      kicker="Casas"
      entry={TEMPLATES.casas[n]}
      datos={[["Tipo", TIPO(k)]]}
      path={`/carta-natal/casas/${n}`}
      prev={{ href: `/carta-natal/casas/${prev}`, label: `Casa ${prev}` }}
      next={{ href: `/carta-natal/casas/${next}`, label: `Casa ${next}` }}
    />
  );
}
```

- [ ] **Step 4: Correr y ver que pasa; SEO de una ficha**

Run: `cd webApp && npx vitest run src/app/sitemap.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS y limpio.

Run: `cd webApp && npm run build && (PORT=3102 npx next start -p 3102 &) && sleep 5 && bash scripts/check-seo.sh http://localhost:3102/carta-natal/signos/aries; kill %1 2>/dev/null || pkill -f "next start -p 3102"`
Expected: `check-seo.sh` verde (title, description, canonical, JSON-LD, sin `noindex`).

- [ ] **Step 5: Commit**

```bash
git add webApp/src/components/carta-natal/FichaLayout.tsx "webApp/src/app/(marketing)/carta-natal/signos" "webApp/src/app/(marketing)/carta-natal/planetas" "webApp/src/app/(marketing)/carta-natal/casas" webApp/src/app/sitemap.ts webApp/src/app/sitemap.test.ts
git commit -m "feat(carta-natal): fichas indexables de signos, planetas y casas, y sus URLs en el sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Bloqueo del panel docente sin carta propia

**Files:**
- Create: `webApp/src/components/carta-natal/TeacherChartGate.tsx`
- Modify: `webApp/src/app/(app)/panel/docente/layout.tsx`
- Test: `webApp/src/app/(app)/panel/docente/layout.test.ts`
- Modify: `webApp/supabase/seed.fixtures.sql` (carta propia de toda docente del seed)

**Interfaces:**
- Consumes: `hasSelfChart` (Task 15), `ChartForm` modo `"propia"` (Task 17), `getCurrentUser`.
- Produces: `TeacherChartGate()` (Server Component). El layout renderiza el gate en lugar de `children` cuando la docente no tiene carta `is_self`. **Regla de producto, no límite de seguridad**: las Server Actions docentes no la re-verifican (spec §4). El admin no entra al panel docente (el layout ya lo manda a `/panel`), así que no hay caso admin.

- [ ] **Step 1: Escribir el test que falla**

```ts
// webApp/src/app/(app)/panel/docente/layout.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";

const { getCurrentUser, hasSelfChart, redirect } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  hasSelfChart: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/server/natal-chart", () => ({ hasSelfChart }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/carta-natal/TeacherChartGate", () => ({ default: function TeacherChartGate() { return null; } }));

import TeacherPanelLayout from "./layout";
import TeacherChartGate from "@/components/carta-natal/TeacherChartGate";

const hijo = createElement("p", null, "panel");

beforeEach(() => {
  getCurrentUser.mockReset();
  hasSelfChart.mockReset();
});

describe("T-024 · bloqueo del panel docente", () => {
  it("una docente sin carta propia ve solo el formulario", async () => {
    getCurrentUser.mockResolvedValue({ id: "t", role: "teacher" });
    hasSelfChart.mockResolvedValue(false);
    const el = (await TeacherPanelLayout({ children: hijo })) as { type: unknown };
    expect(el.type).toBe(TeacherChartGate);
  });

  it("con carta propia entra al panel", async () => {
    getCurrentUser.mockResolvedValue({ id: "t", role: "teacher" });
    hasSelfChart.mockResolvedValue(true);
    const el = (await TeacherPanelLayout({ children: hijo })) as { props: { children: unknown } };
    expect(el.props.children).toBe(hijo);
  });

  it("quien no es docente sigue yendo a /panel sin consultar la carta", async () => {
    getCurrentUser.mockResolvedValue({ id: "a", role: "admin" });
    await expect(TeacherPanelLayout({ children: hijo })).rejects.toThrow("REDIRECT /panel");
    expect(hasSelfChart).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/layout.test.ts"`
Expected: FAIL (`Failed to resolve import "@/components/carta-natal/TeacherChartGate"` antes de crearlo; o, con el stub, `expected [Function Fragment] to be [Function TeacherChartGate]`).

- [ ] **Step 3: Implementar el gate y el layout**

```tsx
// webApp/src/components/carta-natal/TeacherChartGate.tsx
import AppPageHeader from "@/components/layout/AppPageHeader";
import SiteHeader from "@/components/layout/SiteHeader";
import ChartForm from "./ChartForm";

export default function TeacherChartGate() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      <SiteHeader />
      <AppPageHeader
        eyebrow="Panel docente"
        title="Antes de entrar, cargá tu carta natal"
        subtitle="Toda guía de la escuela tiene su carta cargada. En tu perfil público se ven solo los signos de tu Sol, tu Luna y tu Ascendente; la fecha, la hora y el lugar quedan privados. Si no sabés la hora, marcá «No sé la hora»."
      />
      <main className="mx-auto max-w-[900px] px-6 py-12">
        <ChartForm mode="propia" signedIn isTeacher />
      </main>
    </div>
  );
}
```

```tsx
// webApp/src/app/(app)/panel/docente/layout.tsx
import { redirect } from "next/navigation";
import TeacherChartGate from "@/components/carta-natal/TeacherChartGate";
import { getCurrentUser } from "@/lib/server/auth";
import { hasSelfChart } from "@/lib/server/natal-chart";

// Segunda capa de guard de rol (la primera es `src/proxy.ts`, que redirige por el CLAIM del
// JWT — orientativo, ADR-006). Acá se resuelve contra `profiles.role`, la única autoridad:
// un docente recién degradado cuyo token todavía dice "teacher" (hasta el próximo refresh)
// no entra igual. Mismo patrón que `panel/admin/layout.tsx` (T-008).
// T-024: sin carta propia, la docente ve solo el formulario. Es una regla de producto, no un
// límite de seguridad: las Server Actions docentes no la re-verifican.
export default async function TeacherPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "teacher") {
    redirect("/panel");
  }

  if (!(await hasSelfChart())) return <TeacherChartGate />;

  return <>{children}</>;
}
```

- [ ] **Step 4: Carta propia para las docentes del seed** — al final de `webApp/supabase/seed.fixtures.sql`, **antes** del `commit;`:

```sql
-- T-024 · toda docente tiene su carta propia: sin ella el panel docente muestra solo el formulario
-- y los e2e de docentes no podrían entrar. Sin signos: el seed no publica Sol/Luna/Ascendente
-- inventados. 1990-07-01 en Buenos Aires es UTC-3 (sin horario de verano en julio).
insert into public.natal_charts (user_id, label, birth_date, birth_time, place_id, lat, lon, timezone,
                                 utc_offset_seconds, tzdata_version, house_system, is_self, consented_at)
select p.id, 'Mi carta', date '1990-07-01', null, null, -34.60372, -58.38159, 'America/Argentina/Buenos_Aires',
       -10800, '2026e', 'placidus', true, now()
  from public.profiles p
 where p.role = 'teacher'
   and not exists (select 1 from public.natal_charts c where c.user_id = p.id and c.is_self);
```

Aplicarlo a la base local sin resetear: `docker exec -i supabase_db_webApp psql -U postgres -d postgres < webApp/supabase/seed.fixtures.sql` (el archivo es idempotente: todos sus INSERT tienen `on conflict`/`not exists`; verificarlo leyendo el archivo antes de correrlo; si alguno no lo es, ejecutar solo el bloque nuevo con `psql -c`).

- [ ] **Step 5: Correr y ver que pasa**

Run: `cd webApp && npx vitest run "src/app/(app)/panel/docente/layout.test.ts" && npx tsc --noEmit && npm run lint`
Expected: PASS (3 tests) y limpio.

- [ ] **Step 6: Commit**

```bash
git add webApp/src/components/carta-natal/TeacherChartGate.tsx "webApp/src/app/(app)/panel/docente/layout.tsx" "webApp/src/app/(app)/panel/docente/layout.test.ts" webApp/supabase/seed.fixtures.sql
git commit -m "feat(carta-natal): el panel docente exige la carta propia antes de entrar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Signos en el perfil público de la guía

**Files:**
- Modify: `webApp/src/lib/server/guias.ts` (select, `TeacherRow`, `PublicTeacherProfile`, `getTeacherBySlug`)
- Modify: `webApp/src/lib/server/guias.test.ts`
- Modify: `webApp/src/app/(marketing)/guias/[slug]/page.tsx`

**Interfaces:**
- Consumes: columnas `profiles.sun_sign/moon_sign/asc_sign` (Task 12); `SIGNS`, `isSignId`, `SignId` (Task 2).
- Produces: `PublicTeacherProfile.signs: { sun: SignId | null; moon: SignId | null; asc: SignId | null }`. Solo signos: sin grados, rueda ni lugar (spec, decisión 7).

- [ ] **Step 1: Test que falla** — agregar a `webApp/src/lib/server/guias.test.ts` (importar también `getTeacherBySlug`):

```ts
describe("T-024 · signos públicos de la guía", () => {
  it("pide sun_sign, moon_sign y asc_sign y descarta valores que no son signos", async () => {
    const c = client(
      [{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: null, sun_sign: "leo", moon_sign: "piscis", asc_sign: "ofiuco" }],
      [{ slug: "a", teacher_id: "t1", discipline: "Astrología" }],
    );
    getPublicSupabaseClient.mockReturnValue(c);
    const t = await getTeacherBySlug("luna");
    expect(c.select.mock.calls[0][0]).toMatch(/sun_sign, moon_sign, asc_sign/);
    expect(t?.signs).toEqual({ sun: "leo", moon: "piscis", asc: null });
  });
});
```

Run: `cd webApp && npx vitest run src/lib/server/guias.test.ts`
Expected: FAIL (`expected undefined to deeply equal { sun: 'leo', … }`).

- [ ] **Step 2: Implementar** en `webApp/src/lib/server/guias.ts`:
- `import { isSignId, type SignId } from "@/lib/astro/zodiac";`
- En el `.select(` de `profiles`, agregar `, sun_sign, moon_sign, asc_sign` al final de la lista de columnas.
- En `interface TeacherRow`: `sun_sign: string | null; moon_sign: string | null; asc_sign: string | null;`.
- En `interface PublicTeacherProfile`: `signs: { sun: SignId | null; moon: SignId | null; asc: SignId | null };`.
- En el objeto que devuelve `getTeacherBySlug`, después de `testimonials`:

```ts
    signs: {
      sun: row.sun_sign && isSignId(row.sun_sign) ? row.sun_sign : null,
      moon: row.moon_sign && isSignId(row.moon_sign) ? row.moon_sign : null,
      asc: row.asc_sign && isSignId(row.asc_sign) ? row.asc_sign : null,
    },
```

En `webApp/src/app/(marketing)/guias/[slug]/page.tsx`, importar `Link` (ya está), `SIGNS` de `@/lib/astro/zodiac`, y debajo del `<p>` de `datos`:

```tsx
          {M.signs.sun && M.signs.moon && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-tinta">
              <Link href={`/carta-natal/signos/${M.signs.sun}`} className="hover:underline">Sol en {SIGNS[M.signs.sun].nombre}</Link>
              <Link href={`/carta-natal/signos/${M.signs.moon}`} className="hover:underline">Luna en {SIGNS[M.signs.moon].nombre}</Link>
              {M.signs.asc && <Link href={`/carta-natal/signos/${M.signs.asc}`} className="hover:underline">Ascendente en {SIGNS[M.signs.asc].nombre}</Link>}
            </p>
          )}
```

- [ ] **Step 3: Correr y ver que pasa**

Run: `cd webApp && npx vitest run src/lib/server/guias.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS y limpio.

- [ ] **Step 4: Commit**

```bash
git add webApp/src/lib/server/guias.ts webApp/src/lib/server/guias.test.ts "webApp/src/app/(marketing)/guias/[slug]/page.tsx"
git commit -m "feat(carta-natal): el perfil público de la guía muestra solo los signos de Sol, Luna y Ascendente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: E2E (Playwright)

**Files:**
- Create: `webApp/e2e/carta-natal.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior; fixtures `ALUMNA`, `login`, `assertStackUp` (`e2e/fixtures.ts`), `DOCENTE` (`e2e/account.ts`), `psql` (`e2e/db.ts`). Ids del seed: alumna `d0000000-0000-4000-8000-000000000003`, docente `d0000000-0000-4000-8000-000000000002` (`seed.fixtures.sql`).
- Produces: los cuatro recorridos de la spec §6 más hora ambigua y 404 de carta ajena.

El lugar de prueba (id 999000001) se inserta y se borra en el propio spec: los e2e no dependen de que `places` esté cargada. `test` viene de `./fixtures` (su `cspGuard` falla ante cualquier violación de CSP).

- [ ] **Step 1: Escribir el spec**

```ts
// webApp/e2e/carta-natal.spec.ts
import { expect, test, ALUMNA, assertStackUp, login } from "./fixtures";
import { DOCENTE } from "./account";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const DOCENTE_ID = "d0000000-0000-4000-8000-000000000002";
const LUGAR = 999000001;
const SIN_HORA = "Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.";

const cartaDelSeed = `insert into public.natal_charts (user_id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, is_self, consented_at)
  select '${DOCENTE_ID}', 'Mi carta', date '1990-07-01', null, null, -34.60372, -58.38159, 'America/Argentina/Buenos_Aires', -10800, '2026e', 'placidus', true, now()
  where not exists (select 1 from public.natal_charts where user_id = '${DOCENTE_ID}' and is_self);`;

test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  psql(`insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
        values (${LUGAR}, 'Ciudad de Prueba', 'Ciudad de Prueba', 'Buenos Aires', 'AR', -34.60372, -58.38159, 'America/Argentina/Buenos_Aires', 1)
        on conflict (id) do nothing;`);
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
});
test.afterAll(() => {
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
  psql(cartaDelSeed);
  psql(`delete from public.places where id = ${LUGAR};`);
});

async function datosConLugar(page: import("@playwright/test").Page, { hora = "09:00" }: { hora?: string } = {}) {
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  if (hora) await page.getByLabel("Hora de nacimiento").fill(hora);
  else await page.getByLabel("No sé la hora").check();
  await page.getByLabel("Lugar de nacimiento").fill("Ciudad de Pru");
  await page.getByRole("button", { name: /Ciudad de Prueba/ }).click();
}

test("anónima con hora: lugar de la lista, rueda y tablas, y nada viaja en la URL", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/carta-natal");
  await datosConLugar(page);
  await page.getByRole("button", { name: "Calcular mi carta" }).click();
  await expect(page.getByRole("img", { name: "Rueda de la carta natal" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Posiciones" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Aspectos" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Ascendente" })).toBeVisible();
  await expect(page.getByText("Hora de Buenos Aires, UTC−3")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/carta-natal");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/Para guardarla/)).toBeVisible();
});

test("anónima sin hora, lugar a mano: sin Ascendente ni casas y con el aviso", async ({ page }) => {
  await page.goto("/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  await page.getByLabel("No sé la hora").check();
  await page.getByRole("button", { name: "No encuentro mi localidad" }).click();
  await page.getByLabel("Latitud").fill("-34.60372");
  await page.getByLabel("Longitud").fill("-58.38159");
  await page.getByLabel("Huso horario (IANA)").fill("America/Argentina/Buenos_Aires");
  await page.getByRole("button", { name: "Calcular mi carta" }).click();
  await expect(page.getByText(SIN_HORA)).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Ascendente" })).toHaveCount(0);
});

test("hora ambigua: pregunta antes o después del atraso, nunca elige sola", async ({ page }) => {
  await page.goto("/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("2008-03-15");
  await page.getByLabel("Hora de nacimiento").fill("23:30");
  await page.getByRole("button", { name: "No encuentro mi localidad" }).click();
  await page.getByLabel("Latitud").fill("-34.60372");
  await page.getByLabel("Longitud").fill("-58.38159");
  await page.getByLabel("Huso horario (IANA)").fill("America/Argentina/Buenos_Aires");
  await page.getByRole("button", { name: "Calcular mi carta" }).click();
  await expect(page.getByText("Esa hora existió dos veces")).toBeVisible();
  await expect(page.getByRole("table", { name: "Posiciones" })).toHaveCount(0);
  await page.getByLabel("Después del atraso (UTC−3)").check();
  await page.getByRole("button", { name: "Calcular mi carta" }).click();
  await expect(page.getByRole("table", { name: "Posiciones" })).toBeVisible();
});

test("alumna: sin consentimiento no guarda; con consentimiento guarda, reabre recalculada y borra", async ({ page }) => {
  await login(page, ALUMNA);
  await page.goto("/carta-natal");
  await datosConLugar(page);
  await page.getByRole("button", { name: "Calcular mi carta" }).click();
  await expect(page.getByRole("table", { name: "Posiciones" })).toBeVisible();

  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /aceptar/ })).toBeVisible();
  expect(psql(`select count(*) from public.natal_charts where user_id = '${ALUMNA_ID}';`)).toBe("0");

  await page.getByLabel("Nombre para esta carta (opcional)").fill("Prueba e2e");
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toBeVisible();
  await expect.poll(() => psql(`select count(*) from public.natal_charts where user_id = '${ALUMNA_ID}';`)).toBe("1");

  await page.getByRole("link", { name: "Guardada. Verla" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba e2e");
  await expect(page.getByRole("table", { name: "Posiciones" })).toBeVisible();

  await page.goto("/panel/carta-natal");
  await expect(page.getByRole("link", { name: "Prueba e2e" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar carta" }).click();
  await expect.poll(() => psql(`select count(*) from public.natal_charts where user_id = '${ALUMNA_ID}';`)).toBe("0");
});

test("una carta ajena o inexistente es 404 y no se indexa", async ({ page }) => {
  const res = await page.goto("/carta-natal/11111111-1111-4111-8111-111111111111");
  expect(res?.status()).toBe(404);
});

test("docente sin carta ve el bloqueo y al guardarla entra al panel", async ({ page }) => {
  psql(`delete from public.natal_charts where user_id = '${DOCENTE_ID}';`);
  await login(page, DOCENTE);
  await page.goto("/panel/docente");
  await expect(page.getByRole("heading", { name: "Antes de entrar, cargá tu carta natal" })).toBeVisible();
  await page.getByLabel("Fecha de nacimiento").fill("1985-03-21");
  await page.getByLabel("No sé la hora").check();
  await page.getByLabel("Lugar de nacimiento").fill("Ciudad de Pru");
  await page.getByRole("button", { name: /Ciudad de Prueba/ }).click();
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar mi carta" }).click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
  await expect(page.getByRole("heading", { name: "Antes de entrar, cargá tu carta natal" })).toHaveCount(0);
  expect(psql(`select count(*) from public.natal_charts where user_id = '${DOCENTE_ID}' and is_self;`)).toBe("1");
  expect(psql(`select sun_sign is not null and moon_sign is not null and asc_sign is null from public.profiles where id = '${DOCENTE_ID}';`)).toBe("t");
});

test("la ficha de un signo es indexable", async ({ page }) => {
  const res = await page.goto("/carta-natal/signos/aries");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Aries/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/carta-natal\/signos\/aries$/);
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('"Article"');
  const robots = await page.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
  expect(robots ?? "").not.toMatch(/noindex/);
});
```

- [ ] **Step 2: Correr**

Run: `cd webApp && npx supabase start && npm run test:e2e -- e2e/carta-natal.spec.ts`
Expected: 7 passed. Después, la suite entera: `cd webApp && npm run test:e2e` (los specs de docentes siguen verdes porque el seed les dio carta propia, Task 20). Si un spec de docente falla por el bloqueo, la base local no tiene el bloque nuevo de `seed.fixtures.sql`: aplicarlo (Task 20, Step 4).

- [ ] **Step 3: Commit**

```bash
git add webApp/e2e/carta-natal.spec.ts
git commit -m "test(carta-natal): e2e de cálculo con y sin hora, hora ambigua, guardado con consentimiento, bloqueo docente y ficha

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: `CLAUDE.md` y verificación final

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: el estado medido del repo al terminar.
- Produces: `CLAUDE.md` sin afirmaciones falsas (su cabecera exige que cada dato esté verificado).

- [ ] **Step 1: Medir** (no copiar números de este plan):

```bash
cd /Users/gabrielsk/Documents/Proyects/Humano-despierto/webApp
find src/app -name page.tsx | wc -l
ls supabase/migrations/*.sql | wc -l && ls supabase/migrations | tail -1
cd supabase && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
cd .. && npm test 2>&1 | grep -E "Test Files|Tests "
find src -name "*.ts" -o -name "*.tsx" | grep -v test | xargs cat | wc -l
```

- [ ] **Step 2: Editar `CLAUDE.md`**
- Tabla «Actual implementation state»: rutas (`page.tsx`), LOC, archivos de `components/`, tests de Vitest; `webApp/supabase`: migraciones (última `0072`), **25 tablas** (`places`, `natal_charts`), tests de mutación; agregar «Motor de carta natal (puro, sin DB) en `src/lib/astro/` sobre `astronomy-engine` 2.1.19 (ADR-017)».
- «Routes that exist», después del bloque de tarot:

```
/carta-natal                        Carta natal: formulario + resultado (POST, nada en la URL)
/carta-natal/[id]                   Carta guardada, recalculada al abrir      [dueña; noindex]
/carta-natal/signos/[slug] · /planetas/[slug] · /casas/[n]   Fichas indexables (37)
/panel/carta-natal                  Mis cartas natales: borrar, marcar «mi carta»  [auth]
```

  y en la línea de `/panel/docente/**`: «sin carta propia (`natal_charts.is_self`) muestra solo el formulario de carta (T-024, regla de producto)».
- «Commands → Database»: `npm run places:load` (carga `places` desde GeoNames; local por `docker exec`, cloud con `DATABASE_URL`).
- «Security rules», regla nueva **12**: «Los datos de nacimiento son dato reforzado (T-024). `natal_charts` no tiene grant para `anon`; la dueña lee y borra; nadie del cliente inserta ni modifica: escribir es `save_natal_chart`/`set_self_natal_chart`, solo `service_role`, después de `getUser()` y del consentimiento. `profiles.sun_sign/moon_sign/asc_sign` son públicos y solo los escriben esas funciones y el trigger que los limpia al borrar la carta propia. Fecha, hora y lugar nunca van en la URL. `time.ts` es el único lugar que convierte hora local.»
- Regla 2: reemplazar «you must add it by hand to `0003_privileges.sql`» por «you must grant it by hand, column by column, in the migration that adds it (as `0011`, `0028` and `0072` do); applied migrations are never edited».
- «External dependencies not yet provisioned»: «**Carga de `places` en el cloud** (T-024): correr `npm run places:load` con `DATABASE_URL` del proyecto después de aplicar `0072`; sin eso la búsqueda de lugar no devuelve nada.» y «**Consulta legal** sobre datos de nacimiento y **revisión de los 78 textos** por la dueña (`templates.json`, `_meta.estado`): bloquean el release de T-024, no el desarrollo.»

- [ ] **Step 3: Verificadores completos**

Run: `cd webApp && npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` y `cd webApp/supabase && npm test`
Expected: todo verde.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(carta-natal): CLAUDE.md con rutas, tablas, migración 0072, regla de dato reforzado y carga de places

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Desvíos a confirmar con el PO

Nada de esto lo decidió el arquitecto por su cuenta en contra de la spec; el plan sigue la opción indicada hasta que el PO diga otra cosa.

- **D-1 · Tolerancia del nodo verdadero.** La spec pide «nodos y Lilith media ≤10″» y dice tomarlo de `motor-de-calculo.md`, pero ese informe (§8.2) sugiere **15″** para el nodo verdadero. Medido al escribir el plan contra los elementos osculantes de Horizons: 0,2″ a **10,8″** (2100). El plan usa 15″ para el verdadero y 10″ para el medio y Lilith media. Alternativa: 10″ y aceptar un test rojo en 2100, o achicar el rango de fechas del test.
- **D-2 · Oráculo de Swiss Ephemeris para ángulos, casas, nodo medio y Lilith.** Horizons no da casas ni puntos medios. El plan genera `swe.json` con `pyswisseph` **fuera del repo** y commitea solo números (recomendación prudente de `motor-de-calculo.md` §8.3, «interpretación, no asesoramiento legal»). Si el PO prefiere riesgo cero: 10 casos cargados a mano en astro.com (Task 4, Step 4, describe el reemplazo exacto).
- **D-3 · Quién inserta en `natal_charts`.** La spec dice «INSERT solo por la Server Action con `service_role` (mismo patrón que `tarot_readings`)», pero `tarot_readings` inserta con la **sesión** y un guard. El plan sigue la regla explícita (`service_role` vía `save_natal_chart`), que además es la única forma de escribir los signos del perfil en la misma transacción.
- **D-4 · Grants de los signos en `0072`, no en `0003_privileges.sql`.** La spec dice «entran a la lista blanca de `0003_privileges.sql`»; editar una migración ya aplicada no llega al cloud. Se otorgan en `0072` (precedentes `0011`, `0028`) y Task 23 corrige la redacción de la regla 2 de `CLAUDE.md`.
- **D-5 · «Corregir el huso».** Se interpreta como elegir otra zona IANA (lista de `Intl.supportedValuesOf`), no como tipear un offset numérico libre. La carta guarda `timezone` + `utc_offset_seconds` y **se recalcula con el offset guardado**, no con la tzdata del día en que se abre: así una carta no cambia sola si la tzdata se corrige (`lugar-y-hora.md` §4). Confirmar ambas cosas.
- **D-6 · Zona de GeoNames vs. provincia.** `lugar-y-hora.md` §3.1 recomienda validar la zona contra la provincia (~30 filas de frontera, algunas bases antárticas). La spec dice cargar la zona «tal como viene». El plan no corrige nada; la persona puede corregir el huso en el formulario.
- **D-7 · Rueda sin glifos astrológicos.** `CLAUDE.md` (D-63) prohíbe glifos Unicode como íconos. La rueda usa abreviaturas de texto (So, Lu, Ari, Tau…), con el nombre completo en `<title>` y en las tablas. Si el PO quiere glifos, hacen falta 25 íconos SVG de línea en `atoms/Icon.tsx` (trabajo de diseño aparte).
- **D-8 · Recurso de derivación en el aviso de marco.** `fundamentos-interpretativos.md` §7.3.3 deja «pendiente PO» el teléfono o recurso concreto. El aviso dice «consultá a una profesional» sin número.
- **D-9 · Release bloqueado por dos cosas fuera del código:** la consulta legal sobre datos de nacimiento (spec, «Riesgos») y la aprobación de los 78 textos por la dueña (`templates.json` en `estado: "borrador"`).

## Riesgos de ejecución

- **Red en dos pasos manuales:** Task 4 y Task 9 consultan JPL Horizons; Task 13 descarga GeoNames (~30 MB). Si no hay red, esas tareas quedan bloqueadas; nada en CI depende de la red.
- **Temporal y tzdata:** los casos de Task 3 se midieron con tzdata 2026e (Node 22.23.4) y se re-verificaron con el polyfill 0.5.1 al escribir el plan. Un Node con otra tzdata puede mover casos anteriores a 1970; el test imprime cuál.
- **React 19 resetea formularios** después de una acción: por eso `ChartForm` usa campos controlados. No «simplificarlos».
- **Supabase cloud:** `create extension ... with schema extensions` asume que `pg_trgm`/`unaccent` no están ya en otro esquema; si lo están, `search_places` falla al llamar `extensions.unaccent`. Verificar con `select extname, extnamespace::regnamespace from pg_extension` antes de aplicar `0072` en el cloud.
- **Seed y e2e de docentes:** si la base local no tiene el bloque nuevo de `seed.fixtures.sql`, todos los e2e que entran a `/panel/docente` ven el bloqueo.
- **Tamaño del bundle de servidor:** `chiron.json` (~110 KB) y `templates.json` viajan solo en funciones de servidor; `ChartForm` importa tipos, no el motor.

## Self-review contra la spec

| Spec | Dónde |
|---|---|
| Decisión 1 (pública, guardar con sesión) | Tasks 15, 17, 18 |
| Decisión 2 (toda docente carga su carta, al entrar al panel) | Task 20 (+ seed), e2e Task 22 |
| Decisión 3 (Placidus por defecto, Whole Sign a elección) | Tasks 7, 17 |
| Decisión 4 (Quirón, Lilith media rotulada, nodo verdadero) | Tasks 2, 8, 9 |
| Decisión 5 (orbes Urania Trust) | Task 10 |
| Decisión 6 (hora opcional, 12:00, sin ASC/MC/casas, texto exacto) | Tasks 11, 14, 15, 16, e2e |
| Decisión 7 (perfil público solo signos) | Tasks 12, 21 |
| Decisión 8 (dato reforzado, consentimiento, borrado inmediato) | Tasks 12, 15, 18 (sin confirmación), 23 (regla 12) |
| Decisión 9 (~78 textos, revisión de la dueña) | Task 14, D-9 |
| Decisión 10 (sin link público) | Task 18: `/carta-natal/[id]` es solo de la dueña, `noindex` |
| Decisión 11 (GeoNames; manual; 1900-2100) | Tasks 12, 13, 15, 17 |
| §1 rutas y tres Server Actions con rate limit; nada en la URL | Tasks 15, 17-19; e2e verifica la URL |
| §1 formulario (huso y desfase visibles y corregibles; ambigua pregunta; inexistente avisa) | Tasks 3, 15, 17; e2e |
| §1 resultado (rueda ASC a la izquierda, antihoraria, color y trazo, `<figure>` con dos tablas, aviso al pie) | Task 16 |
| §2 motor, módulo por módulo, con su test | Tasks 2-11, 14 |
| §2 tolerancias | Tasks 5-9 (D-1 para el nodo verdadero) |
| §3 `places` (columnas, trigram + unaccent, grants, carga por script) | Tasks 12, 13 |
| §3 `natal_charts` (columnas, solo input, RLS, sin anon, INSERT `service_role`, sin UPDATE, único `is_self`, tope 100, cascada) | Task 12 |
| §3 `profiles.*_sign` | Tasks 12, 21 |
| §4 bloqueo (regla de producto) | Task 20 |
| §5 textos y fichas | Tasks 14, 19 |
| §6 pruebas unit, schema, rate limit, e2e | Tasks 3-16, 12, 15, 22 |
| §7 verificadores | Task 23 |
| Riesgos: `tzdata_version` por carta | Tasks 3 (`tzdataVersion`), 12, 15 |
| Requiere ADR-017 | `engram/02_architecture.md`, ADR-017 |

Consistencia de nombres revisada entre tareas: `ChartFacts`/`computeChart` (11) en 14-16; `ChartView`/`prepareChart`/`viewFromSaved` (15) en 16-18; `TEMPLATES`/`HOUSE_KEYS`/`TextEntry` (14) en 17, 19; `hasSelfChart` (15) en 20; nombres de campos del formulario (15) iguales en `ChartForm` (17) y en el e2e (22); funciones SQL (12) con los mismos parámetros nombrados en `insertNatalChart`/`markSelfChart` (15).

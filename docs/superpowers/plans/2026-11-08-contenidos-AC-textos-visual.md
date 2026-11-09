# Contenidos de la dueña · Bloques A (Textos) y C (Visual) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los textos de la portada, el calendario lunar, el footer, el catálogo, «Nuestros docentes», el Diario y Tarot por los del documento de la dueña, y vestir la portada, el calendario y `/tarot` con una superficie cósmica (tokens `noche`/`indigo`/`oro` + sus imágenes) sobre el sitio Brote claro.

**Architecture:** Los textos viven en `src/content/` (`landing.ts`, `site-copy.ts`) y los componentes los consumen; cada pantalla tiene un test de render que fija el texto literal. La superficie cósmica es una clase CSS única, `.cosmico`, definida en `globals.css` con tokens nuevos en `tokens.css`; un test calcula los contrastes de cada par y otro impide usar los tokens fuera de un archivo que declare `cosmico`. Las imágenes de la dueña se convierten una vez a WebP en `public/brand/` y se sirven con `next/image`.

**Tech Stack:** Next.js 16 (App Router, `next/image`), React 19, Tailwind 4 (`@theme inline`), Vitest 5 (unit, `renderToStaticMarkup`), Playwright + `axe-core` (e2e), `sharp` (ya en dependencias) para la conversión.

**Spec:** `docs/superpowers/specs/2026-11-08-contenidos-duena-design.md` (bloques A y C). Texto fuente literal: `/private/tmp/claude-501/-Users-gabrielsk-Documents-Proyects-Humano-despierto/33e4f0d6-88fb-45d9-ab85-85aa6af53dbd/scratchpad/doc-duena/doc.txt`. Imágenes: `.../scratchpad/doc-duena/z/images/image1..image11.png`.

## Global Constraints

- Rama `dev`, worktree `/Users/gabrielsk/Documents/Proyects/Humano-despierto/.claude/worktrees/dev`. Sin push, sin PR, sin merge a `main` (flujo git humano de `CLAUDE.md`). Todos los comandos se corren desde `webApp/`.
- Next 16: antes de usar una API de Next no listada acá, leer `webApp/node_modules/next/dist/docs/` (la de `next/image` está en `01-app/03-api-reference/02-components/image.md`; `preload` reemplaza a `priority`).
- Los textos de la dueña se copian **literales**, con sus comillas «» y su puntuación. Donde este plan marca «texto derivado» es porque el documento no trae el string y hubo que redactarlo; está listado en «Dudas abiertas».
- Barrido, sin excepciones en `src/` fuera de tests: nada de `herbolaria`, `herboristas`, `reiki`, `reikistas`, `oficios`, `sin vencimiento`, `acceso ilimitado`, ni promesa general de certificado.
- «Guías» pasa a «Docentes» sólo en etiquetas, `<title>`, breadcrumbs y títulos. Las rutas `/guias` y `/guias/[slug]` **no cambian**.
- Un solo tema claro (ADR-015). Los tokens `noche` `#0E1430`, `indigo` `#2A2F6B`, `oro` `#D9B45A` existen **sólo dentro de superficies `.cosmico`**; el resto del sitio sigue en Brote claro y el footer sigue en `bosque`.
- Contraste de texto ≥ 4.5:1 y foco ≥ 3:1. Dentro de `.cosmico`: texto `papel` o `oro`, foco `oro`; el botón `primary` (miel con texto bosque) no cambia. `oro` como texto sólo sobre fondo sólido `noche`/`indigo`, nunca sobre una imagen. El velo `noche` sobre imagen es de 70 % como mínimo.
- Botones: sólo `Button` / `ButtonLink` (`src/components/atoms/Button.tsx`), la pantalla elige variante y nunca estiliza un botón.
- Imágenes: `next/image` con tamaño reservado (contenedor `relative` + `fill` + `sizes`). `alt=""` si la imagen es decorativa junto a texto que ya dice lo mismo; `alt` real si carga contenido. Sin emojis ni glifos Unicode como íconos. Sin starfield ni canvas.
- Server Components por defecto. No hacer estática ninguna página (CSP con nonce, `connection()` del root layout): no agregar `export const dynamic/revalidate` en páginas.
- `Reveal` y `prefers-reduced-motion` sin cambios; todo hover con transform lleva su `motion-reduce:`.
- Comentarios cortos, en español, sólo para el porqué.
- Cada commit lleva el trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (segundo `-m`).
- Antes de cada commit: `npx tsc --noEmit` y `npm run lint` limpios, y el test de la tarea en verde. Al cerrar el plan: `npm test`, `npm run test:e2e` (necesita `npx supabase start`; arranca su propio `next dev` en el puerto 3101, **no tocar el puerto 3000**) y `bash scripts/check-seo.sh`.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `scripts/brand-images.mjs` | PNG de la dueña → WebP en `public/brand/` (one-shot, re-ejecutable) | 1 |
| `public/brand/*.webp`, `public/brand/CREDITS.md` | Assets de marca y su procedencia | 1 |
| `src/content/brand-assets.test.ts` | Los 10 WebP existen, pesan poco, `image2` ausente, CREDITS dice lo pactado | 1 |
| `src/content/brand-images.ts` (+ `.test.ts`) | Catálogo de imágenes de marca con `alt` y `brandImageForDiscipline` | 2 |
| `src/content/placeholder-photos.ts` (+ `.test.ts`) | Se reduce a las 2 fotos de Unsplash que aún usa `auth-aside` | 2 |
| `src/lib/ui/contrast.ts` (+ `.test.ts`) | `contrastRatio`, `blend` | 3 |
| `src/lib/ui/cosmic-tokens.test.ts` | Contraste de cada par cósmico, velo ≥ 70 %, tokens sólo en archivos `cosmico` | 3 |
| `src/styles/tokens.css`, `src/styles/globals.css` | Tokens `noche`/`indigo`/`oro`/`--velo-min` y clases `.cosmico`, `.cosmico-velo` | 3 |
| `src/content/site-copy.ts` (+ `.test.ts`) | Textos compartidos: Docentes, Catálogo, Diario | 4 |
| `src/content/landing.ts` (+ `.test.ts`) | Textos de la portada y de la ficha | 4, 5 |
| `src/components/landing/{Hero,Manifiesto,Empezar,LunarCalendar,GuiasSection,Cifras,FeaturedCourses}.tsx` | Secciones de la portada | 4, 5 |
| `src/app/page.tsx` (+ `page.test.ts`) | Orden de secciones y datos de la portada | 4, 5 |
| `src/lib/ui/nav-links.ts`, `src/components/layout/SiteFooter.tsx` | Menú «Docentes», footer nuevo | 6 |
| `src/app/(marketing)/guias/**` | Títulos y vacío de «Nuestros docentes» | 7 |
| `src/app/(marketing)/cursos/page.tsx`, `catalog-filters.ts` | Textos del catálogo y búsqueda por disciplina | 8 |
| `src/app/(marketing)/diario/page.tsx` | Textos del Diario | 9 |
| `src/app/(marketing)/tarot/page.tsx` | Textos, cabecera cósmica y CTA final de Tarot | 10 |
| `src/app/layout.tsx`, `src/lib/og/brand.tsx`, mail `welcome.ts` + `layout.ts`, `panel-copy.ts`, `taxonomy.ts` (comentario) | Barrido de términos | 11 |
| `src/content/forbidden-terms.test.ts` | Barrido automático de `src/` | 11 |
| `e2e/contenidos.spec.ts`, `package.json` | e2e + axe de portada, calendario y `/tarot` | 12 |
| `CLAUDE.md` | Tokens cósmicos, ADR-015 extendido, textos del proyecto | 13 |

---

### Task 1: Imágenes de la dueña a WebP

**Files:**
- Create: `webApp/scripts/brand-images.mjs`
- Create: `webApp/public/brand/*.webp` (10 archivos, generados por el script)
- Create: `webApp/public/brand/CREDITS.md`
- Test: `webApp/src/content/brand-assets.test.ts`

**Interfaces:**
- Produces: archivos `/brand/<nombre>.webp` con estos nombres exactos (los consume la Tarea 2): `hero-nebulosa` (image1) · `hero-via-lactea` (image5) · `hero-galaxia` (image11) · `carta-astral-azul` (image9) · `carta-astral-dorada` (image10) · `tarot-arcanos-dorados` (image6) · `minerales-cuarzos` (image4) · `escritorio-astrologico` (image7) · `libro-constelaciones` (image8) · `libro-estelar` (image3). `image2` se descarta.

- [ ] **Step 1: Escribir el test que falla**

`webApp/src/content/brand-assets.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const DIR = join(process.cwd(), "public", "brand");

const EXPECTED = [
  "carta-astral-azul",
  "carta-astral-dorada",
  "escritorio-astrologico",
  "hero-galaxia",
  "hero-nebulosa",
  "hero-via-lactea",
  "libro-constelaciones",
  "libro-estelar",
  "minerales-cuarzos",
  "tarot-arcanos-dorados",
];

describe("public/brand", () => {
  it("tiene exactamente las 10 imágenes aprobadas (image2 queda afuera)", () => {
    const webp = readdirSync(DIR).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")).sort();
    expect(webp).toEqual(EXPECTED);
    expect(readdirSync(DIR).filter((f) => /\.(png|jpe?g)$/i.test(f))).toEqual([]);
  });

  it.each(EXPECTED)("%s es WebP de a lo sumo 1920 px y pesa menos de 600 KB", async (name) => {
    const file = join(DIR, `${name}.webp`);
    const meta = await sharp(file).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width ?? 0).toBeLessThanOrEqual(1920);
    expect(statSync(file).size).toBeLessThan(600 * 1024);
  });

  it("CREDITS.md dice que las generó la dueña con IA y las cedió a la escuela", () => {
    const credits = readFileSync(join(DIR, "CREDITS.md"), "utf8");
    expect(credits).toMatch(/generadas por la dueña con IA, cedidas a la escuela/);
    expect(credits).toMatch(/image2/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run src/content/brand-assets.test.ts`
Expected: FAIL (`ENOENT ... public/brand`).

- [ ] **Step 3: Escribir el script de conversión y correrlo**

`webApp/scripts/brand-images.mjs`:

```js
// Convierte las imágenes de la dueña (PNG) a WebP en public/brand/.
// Uso: node scripts/brand-images.mjs <carpeta con image1.png … image11.png>
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const NAMES = {
  image1: "hero-nebulosa",
  image5: "hero-via-lactea",
  image11: "hero-galaxia",
  image9: "carta-astral-azul",
  image10: "carta-astral-dorada",
  image6: "tarot-arcanos-dorados",
  image4: "minerales-cuarzos",
  image7: "escritorio-astrologico",
  image8: "libro-constelaciones",
  image3: "libro-estelar",
};
// image2 no está a propósito: reproducía una obra firmada por un pintor (decisión del PO).

const [src] = process.argv.slice(2);
if (!src) {
  console.error("Uso: node scripts/brand-images.mjs <carpeta con image1.png … image11.png>");
  process.exit(1);
}

const out = fileURLToPath(new URL("../public/brand/", import.meta.url));
await mkdir(out, { recursive: true });

for (const [from, to] of Object.entries(NAMES)) {
  const info = await sharp(join(src, `${from}.png`))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 76, effort: 6 })
    .toFile(join(out, `${to}.webp`));
  console.log(`${from}.png -> ${to}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}
```

Run: `cd webApp && node scripts/brand-images.mjs /private/tmp/claude-501/-Users-gabrielsk-Documents-Proyects-Humano-despierto/33e4f0d6-88fb-45d9-ab85-85aa6af53dbd/scratchpad/doc-duena/z/images`
Expected: 10 líneas `imageN.png -> nombre.webp ...`. Si alguna pasa de 600 KB, bajar `quality` a 70 en el script y repetir (no subir el tope del test).

- [ ] **Step 4: Escribir CREDITS.md**

`webApp/public/brand/CREDITS.md`:

```md
# Créditos · imágenes de marca

Las imágenes de esta carpeta fueron generadas por la dueña con IA, cedidas a la escuela. Salen del «Documento maestro de contenidos y diseño web» (2026-11-08), `image1` a `image11`, convertidas a WebP de hasta 1920 px de ancho con `scripts/brand-images.mjs`.

`image2` se descartó: reproducía una obra con la firma de un pintor.

| Archivo | Original | Uso previsto |
|---|---|---|
| `hero-nebulosa.webp` | image1 | Fondo del hero de la portada |
| `hero-galaxia.webp` | image11 | Cabecera de `/tarot` |
| `hero-via-lactea.webp` | image5 | Reserva para otras cabeceras cósmicas |
| `carta-astral-azul.webp` | image9 | «Nuestra mirada» (portada); portada de ejemplo de Simbología |
| `carta-astral-dorada.webp` | image10 | Portada de ejemplo de Astrología |
| `tarot-arcanos-dorados.webp` | image6 | Bloque final de `/tarot`; portada de ejemplo de Tarot |
| `minerales-cuarzos.webp` | image4 | Portada de ejemplo de Gemoterapia |
| `escritorio-astrologico.webp` | image7 | Portada de ejemplo de Magia |
| `libro-constelaciones.webp` | image8 | Portada de ejemplo de Constelaciones y Talleres lunares |
| `libro-estelar.webp` | image3 | Imagen neutra (disciplina desconocida) |

Pendiente (F-C3): los originales en alta resolución, que se le piden a la dueña.
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd webApp && npx vitest run src/content/brand-assets.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 6: Commit**

```bash
git add webApp/scripts/brand-images.mjs webApp/public/brand webApp/src/content/brand-assets.test.ts
git commit -m "feat(visual): imágenes de la dueña convertidas a WebP en public/brand" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Catálogo de imágenes de marca y retiro de las fotos viejas

**Files:**
- Create: `webApp/src/content/brand-images.ts`
- Create: `webApp/src/content/brand-images.test.ts`
- Modify: `webApp/src/content/placeholder-photos.ts` (reescritura completa)
- Modify: `webApp/src/content/placeholder-photos.test.ts` (reescritura completa)
- Modify: `webApp/src/content/auth-aside.ts:5` (frase sin «oficio»)
- Modify: `webApp/src/components/atoms/CourseCover.tsx`
- Modify: `webApp/src/app/(marketing)/cursos/[slug]/page.tsx:18,75,138-146`

**Interfaces:**
- Consumes: los WebP de la Tarea 1.
- Produces:
  - `interface BrandImage { src: string; alt: string }`
  - `const BRAND: { heroNebulosa, heroViaLactea, heroGalaxia, cartaAstralAzul, cartaAstralDorada, tarotArcanos, minerales, escritorioAstrologico, libroConstelaciones, libroEstelar }`, cada una `BrandImage`
  - `brandImageForDiscipline(discipline: string | null | undefined): BrandImage`
  - `placeholder-photos.ts` conserva `PLACEHOLDER_PHOTOS`, `PlaceholderPhoto`, `unsplashUrl` y **pierde** `HERO_PHOTO`, `placeholderForDiscipline`.

- [ ] **Step 1: Escribir los tests que fallan**

`webApp/src/content/brand-images.test.ts`:

```ts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, brandImageForDiscipline } from "./brand-images";

describe("BRAND", () => {
  it("cada imagen existe en public/ y su alt dice lo que se ve", () => {
    for (const img of Object.values(BRAND)) {
      expect(existsSync(join(process.cwd(), "public", img.src)), img.src).toBe(true);
      expect(img.alt.trim().length).toBeGreaterThan(15);
    }
  });
});

describe("brandImageForDiscipline", () => {
  it.each([
    ["Tarot", BRAND.tarotArcanos],
    ["tarot", BRAND.tarotArcanos],
    ["Astrología", BRAND.cartaAstralDorada],
    ["astrologia", BRAND.cartaAstralDorada],
    ["Constelaciones familiares", BRAND.libroConstelaciones],
    ["constelaciones", BRAND.libroConstelaciones],
    ["Magia", BRAND.escritorioAstrologico],
    ["Gemoterapia", BRAND.minerales],
    ["Simbología y símbolos de poder", BRAND.cartaAstralAzul],
    ["simbologia", BRAND.cartaAstralAzul],
    ["Talleres lunares", BRAND.libroConstelaciones],
    ["talleres-lunares", BRAND.libroConstelaciones],
  ])("%s → su imagen", (discipline, expected) => {
    expect(brandImageForDiscipline(discipline)).toBe(expected);
  });

  it("una disciplina desconocida, vieja o ausente cae en la imagen neutra", () => {
    for (const d of ["Herbal", "Numerología", "", null, undefined]) {
      expect(brandImageForDiscipline(d)).toBe(BRAND.libroEstelar);
    }
  });
});
```

`webApp/src/content/placeholder-photos.test.ts` (reemplaza el archivo entero):

```ts
import { describe, expect, it } from "vitest";
import { PLACEHOLDER_PHOTOS, unsplashUrl } from "./placeholder-photos";

// Los 16 ids verificados a mano en design_handoff_humano_humano/reference/brote/README.md.
const README_IDS = [
  "1441974231531-c6227db76b6e", "1760445529648-9c8af38a0bb3", "1600429991827-5224817554f8",
  "1694144167581-8bc49479f6b7", "1772710333229-97bb734d5d5e", "1519681393784-d120267933ba",
  "1545840716-c82e9eec6930", "1492552181161-62217fc3076d", "1567922045116-2a00fae2ed03",
  "1447619297994-b829cc1ab44a", "1762162623066-89e462b3d8f0", "1470252649378-9c29740c9fa8",
  "1746410848551-ca40cdb57674", "1544005313-94ddf0286df2", "1692801439915-ef9194bf0951",
  "1643224196036-a61f69ff4144",
];

describe("PLACEHOLDER_PHOTOS", () => {
  it("sólo trae ids verificados del README, sin la foto de somosbuenavida.com", () => {
    for (const p of PLACEHOLDER_PHOTOS) expect(README_IDS).toContain(p.id);
    expect(PLACEHOLDER_PHOTOS.map((p) => p.id)).not.toContain("1469474968028-56623f02e42e");
  });

  it("quedan sólo las dos que usa el costado de las pantallas de acceso", () => {
    expect(PLACEHOLDER_PHOTOS.map((p) => p.id).sort()).toEqual([
      "1441974231531-c6227db76b6e",
      "1470252649378-9c29740c9fa8",
    ]);
  });

  it("toda foto describe lo que se ve", () => {
    for (const p of PLACEHOLDER_PHOTOS) expect(p.alt.trim().length).toBeGreaterThan(10);
  });

  it("unsplashUrl arma la URL del host listado en remotePatterns", () => {
    expect(unsplashUrl("1470252649378-9c29740c9fa8")).toBe("https://images.unsplash.com/photo-1470252649378-9c29740c9fa8");
  });
});

describe("sin retratos de stock (decisión 3 del PO, QA T-060 D1)", () => {
  it("ninguna foto de muestra es una persona: nunca va una cara ajena junto al nombre de una docente real", async () => {
    expect(PLACEHOLDER_PHOTOS.every((p) => (p.use as string) !== "retrato")).toBe(true);
    const mod: Record<string, unknown> = await import("./placeholder-photos");
    expect(mod.placeholderPortrait).toBeUndefined();
  });

  it.each([
    "1746410848551-ca40cdb57674",
    "1544005313-94ddf0286df2",
    "1692801439915-ef9194bf0951",
    "1643224196036-a61f69ff4144",
    "1469474968028-56623f02e42e",
  ])("excluye explícitamente el id %s (retrato o prohibido)", (id) => {
    expect(PLACEHOLDER_PHOTOS.map((p) => p.id)).not.toContain(id);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/content/brand-images.test.ts src/content/placeholder-photos.test.ts`
Expected: `brand-images.test.ts` FAIL (módulo inexistente); `placeholder-photos.test.ts` FAIL en «quedan sólo las dos».

- [ ] **Step 3: Crear `brand-images.ts`**

`webApp/src/content/brand-images.ts`:

```ts
/**
 * Imágenes de marca generadas por la dueña con IA y cedidas a la escuela (public/brand/CREDITS.md).
 * Locales: pasan por `next/image` sin host remoto. `alt` describe lo que se ve; quien la usa como
 * fondo decorativo junto a texto pasa `alt=""`.
 */
export interface BrandImage {
  src: string;
  alt: string;
}

export const BRAND = {
  heroNebulosa: { src: "/brand/hero-nebulosa.webp", alt: "Nebulosa de tonos azules, violetas y dorados rodeada de estrellas" },
  heroViaLactea: { src: "/brand/hero-via-lactea.webp", alt: "Vía Láctea sobre un mar de nubes al atardecer" },
  heroGalaxia: { src: "/brand/hero-galaxia.webp", alt: "Galaxia en espiral sobre un mar de nubes violetas" },
  cartaAstralAzul: { src: "/brand/carta-astral-azul.webp", alt: "Carta astral en azul profundo y dorado, con el zodíaco y los planetas" },
  cartaAstralDorada: { src: "/brand/carta-astral-dorada.webp", alt: "Carta astral con anillos dorados sobre un cielo azul noche" },
  tarotArcanos: { src: "/brand/tarot-arcanos-dorados.webp", alt: "Cuatro cartas de tarot azul y oro: El Carro, Los Enamorados, la Reina de Espadas y El Colgado" },
  minerales: { src: "/brand/minerales-cuarzos.webp", alt: "Cuarzos y amatista sobre una tela negra" },
  escritorioAstrologico: { src: "/brand/escritorio-astrologico.webp", alt: "Cartas de tarot, minerales, una brújula y cartas astrales sobre una mesa de madera" },
  libroConstelaciones: { src: "/brand/libro-constelaciones.webp", alt: "Libro abierto con constelaciones y lunas doradas sobre acuarelas azules" },
  libroEstelar: { src: "/brand/libro-estelar.webp", alt: "Libro abierto con un mapa celeste que brilla sobre un fondo de estrellas" },
} as const satisfies Record<string, BrandImage>;

// `discipline` llega como etiqueta ("Astrología") o, tras el bloque B, como clave ("astrologia"):
// se compara por raíz, sin tildes ni mayúsculas, así que sirve para las dos.
const BY_DISCIPLINE: ReadonlyArray<[root: string, image: BrandImage]> = [
  ["tarot", BRAND.tarotArcanos],
  ["astrolog", BRAND.cartaAstralDorada],
  ["constelac", BRAND.libroConstelaciones],
  ["magia", BRAND.escritorioAstrologico],
  ["gemo", BRAND.minerales],
  ["simbol", BRAND.cartaAstralAzul],
  ["lunar", BRAND.libroConstelaciones],
];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Imagen de muestra de un curso sin portada propia. */
export function brandImageForDiscipline(discipline: string | null | undefined): BrandImage {
  const d = normalize(discipline ?? "");
  const hit = d ? BY_DISCIPLINE.find(([root]) => d.includes(root)) : undefined;
  return hit ? hit[1] : BRAND.libroEstelar;
}
```

- [ ] **Step 4: Reducir `placeholder-photos.ts`**

Reemplazar el archivo entero por:

```ts
/**
 * PLACEHOLDER (ADR-015) · Fotos de Unsplash verificadas a mano, una por una, en
 * `design_handoff_humano_humano/reference/brote/README.md`. Lista cerrada: una foto nueva se mira
 * antes de entrar y su `alt` dice lo que se ve. Prohibida la 1469474968028-56623f02e42e (es la de
 * somosbuenavida.com). Sin retratos: una foto de stock de una persona junto al nombre de una
 * docente real le atribuiría una cara ajena (decisión 3 del PO, QA T-060 D1).
 *
 * Desde 2026-11-08 sólo quedan las dos del costado de las pantallas de acceso (`auth-aside.ts`):
 * el hero, «Nuestra mirada» y las portadas de ejemplo usan `brand-images.ts`.
 */

export type PhotoUse = "fondo";

export interface PlaceholderPhoto {
  id: string;
  alt: string;
  use: PhotoUse;
}

export const PLACEHOLDER_PHOTOS = [
  { id: "1441974231531-c6227db76b6e", alt: "Sendero en un bosque con luz de sol entre los árboles", use: "fondo" },
  { id: "1470252649378-9c29740c9fa8", alt: "Sol saliendo sobre un prado con niebla", use: "fondo" },
] as const satisfies readonly PlaceholderPhoto[];

/** Sin query: el ancho y la calidad los pone `next/image` al pasar por el optimizador. */
export function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}`;
}
```

- [ ] **Step 5: Cambiar `auth-aside.ts` y los dos usos de la foto de muestra**

En `webApp/src/content/auth-aside.ts`, la línea de `entrar`:

```ts
  entrar: { photoId: "1470252649378-9c29740c9fa8", phrase: "Se aprende de a poco, a tu ritmo." },
```

En `webApp/src/components/atoms/CourseCover.tsx`:

```tsx
import Image from "next/image";
import SignedImage from "@/components/atoms/SignedImage";
import { brandImageForDiscipline } from "@/content/brand-images";

/** Imagen de un curso dentro de un contenedor `relative`: su portada firmada o, sin ella, la imagen
 *  de marca de su disciplina. `alt` vacío: quien la usa ya nombra el curso al lado. */
export default function CourseCover({
  coverUrl,
  discipline,
  sizes,
  eager,
  className,
}: {
  coverUrl: string | null | undefined;
  discipline: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  if (coverUrl) {
    return (
      <SignedImage
        src={coverUrl}
        alt=""
        loading={eager ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }
  return (
    <Image
      src={brandImageForDiscipline(discipline).src}
      alt=""
      fill
      loading={eager ? "eager" : "lazy"}
      sizes={sizes}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
```

En `webApp/src/app/(marketing)/cursos/[slug]/page.tsx`:
1. línea 18: `import { placeholderForDiscipline, unsplashUrl } from "@/content/placeholder-photos";` → `import { brandImageForDiscipline } from "@/content/brand-images";`
2. línea 75: `const placeholder = placeholderForDiscipline(course.discipline);` → `const brandCover = brandImageForDiscipline(course.discipline);`
3. en el `<Image>` del `<aside>`: `src={unsplashUrl(placeholder.id)}` → `src={brandCover.src}` y `alt={placeholder.alt}` → `alt={brandCover.alt}`.

- [ ] **Step 6: Verificar tipos, lint y tests**

Run: `cd webApp && npx tsc --noEmit && npm run lint && npx vitest run src/content`
Expected: sin errores; PASS. Requiere que la Tarea 4 ya haya reescrito `Hero.tsx` y `Manifiesto.tsx` (ver «Orden de ejecución» al final): si `grep -rn "HERO_PHOTO\|placeholderForDiscipline" src` devuelve algo, falta ejecutar esa tarea.

- [ ] **Step 7: Commit**

```bash
git add webApp/src/content webApp/src/components/atoms/CourseCover.tsx "webApp/src/app/(marketing)/cursos/[slug]/page.tsx"
git commit -m "feat(visual): catálogo de imágenes de marca y retiro de fotos de Unsplash sin uso" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

> Orden de ejecución: esta tarea se parte. Steps 1-3 (tests + `brand-images.ts`) van antes de la Tarea 4; Steps 4-7 después, porque `Hero.tsx` y `Manifiesto.tsx` importan `HERO_PHOTO` y la foto del romero hasta que la Tarea 4 los reescribe.

---

### Task 3: Tokens cósmicos y test de contraste

**Files:**
- Create: `webApp/src/lib/ui/contrast.ts`
- Create: `webApp/src/lib/ui/contrast.test.ts`
- Create: `webApp/src/lib/ui/cosmic-tokens.test.ts`
- Modify: `webApp/src/styles/tokens.css`
- Modify: `webApp/src/styles/globals.css` (bloque `@theme inline` y `@layer components`)

**Interfaces:**
- Produces:
  - `type Rgb = [number, number, number]`
  - `hexToRgb(hex: string): Rgb`
  - `contrastRatio(a: string | Rgb, b: string | Rgb): number` (acepta hex `#rrggbb` o `Rgb`)
  - `blend(fg: Rgb, bg: Rgb, alpha: number): Rgb` (`fg` con opacidad `alpha` sobre `bg`)
  - Tokens CSS `--noche`, `--indigo`, `--oro`, `--velo-min`; utilidades Tailwind `bg-noche`, `text-oro`, `border-indigo`, etc.; clases `.cosmico` y `.cosmico-velo`.

- [ ] **Step 1: Escribir los tests que fallan**

`webApp/src/lib/ui/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { blend, contrastRatio, hexToRgb } from "./contrast";

describe("contrast", () => {
  it("negro sobre blanco es 21:1 y un color sobre sí mismo es 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#2a2f6b", "#2a2f6b")).toBeCloseTo(1, 5);
  });

  it("es simétrico y acepta hex o rgb", () => {
    expect(contrastRatio("#0e1430", "#ffffff")).toBeCloseTo(contrastRatio([255, 255, 255], "#0e1430"), 8);
  });

  it("hexToRgb rechaza lo que no es #rrggbb", () => {
    expect(hexToRgb("#d9b45a")).toEqual([217, 180, 90]);
    expect(() => hexToRgb("rojo")).toThrow(/hex inválido/);
  });

  it("blend con alpha 1 devuelve el frente y con 0 el fondo", () => {
    expect(blend([10, 20, 30], [200, 200, 200], 1)).toEqual([10, 20, 30]);
    expect(blend([10, 20, 30], [200, 200, 200], 0)).toEqual([200, 200, 200]);
    expect(blend([0, 0, 0], [100, 100, 100], 0.5)).toEqual([50, 50, 50]);
  });
});
```

`webApp/src/lib/ui/cosmic-tokens.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio, hexToRgb } from "./contrast";

const SRC = join(process.cwd(), "src");
const css = readFileSync(join(SRC, "styles", "tokens.css"), "utf8");

function token(name: string): string {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`falta el token --${name} en tokens.css`);
  return m[1].trim();
}

const noche = token("noche");
const indigo = token("indigo");
const oro = token("oro");
const papel = token("papel");
const miel = token("miel");
const bosque = token("bosque");

describe("tokens cósmicos (ADR-015 extendido)", () => {
  it("valores de la spec", () => {
    expect([noche, indigo, oro]).toEqual(["#0e1430", "#2a2f6b", "#d9b45a"]);
  });

  it.each([
    ["papel sobre noche", papel, noche],
    ["oro sobre noche", oro, noche],
    ["papel sobre indigo", papel, indigo],
    ["oro sobre indigo", oro, indigo],
    ["bosque sobre miel (botón primary)", bosque, miel],
  ])("texto: %s ≥ 4.5:1", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["foco oro sobre noche", oro, noche],
    ["foco oro sobre indigo", oro, indigo],
    ["miel (botón) sobre noche", miel, noche],
  ])("no texto: %s ≥ 3:1", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it("el velo sobre imagen es de 70 % como mínimo y sostiene el texto papel aun sobre un píxel blanco", () => {
    const velo = Number(token("velo-min"));
    expect(velo).toBeGreaterThanOrEqual(0.7);
    const peorCaso = blend(hexToRgb(noche), [255, 255, 255], velo);
    expect(contrastRatio(hexToRgb(papel), peorCaso)).toBeGreaterThanOrEqual(4.5);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe("los tokens cósmicos sólo se usan en superficies .cosmico", () => {
  const USO = /\b(?:bg|text|border|fill|stroke|from|to|via|ring|outline)-(?:noche|indigo|oro)\b/;
  const files = walk(SRC).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f),
  );

  it("todo archivo que usa noche/indigo/oro declara la clase `cosmico`", () => {
    const sueltos = files
      .filter((f) => USO.test(readFileSync(f, "utf8")) && !readFileSync(f, "utf8").includes("cosmico"))
      .map((f) => f.replace(SRC, "src"));
    expect(sueltos).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/lib/ui/contrast.test.ts src/lib/ui/cosmic-tokens.test.ts`
Expected: FAIL (`./contrast` no existe; `falta el token --noche`).

- [ ] **Step 3: Escribir `contrast.ts`**

`webApp/src/lib/ui/contrast.ts`:

```ts
// Contraste WCAG 2.x (luminancia relativa). Sin dependencias: lo usan los tests de tokens.
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`color hex inválido: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const asRgb = (c: string | Rgb): Rgb => (typeof c === "string" ? hexToRgb(c) : c);

export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const la = luminance(asRgb(a));
  const lb = luminance(asRgb(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` con opacidad `alpha` sobre `bg`: el color que ve el ojo bajo un velo. */
export function blend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as Rgb;
}
```

- [ ] **Step 4: Agregar los tokens y las clases**

En `webApp/src/styles/tokens.css`, dentro de `:root`, después de `--exito: #2f6b45;`:

```css

  /* Acentos cósmicos (ADR-015 extendido, 2026-11-08). Existen sólo dentro de `.cosmico`
     (hero, calendario lunar, cabecera y bloque final de /tarot). Pares verificados en
     src/lib/ui/cosmic-tokens.test.ts. */
  --noche: #0e1430;
  --indigo: #2a2f6b;
  --oro: #d9b45a;
  /* Opacidad mínima del velo `noche` sobre una imagen: con menos, el título pierde contraste. */
  --velo-min: 0.78;
```

En `webApp/src/styles/globals.css`, en `@theme inline`, después de `--color-exito: var(--exito);`:

```css
  --color-noche: var(--noche);
  --color-indigo: var(--indigo);
  --color-oro: var(--oro);
```

En `@layer components`, antes de `.btn { ... }`:

```css
  /* Superficie cósmica: la única donde existen noche/indigo/oro. Texto papel, foco oro. */
  .cosmico {
    background-color: var(--noche);
    color: var(--papel);
  }
  .cosmico h1,
  .cosmico h2,
  .cosmico h3,
  .cosmico h4 {
    color: var(--papel);
  }
  .cosmico :focus-visible {
    outline-color: var(--oro);
  }
  /* Velo sobre una imagen de fondo; arriba y abajo nunca baja de --velo-min. */
  .cosmico-velo {
    background: linear-gradient(to top, rgb(14 20 48 / 0.94), rgb(14 20 48 / var(--velo-min)));
  }
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd webApp && npx vitest run src/lib/ui/contrast.test.ts src/lib/ui/cosmic-tokens.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS. (El guard de «sólo en `cosmico`» pasa porque todavía ningún archivo usa los tokens.)

- [ ] **Step 6: Commit**

```bash
git add webApp/src/lib/ui webApp/src/styles
git commit -m "feat(visual): tokens cósmicos noche/indigo/oro con test de contraste y clase .cosmico" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Portada, parte 1 · textos compartidos, hero y «Nuestra mirada»

**Files:**
- Create: `webApp/src/content/site-copy.ts`
- Create: `webApp/src/content/site-copy.test.ts`
- Create: `webApp/src/content/landing.test.ts`
- Modify: `webApp/src/content/landing.ts` (interfaz y bloques `hero`, `manifiesto`, `cursos`, `guias`)
- Modify: `webApp/src/components/landing/Hero.tsx` (reescritura completa)
- Modify: `webApp/src/components/landing/Hero.test.tsx` (reescritura completa)
- Modify: `webApp/src/components/landing/Manifiesto.tsx` (reescritura completa)
- Create: `webApp/src/components/landing/Manifiesto.test.tsx`
- Modify: `webApp/src/app/page.tsx` (sin cita ni destacada)
- Modify: `webApp/src/app/page.test.ts`

**Interfaces:**
- Consumes: `BRAND` (Tarea 2), clases `.cosmico` / `.cosmico-velo` (Tarea 3).
- Produces:
  - `DOCENTES: { title, lead, navLabel, verTodos, volver, metaTitle, metaDescription }`
  - `CATALOGO: { title, lead, searchPlaceholder, empty, metaDescription }`
  - `DIARIO: { title, lead, empty, metaDescription }`
  - `LANDING.hero: { title; lead; ctaCursos; ctaProyecto }`; `Hero` **sin props**.
  - `Manifiesto` con `id="nuestra-mirada"`; su botón apunta a `#empezar`.
  - Ya no existen `HeroQuote`, `LANDING.hero.heading/fallbackQuote/fallbackByline/ctaGuias`.

- [ ] **Step 1: Escribir los tests que fallan**

`webApp/src/content/site-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATALOGO, DIARIO, DOCENTES } from "./site-copy";

describe("site-copy · textos literales del documento de la dueña", () => {
  it("Nuestros docentes (pantalla 6)", () => {
    expect(DOCENTES.title).toBe("Nuestros docentes");
    expect(DOCENTES.lead).toBe(
      "Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje. Conocé a quienes comparten sus saberes y acompañan cada recorrido.",
    );
    expect(DOCENTES.navLabel).toBe("Docentes");
  });

  it("Catálogo (pantalla 5)", () => {
    expect(CATALOGO.title).toBe("Cursos");
    expect(CATALOGO.lead).toBe(
      "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
    );
    expect(CATALOGO.searchPlaceholder).toBe("¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.");
    expect(CATALOGO.empty).toBe(
      "No encontramos formaciones con esos criterios. Probá con otra búsqueda o explorá todas nuestras propuestas.",
    );
  });

  it("Diario (pantalla 7)", () => {
    expect(DIARIO.title).toBe("Diario");
    expect(DIARIO.lead).toBe(
      "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
    );
    expect(DIARIO.empty).toBe(
      "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
    );
  });
});
```

`webApp/src/content/landing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { LANDING } from "./landing";

describe("LANDING · portada (pantallas 1 y 2)", () => {
  it("hero: título con sus comillas, subtítulo y botones", () => {
    expect(LANDING.hero.title).toBe(
      "«Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú».",
    );
    expect(LANDING.hero.lead).toBe(
      "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    );
    expect(LANDING.hero.ctaCursos).toBe("Explorar los cursos");
    expect(LANDING.hero.ctaProyecto).toBe("Conocé Humano Despierto");
  });

  it("nuestra mirada: título, dos párrafos y botón", () => {
    expect(LANDING.manifiesto.title).toBe(
      "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.",
    );
    expect(LANDING.manifiesto.paragraphs).toEqual([
      "La astrología nos invita a descubrir los símbolos del cielo y su relación con nuestra experiencia humana. A través de la carta natal, los arquetipos y los ciclos planetarios, podemos explorar nuestra personalidad, nuestros procesos y las posibilidades de transformación.",
      "En Humano Despierto también nos acercamos al tarot, las constelaciones familiares, la magia, la gemoterapia y el universo de los símbolos de poder, sanación y protección. Diferentes caminos que nos permiten ampliar la mirada, despertar preguntas y profundizar en el conocimiento de nosotros mismos.",
    ]);
    expect(LANDING.manifiesto.cta).toBe("Descubrí nuestra propuesta");
  });

  it("la sección de cursos reusa la bajada del catálogo y la de docentes, la de Nuestros docentes", () => {
    expect(LANDING.cursos.lead).toBe(
      "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
    );
    expect(LANDING.guias.title).toBe("Nuestros docentes");
    expect(LANDING.guias.verTodas).toBe("Ver todos los docentes");
  });
});
```

`webApp/src/components/landing/Hero.test.tsx` (reemplaza el archivo):

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Hero from "./Hero";

const TITULO =
  "«Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú».";

describe("portada · hero cósmico", () => {
  const html = renderToStaticMarkup(<Hero />);

  it("tiene exactamente un h1, visible, con el título de la dueña", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    const h1 = /<h1[^>]*>/.exec(html)![0];
    expect(h1).not.toContain("sr-only");
    expect(html).toContain(TITULO);
  });

  it("subtítulo y botones literales", () => {
    expect(html).toContain(
      "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    );
    expect(html).toMatch(/href="\/cursos"[^>]*>Explorar los cursos/);
    expect(html).toMatch(/href="#nuestra-mirada"[^>]*>Conocé Humano Despierto/);
  });

  it("es superficie cósmica con velo sobre la imagen de la dueña, sin viejos términos", () => {
    expect(html).toContain("cosmico");
    expect(html).toContain("cosmico-velo");
    expect(html).toMatch(/hero-nebulosa/);
    expect(html).not.toMatch(/herbolaria|reiki|oficios|unsplash/i);
  });
});
```

`webApp/src/components/landing/Manifiesto.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Manifiesto from "./Manifiesto";

describe("portada · nuestra mirada", () => {
  const html = renderToStaticMarkup(<Manifiesto />);

  it("es el ancla del botón del hero y trae el título y los párrafos de la dueña", () => {
    expect(html).toContain('id="nuestra-mirada"');
    expect(html).toContain("La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.");
    expect(html).toContain("A través de la carta natal, los arquetipos y los ciclos planetarios");
    expect(html).toContain("el universo de los símbolos de poder, sanación y protección");
  });

  it("el botón lleva a la sección siguiente, no a instrucciones de acceso", () => {
    expect(html).toMatch(/href="#empezar"[^>]*>Descubrí nuestra propuesta/);
  });

  it("la imagen es una carta astral con alt real, nunca hierbas", () => {
    expect(html).toMatch(/carta-astral-azul/);
    expect(html).toMatch(/alt="Carta astral/);
    expect(html).not.toMatch(/romero|hierbas|unsplash|herbolaria/i);
  });
});
```

`webApp/src/app/page.test.ts` — reemplazar el bloque de mocks y la lista final:

```ts
import { describe, expect, it, vi } from "vitest";

const { connection, getLandingData, getPublishedCourses, getPublicTeachers } = vi.hoisted(() => ({
  connection: vi.fn(async () => {
    throw new Error("PRERENDER_BAIL");
  }),
  getLandingData: vi.fn(),
  getPublishedCourses: vi.fn(),
  getPublicTeachers: vi.fn(),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/server/landing", () => ({ getLandingData }));
vi.mock("@/lib/server/courses", () => ({ getPublishedCourses, signCatalogCovers: vi.fn() }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers, signTeacherAvatars: vi.fn() }));

import LandingPage from "./page";

describe("T-091 · la portada no consulta la base en el build", () => {
  it("espera un request antes de lanzar las consultas", async () => {
    // El layout ya llama a connection(), pero la página se renderiza en paralelo y sus
    // consultas salían igual durante el prerender.
    await expect(LandingPage()).rejects.toThrow("PRERENDER_BAIL");
    for (const fn of [getLandingData, getPublishedCourses, getPublicTeachers]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/content/site-copy.test.ts src/content/landing.test.ts src/components/landing`
Expected: FAIL (módulo `site-copy` inexistente; `LANDING.hero.title` indefinido; `Hero` sigue pidiendo `quote`).

- [ ] **Step 3: Crear `site-copy.ts`**

`webApp/src/content/site-copy.ts`:

```ts
/**
 * Textos del documento maestro de la dueña (2026-11-08) que comparten más de una pantalla.
 * Literales: no se parafrasean. Los `meta*` son texto derivado de la bajada de cada pantalla.
 */

export const DOCENTES = {
  title: "Nuestros docentes",
  lead: "Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje. Conocé a quienes comparten sus saberes y acompañan cada recorrido.",
  navLabel: "Docentes",
  verTodos: "Ver todos los docentes",
  volver: "Todos los docentes",
  metaTitle: "Docentes",
  metaDescription: "Conocé a quienes comparten sus saberes y acompañan cada formación en Humano Despierto.",
} as const;

export const CATALOGO = {
  title: "Cursos",
  lead: "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
  searchPlaceholder: "¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.",
  empty: "No encontramos formaciones con esos criterios. Probá con otra búsqueda o explorá todas nuestras propuestas.",
  metaDescription:
    "Explorá las formaciones de Humano Despierto: astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
} as const;

export const DIARIO = {
  title: "Diario",
  lead: "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
  empty: "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
  metaDescription:
    "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
} as const;
```

- [ ] **Step 4: Cambiar `landing.ts` (hero, manifiesto, cursos, guías)**

En `webApp/src/content/landing.ts`: reemplazar el comentario de cabecera, agregar el import y cambiar los cuatro bloques. El resto del archivo (`cifra`, `testimonios`, `empezar`, `COURSE_FAQ`) **no se toca en esta tarea**.

Cabecera (reemplaza el bloque `/** … */` inicial) más import:

```ts
import { CATALOGO, DOCENTES } from "@/content/site-copy";

/**
 * Texto editorial de la portada y de la ficha. Lo edita la escuela; las cifras, cursos, docentes y
 * testimonios NO viven acá: salen de la base. Los textos de la portada son literales del documento
 * maestro de la dueña (2026-11-08).
 */
```

En `interface LandingContent`, reemplazar `hero`, `cursos` y `guias`:

```ts
  hero: { title: string; lead: string; ctaCursos: string; ctaProyecto: string };
  manifiesto: { title: string; paragraphs: readonly string[]; cta: string };
  cursos: { title: string; lead: string; verTodos: (n: number) => string };
  cifra: { verbo: string; nota: string };
  guias: { title: string; lead: string; verPerfil: string; verTodas: string };
```

En `LANDING`, reemplazar `hero`, `manifiesto`, `cursos` y `guias`:

```ts
  hero: {
    title: "«Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú».",
    lead: "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    ctaCursos: "Explorar los cursos",
    ctaProyecto: "Conocé Humano Despierto",
  },
  manifiesto: {
    title: "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.",
    paragraphs: [
      "La astrología nos invita a descubrir los símbolos del cielo y su relación con nuestra experiencia humana. A través de la carta natal, los arquetipos y los ciclos planetarios, podemos explorar nuestra personalidad, nuestros procesos y las posibilidades de transformación.",
      "En Humano Despierto también nos acercamos al tarot, las constelaciones familiares, la magia, la gemoterapia y el universo de los símbolos de poder, sanación y protección. Diferentes caminos que nos permiten ampliar la mirada, despertar preguntas y profundizar en el conocimiento de nosotros mismos.",
    ],
    cta: "Descubrí nuestra propuesta",
  },
  cursos: {
    title: "Cursos",
    lead: CATALOGO.lead,
    verTodos: (n) => (n === 1 ? "Ver el curso" : `Ver los ${n} cursos`),
  },
```

(`cifra` queda como está.) Y:

```ts
  guias: {
    title: DOCENTES.title,
    lead: DOCENTES.lead,
    verPerfil: "Ver su perfil",
    verTodas: DOCENTES.verTodos,
  },
```

- [ ] **Step 5: Reescribir `Hero.tsx`**

`webApp/src/components/landing/Hero.tsx`:

```tsx
import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import { BRAND } from "@/content/brand-images";
import { LANDING } from "@/content/landing";

/** Hero cósmico: la imagen de la dueña a sangre, velo `noche` (≥ 70 %) y el título como h1. El
 *  header va transparente encima (`overHero`). La imagen es decorativa: el texto ya lo dice todo. */
export default function Hero() {
  const h = LANDING.hero;
  return (
    <section aria-label="Presentación" className="cosmico relative grid min-h-[min(100svh,860px)] items-end overflow-hidden">
      <Image
        src={BRAND.heroNebulosa.src}
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-center"
      />
      <div aria-hidden="true" className="cosmico-velo absolute inset-0" />
      {/* Banda superior: el header transparente tiene texto blanco encima de la imagen. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgb(14_20_48/0.7),rgb(14_20_48/0))]" />
      <div className="relative mx-auto w-full max-w-[1200px] px-6 pb-16 pt-36 md:pb-[72px]">
        <h1 className="max-w-[26ch] text-[clamp(28px,4.2vw,54px)] font-semibold leading-[1.12] tracking-[-0.02em] text-balance">
          {h.title}
        </h1>
        <p className="mb-10 mt-6 max-w-[52ch] text-lg leading-relaxed">{h.lead}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/cursos" arrow>
            {h.ctaCursos}
          </ButtonLink>
          <ButtonLink href="#nuestra-mirada" variant="outline-light">
            {h.ctaProyecto}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Reescribir `Manifiesto.tsx`**

`webApp/src/components/landing/Manifiesto.tsx`:

```tsx
import Image from "next/image";
import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import Reveal from "@/components/layout/Reveal";
import { BRAND } from "@/content/brand-images";
import { LANDING } from "@/content/landing";

export default function Manifiesto() {
  const m = LANDING.manifiesto;
  return (
    <section id="nuestra-mirada" aria-labelledby="manifiesto-titulo" className="scroll-mt-20 py-[90px] md:pb-[110px] md:pt-[130px]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 md:grid-cols-2 md:gap-[72px]">
        <div>
          <Reveal>
            <h2 id="manifiesto-titulo" className="mb-5 max-w-[18ch] text-[clamp(30px,3.6vw,46px)] leading-[1.12]">
              {m.title}
            </h2>
          </Reveal>
          {m.paragraphs.map((p, i) => (
            <Reveal key={i} delay={i === 0 ? 1 : 2}>
              <p className="mt-4 max-w-[48ch] text-suave">{p}</p>
            </Reveal>
          ))}
          <Reveal delay={3} className="mt-8">
            <ButtonLink href="#empezar" arrow>
              {m.cta}
            </ButtonLink>
          </Reveal>
        </div>
        <Reveal delay={1} className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[16px] bg-salvia shadow-lift">
            <Image
              src={BRAND.cartaAstralAzul.src}
              alt={BRAND.cartaAstralAzul.alt}
              fill
              sizes="(min-width: 768px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <LeafIllustration className="absolute -bottom-8 right-2 md:-left-[54px] md:right-auto" />
        </Reveal>
      </div>
    </section>
  );
}
```

(`LeafIllustration` se mantiene como motivo de marca Brote: ver «Dudas abiertas».)

- [ ] **Step 7: Simplificar `page.tsx` (sin cita del hero ni docente destacada)**

En `webApp/src/app/page.tsx`:
1. Imports: cambiar `import Hero, { type HeroQuote } from "@/components/landing/Hero";` por `import Hero from "@/components/landing/Hero";`; borrar `import { LANDING } from "@/content/landing";`; en la línea de `guias` dejar `import { getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";`.
2. En el cuerpo, reemplazar desde `const [{ stats, ... }, courses, guias, maestra] = await Promise.all([` hasta el cálculo de `quote` (incluido) por:

```tsx
  const [{ stats, disciplines, testimonials }, courses, guias] = await Promise.all([
    getLandingData(),
    getPublishedCourses(),
    getPublicTeachers(),
  ]);

  // Destacados primero; si la escuela marcó menos de tres, se completa con el resto del catálogo.
  const featured = [...courses.filter((c) => c.featured), ...courses.filter((c) => !c.featured)].slice(0, 3);
  const guiasVisibles = guias.slice(0, 3);
  const [covers, avatars] = await Promise.all([signCatalogCovers(featured), signTeacherAvatars(guiasVisibles)]);
```

3. Dejar `const claim = freeClassClaim(...)` como está (se quita en la Tarea 5) y cambiar `<Hero quote={quote} />` por `<Hero />`.

- [ ] **Step 8: Verificar**

Run: `cd webApp && npx vitest run src/content src/components/landing src/app/page.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS. (`Empezar` sigue compilando porque `LANDING.empezar` no cambió.)

- [ ] **Step 9: Commit**

```bash
git add webApp/src/content webApp/src/components/landing webApp/src/app/page.tsx webApp/src/app/page.test.ts
git commit -m "feat(textos): hero cósmico y «Nuestra mirada» con los textos de la dueña" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Portada, parte 2 · programa, calendario lunar, docentes y cifras

**Files:**
- Modify: `webApp/src/content/landing.ts` (`empezar`, nuevo `lunar`, `COURSE_FAQ`)
- Modify: `webApp/src/content/landing.test.ts` (agrega casos)
- Modify: `webApp/src/components/landing/Empezar.tsx` (reescritura completa)
- Create: `webApp/src/components/landing/Empezar.test.tsx`
- Modify: `webApp/src/components/landing/LunarCalendar.tsx` (reescritura completa)
- Create: `webApp/src/components/landing/LunarCalendar.test.tsx`
- Modify: `webApp/src/components/landing/Cifras.tsx`
- Modify: `webApp/src/components/landing/FeaturedCourses.tsx:35`
- Modify: `webApp/src/lib/landing.ts:24`, `webApp/src/lib/landing.test.ts`, `webApp/src/lib/server/landing.test.ts:55`
- Modify: `webApp/src/app/page.tsx` (orden y `Empezar` sin props)

**Interfaces:**
- Consumes: `LANDING`, clases cósmicas.
- Produces:
  - `LANDING.empezar: { title; lead; pasos: readonly { n: string; title: string; detail: string }[]; cta }` (se eliminan `lead.todos/prudente/ninguno`, `titleSinClase`, `pasosSinClase`)
  - `LANDING.lunar: { title: string; lead: string }`
  - `Empezar()` sin props; `LunarCalendar({ days: LunarDay[] })` igual que antes.
  - `buildHeroStats` rotula `Docente` / `Docentes`.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `webApp/src/content/landing.test.ts` (antes del último `});` no: como `describe` nuevos al final del archivo, e importar `COURSE_FAQ`):

```ts
import { COURSE_FAQ } from "./landing";

describe("LANDING · programa (pantalla 3)", () => {
  it("título, bajada y los tres pasos", () => {
    expect(LANDING.empezar.title).toBe("Explorá cada propuesta y elegí tu camino de aprendizaje.");
    expect(LANDING.empezar.lead).toBe(
      "Cada formación tiene su propio recorrido. Conocé los contenidos, explorá los módulos y descubrí qué herramientas y conocimientos vas a incorporar en cada propuesta.",
    );
    expect(LANDING.empezar.pasos).toEqual([
      { n: "01", title: "Elegí tu formación", detail: "Explorá las propuestas y conocé sus contenidos, objetivos y modalidades." },
      { n: "02", title: "Conocé cómo vas a aprender", detail: "Cada curso detalla su modalidad, materiales, clases y recursos disponibles." },
      { n: "03", title: "Comenzá tu recorrido", detail: "Inscribite y accedé a los contenidos de tu formación." },
    ]);
    expect(LANDING.empezar.cta).toBe("Elegir un curso");
  });

  it("el calendario lunar conserva su título", () => {
    expect(LANDING.lunar.title).toBe("Calendario lunar");
  });
});

describe("el texto de la portada y la ficha no promete acceso ilimitado ni certificado general", () => {
  const BANNED = /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado|queda tu certificado|certificado con tu nombre|no vence/i;
  it("LANDING y COURSE_FAQ", () => {
    expect(JSON.stringify(LANDING)).not.toMatch(BANNED);
    expect(JSON.stringify(COURSE_FAQ)).not.toMatch(BANNED);
  });
});
```

`webApp/src/components/landing/Empezar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Empezar from "./Empezar";

describe("portada · programa", () => {
  const html = renderToStaticMarkup(<Empezar />);

  it("trae título, bajada y los tres pasos numerados de la dueña", () => {
    expect(html).toContain("Explorá cada propuesta y elegí tu camino de aprendizaje.");
    expect(html).toContain("Cada formación tiene su propio recorrido.");
    for (const t of ["01", "Elegí tu formación", "02", "Conocé cómo vas a aprender", "03", "Comenzá tu recorrido"]) {
      expect(html).toContain(t);
    }
  });

  it("conserva el botón «Elegir un curso» hacia el catálogo y es el destino del ancla #empezar", () => {
    expect(html).toContain('id="empezar"');
    expect(html).toMatch(/href="\/cursos"[^>]*>Elegir un curso/);
  });

  it("ya no promete clase gratuita, certificado ni vencimiento", () => {
    expect(html).not.toMatch(/clase gratuita|certificado|vencimiento/i);
  });
});
```

`webApp/src/components/landing/LunarCalendar.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { LunarDay } from "@/lib/lunar";
import LunarCalendar from "./LunarCalendar";

const days: LunarDay[] = [
  { date: new Date("2026-11-24T12:00:00Z"), phase: "full", waxing: false, age: 14.8, today: true },
  { date: new Date("2026-11-28T12:00:00Z"), phase: "half", waxing: false, age: 18.5, today: false },
];

describe("portada · calendario lunar cósmico", () => {
  const html = renderToStaticMarkup(<LunarCalendar days={days} />);

  it("es una superficie cósmica con su título", () => {
    expect(html).toContain("cosmico");
    expect(html).toContain("Calendario lunar");
    expect(html).not.toContain("bg-papel");
  });

  it("las fases van en blanco y sólo la de hoy en oro, con su etiqueta «Hoy»", () => {
    expect(html.match(/fill-oro/g)).toHaveLength(1);
    expect(html).toContain("fill-papel");
    expect(html).toContain("Hoy");
    expect(html).toMatch(/class="[^"]*text-oro[^"]*">Hoy</);
  });

  it("conserva etiquetas de fase y la aclaración de que no son fechas de clase", () => {
    expect(html).toContain("Luna llena");
    expect(html).toContain("Cuarto menguante");
    expect(html).toContain("No son fechas de clase.");
  });
});
```

En `webApp/src/lib/landing.test.ts` y `webApp/src/lib/server/landing.test.ts` reemplazar las etiquetas `"Guías"` por `"Docentes"` y `"Guía"` por `"Docente"` (líneas 8, 14, 19 del primero; 55 del segundo). En el título del `it` de `server/landing.test.ts:51` cambiar «guías» por «docentes».

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/content/landing.test.ts src/components/landing src/lib/landing.test.ts src/lib/server/landing.test.ts`
Expected: FAIL (`LANDING.empezar.pasos[0].n` indefinido, `Empezar` pide props, `LANDING.lunar` inexistente, etiquetas `Guías`).

- [ ] **Step 3: Cambiar `landing.ts` (programa, lunar, FAQ)**

En `interface LandingContent`, reemplazar el bloque `empezar` y agregar `lunar`:

```ts
  lunar: { title: string; lead: string };
  empezar: {
    title: string;
    lead: string;
    pasos: readonly { n: string; title: string; detail: string }[];
    cta: string;
  };
```

En `LANDING`, reemplazar el bloque `empezar` completo por:

```ts
  lunar: {
    title: "Calendario lunar",
    // Texto derivado: la dueña pidió conservar la sección sin cambiar su lógica.
    lead: "Las próximas fases de la luna, para acompañar la práctica. No son fechas de clase.",
  },
  empezar: {
    title: "Explorá cada propuesta y elegí tu camino de aprendizaje.",
    lead: "Cada formación tiene su propio recorrido. Conocé los contenidos, explorá los módulos y descubrí qué herramientas y conocimientos vas a incorporar en cada propuesta.",
    pasos: [
      { n: "01", title: "Elegí tu formación", detail: "Explorá las propuestas y conocé sus contenidos, objetivos y modalidades." },
      { n: "02", title: "Conocé cómo vas a aprender", detail: "Cada curso detalla su modalidad, materiales, clases y recursos disponibles." },
      { n: "03", title: "Comenzá tu recorrido", detail: "Inscribite y accedé a los contenidos de tu formación." },
    ],
    cta: "Elegir un curso",
  },
```

En `COURSE_FAQ`, reemplazar la primera y la tercera respuesta (texto derivado: el documento pide no fijar acceso ilimitado ni certificado como regla general):

```ts
  {
    q: "¿Cuánto tiempo tengo para ver el curso?",
    a: "Depende de cada formación: en su ficha están la modalidad y las condiciones de acceso. Cuando la escuela habilita tu inscripción, el curso queda en tu panel y tu avance se guarda solo.",
  },
```

```ts
  {
    q: "¿El certificado tiene validez oficial?",
    a: "No. Cuando una formación ofrece certificado, acredita que recorriste el curso completo, no que rendiste una evaluación. Lleva tu nombre, la fecha y un código que cualquiera puede verificar.",
  },
```

- [ ] **Step 4: Reescribir `Empezar.tsx`**

`webApp/src/components/landing/Empezar.tsx`:

```tsx
import { ButtonLink } from "@/components/atoms/Button";
import LeafIllustration from "@/components/atoms/LeafIllustration";
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";

/** «Explorá cada propuesta» (pantalla 3 del documento de la dueña): título, bajada y tres pasos.
 *  Ya no depende de si los cursos tienen clase gratuita: no se promete nada de acceso. */
export default function Empezar() {
  const e = LANDING.empezar;
  return (
    <section id="empezar" aria-labelledby="empezar-titulo" className="scroll-mt-20 py-[100px] md:py-[120px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal className="relative grid items-center gap-10 overflow-hidden rounded-[24px] bg-salvia-100 px-6 py-14 md:px-16 lg:grid-cols-[1.2fr_0.8fr]">
          <LeafIllustration className="absolute -bottom-9 -right-6 opacity-35" />
          <div className="relative">
            <h2 id="empezar-titulo" className="mb-3.5 max-w-[20ch] text-[clamp(28px,3.6vw,42px)]">
              {e.title}
            </h2>
            <p className="max-w-[48ch] text-suave">{e.lead}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/cursos" arrow>
                {e.cta}
              </ButtonLink>
            </div>
          </div>
          <ol className="relative grid gap-3.5">
            {e.pasos.map((p) => (
              <li key={p.n} className="grid grid-cols-[44px_1fr] items-start gap-3.5 text-[15px] leading-normal text-tinta">
                <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-papel text-sm font-bold text-bosque">
                  {p.n}
                </span>
                <span>
                  <b className="block text-bosque">{p.title}</b>
                  {p.detail}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
```

Ojo: el número queda `aria-hidden` y la lista es `<ol>`: el orden lo da la semántica; el test lo busca en el HTML igual.

- [ ] **Step 5: Reescribir `LunarCalendar.tsx`**

`webApp/src/components/landing/LunarCalendar.tsx`:

```tsx
import Reveal from "@/components/layout/Reveal";
import { LANDING } from "@/content/landing";
import { cn } from "@/lib/utils/cn";
import { phaseLabel, type LunarDay, type LunarPhaseName } from "@/lib/lunar";

const LIT: Record<LunarPhaseName, number> = { new: 0, crescent: 0.25, half: 0.5, gibbous: 0.75, full: 1 };

const fecha = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

/** Fase en línea (ADR-015: SVG, no glifos). La parte iluminada es un semicírculo más el arco del
 *  terminador, una elipse de ancho |1 - 2k| con k = fracción iluminada. Cósmica: disco `indigo`,
 *  fase en `papel` y la de hoy en `oro`. */
function Moon({ phase, waxing, today }: { phase: LunarPhaseName; waxing: boolean; today: boolean }) {
  const k = LIT[phase];
  const rx = Math.abs(1 - 2 * k) * 20;
  // Creciente: iluminado a la derecha; menguante, a la izquierda. El terminador se curva hacia el
  // lado iluminado mientras k < 1/2 y hacia el oscuro después.
  const outer = waxing ? 1 : 0;
  const inner = (k < 0.5) === waxing ? 0 : 1;
  const lit = today ? "fill-oro" : "fill-papel";
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true" focusable="false">
      <circle cx={24} cy={24} r={20} className="fill-indigo" />
      {k === 1 ? (
        <circle cx={24} cy={24} r={20} className={lit} />
      ) : k > 0 ? (
        <path d={`M24 4A20 20 0 0 ${outer} 24 44A${rx} 20 0 0 ${inner} 24 4Z`} className={lit} />
      ) : null}
      <circle cx={24} cy={24} r={20} fill="none" strokeWidth={1.5} className={today ? "stroke-oro" : "stroke-papel"} />
    </svg>
  );
}

/** Calendario lunar de la portada (T-053), ahora una banda cósmica `noche`. Es un mapa del cielo
 *  para la práctica, no un calendario de clases: los cursos no tienen fechas (ADR-004). */
export default function LunarCalendar({ days }: { days: LunarDay[] }) {
  return (
    <section aria-labelledby="luna-titulo" className="cosmico py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <Reveal>
          <h2 id="luna-titulo" className="mb-3 text-[clamp(26px,3vw,36px)]">{LANDING.lunar.title}</h2>
          <p className="mb-10 max-w-[52ch]">{LANDING.lunar.lead}</p>
          <ol className="grid grid-cols-4 gap-x-4 gap-y-8 md:grid-cols-8">
            {days.map((d) => (
              <li key={d.date.toISOString()} className="flex flex-col items-center gap-2 text-center">
                <Moon phase={d.phase} waxing={d.waxing} today={d.today} />
                <span className={cn("text-sm font-semibold", d.today && "text-oro")}>
                  {d.today ? "Hoy" : fecha.format(d.date).replace(".", "")}
                </span>
                <span className="text-[13px] leading-tight">{phaseLabel(d.phase, d.waxing)}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
```

El test busca `class="…text-oro…">Hoy<`: `cn` emite `text-sm font-semibold text-oro`, así que coincide.

- [ ] **Step 6: Renombrar «oficios» y «Guías» del resto de la portada**

`webApp/src/components/landing/Cifras.tsx`: cambiar el comentario y la variable.

```tsx
/** Cifra B4 con datos reales: cuántos cursos y de qué disciplinas, y la fila de conteos de la base. */
```
y en el cuerpo `const oficios = disciplines.map(...)` → `const disciplinas = disciplines.map((d) => d.label.toLocaleLowerCase("es"));` con los tres usos (`oficios.length`, `joinSpanish(oficios)`, `oficios.map(...)`) renombrados a `disciplinas`.

`webApp/src/components/landing/FeaturedCourses.tsx`: `aria-label="Cursos por oficio"` → `aria-label="Cursos por disciplina"`.

`webApp/src/lib/landing.ts`: `label: teachers === 1 ? "Guía" : "Guías"` → `label: teachers === 1 ? "Docente" : "Docentes"`.

- [ ] **Step 7: Reordenar la portada**

En `webApp/src/app/page.tsx`: borrar `import { freeClassClaim } from "@/lib/catalog/free-class";` y la línea `const claim = freeClassClaim(...)`, y dejar `<main>` así (el calendario va pegado al programa, que es la «pantalla 3» del documento):

```tsx
      <main id="contenido">
        <Hero />
        <Manifiesto />
        <FeaturedCourses courses={featured} covers={covers} total={courses.length} disciplines={disciplines} />
        <Cifras stats={stats} disciplines={disciplines} />
        <GuiasSection guias={guiasVisibles} total={guias.length} avatars={avatars} />
        <Testimonios items={testimonials} />
        <LunarCalendar days={lunarDays(new Date())} />
        <Empezar />
      </main>
```

- [ ] **Step 8: Verificar**

Run: `cd webApp && npx vitest run src/content src/components/landing src/lib/landing.test.ts src/lib/server/landing.test.ts src/lib/catalog src/app/page.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS. (`freeClassClaim` queda sin uso en código de producción pero con su test; `firstPreviewLesson` sigue en uso por la ficha. No borrarlo acá.)

- [ ] **Step 9: Commit**

```bash
git add webApp/src
git commit -m "feat(textos): programa, calendario lunar cósmico y Nuestros docentes en la portada" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Menú «Docentes» y footer

**Files:**
- Modify: `webApp/src/lib/ui/nav-links.ts:10`
- Modify: `webApp/src/lib/ui/nav-links.test.ts`
- Modify: `webApp/src/components/layout/SiteFooter.tsx` (reescritura completa)
- Create: `webApp/src/components/layout/SiteFooter.test.tsx`

**Interfaces:**
- Consumes: `DOCENTES.navLabel` (Tarea 4).
- Produces: `headerLinks` con la etiqueta «Docentes» (href `/guias`); `SiteFooter` sin la frase de vencimiento.

- [ ] **Step 1: Escribir los tests que fallan**

En `webApp/src/lib/ui/nav-links.test.ts`, agregar dentro del `describe`:

```ts
  it("la ruta /guias se rotula «Docentes» en el menú", () => {
    const labels = headerLinks(null).map((l) => l.label);
    expect(labels).toEqual(["Cursos", "Docentes", "Diario", "Tarot"]);
  });
```

`webApp/src/components/layout/SiteFooter.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./BackToTop", () => ({ default: () => null }));
vi.mock("./WhatsAppFloat", () => ({ default: () => null }));

import SiteFooter from "./SiteFooter";

describe("footer (pantalla 4)", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  it("primera columna con el texto nuevo", () => {
    expect(html).toContain(
      "Un espacio de aprendizaje, autoconocimiento y transformación. Astrología, tarot, constelaciones familiares, magia, gemoterapia y el universo de los símbolos.",
    );
  });

  it("«Guías» pasa a «Docentes» y la ruta no cambia; el resto de las columnas se conserva", () => {
    expect(html).toMatch(/href="\/guias"[^>]*>Docentes</);
    for (const l of ["Cursos", "Diario", "Círculo", "Entrar", "Mi panel", "Mi perfil"]) expect(html).toContain(`>${l}<`);
    expect(html).not.toContain(">Guías<");
  });

  it("columna de certificados con el texto condicional", () => {
    expect(html).toContain(
      "Al finalizar determinadas formaciones, podrás acceder a tu certificado de participación o aprobación, según las condiciones de cada curso.",
    );
  });

  it("conserva el copyright y retira la frase de cursos sin vencimiento", () => {
    expect(html).toMatch(/© \d{4} Humano Despierto/);
    expect(html).not.toMatch(/sin vencimiento|primer día|oficios|herbolaria|reiki/i);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/lib/ui/nav-links.test.ts src/components/layout/SiteFooter.test.tsx`
Expected: FAIL (etiqueta «Guías», texto viejo del footer).

- [ ] **Step 3: Implementar**

En `webApp/src/lib/ui/nav-links.ts`:

```ts
import type { AppRole } from "@/lib/stores/useAuthStore";
import { DOCENTES } from "@/content/site-copy";
```
y `{ label: "Guías", href: "/guias" },` → `{ label: DOCENTES.navLabel, href: "/guias" },`.

`webApp/src/components/layout/SiteFooter.tsx` (completo):

```tsx
import Link from "next/link";
import { DOCENTES } from "@/content/site-copy";
import BackToTop from "./BackToTop";
import WhatsAppFloat from "./WhatsAppFloat";

// C-02 · Sólo destinos que existen. Un link que no lleva a ningún lado le enseña a la usuaria
// que la interfaz miente: redes y contacto vuelven cuando exista la cuenta detrás.
const COLS = [
  {
    title: "Escuela",
    links: [
      { label: "Cursos", href: "/cursos" },
      { label: DOCENTES.navLabel, href: "/guias" },
      { label: "Diario", href: "/diario" },
      { label: "Círculo", href: "/circulo" },
    ],
  },
  {
    title: "Vos",
    links: [
      { label: "Entrar", href: "/entrar" },
      { label: "Mi panel", href: "/panel" },
      { label: "Mi perfil", href: "/panel/perfil" },
    ],
  },
] as const;

export default function SiteFooter() {
  return (
    <>
      <footer className="bg-bosque px-6 pb-9 pt-[72px] text-[15px] text-white/80">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1">
              <h2 className="mb-3.5 text-base font-semibold text-white">Humano Despierto</h2>
              <p className="max-w-[34ch]">
                Un espacio de aprendizaje, autoconocimiento y transformación. Astrología, tarot, constelaciones
                familiares, magia, gemoterapia y el universo de los símbolos.
              </p>
            </div>
            {COLS.map((col) => (
              <div key={col.title}>
                <h2 className="mb-3.5 text-base font-semibold text-white">{col.title}</h2>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h2 className="mb-3.5 text-base font-semibold text-white">Certificados</h2>
              <p>
                Al finalizar determinadas formaciones, podrás acceder a tu certificado de participación o
                aprobación, según las condiciones de cada curso.
              </p>
            </div>
          </div>
          <div className="border-t border-white/15 pt-6 text-[13px]">
            <span>© {new Date().getFullYear()} Humano Despierto</span>
          </div>
        </div>
      </footer>
      <WhatsAppFloat />
      <BackToTop />
    </>
  );
}
```

Atención: JSX con salto de línea dentro de un `<p>` colapsa el espacio entre líneas a un solo espacio, así que el test que busca el string completo pasa.

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run src/lib/ui/nav-links.test.ts src/components/layout && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webApp/src/lib/ui webApp/src/components/layout
git commit -m "feat(textos): menú «Docentes» y footer nuevo sin promesa de vencimiento" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: «Nuestros docentes» (`/guias`)

**Files:**
- Modify: `webApp/vitest.config.mts` (include)
- Modify: `webApp/src/app/(marketing)/guias/page.tsx` (reescritura completa)
- Create: `webApp/src/app/(marketing)/guias/page.test.tsx`
- Modify: `webApp/src/app/(marketing)/guias/[slug]/page.tsx:18,46`

**Interfaces:**
- Consumes: `DOCENTES` (Tarea 4).
- Produces: `/guias` sin mensaje de ausencia cuando no hay docentes; `metadata.title = "Docentes"`.
- **No incluye** la tarjeta grande de la creadora ni nada de `is_founder` (bloque B).

- [ ] **Step 1: Escribir el test que falla**

En `webApp/vitest.config.mts`, agregar `"src/app/**/page.test.tsx"` a `include`:

```ts
    include: ["src/lib/**/*.test.ts", "src/content/**/*.test.ts", "src/app/**/*actions.test.ts", "src/app/**/route.test.ts", "src/app/**/layout.test.ts", "src/app/**/page.test.tsx", "src/app/sitemap.test.ts", "src/app/page.test.ts", "src/components/**/*.test.tsx"],
```

`webApp/src/app/(marketing)/guias/page.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getPublicTeachers } = vi.hoisted(() => ({ getPublicTeachers: vi.fn(async () => []) }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers, signTeacherAvatars: vi.fn(async () => new Map()) }));

import GuiasPage, { metadata } from "./page";

describe("Nuestros docentes (pantalla 6)", () => {
  it("título y bajada de la dueña; el <title> dice «Docentes»", async () => {
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).toContain("Nuestros docentes");
    expect(html).toContain("Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje.");
    expect(metadata.title).toBe("Docentes");
  });

  it("sin docentes publicados no muestra mensaje de ausencia: sólo el encabezado", async () => {
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).not.toMatch(/Todavía no hay|no hay docentes|no hay guías/i);
    expect(html).not.toContain("<ul");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run "src/app/(marketing)/guias/page.test.tsx"`
Expected: FAIL (título «Las guías», mensaje «Todavía no hay guías…»).

- [ ] **Step 3: Implementar**

`webApp/src/app/(marketing)/guias/page.tsx`:

```tsx
import type { Metadata } from "next";
import GuiaCard from "@/components/molecules/GuiaCard";
import PageIntro from "@/components/layout/PageIntro";
import { DOCENTES } from "@/content/site-copy";
import { getPublicTeachers, signTeacherAvatars } from "@/lib/server/guias";

export const metadata: Metadata = {
  title: DOCENTES.metaTitle,
  description: DOCENTES.metaDescription,
};

export default async function GuiasPage() {
  const guias = await getPublicTeachers();
  const avatars = await signTeacherAvatars(guias);

  return (
    <div className="min-h-screen bg-fondo">
      <PageIntro title={DOCENTES.title} lead={DOCENTES.lead} />
      {guias.length > 0 && (
        <div className="mx-auto max-w-[1200px] px-6 pb-24">
          <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {guias.map((guia) => (
              <GuiaCard key={guia.slug} {...guia} avatarUrl={guia.avatarPath ? avatars.get(guia.avatarPath) : null} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

En `webApp/src/app/(marketing)/guias/[slug]/page.tsx`: agregar `import { DOCENTES } from "@/content/site-copy";`; línea 18 `{ title: "Guía no encontrada" }` → `{ title: "Docente no encontrado" }`; línea 46 `Todas las guías` → `{DOCENTES.volver}`.

En `webApp/src/components/molecules/GuiaCard.tsx:5` el comentario dice «oficio»: cambiar «nombre, oficio y una línea» por «nombre, disciplina y una línea».

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run "src/app/(marketing)/guias" && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add webApp/vitest.config.mts "webApp/src/app/(marketing)/guias" webApp/src/components/molecules/GuiaCard.tsx
git commit -m "feat(textos): «Nuestros docentes» en /guias, sin mensaje de ausencia" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Catálogo · textos y búsqueda por disciplina

**Files:**
- Modify: `webApp/src/app/(marketing)/cursos/catalog-filters.ts:89-95` (`matchesSearch`)
- Create: `webApp/src/lib/catalog/catalog-search.test.ts`
- Modify: `webApp/src/app/(marketing)/cursos/page.tsx` (metadata, `PageIntro`, placeholder, vacío, `aria-label`)

**Interfaces:**
- Consumes: `CATALOGO` (Tarea 4).
- Produces: la búsqueda `?q=` también compara la disciplina, sin tildes ni mayúsculas.
- **No incluye** el filtro de las 7 disciplinas ni la leyenda de categoría vacía (bloque B).

- [ ] **Step 1: Escribir el test que falla**

`webApp/src/lib/catalog/catalog-search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  filterCourses,
  parseCatalogFilterState,
  type AnnotatedCourse,
} from "@/app/(marketing)/cursos/catalog-filters";

const course = (over: Partial<AnnotatedCourse>) =>
  ({ slug: "x", title: "Título", subtitle: null, desc: null, discipline: "", ...over }) as unknown as AnnotatedCourse;

const search = (q: string, list: AnnotatedCourse[]) =>
  filterCourses(list, parseCatalogFilterState({ q })).map((c) => c.slug);

describe("búsqueda del catálogo (pantalla 5)", () => {
  const tarot = course({ slug: "tarot", title: "Arcanos menores", discipline: "Tarot" });
  const astro = course({ slug: "astro", title: "Carta natal", discipline: "Astrología" });
  const lista = [tarot, astro];

  it("encuentra por nombre (como antes)", () => {
    expect(search("carta natal", lista)).toEqual(["astro"]);
  });

  it("encuentra por disciplina aunque el título no la nombre", () => {
    expect(search("tarot", lista)).toEqual(["tarot"]);
  });

  it("ignora tildes y mayúsculas al buscar la disciplina", () => {
    expect(search("ASTROLOGIA", lista)).toEqual(["astro"]);
    expect(search("astrología", lista)).toEqual(["astro"]);
  });

  it("encuentra por descripción y sin texto devuelve todo", () => {
    const conDesc = course({ slug: "d", desc: "Aprendé la lectura de símbolos" });
    expect(search("símbolos", [conDesc, tarot])).toEqual(["d"]);
    expect(search("", lista)).toEqual(["tarot", "astro"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run src/lib/catalog/catalog-search.test.ts`
Expected: FAIL en «por disciplina» (el título «Arcanos menores» no contiene «tarot») y en tildes.

- [ ] **Step 3: Implementar la búsqueda**

En `webApp/src/app/(marketing)/cursos/catalog-filters.ts`, reemplazar `matchesSearch`:

```ts
// Sin tildes ni mayúsculas: «astrologia» tiene que encontrar «Astrología».
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function matchesSearch(course: AnnotatedCourse, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return [course.title, course.subtitle, course.desc, course.discipline].some((field) =>
    fold(field ?? "").includes(q)
  );
}
```

- [ ] **Step 4: Cambiar los textos de la página**

En `webApp/src/app/(marketing)/cursos/page.tsx`:
1. Agregar `import { CATALOGO } from "@/content/site-copy";`.
2. `metadata`: `description: CATALOGO.metaDescription,` (el `title: "Cursos"` queda).
3. `PageIntro`: reemplazar el `title`/`lead` por `title={CATALOGO.title} lead={CATALOGO.lead}`.
4. Input de búsqueda: `placeholder="Buscar por tema, por ejemplo «carta natal»"` → `placeholder={CATALOGO.searchPlaceholder}`.
5. Estado vacío: el `<p className="max-w-sm text-suave">…Ningún curso coincide…</p>` pasa a `<p className="max-w-sm text-suave">{CATALOGO.empty}</p>`. El botón «Limpiar filtros» se conserva.
6. `aria-label="Filtrar por oficio"` → `aria-label="Filtrar por disciplina"`.

- [ ] **Step 5: Verificar**

Run: `cd webApp && npx vitest run src/lib/catalog && npx tsc --noEmit && npm run lint`
Expected: PASS. Confirmar que no quedan referencias: `grep -n "oficio\|Ningún curso\|Buscar por tema" "src/app/(marketing)/cursos/page.tsx"` sin salida.

- [ ] **Step 6: Commit**

```bash
git add "webApp/src/app/(marketing)/cursos" webApp/src/lib/catalog/catalog-search.test.ts
git commit -m "feat(textos): bajada, buscador y estado vacío del catálogo; la búsqueda incluye la disciplina" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Diario · textos

**Files:**
- Modify: `webApp/src/app/(marketing)/diario/page.tsx`
- Create: `webApp/src/app/(marketing)/diario/page.test.tsx`

**Interfaces:**
- Consumes: `DIARIO` (Tarea 4).
- **No incluye** categorías, portadas ni filtro (bloque B).

- [ ] **Step 1: Escribir el test que falla**

`webApp/src/app/(marketing)/diario/page.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getPublishedPosts } = vi.hoisted(() => ({ getPublishedPosts: vi.fn(async () => []) }));
vi.mock("@/lib/server/diario", () => ({ getPublishedPosts }));

import DiarioPage, { metadata } from "./page";

describe("Diario (pantalla 7)", () => {
  it("bajada de la dueña y metadata acorde", async () => {
    const html = renderToStaticMarkup(await DiarioPage());
    expect(html).toContain("Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos");
    expect(metadata.description).toContain("profundizar en los misterios del universo");
  });

  it("sin publicaciones muestra el mensaje de la dueña, entero y sin el texto viejo", async () => {
    const html = renderToStaticMarkup(await DiarioPage());
    expect(html).toContain(
      "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
    );
    expect(html).not.toMatch(/Todavía no hay escritos|Las guías están escribiendo|entre clase y clase/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run "src/app/(marketing)/diario/page.test.tsx"`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En `webApp/src/app/(marketing)/diario/page.tsx`:
1. `import { DIARIO } from "@/content/site-copy";`
2. `metadata`: `title: DIARIO.title, description: DIARIO.metaDescription,`
3. `PageIntro`: `title={DIARIO.title} lead={DIARIO.lead}`
4. Estado vacío (reemplaza el `<div className="rounded-lg bg-salvia-100 p-10">…</div>`):

```tsx
          // Estado vacío digno, no roto (criterio 5): el mensaje es el de la dueña, sin título aparte.
          <div className="rounded-lg bg-salvia-100 p-10">
            <p className="max-w-[60ch] text-lg text-bosque">{DIARIO.empty}</p>
          </div>
```

El comentario `// Criterio 5: estado vacío digno, no roto.` previo se reemplaza por el de arriba (queda un solo comentario).

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run "src/app/(marketing)/diario" && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "webApp/src/app/(marketing)/diario"
git commit -m "feat(textos): bajada y mensaje vacío del Diario con los textos de la dueña" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Tarot · textos, cabecera cósmica y CTA final

**Files:**
- Modify: `webApp/src/app/(marketing)/tarot/page.tsx` (reescritura completa)
- Create: `webApp/src/app/(marketing)/tarot/page.test.tsx`

**Interfaces:**
- Consumes: `BRAND.heroGalaxia`, `BRAND.tarotArcanos` (Tarea 2), clases cósmicas (Tarea 3), `ButtonLink`.
- Produces: `/tarot` con cabecera `.cosmico`, texto educativo nuevo y un bloque final cósmico cuyo botón lleva a `/cursos?disciplina=tarot`.

- [ ] **Step 1: Escribir el test que falla**

`webApp/src/app/(marketing)/tarot/page.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TarotPage from "./page";

describe("Tarot (pantalla 8)", () => {
  const html = renderToStaticMarkup(<TarotPage />);

  it("título y subtítulo nuevos, en una cabecera cósmica con un solo h1", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain("El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.");
    expect(html).toContain(
      "Explorá el universo de los 78 arcanos del Tarot Rider-Waite. Elegí una tirada, descubrí sus símbolos y encontrá nuevas perspectivas a través de la lectura de las cartas.",
    );
    expect(html).toContain("cosmico");
    expect(html).toContain("hero-galaxia");
  });

  it("«Qué es el tarot y cómo leerlo»: título conservado y texto nuevo", () => {
    expect(html).toContain("Qué es el tarot y cómo leerlo");
    expect(html).toContain("El Tarot es un lenguaje de imágenes, símbolos y arquetipos que nos invita a explorar distintas dimensiones de la experiencia humana.");
    expect(html).toContain("Sus 78 arcanos conforman un universo simbólico que puede ayudarnos a reflexionar sobre situaciones, procesos, desafíos y posibilidades.");
    expect(html).toContain("Leer el Tarot implica aprender a observar, relacionar e interpretar.");
    expect(html).not.toContain("Italia del siglo XV");
  });

  it("conserva «Cómo leer esto», las cuatro tiradas y el enlace a las 78 cartas", () => {
    expect(html).toContain("Cómo leer esto");
    expect(html).toContain("No reemplaza a una profesional");
    expect(html).toContain("Ver las 78 cartas y sus significados");
    expect(html.match(/>Tirar</g)).toHaveLength(4);
  });

  it("bloque final: título, texto y botón hacia el catálogo filtrado por Tarot", () => {
    expect(html).toContain("¿Querés profundizar en el lenguaje del Tarot?");
    expect(html).toContain("Descubrí nuestras formaciones y aprendé a interpretar los arcanos, sus símbolos y sus múltiples relaciones.");
    expect(html).toMatch(/href="\/cursos\?disciplina=tarot"[^>]*>Conocé nuestros cursos de Tarot/);
    expect(html).toMatch(/alt="Cuatro cartas de tarot/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd webApp && npx vitest run "src/app/(marketing)/tarot/page.test.tsx"`
Expected: FAIL.

- [ ] **Step 3: Reescribir la página**

`webApp/src/app/(marketing)/tarot/page.tsx`:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SectionHeading from "@/components/atoms/SectionHeading";
import { ButtonLink } from "@/components/atoms/Button";
import EthicsNote from "@/components/tarot/EthicsNote";
import { BRAND } from "@/content/brand-images";
import { SITE_OG_IMAGE } from "@/lib/og/site";
import { SPREADS } from "@/lib/tarot/spreads";

export const metadata: Metadata = {
  title: "Tarot online gratis: tiradas con el Rider-Waite",
  description: "Tirá las cartas online con las 78 del tarot Rider-Waite: carta del día, sí o no, pasado-presente-futuro y cruz celta, con una lectura que relaciona las cartas entre sí.",
  alternates: { canonical: "/tarot" },
  openGraph: { title: "Tarot online gratis", description: "Tiradas con las 78 cartas del Rider-Waite y una lectura que las relaciona.", url: "/tarot", type: "website", images: [SITE_OG_IMAGE] },
};

export default function TarotPage() {
  return (
    <div className="min-h-screen bg-fondo text-tinta">
      {/* Cabecera cósmica: imagen de la dueña bajo un velo `noche`; el texto es `papel`, nunca `oro`. */}
      <header className="cosmico relative overflow-hidden">
        <Image src={BRAND.heroGalaxia.src} alt="" fill preload sizes="100vw" className="object-cover object-center" />
        <div aria-hidden="true" className="cosmico-velo absolute inset-0" />
        <div className="relative mx-auto max-w-[1200px] px-6 pb-14 pt-12 md:pb-20 md:pt-16">
          <p className="text-sm font-semibold">Tarot online</p>
          <h1 className="mt-3 max-w-[22ch] text-display-lg leading-[1.08] tracking-[-0.025em]">
            El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg">
            Explorá el universo de los 78 arcanos del Tarot Rider-Waite. Elegí una tirada, descubrí sus símbolos y encontrá nuevas perspectivas a través de la lectura de las cartas.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-12">
        <p className="text-sm font-semibold text-miel-800">Elegí una tirada</p>
        <SectionHeading title="Cuatro formas de preguntar" />
        <ul className="-mt-2 grid gap-5 sm:grid-cols-2">
          {SPREADS.map((s) => (
            <li key={s.slug} className="tarjeta flex flex-col gap-3 p-6">
              <h3 className="text-xl font-bold text-bosque">{s.nombre}</h3>
              <p className="text-suave">{s.descripcion}</p>
              <p className="text-sm text-suave">{s.cartas.join(" o ")} {s.cartas[0] === 1 && s.cartas.length === 1 ? "carta" : "cartas"}</p>
              <div className="mt-auto pt-2">
                <ButtonLink href={`/tarot/${s.slug}`} arrow>Tirar</ButtonLink>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-16 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-miel-800">Antes de tirar</p>
            <SectionHeading title="Qué es el tarot y cómo leerlo" />
            <div className="-mt-4 space-y-4 text-tinta">
              <p>El Tarot es un lenguaje de imágenes, símbolos y arquetipos que nos invita a explorar distintas dimensiones de la experiencia humana.</p>
              <p>Sus 78 arcanos conforman un universo simbólico que puede ayudarnos a reflexionar sobre situaciones, procesos, desafíos y posibilidades.</p>
              <p>Leer el Tarot implica aprender a observar, relacionar e interpretar. Cada carta tiene un significado propio, pero su mensaje también se transforma según las cartas que la acompañan, la posición que ocupa y la pregunta que orienta la lectura.</p>
            </div>
            <Link href="/tarot/cartas" className="mt-6 inline-flex min-h-10 items-center text-sm font-semibold text-miel-800 hover:underline">Ver las 78 cartas y sus significados</Link>
          </div>
          <EthicsNote />
        </section>

        {/* Bloque final cósmico: el texto va sobre `noche` sólido y la imagen al costado, con su alt. */}
        <section aria-labelledby="tarot-cursos-titulo" className="cosmico mt-20 grid overflow-hidden rounded-[24px] md:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start justify-center gap-5 px-6 py-12 md:px-14 md:py-16">
            <h2 id="tarot-cursos-titulo" className="max-w-[18ch] text-[clamp(26px,3vw,38px)]">
              ¿Querés profundizar en el lenguaje del Tarot?
            </h2>
            <p className="max-w-[44ch]">
              Descubrí nuestras formaciones y aprendé a interpretar los arcanos, sus símbolos y sus múltiples relaciones.
            </p>
            <ButtonLink href="/cursos?disciplina=tarot" arrow>Conocé nuestros cursos de Tarot</ButtonLink>
          </div>
          <div className="relative aspect-square md:aspect-auto md:min-h-[360px]">
            <Image
              src={BRAND.tarotArcanos.src}
              alt={BRAND.tarotArcanos.alt}
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
```

El `<title>` y la metadata de Open Graph no cambian (SEO ya indexado; la dueña no los tocó).

- [ ] **Step 4: Verificar**

Run: `cd webApp && npx vitest run "src/app/(marketing)/tarot" && npx tsc --noEmit && npm run lint`
Expected: PASS (el test de `actions.test.ts` de tarot sigue verde).

- [ ] **Step 5: Commit**

```bash
git add "webApp/src/app/(marketing)/tarot/page.tsx" "webApp/src/app/(marketing)/tarot/page.test.tsx"
git commit -m "feat(textos): Tarot con cabecera cósmica, textos de la dueña y bloque final hacia los cursos" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Barrido de términos (metadata, OG, mail, panel) y test de barrido

**Files:**
- Modify: `webApp/src/app/layout.tsx:19`
- Modify: `webApp/src/lib/og/brand.tsx:62`
- Modify: `webApp/src/lib/server/mail/templates/welcome.ts`
- Modify: `webApp/src/lib/server/mail/layout.ts:103,129`
- Create: `webApp/src/lib/server/mail/templates/welcome.test.ts`
- Modify: `webApp/src/lib/enrollment/panel-copy.ts:23`
- Modify: `webApp/src/lib/enrollment/panel-copy.test.ts`
- Modify: `webApp/src/lib/utils/taxonomy.ts` (comentario de las líneas 3-5)
- Create: `webApp/src/content/forbidden-terms.test.ts`

**Interfaces:**
- Produces: ningún archivo de `src/` (salvo tests) contiene los términos prohibidos.

- [ ] **Step 1: Escribir los tests que fallan**

`webApp/src/content/forbidden-terms.test.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

// Barrido de la spec de contenidos (2026-11-08): la dueña no enseña herbolaria ni reiki, no hay
// «oficios» y no se promete acceso ilimitado ni certificado como regla general. Los tests que
// prueban su ausencia quedan fuera: citan los términos a propósito.
const BANNED =
  /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado|queda tu certificado|certificado con tu nombre/i;

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

describe("barrido de términos prohibidos en src/", () => {
  const files = walk(SRC).filter(
    (f) => /\.(ts|tsx|css|md)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.includes(`${sep}test${sep}`),
  );

  it("hay archivos para barrer", () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it("ninguno contiene un término prohibido", () => {
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ f: f.replace(SRC, "src"), line: i + 1, text: line.trim() }))
        .filter((l) => BANNED.test(l.text)),
    );
    expect(hits).toEqual([]);
  });
});
```

`webApp/src/lib/server/mail/templates/welcome.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderWelcomeMail } from "./welcome";

const BANNED = /herbolar|reiki|oficios|sin vencimiento/i;

describe("renderWelcomeMail", () => {
  const { html, text } = renderWelcomeMail({ studentName: "Ana", catalogUrl: "http://localhost:3000/cursos" });

  it("describe el espacio con los textos nuevos, en HTML y en texto plano", () => {
    expect(html).toContain("constelaciones familiares");
    expect(text).toContain("constelaciones familiares");
  });

  it("no menciona herbolaria, reiki ni oficios (cuerpo ni pie)", () => {
    expect(html).not.toMatch(BANNED);
    expect(text).not.toMatch(BANNED);
  });
});
```

En `webApp/src/lib/enrollment/panel-copy.test.ts`, en el test «inscripta: el título lo dice», agregar la línea:

```ts
    expect(copy.lead).not.toMatch(/vencimiento/);
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `cd webApp && npx vitest run src/content/forbidden-terms.test.ts src/lib/server/mail/templates/welcome.test.ts src/lib/enrollment/panel-copy.test.ts`
Expected: FAIL (el barrido lista `layout.tsx`, `og/brand.tsx`, `welcome.ts`, `mail/layout.ts`, `panel-copy.ts`, `taxonomy.ts`; welcome y panel-copy fallan).

- [ ] **Step 3: Corregir cada hallazgo**

- `webApp/src/app/layout.tsx:19`:
  `description: "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",`
- `webApp/src/lib/og/brand.tsx:62` (tagline del OG):
  `Astrología, tarot, constelaciones familiares, magia y autoconocimiento.` (texto derivado; el tamaño 36 px y `maxWidth: 820` alcanzan en dos líneas).
- `webApp/src/lib/server/mail/templates/welcome.ts`: el segundo `<p>` del HTML pasa a

```ts
    <p style="margin:0 0 14px;">
      Tu cuenta ya está lista. Este es un espacio de aprendizaje, autoconocimiento y transformación:
      astrología, tarot, constelaciones familiares, magia, gemoterapia y el universo de los símbolos —
      a tu ritmo, sin fechas fijas ni clases que te esperan a una hora exacta.
    </p>
```
  y las tres líneas del texto plano (`"Tu cuenta ya está lista. Este es un espacio para tarot, …"`) pasan a:

```ts
      "Tu cuenta ya está lista. Este es un espacio de aprendizaje, autoconocimiento y",
      "transformación: astrología, tarot, constelaciones familiares, magia, gemoterapia y el",
      "universo de los símbolos — a tu ritmo, sin fechas fijas ni clases que te esperan a una",
      "hora exacta.",
```
- `webApp/src/lib/server/mail/layout.ts` líneas 103 y 129: `escuela de oficios holísticos` → `espacio de aprendizaje y transformación`.
- `webApp/src/lib/enrollment/panel-copy.ts:23`: `lead: "Tenés el curso completo en tu panel, a tu ritmo y sin vencimiento."` → `lead: "Tenés el curso en tu panel, a tu ritmo."`
- `webApp/src/lib/utils/taxonomy.ts`: en el comentario de las líneas 3-5, reemplazar `("Astrología", "Herbal", "Reiki", "Tarot" / "Inicial", "Intermedio", "Maestría")` por `("Astrología", "Tarot", "Magia" / "Inicial", "Intermedio", "Maestría")`.

- [ ] **Step 4: Correr el barrido hasta que quede vacío**

Run: `cd webApp && npx vitest run src/content/forbidden-terms.test.ts`
Expected: PASS. Si lista otra línea que este plan no previó, **corregir el texto** (no ampliar la lista de exclusiones ni tocar el regex); si es una cita legítima en un archivo de test, ya está excluida por el filtro.

- [ ] **Step 5: Verificar todo y commitear**

Run: `cd webApp && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

```bash
git add webApp/src
git commit -m "feat(textos): barrido de herbolaria, reiki, oficios y promesas de acceso en metadata, OG y mails" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: e2e y axe de portada, calendario y `/tarot`

**Files:**
- Modify: `webApp/package.json`, `webApp/package-lock.json` (devDependency `axe-core`)
- Create: `webApp/e2e/contenidos.spec.ts`

**Interfaces:**
- Consumes: todo lo anterior; fixtures `test`, `expect`, `assertStackUp` de `e2e/fixtures.ts` (el `cspGuard` hace fallar el test ante cualquier violación de CSP).
- Produces: un spec que fija los textos visibles, el CTA de Tarot, el color de «Hoy» y cero violaciones axe de contraste/alt/nombre en portada, `/tarot` y calendario.

- [ ] **Step 1: Declarar `axe-core` como devDependency**

`axe-core@4.11.4` ya está instalado como dependencia transitiva de `eslint-plugin-jsx-a11y`; sólo se declara.
Run: `cd webApp && npm install --save-dev axe-core@4.11.4`
Expected: `package.json` suma `"axe-core": "4.11.4"` en `devDependencies`; el lockfile cambia sólo en esa entrada. (No es una librería de runtime: no llega al bundle.)

- [ ] **Step 2: Escribir el spec**

`webApp/e2e/contenidos.spec.ts`:

```ts
import axe from "axe-core";
import type { Page } from "@playwright/test";
import { expect, test, assertStackUp } from "./fixtures";

type AxeResult = { violations: { id: string; nodes: { target: unknown }[] }[] };
type AxeWindow = { axe: { run: (ctx: unknown, opts: unknown) => Promise<AxeResult> } };

// axe se inyecta por CDP (evaluate), no con <script>: así no cuenta como violación de CSP.
// `reduce` deja visible todo lo que `Reveal` esconde antes de entrar en pantalla.
// Sobre una imagen axe no puede calcular el contraste (lo marca «incomplete»): eso lo cubre la
// aritmética del velo en src/lib/ui/cosmic-tokens.test.ts; acá se vigilan las superficies sólidas.
async function axeViolations(page: Page, include?: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(axe.source);
  const result = await page.evaluate(
    ({ inc }) =>
      (window as unknown as AxeWindow).axe.run(inc ? { include: [inc] } : document, {
        runOnly: { type: "rule", values: ["color-contrast", "image-alt", "link-name", "button-name"] },
      }),
    { inc: include ?? null },
  );
  return result.violations.map((v) => `${v.id}: ${JSON.stringify(v.nodes.map((n) => n.target))}`);
}

const BANNED = /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado/i;

test.beforeEach(async ({ request }) => {
  await assertStackUp(request);
});

test("portada: textos de la dueña, ancla del hero y sin términos viejos en el chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "«Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú».",
  );
  await expect(
    page.getByText("Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorar los cursos" })).toHaveAttribute("href", "/cursos");

  await page.getByRole("link", { name: "Conocé Humano Despierto" }).click();
  await expect(page).toHaveURL(/#nuestra-mirada$/);
  await expect(page.getByRole("heading", { name: "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo." })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Explorá cada propuesta y elegí tu camino de aprendizaje." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Docentes" }).first()).toBeVisible();
  await expect(page.getByText("Al finalizar determinadas formaciones")).toBeVisible();

  // Las cifras y las tarjetas traen datos de la base (el seed local aún tiene «Reiki»): el barrido
  // de texto sólo cubre lo que es texto de la escuela. Los datos los remapea el bloque B.
  for (const sel of ["section[aria-label=Presentación]", "#nuestra-mirada", "#empezar", "footer"]) {
    expect(await page.locator(sel).innerText(), sel).not.toMatch(BANNED);
  }
});

test("portada: axe sin violaciones de contraste, alt ni nombres", async ({ page }) => {
  await page.goto("/");
  expect(await axeViolations(page)).toEqual([]);
});

test("calendario lunar: banda cósmica, «Hoy» en oro y axe limpio", async ({ page }) => {
  await page.goto("/");
  const luna = page.locator('section[aria-labelledby="luna-titulo"]');
  await expect(luna.getByRole("heading", { name: "Calendario lunar" })).toBeVisible();
  await expect(luna).toHaveCSS("background-color", "rgb(14, 20, 48)");
  await expect(luna.getByText("Hoy", { exact: true })).toHaveCSS("color", "rgb(217, 180, 90)");
  expect(await axeViolations(page, 'section[aria-labelledby="luna-titulo"]')).toEqual([]);
});

test("/tarot: textos nuevos, cabecera cósmica, axe limpio y CTA hacia los cursos de Tarot", async ({ page }) => {
  await page.goto("/tarot");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.");
  await expect(page.getByRole("heading", { name: "Qué es el tarot y cómo leerlo" })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(BANNED);
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("link", { name: "Conocé nuestros cursos de Tarot" }).click();
  await expect(page).toHaveURL(/\/cursos\?disciplina=tarot$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cursos" })).toBeVisible();
});

test("catálogo, docentes y diario: bajadas y buscador de la dueña", async ({ page }) => {
  await page.goto("/cursos");
  await expect(page.getByText("Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.").first()).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar cursos" })).toHaveAttribute(
    "placeholder",
    "¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.",
  );

  await page.goto("/guias");
  await expect(page.getByRole("heading", { level: 1, name: "Nuestros docentes" })).toBeVisible();

  await page.goto("/diario");
  await expect(page.getByText("Un espacio para explorar el conocimiento", { exact: false })).toBeVisible();
});
```

- [ ] **Step 3: Correr el spec (stack local arriba)**

Run: `cd webApp && npx supabase start` (si no está) y luego `npx playwright test e2e/contenidos.spec.ts`
Expected: PASS (5 tests). Si `axe` marca un `color-contrast` real, corregir la clase de la superficie (nunca silenciar la regla ni sacar el selector); si marca algo fuera de lo cambiado por este plan (p. ej. un chip de `FeaturedCourses`), anotarlo en el handoff y acotar `include` a la sección propia en vez de a toda la página.

- [ ] **Step 4: Correr la suite e2e y la de SEO**

Run: `cd webApp && npm run test:e2e` y, con el server de e2e abajo, `E2E_PROD=1 npx playwright test e2e/contenidos.spec.ts e2e/csp.spec.ts` (guard de CSP contra el build) y `bash scripts/check-seo.sh http://localhost:3101` contra un `next start` en ese puerto.
Expected: verde; `check-seo.sh` sin `FALLA` (el `<title>` de `/guias` ahora es «Docentes — Humano Despierto» y sigue siendo único).

- [ ] **Step 5: Commit**

```bash
git add webApp/e2e/contenidos.spec.ts webApp/package.json webApp/package-lock.json
git commit -m "test(e2e): textos de la dueña, CTA de Tarot y axe en portada, calendario y /tarot" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Documentación (`CLAUDE.md` y ADR-015)

**Files:**
- Modify: `CLAUDE.md` (raíz del repo; es el que lee Claude Code)
- Engram (gitignored, **no se commitea**): texto de la extensión de ADR-015 para `engram/02_architecture.md`

**Interfaces:**
- Consumes: el estado real tras las Tareas 1-12 (los conteos se miden, no se estiman).

- [ ] **Step 1: Medir los conteos nuevos**

Run: `cd webApp && npm test 2>&1 | tail -8` y `git ls-files src | grep -c "page.tsx$"` y `find src -path '*components*' -name '*.tsx' ! -name '*.test.tsx' | wc -l`
Expected: números de tests/archivos de Vitest y de componentes; usarlos en el Step 2.

- [ ] **Step 2: Editar `CLAUDE.md`**

1. «What this is»: reemplazar `Online school for holistic trades: tarot, astrology, herbalism, reiki, magic.` por `Online school of learning and self-knowledge: astrology, tarot, family constellations, magic, gemotherapy and the universe of symbols.` (herbolaria y reiki **no** se enseñan: decisión de la dueña, 2026-11-08).
2. Tabla «Actual implementation state», fila `webApp/src`: actualizar los conteos de tests (Vitest N tests en M files) con los medidos en el Step 1, y agregar `public/brand/` (10 WebP de la dueña, `CREDITS.md`) a la lista de assets.
3. «Routes that exist»: en `/guias  ·  /guias/[slug]` cambiar `Teacher directory + public profile` por `«Nuestros docentes»: directory + public profile (route kept, label renamed)`.
4. «Design language», lista de reglas duras: reemplazar `- **One light theme.** No \`data-theme\`, no toggle, no dark mode. Cosmos and \`pergamino\` are gone.` por:

```md
- **One light theme, with cosmic surfaces** (ADR-015 extended, PO 2026-11-08: «Brote + acentos
  cósmicos»). No `data-theme`, no toggle, no dark mode. The site stays light; four surfaces carry the
  class `.cosmico` (`globals.css`): the landing hero, the lunar calendar band, the `/tarot` header and
  the `/tarot` closing block. Cosmos and `pergamino` are still gone.
- **Cosmic tokens** (`tokens.css`, `@theme inline`): `noche` `#0E1430` · `indigo` `#2A2F6B` · `oro`
  `#D9B45A` · `--velo-min` `0.78`. They exist **only inside `.cosmico`**: a file that uses
  `bg|text|border|fill|stroke-(noche|indigo|oro)` must declare `cosmico` or
  `src/lib/ui/cosmic-tokens.test.ts` fails. Inside: text `papel` or `oro`, focus `oro`; `oro` as text
  only on solid `noche`/`indigo`, never on an image. A photo under text takes `.cosmico-velo` (≥ 70 %
  `noche`). Every pair is checked in that test (≥ 4.5:1 text, ≥ 3:1 focus). The `primary` button
  (`miel` + `bosque` text) does not change. The footer stays `bosque`.
```

5. En la regla de tokens semánticos, agregar al final de la lista: `· \`noche\`/\`indigo\`/\`oro\` (cosmic surfaces only, see above)`; y en la frase `No \`cosmos\`, \`lila\`, \`ink\`, \`gold\` or \`hh-\` class names` aclarar que `noche`, `indigo` y `oro` sí existen (son los tokens nuevos, distintos de `cosmos`/`gold`).
6. Regla de imágenes: después de `**The 78 tarot card scans** …` agregar:

```md
- **The owner's brand images** (`public/brand/*.webp`, generated by her with AI and ceded to the school,
  see `CREDITS.md`; `image2` was discarded) are the third raster source, catalogued with their `alt`
  in `src/content/brand-images.ts` and served through `next/image` with reserved size. The hero and
  `/tarot` header use them as decorative backgrounds (`alt=""`); «Nuestra mirada» and the closing
  tarot block carry content (real `alt`). Courses without their own cover show
  `brandImageForDiscipline`. `placeholder-photos.ts` keeps only the two Unsplash photos of the
  auth screens.
```

7. «Design language» → «No emojis»: sin cambios. «Coding standards»: agregar `- Copy lives in \`src/content/\` (\`landing.ts\`, \`site-copy.ts\`); the owner's texts are literal, and \`src/content/forbidden-terms.test.ts\` fails if \`herbolaria\`, \`herboristas\`, \`reiki\`, \`oficios\`, \`sin vencimiento\` or \`acceso ilimitado\` come back to \`src/\`.`
8. En «History», agregar una línea: `On 2026-11-08 the owner's content document replaced the landing, footer, catalogue, teachers, journal and tarot copy and added the cosmic surfaces (blocks A and C of \`docs/superpowers/specs/2026-11-08-contenidos-duena-design.md\`).`

- [ ] **Step 3: Preparar el texto de ADR-015 extendido (engram, no se commitea)**

Si existe `engram/02_architecture.md` en el checkout principal, agregar al final de ADR-015:

```md
**Extensión 2026-11-08 · «Brote + acentos cósmicos» (PO).** El sitio sigue siendo un solo tema claro.
Se suman tres tokens (`noche` #0E1430, `indigo` #2A2F6B, `oro` #D9B45A) que sólo viven dentro de
superficies `.cosmico`: hero de la portada, banda del calendario lunar, cabecera y bloque final de
/tarot. Texto `papel` u `oro` (oro sólo sobre fondo sólido), foco `oro`, velo `noche` ≥ 70 % bajo texto
sobre imagen. Imágenes de la dueña (IA, cedidas) en WebP. Verificación: cosmic-tokens.test.ts + axe en e2e.
Backlog: F-C1 encuentros en vivo agendados · F-C2 calendario lunar vinculado a talleres · F-C3 originales
de las imágenes en alta resolución.
```

- [ ] **Step 4: Verificación final del plan**

Run (desde `webApp/`): `npm test && npx tsc --noEmit && npm run lint && npm run test:e2e && bash scripts/check-seo.sh http://localhost:3101`
Expected: todo verde. Revisar a ojo en `localhost:3101` la portada, `/tarot`, `/cursos` y `/guias` en 375 px y 1280 px (el hero no corta el título; el calendario no desborda en 8 columnas; sin scroll horizontal).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md con tokens cósmicos, imágenes de la dueña y reglas de copy" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

**Cobertura de la spec (A y C):**
- A1 Portada (título, subtítulo, botones, «Guías»→«Docentes» en el menú): Tareas 4 y 6. A2 Nuestra mirada y botón con ancla: Tarea 4. A3 Programa, calendario sin cambio de lógica, tres pasos, «Elegir un curso»: Tarea 5. A4 Footer: Tarea 6. A5 Catálogo (bajada, placeholder, vacío, búsqueda por disciplina): Tarea 8 (filtro de 7 disciplinas y leyenda de categoría vacía quedan en B, como pidió el encargo). A6 Docentes (títulos, `<title>`, breadcrumb, sin mensaje de ausencia): Tarea 7. A7 Diario (bajada, vacío): Tarea 9. A8 Tarot (textos, bloque final con `/cursos?disciplina=tarot`): Tarea 10. Barrido incluyendo `layout.tsx`, `landing.ts`, `SiteFooter`, bienvenida, `og/brand.tsx`: Tareas 5, 6 y 11 más el test de barrido.
- C tokens + contraste + `.cosmico` + velo ≥ 70 %: Tarea 3. Superficies (hero, calendario, `/tarot` cabecera y bloque final): Tareas 4, 5, 10. Imágenes a WebP con `next/image` y alt, `CREDITS.md`, `image2` descartada: Tareas 1, 2, 4, 10. Retiro de fotos de `placeholder-photos.ts` y del allowlist: Tarea 2 (el `remotePatterns` de `next.config.ts` se queda: `auth-aside` aún usa 2 fotos).
- Pruebas pedidas: barrido (T11), contraste de tokens (T3), e2e/axe en portada, `/tarot` y calendario (T12), CTA de Tarot filtra el catálogo (T12), `cspGuard` limpio (fixture automática + corrida `E2E_PROD=1` en T12). Documentación: T13.

**Placeholders:** no hay «TBD»/«similar a». La única instrucción no literal es la medición de conteos de `CLAUDE.md` (Tarea 13, Step 1), que son datos a medir, y el plan dice cómo.

**Consistencia de tipos/nombres:** `BRAND.*` (`heroNebulosa`, `heroGalaxia`, `cartaAstralAzul`, `tarotArcanos`, …) igual en T2, T4, T5, T10; `DOCENTES.{title,lead,navLabel,verTodos,volver,metaTitle,metaDescription}` y `CATALOGO`/`DIARIO` iguales en T4, T6-T9; `LANDING.hero.{title,lead,ctaCursos,ctaProyecto}`, `LANDING.empezar.pasos[].n`, `LANDING.lunar` iguales entre T4, T5 y sus tests; ids de ancla `nuestra-mirada` y `empezar` coinciden entre Hero, Manifiesto, Empezar y e2e; clases `cosmico`/`cosmico-velo` iguales en CSS, componentes y tests.

**Orden de ejecución:** 1 → 3 → 2 (Steps 1-3) → 4 → 2 (Steps 4-7) → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13. La Tarea 2 queda partida porque `Hero.tsx`/`Manifiesto.tsx` dependen de `HERO_PHOTO` y de la foto del romero hasta que la Tarea 4 los reescribe.

---

## Handoff para quien orquesta

- **Riesgo de conflicto con el bloque B** (mismos archivos): `src/app/(marketing)/cursos/page.tsx` y `catalog-filters.ts` (B: filtro de 7 disciplinas, claves, leyenda; yo cambio textos y `matchesSearch`) · `src/app/(marketing)/guias/page.tsx` (B: tarjeta de la creadora; yo lo reescribo entero) · `src/app/(marketing)/diario/page.tsx` y, si B agrega portadas/categorías, `diario/[slug]` · `src/lib/utils/taxonomy.ts` (sólo un comentario mío) · `src/app/page.tsx` (quito `getFeaturedTeacher`/cita del hero) y `src/lib/server/guias.ts` por `PublicTeacherCard` · `src/components/atoms/CourseCover.tsx` y `cursos/[slug]/page.tsx` (B2 agrega bloque «Modalidad» en la ficha) · `src/content/landing.ts` (`COURSE_FAQ` habla de certificado/acceso que B2 vuelve dato) · `src/app/(app)/panel/admin/actions.ts`: no lo toco · `webApp/supabase/*`: no lo toco · `CLAUDE.md` (T13 y el bloque B editan la misma tabla de estado) · `e2e/` del catálogo y `vitest.config.mts` (agrego `page.test.tsx` al include).
- **Dudas abiertas:** (1) Textos derivados, no literales del documento: lead del calendario lunar, `COURSE_FAQ` (acceso y certificado), `meta*` de `site-copy`, tagline del OG, cuerpo del mail de bienvenida, `cursos.lead` de la portada reusa la bajada del catálogo. (2) La portada pierde la cita/firma de la docente destacada (`profiles.quote`): el título de la dueña la reemplaza; ¿se retoma luego? (3) Moví el calendario lunar pegado al programa (el documento los agrupa en la pantalla 3); confirmar el orden. (4) `LeafIllustration` (hojas) sigue en «Nuestra mirada» y «Programa»: la dueña pidió evitar referencias a herbolaria en esa zona; ¿se retira? (5) `image7` (escritorio astrológico) trae ramas de eucalipto; la asigné a Magia como portada de ejemplo, alternativa `image5` o `image8`. `image5` (`hero-via-lactea`) queda convertida y sin uso. (6) axe no puede medir contraste sobre imágenes; lo cubre la aritmética del velo y el e2e valida las superficies sólidas. (7) Se agrega `axe-core` como devDependency directa (ya estaba transitiva). (8) `freeClassClaim` queda sin uso en producción (sólo su test); ¿se borra en un ticket aparte? (9) El seed local sigue trayendo disciplinas «Herbal»/«Reiki» que se verán en cifras y tarjetas hasta que B las remape; el e2e barre sólo texto de la escuela.

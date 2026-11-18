# Design language and SEO

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (sections «Design language» and «SEO metadata»). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

## Design language (hard constraints)
**«Brote»** (ADR-015, PO 2026-10-22). Spec: `docs/superpowers/specs/2026-10-22-rediseno-brote-design.md`;
visual reference: `design_handoff_humano_humano/reference/brote/b4-brote2.html`.
- **One light theme, with cosmic surfaces** (ADR-015 extended, PO 2026-11-08: «Brote + acentos
  cósmicos»). No `data-theme`, no toggle, no dark mode. The site stays light; four surfaces carry the
  class `.cosmico` (`globals.css`): the landing hero, the lunar calendar band, the `/tarot` header and
  the `/tarot` closing block. Cosmos and `pergamino` are still gone.
- **Cosmic tokens** (`tokens.css`, `@theme inline`): `noche` `#0E1430` · `indigo` `#2A2F6B` · `oro`
  `#D9B45A` · `--velo-min` `0.78`. They exist **only inside `.cosmico`**: a file that uses
  `bg|text|border|fill|stroke-(noche|indigo|oro)` must declare `cosmico` or
  `src/lib/ui/cosmic-tokens.test.ts` fails. Inside: text `papel` or `oro`, focus `oro`; `oro` as text
  only on solid `noche`/`indigo`, never on an image. A photo under text takes `.cosmico-velo` (>= 70 %
  `noche`). Every pair is checked in that test (>= 4.5:1 text, >= 3:1 focus). The `primary` button
  (`miel` + `bosque` text) does not change. The footer stays `bosque`.
- **Semantic tokens only**, defined once in `webApp/src/styles/tokens.css` and exposed to Tailwind
  by `@theme inline` in `src/styles/globals.css`. Palette **«Noche y oro»** (owner, 2026-11-09); the
  token names are historical (`bosque` is now night blue, `salvia` lavender-grey, `miel` gold):
  `fondo` `#F7F5F0` · `papel` `#FFFFFF` · `salvia-100` `#ECEBF3` · `salvia` `#D9D7E6` · `linea` `#E2E0EA` ·
  `tinta` `#262B45` (body text) · `bosque` `#141A38` (headings, secondary button, footer) · `bosque-700` ·
  `suave` `#555B78` (secondary text) · `miel` `#D9B45A` (primary button, `bosque` text on it: 8.6:1) ·
  `miel-hover` `#E4C373` · `miel-800` `#7A5A12` (links, accent text) · `miel-100` (tags) · `musgo` `#5A6390`
  (**icons and illustration only, never text**) · `error` `#A8322A` · `exito` `#2F6B45`. Cosmic accents
  `noche`/`indigo`/`oro` live only inside `.cosmico`. No `cosmos`, `lila`,
  `ink`, `gold` or `hh-` class names in `webApp/src`. The mail layout (`src/lib/server/mail/layout.ts`)
  and the OG images (`src/lib/og/brand.tsx`) carry the same palette as literals. Tailwind's default
  palette (`red-400`…) is not used for text either: errors are `text-error`. Radii `sm` 8 · `md` 12 · `lg` 18 · `pill`.
- **Text contrast ≥ 4.5:1.** No light text on light backgrounds, no opacity on text colours and no
  `opacity-*` on a container that holds text (a state such as «Completado» or «Mensaje borrado» is a
  background plus a label). Only genuinely inactive controls (`disabled:`, locked lessons) and
  illustration are dimmed. Never `text-suave`/`text-miel-800` on `bg-salvia`, never white on `miel`.
  The focus ring is `miel-800`; on dark surfaces (`bg-bosque`, `.sobre-oscuro`) it switches to `miel`.
- **Font: Plus Jakarta Sans only**, via `next/font/google` in `src/app/layout.tsx` (`--font-jakarta`,
  served from our origin, so CSP `font-src 'self'` is enough). `font-display`, `font-body` and
  `font-quote` still exist and all point to it; heading weight comes from the base styles.
  (OG images still render with the vendored Cinzel in `src/assets/fonts/` until T-061, D-61.)
- **Buttons:** `Button` / `ButtonLink` (`src/components/atoms/Button.tsx`), variants `primary` ·
  `secondary` · `outline` · `ghost`, sizes `md` (48px) · `sm` (40px), optional `arrow`. The variant
  CSS lives only in `globals.css` (`.btn-*`); a screen picks a variant, it never styles a button.
- **Dates and times:** `molecules/DateField` (segments DD/MM/AAAA plus a calendar popover with month
  and year selectors) and `molecules/TimeField` (HH:MM, 24 h), on `react-aria-components` with
  locale `es-AR` whatever the OS language. Never `<input type="date|time">`: native pickers showed
  mm/dd/yyyy and AM/PM. Values are ISO strings (`AAAA-MM-DD`, `HH:MM`, `src/lib/ui/date-value.ts`).
  A controlled field ignores the reset React does after a form action (`use-ignore-form-reset`).
  e2e types them with `e2e/campos.ts`.
- **Errors and limits keep their T-050/T-051 wiring in Brote.** Every `error.tsx` and
  `global-error.tsx` calls `useReportError(error)` and shows `ErrorReference` (the digest support
  looks up in the log); student routes use `layout/ErrorScreen`, the Campus `campus/CampusError`.
  A rate-limited action answers in the form state's `error`, so each form shows it with its usual
  error pattern (`FormStatus`, `panel/StatusMessage`, `reviews/ActionFeedback`), never a new banner.
- **The 78 tarot card scans** (`public/tarot/rws/*.webp`, public domain, see `CREDITS.md`) are the second raster source, also served through `next/image`.
- **The owner's brand images** (`public/brand/*.webp`, generated by her with AI and ceded to the school,
  see `CREDITS.md`; `image2` was discarded and `image5` is not shipped) are the third raster source,
  catalogued with their `alt` in `src/content/brand-images.ts` and served through `next/image` with
  reserved size. The hero and `/tarot` header use them as decorative backgrounds (`alt=""`); «Nuestra
  mirada» and the closing tarot block carry content (real `alt`). Courses without their own cover
  show `brandImageForDiscipline`. `placeholder-photos.ts` keeps only the two Unsplash photos of the
  auth screens. Line illustration in the landing uses `atoms/SkyIllustration` (moon and stars);
  `LeafIllustration` stays for the panel, auth and empty states.
- **Raster is allowed for photography, always through `next/image`**, with reserved size. A photo that
  carries content gets a real `alt`; a decorative one next to text that already names the thing (the
  photo of a course card, whose title is the link) gets `alt=""`. The only remote host in `images.remotePatterns` is `images.unsplash.com`, and only the closed,
  hand-verified list in `src/content/placeholder-photos.ts` (marked PLACEHOLDER in code; id
  `1469474968028-56623f02e42e` is forbidden). **No stock portraits:** a real guide without a signed
  avatar shows her initials (`atoms/Monogram`, `Avatar` with `name`), never a stranger's face (PO
  decision 3; bringing the avatar to `PublicTeacherCard` is D-62). Exception: signed `uploads` URLs (avatar, course cover)
  go through `SignedImage` (`<img>`), because they expire in 1 h and the optimizer would cache them;
  uploads stay jpg/png/webp, never SVG. Illustration is inline SVG (`LeafIllustration`, `Icon`).
- **No emojis. Unicode glyphs are not part of the language:** where one worked as an icon it is a
  line SVG from `atoms/Icon.tsx` (lesson state, stars, bookmark, votes). Glyphs that are *data*
  (`profiles.glyph`, `courses.moon_glyph`, the lunar calendar, and the `○`/`✦` defaults that
  `src/lib/server/campus.ts` fills in) are still rendered as data (D-63).
- No Starfield, ZodiacWheel, three.js canvas or Roman-numeral watermarks (deleted in T-060; `three`
  is not a dependency). Motion: `Reveal` only animates what starts below the fold. Under
  `prefers-reduced-motion` `.btn` and `.reveal` drop their transforms and every hover transform in
  `src` carries a `motion-reduce:` variant that cancels it.
- `design_handoff_humano_humano/reference/design-system/` is **historical**. Read the Brote reference
  for spec — do not paste its HTML.

**SEO metadata** (T-099): `src/lib/seo/meta.ts` holds titles, descriptions and `pageOpenGraph` (a segment's own
`openGraph` replaces the root's whole, so siteName/locale `es_AR` ride in that helper). Descriptions <= 160 (>= 70 for
natal-chart sheets), titles <= 60 counting the template suffix; `meta.test.ts` walks all 78 cards and 37 sheets. `/`, `/cursos`,
`/guias`, `/diario` carry a clean canonical. Card OG images use `public/tarot/rws/*` with the sizes in `lib/tarot/image-sizes.ts`.

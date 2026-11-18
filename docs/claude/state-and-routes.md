# Implementation state and routes

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (sections «Actual implementation state» and «Routes that exist»). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

## Actual implementation state (measured, not aspirational)

| Area | State |
|------|-------|
| `webApp/src` | **~27.1k LOC** (non-test). 48 routes (`page.tsx`), 165 non-test files under `components/`, no mock modules (`lib/mocks/` removed in T-053), `tokens.css`. Real Supabase queries everywhere. Tarot engine (pure, no DB, no AI) in `src/lib/tarot/`, with the reading interpreted by lenses, tensions and a reflective answer in `src/lib/tarot/interpret/` (T-094); 78 card scans in `public/tarot/rws/`; the owner's 9 brand images in `public/brand/` (WebP, `CREDITS.md`). Tarot text comes from the owner's course material in `docs/TAROT/fuente/` (originals outside git). Natal-chart engine (pure, no DB) in `src/lib/astro/` on `astronomy-engine` (MIT, ADR-017; credits in `src/lib/astro/CREDITS.md`). Its text per position (10 planets x 12 signs and x 12 houses, each with `texto`, `luz`, `sombra`) lives in `src/lib/astro/data/posiciones/<planeta>.json` (T-101), validated on import by `posiciones.ts`; `tonoDe` orders light and shadow by the planet's aspects; Chiron, the node and Lilith keep the generic phrases of `templates.json`. Aspects of Pluto with the other nine planets have their own text by family (conjunction, flowing, tense) in `src/lib/astro/data/aspectos/pluton.json` (T-102, `aspectos-pluton.ts`); every other aspect keeps the generic phrase. The content guards shared by both live in `src/test/guardas-astro.ts`. Each of the 240 positions has its own indexable page `/carta-natal/planetas/[slug]/[posicion]` (T-103; `posicion-rutas.ts` resolves `aries`..`piscis` or `casa-1`..`casa-12`, `PosicionLayout.tsx` renders the texts as they are in the JSON); the planet, sign and house sheets link to them and so does the chart result (`Paragraph.enlaces`). Tests: Vitest (1787 unit tests in 205 files, next to the file; `vitest.config.mts` includes every `src/**/*.test.{ts,tsx}`, T-098) + Playwright (`e2e/`), T-039. |
| `webApp/supabase` | **Schema live.** 54 migrations (last `0082`; `0032` applies before `0031` by timestamp, independent), 27 tables (`tarot_readings`, ADR-016; `places`, `natal_charts`, T-024; `diario_post_courses`, B3; `error_events`, 0078), RLS + per-column grants + guard triggers, 1007 mutation tests (PGlite). Private Storage bucket `uploads`: `avatars/` (T-042), `covers/` (T-047) and `diario/` (B3), uploads only via service_role; its policies are only tested over HTTP by b1. Fixtures `@test.local` (admin, docente, alumna) in `seed.fixtures.sql`, content seed in `seed.sql`, demo data in `demo.sql`: all **local only**, never run in the cloud (see `webApp/supabase/README.md`). |
| `mobileApp/` | **Empty directory.** No Expo scaffold. **Out of scope for Phase 2.** |
| `packages/tokens` | 763 LOC of the old Cosmos palette (marked historical in its README, D-66) — **consumed by nobody**: `webApp` does not import it (it uses its own `src/styles/tokens.css`) and `mobileApp` does not exist. Kept for when mobile returns. |
| `Gentleman-Skills/` | **Empty directory.** Referenced by the old CLAUDE.md; there is nothing in it. |
| `design_handoff_humano_humano/` | Real. `reference/brote/` (current visual reference, ADR-015); `reference/hifi/` and `reference/design-system/` are the historical Cosmos spec. Never ships. |

### Routes that exist
```
/                                   Landing (stats, disciplines, testimonials from the DB; lunar calendar computed)
/cursos  ·  /cursos/[slug]          Catalogue (7 discipline chips, ?disciplina=<key>) · course page
                                    (objectives, promo video, modality, reviews)
/guias  ·  /guias/[slug]            «Nuestros docentes»: founder card first (B4), then the grid;
                                    profile (route kept, label renamed)
/diario  ·  /diario/[slug]          Magazine by teachers: ?categoria=<key>, signed cover, related courses
/entrar                             Login + register; honours ?next=, else lands by role
/entrar/recuperar                   Request a password-reset link (neutral reply)
/entrar/nueva-clave                 Choose a new password                     [link session]
/auth/callback                      GoTrue code exchange (confirmation, recovery)
/certificado/[code]                 Public certificate verification
/inscribirme/[curso]                308 -> /cursos/[curso] (T-043; enrollment is requested from the course page)
/panel                              Student dashboard                         [auth]
/panel/perfil                       Own profile, all three roles: name, bio,  [auth]
                                    phone, birth date, avatar
/leccion/[id]                       Lesson player: YouTube IFrame API,        [auth or preview]
                                    persisted progress, chapters, notes,      [owner teacher and
                                    Q&A tab (T-030). No session and no         admin open it to
                                    preview: 307 to /entrar?next= (G-06);      answer and moderate]
                                    session without access: 404
/circulo  ·  /circulo/[curso]       Campus threads                            [auth]
/panel/docente/**                   Teacher panel: courses, modules, lessons, [teacher]
                                    chapters, resources, diario posts,
                                    announcements (`/panel/docente/anuncios`,
                                    T-031: drafts, publish + mail, withdraw).
                                    A teacher without her own chart
                                    (`natal_charts.is_self`) sees only the
                                    chart form (T-024, product rule)
/panel/admin                        Enrollments tab: request queue, grant by  [admin]
                                    mail + slug, searchable paged history
/panel/admin/{usuarios,cursos,invitaciones}  Admin tabs, ?q= search,     [admin]
                                    25 per page by keyset cursor (T-049)
/panel/admin/resenas                Review moderation: report queue, hide     [admin]
/panel/admin/anuncios               Withdraw published announcements (T-031)   [admin]
/panel/admin/errores                Site errors grouped by fingerprint, resolve (0078) [admin]
/tarot                              Tarot online (portada, 9 tiradas: 2 quick + 7 from the workshop)
/tarot/[tirada]                     Tirada interactiva
/tarot/pasado-presente-futuro       308 -> /tarot/cruz-simple (retired spread)
/tarot/lectura                      Lectura por query string (noindex)
/tarot/lectura/[id]                 Tirada guardada                           [auth]
/tarot/cartas  ·  /tarot/cartas/[slug]   Las 78 fichas
/panel/tarot                        Mis tiradas                               [auth]
/carta-natal                        Carta natal: with a saved chart it shows that one («mi carta», else the
                                    latest); form only with none, ?editar=<id> or ?nueva=1 (POST, nothing in the URL)
/carta-natal/[id]                   Saved chart, recomputed on open           [auth, owner; noindex]
/carta-natal/signos/[slug] · /planetas/[slug] · /casas/[n]   Indexable fact sheets (37)
/carta-natal/planetas/[slug]/[posicion]   Planet in sign or house, e.g. marte/tauro, marte/casa-7:
                                    240 indexable pages (10 planets x 24), 404 for anything else
/panel/carta-natal                  Mis cartas natales: delete, mark «mi carta»  [auth]
/invitacion/[token]                 Route Handler: accepts a teacher          [auth]
                                    invitation, refreshes the session claim
/invitacion/invalida                Neutral "invalid or expired" page
/api/csp-report                     POST only: logs csp_violation (no query strings), 20/min per IP
/llms.txt                           Text guide of the citable sections (T-099); no DB, rate-limit exempt
/opengraph-image                    Brand OG image (PNG 1200x630, vendored Cinzel, no network)
/cursos/[slug]/opengraph-image-<h>  Course OG image: cover (jpg/png) or generative card; 404 if not
                                    published. Next adds the -<hash> suffix under a dynamic segment
```
Any unknown route renders `src/app/not-found.tsx` (404, `noindex` injected by Next).
`/guias/[slug]` **is** the "Maestra" screen from the original 9-screen plan, renamed.
Auth is enforced twice: `src/proxy.ts` (session + JWT role for routing) and the server layouts
under `(app)/`, which re-read `profiles.role`.
The proxy refreshes the session (`updateSession`) for `/panel` always and, for every other document,
whenever an `sb-` auth cookie is present (T-096 S-03: a Server Component cannot write the refreshed
cookie). Excluded: `/auth/**` and `/invitacion/**` (they build their own session), `/api/**`, OG
images and any path with a file extension.

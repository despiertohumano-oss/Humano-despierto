# CLAUDE.md

Guidance for Claude Code when working in this repository.

> **Every claim in this file was verified against the repo on 2026-11-08** (T-024; previously T-038); counts, migrations and the session rules updated on 2026-11-13 (T-096, T-097, T-098); natal-chart position texts on 2026-11-18 (T-101). Split into `docs/claude/` on 2026-11-18. If you change
> the code, change this file or the `docs/claude/` file that covers it — a wrong guide is worse than none, because it is trusted.

## What this is
Online school of learning and self-knowledge: astrology, tarot, family constellations, magic, gemotherapy and the universe of symbols (herbalism and reiki are NOT taught: owner's decision, 2026-11-08).
Teachers publish courses whose lessons are **YouTube** videos with downloadable **Google Drive**
resources. Students take them through a Udemy-style curriculum and get persisted progress.
Three roles: `student`, `teacher`, `admin`.

## Current phase
**Phase 2 — real application.** Phase 1 (mocked frontend) is closed: it produced a
high-fidelity static shell with no application layer. Phase 2 turns it into a product.

**Courses are 100% on-demand** (ADR-004). No cohorts, no start dates, no live sessions, no
weekly drip. Active enrollment grants access to the whole curriculum at once.

**Payments are out of scope.** A student requests a course from its page; the row is born `requested` and an admin approves or rejects it in `/panel/admin` (T-043, D2).

## Where the project state lives
`engram/` (gitignored) is the source of truth for state, decisions and backlog:
`_state.md` · `01_requirements.md` · `02_architecture.md` (ADR-001..013) · `03_backlog.md` ·
`04_api_contracts.md` · `05_handoff_log.md` · `06_retro.md`.
**Read `engram/_state.md` first.** This file describes the terrain; the engram describes the work.

## Git workflow (PO rule, 2026-10-31)
- **Work happens on `dev`, locally.** Feature and ticket branches merge into `dev` on this
  machine; `dev` is not pushed and no PRs are opened.
- **A release is a local merge `dev` → `main`, then `main` is pushed to both remotes:**
  ```bash
  git checkout main && git merge --no-ff dev
  git push origin main && git push escuela main
  ```
  `origin` = `gabiMaglia/Humano-despierto` (personal), `escuela` =
  `despiertohumano-oss/Humano-despierto` (private, the school's account). Both must end on the
  same `main`; nobody commits on GitHub directly, so the push never needs `--force`.
- Push to `main` only for a release, and only from here.
- **Production deploys only from GitHub `main` (CD).** Netlify site `humano-despierto`
  (account `despiertohumano@gmail.com`) is linked to `escuela` `main` and builds on every push;
  `netlify.toml` is the build config; its command runs `npm test` (Vitest) before `npm run build`,
  so a red unit test stops the deploy (T-098, G-03). The suite is hermetic: `src/test/hermetic-env.ts`
  (Vitest `setupFiles`) clears every deploy variable before each test file; a test that needs one
  sets it with `vi.stubEnv`. No `netlify deploy --prod` from a laptop, no branch deploys
  or deploy previews (they would share production's database). Runbook: `docs/deploy-netlify.md`.

## Commands

### Setup
`nvm use` (`.nvmrc` = 22) · `cp webApp/.env.example webApp/.env.local` · usuarios de prueba en `README.md`.

### webApp (Next.js 16, React 19, Tailwind 4)
```bash
cd webApp
npm run dev      # dev server at localhost:3000
npm run lint     # ESLint
npx tsc --noEmit # typecheck
npm run build    # production build (don't run unless asked)
npm test         # Vitest, unit layer only (src/lib/**, Server Actions); no stack, no network
npm run test:netlify-env # same suite under the Netlify build env (fake values); must stay green (T-098)
npm run test:unit # same as npm test
npm run test:e2e # Playwright; needs `npx supabase start`; starts its own `next dev` on localhost:3101
```

### Database (Postgres/Supabase schema + security tests)
```bash
cd webApp/supabase
npm install
npm run places:load  # loads `places` from GeoNames (CC BY): local via `docker exec`, cloud via DATABASE_URL (needs psql)
npm test         # 1007 tests, ~1-4 min, no Docker and no credentials needed
```
Runs against **PGlite** (embedded Postgres). Migrations in `migrations/` apply in filename order.

## Read before touching these areas
This file keeps what almost every task needs. The detail lives in `docs/claude/`, moved verbatim:

| Before you… | Read |
|---|---|
| add or move a route, or need sizes/counts of the codebase | `docs/claude/state-and-routes.md` |
| touch mail, Server Action errors, error capture, the player, deletes, founder, e2e | `docs/claude/known-gaps.md` |
| write a migration, a Server Action, an RLS policy, auth, uploads, CSP or rate limits | `docs/claude/security-and-auth.md` |
| change anything visual (tokens, buttons, dates, images, motion) or SEO metadata | `docs/claude/design-language.md` |
| need a cloud service, a secret or a release check | `docs/claude/external-dependencies.md` |
| wonder why this guide distrusts itself | `docs/claude/history.md` |

## Rules that apply to almost every change
Full text, with the reason for each, in `docs/claude/security-and-auth.md` and `docs/claude/design-language.md`.
- **Backend lives inside Next.js** (ADR-001): Server Actions + Route Handlers, logic in `src/lib/server/` with `import 'server-only'`. Two Supabase clients, never mixed: session (RLS) for ordinary work, `service_role` only for privileged operations.
- **Grants:** `REVOKE ALL` then `GRANT` per column; a new column is granted by hand in the migration that adds it; applied migrations are never edited.
- **RLS reads `profiles.role`, never the JWT claim** (the claim is for routing only).
- **Paid-content locators and personal data are `service_role` only** (`lessons.video_id`, `lesson_resources.*`, `profiles.phone/birth_date`, `enrollments.decided_reason`, `natal_charts` writes). No session writes to the `uploads` bucket.
- **Every client-triggerable write is rate-limited** (`withRateLimit`, `src/lib/rate-limit/coverage.test.ts` enforces it). Server Actions return `actionError(err, msg)`, never the engine's message.
- **Never make a page static**: the CSP nonce needs `await connection()`.
- **`lesson_progress.completed` is derived**; money and time are integers in their smallest unit.
- **Closed lists** (disciplines, Diario categories) change as migration + list together; their tests compare both.
- **Design «Brote»**: one light theme; cosmic tokens only inside `.cosmico`; semantic tokens from `tokens.css` only; text contrast ≥ 4.5:1, no opacity on text; Plus Jakarta Sans only; buttons only via `Button`/`ButtonLink`; dates via `DateField`/`TimeField`, never native pickers; raster only through `next/image` (signed uploads via `SignedImage`); no emojis, no stock portraits.
- **Secrets** go in `webApp/.env.local`; `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` never carry `NEXT_PUBLIC_`. **Never run the b1 harness against the cloud.**

## Coding standards
- TypeScript strict everywhere.
- No comments unless the WHY is non-obvious.
- `cn()` = `clsx` + `tailwind-merge`.
- Server Components by default; `'use client'` only for interactivity or animation.
- There are no mocks left (T-053 removed the last one). Do not add mocks.
- Exception: tarot text is rewritten in the site's voice from `docs/TAROT/fuente/` (PO 2026-11-12); the owner's method (máscara de la esencia, equilibrio/desequilibrio, preguntarse) feeds the readings and is never named (`src/lib/tarot/exposicion.test.ts`, `forbidden-terms.test.ts`).
- Copy lives in `src/content/` (`landing.ts`, `site-copy.ts`); the owner's texts are literal, and
  `src/content/forbidden-terms.test.ts` fails if `herbolaria`, `herboristas`, `reiki`, `oficios`,
  `sin vencimiento` or `acceso ilimitado` come back to `src/`.

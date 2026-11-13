# CLAUDE.md

Guidance for Claude Code when working in this repository.

> **Every claim in this file was verified against the repo on 2026-11-08** (T-024; previously T-038); counts, migrations and the session rules updated on 2026-11-13 (T-096, T-097, T-098). The previous
> version described a project that did not exist (see "History" at the bottom). If you change
> the code, change this file — a wrong CLAUDE.md is worse than none, because it is trusted.

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

## Actual implementation state (measured, not aspirational)

| Area | State |
|------|-------|
| `webApp/src` | **~27.1k LOC** (non-test). 47 routes (`page.tsx`), 163 non-test files under `components/`, no mock modules (`lib/mocks/` removed in T-053), `tokens.css`. Real Supabase queries everywhere. Tarot engine (pure, no DB, no AI) in `src/lib/tarot/`, with the reading interpreted by lenses, tensions and a reflective answer in `src/lib/tarot/interpret/` (T-094); 78 card scans in `public/tarot/rws/`; the owner's 9 brand images in `public/brand/` (WebP, `CREDITS.md`). Tarot text comes from the owner's course material in `docs/TAROT/fuente/` (originals outside git). Natal-chart engine (pure, no DB) in `src/lib/astro/` on `astronomy-engine` (MIT, ADR-017; credits in `src/lib/astro/CREDITS.md`). Tests: Vitest (1674 unit tests in 200 files, next to the file; `vitest.config.mts` includes every `src/**/*.test.{ts,tsx}`, T-098) + Playwright (`e2e/`), T-039. |
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

### Known gaps (measured 2026-10-21, see `docs/superpowers/specs/2026-10-21-cierre-funcional-master.md`)
- **Resources are not downloadable.** `lesson_resources` are listed by name only; no route serves
  the Drive link after checking enrollment (T-044).
- **Google OAuth is wired but unproven against Google** (T-041): it needs the PO's OAuth client
  credentials (see "External dependencies"); e2e only intercepts `/auth/v1/authorize`.
- **Profiles are not editable** and there is no Storage usage (T-042).
- **Mail transport is chosen by `MAIL_TRANSPORT`** (T-054, ADR-014, T-090): `smtp` (default) is a
  hand-rolled client on `node:net`/`node:tls`. Against loopback (Mailpit) it needs no AUTH and no
  TLS. Against any other host it needs `SMTP_USER` + `SMTP_PASS` **and** TLS (`SMTP_SECURE=true`
  for 465, or `SMTP_REQUIRE_TLS=true` for 587/STARTTLS), otherwise `register()` refuses to boot
  (credentials never travel in clear, in any `NODE_ENV`). `resend` posts to Resend's HTTP API.
  **Gmail option** (no domain yet): `SMTP_HOST=smtp.gmail.com`, an App Password as `SMTP_PASS`,
  and `MAIL_FROM_ADDRESS` = the Gmail address itself (Gmail rewrites any other From). Limit
  about 500 recipients/day; 550/554 `5.4.5` (daily quota) is classified transient and retried,
  535/534/530 (bad credentials) and other 5xx are permanent. `SMTP_PASS` is redacted from logs
  and error messages. `src/instrumentation.ts`
  validates the mail config in `register()` and the server does not start if it is invalid.
  A permanent provider failure (Resend or SMTP) retires the `mail_log` slot with `last_error`
  (`permanent:<status>/<name>`, migration 0036). After fixing a bad key or domain, recover with
  `delete from mail_log where sent_at is null and last_error ~ '^permanent:(401|403|535)/'` —
  never delete the `409` rows: that mail may already have gone out.
  A mail that hits a send cap is not an attempt: the slot is released (`release_rate_limited_mail_slot`)
  and `/api/mail/retry` (`retryPendingMail`, `CRON_SECRET`) re-runs announcements and, since T-097
  (D-128), transactional mails up to 3 days old with today's data (no «approved» mail for an
  enrollment no longer active). Since T-098 (G-02, closes D-127) the Netlify Scheduled Function
  `webApp/netlify/functions/mail-retry.mts` POSTs to it every 15 min with `Bearer CRON_SECRET`
  (logic in `src/lib/deploy/mail-retry-cron.ts`). A run stops starting sends ~2.5 s before an
  8 s budget (`MAIL_RUN_BUDGET_MS`; not a hard cap: a started send may last the 5 s transport timeout,
  worst case ~10.5 s; Netlify allows 60 s synchronous, 30 s scheduled); an announcement sent in the publish
  `after()` stops at 6 s and leaves one released slot so the cron resumes it, skipping recipients
  already confirmed. Orphan pending slots (recipient no longer enrolled, no resolvable mail,
  announcement withdrawn) are retired as `permanent:000/<cause>` so they never hold the 2 per-run slots.
  Enrollment (approve, reject, grant) and course-completed mails go out in
  `after()` through `mailAfterResponse` (`src/lib/server/mail/after-mail.ts`), never awaited in the
  request. SMTP connections are not reused per batch (the hand-rolled client is one dialog per send; debt D-129).
- **Server Actions never return the engine's message** (T-097, D-120). `actionError(err, msg)`
  (`src/lib/server/action-error.ts`) logs the detail as `action_failed` and returns `msg`; only a
  `UserFacingError` (`requireTeacher`, `assertOwnsCourse`, `assertOwnsPost`) passes its own text.
  A locator write rejected by the 0038 sweep tells the teacher to ask the admin and logs
  `locator_already_public` with the table; authenticated-only text (Q&A, notes, Campus) stays in
  the sweep on purpose (preview Q&A and the general thread are read by any registered account).
- **Error capture is our own, not Sentry** (migration 0078, 2026-11-09). `onRequestError`
  (`src/instrumentation.ts` -> `request-error.ts`) and the error.tsx reports (`client-error.ts`, only
  errors born in the browser: with a digest the server already recorded it) go to
  `recordErrorEvent` (`src/lib/server/error-events.ts`): grouped by fingerprint (source + path with
  ids as `:id` + redacted message) in `error_events` (service_role only, via `record_error_event`).
  The first time, a mail to `ERROR_ALERT_EMAIL` (else `MAIL_FROM_ADDRESS`); then at most once per
  fingerprint per 24 h, 3/h and 10/day overall, max 2000 fingerprints, swept after 30 days idle.
  The admin reads and resolves them in `/panel/admin/errores`. It never throws: its own failures
  go to `log.warn`. `notFound()`/`redirect()` (digest `NEXT_*`) are not errors, nor are a thrown
  `UserFacingError` or `RateLimitError` (`request_expected_error` at warn level, T-098 G-04).
- **The player's progress and note actions return `{ ok: false, error }`, never throw** (T-098,
  G-04, `src/lib/player/action-result.ts`): no session, missing note, rate limit and engine errors
  (via `actionError`) come back in Spanish; the player shows the action's own message (e.g. «Tu sesión se cerró. Volvé a iniciar sesión para guardar.»,
  or «No pudimos guardar tu avance. Revisá tu conexión: seguimos intentando.» on a network failure)
  (`ProgressSaveNotice`). `lesson_notes.body` is capped at 4000 characters in the action and by the
  CHECK `lesson_notes_body_max_length` (migration 0082, born `not valid` and validated only when no
  row violates it; if the cloud has longer notes it stays NOT VALID and `cloud-parity.sh` shows one
  expected diff: run the SQL in `docs/deploy-netlify.md` §7 before the release). `requireTeacher()` in `cursos/[courseId]/actions.ts` and `requireSession()` in
  `circulo/actions.ts` run inside the `try`; `panel/docente/actions.ts` and `diario/actions.ts`
  still call `requireTeacher()` outside it.
- **Deleting a module or a lesson from the course editor asks to type its title** (T-098, G-01,
  `components/teacher/DeleteConfirm.tsx`), with the number of students with progress counted on the
  server (`getStudentProgressCounts`, service_role after `assertOwnsCourse`). There is no DB guard:
  the cascade still deletes their progress, notes and questions.
- **Founder content is on HOLD** (B4): the flag and the card exist, but no founder profile is
  seeded; the owner loads her own photo and bio. `/guias` shows only the grid until the admin
  marks her.
- **Block B e2e specs never ran** (`catalogo-disciplinas`, `modalidad`, `diario-revista`,
  `creadora`): written and listed by Playwright, pending a local stack with 0074-0077 applied.

## Architecture
ADRs live in `engram/02_architecture.md` (ADR-001..013).

**Backend lives inside Next.js** (ADR-001) — Server Actions + Route Handlers. There is no
separate API. Business logic goes in `src/lib/server/`, framework-agnostic, each file starting
with `import 'server-only'`.

**Supabase** (ADR-002) provides Auth + Postgres + RLS. Two clients, never mixed:
the user-session client (anon key + JWT, subject to RLS) for everything ordinary, and the
`service_role` client (bypasses RLS) **only** for privileged operations.

**Auth by mail** (T-040, D8): `enable_confirmations = true`, so `signUp` leaves no session. The
session is born in `/auth/callback`, which also sends the welcome mail (deduped by `mail_log`).
`?next=` is sanitised only by `src/lib/auth/safe-next.ts`; without a valid `next` the login
lands by `profiles.role` (`/panel/admin`, `/panel/docente`, `/panel`). Mail links must be
opened in the browser that requested them: the PKCE verifier lives in a cookie. Use
`localhost` (not `127.0.0.1`) in the browser, matching `SITE_URL` and `site_url`.
Every auth redirect is a trusted origin + `safeNext`: `getSiteUrl()` on the server (never the
`Origin` header), `window.location.origin` on the client; GoTrue's exact allow-list
(`additional_redirect_urls`, fixed host and port, `**` only after `/auth/callback`) is the final
authority. Adding a port means adding its exact entry there. Local e2e needs
`SMTP_HOST=127.0.0.1` and `SMTP_PORT=54325` in `webApp/.env.local` for the app's own mails.

**Google OAuth** (T-041, D5): `/entrar` → `signInWithOAuth` (PKCE) → GoTrue → `/auth/callback`,
the same exchange as mail confirmation. Logic lives in `src/lib/auth/google.ts`. GoTrue links a
Google identity to the account with the same verified mail automatically (and drops that
account's unconfirmed identities). `handle_new_user` takes `full_name` or `name` from the
provider and leaves the name empty if it looks like a locator, instead of aborting the sign-up.
Without a valid `next` the `redirect_to` carries no query and `resolveAuthCallback` lands by
`profiles.role` read after the exchange, so the role-based landing applies to every login
(password, Google, mail confirmation); a failed role read falls back to `/panel`.

### Security rules that are enforced by the schema — do not fight them
These exist because the same class of bug reached production in a sibling project. They are
covered by mutation tests that fail loudly if you regress them.

1. **`REVOKE ALL` then `GRANT` per column — never revoke a single column.** Supabase ships
   `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES`, so every new table is born with
   table-level UPDATE, against which a per-column revoke is a no-op.
2. **Grants are a whitelist.** A new column is not exposed by accident — you must grant it by
   hand, column by column, in the migration that adds it (as `0011`, `0028` and `0072` do);
   applied migrations are never edited. That is deliberate friction.
3. **RLS policies read `profiles.role`, never the JWT claim.** A claim is a snapshot taken when
   the token was issued and survives a role downgrade until refresh. The claim is for routing
   and optimistic UI only. Ownership reads too: a draft course (`courses_read`, `can_read_course`)
   or diario post (`diario_posts_read`) is visible to its author only while
   `profiles.role = 'teacher'` (migration 0081, D-121); a downgraded teacher loses her drafts.
4. **Paid-content locators are `service_role` only** — `lessons.video_id`,
   `lesson_resources.drive_file_id`, `lesson_resources.url`. RLS filters *rows*, not *columns*,
   and every authenticated user sees the rows of any published course. Serve them from a Server
   Action after checking enrollment. A `select *` on `lessons` from the client fails with 42501.
   Same for personal data: `profiles.phone` and `profiles.birth_date` have no SELECT for any
   client role; the owner reads them through `my_private_profile()`. A `select *` on `profiles`
   from the client fails with 42501. `enrollments.decided_reason` (the admin's note to a rejected
   student) has no client SELECT either (migration 0080, T-096): the owner teacher reads the roster
   rows, not the reason; the student reads hers through `my_enrollment_requests()` and the admin
   through `admin_list_enrollments` (service_role). The locator sweep skips `places` (GeoNames data, public by
   design; migration `0073`). Avatars and course covers live in the private bucket
   `uploads` (`avatars/<uid>/<uuid>.<ext>`, `covers/<course_id>/<uuid>.<ext>`).
   **No session writes to `uploads`** (D-34, migration 0030): the bucket only checks size and the
   declared MIME, so a client INSERT policy let users bypass the server's byte check. Uploads go
   through the Server Action with `service_role` (`uploadAsServer`) after validating magic bytes
   and ownership; sessions keep only SELECT (owner signs her own) and DELETE.
   `courses.cover_path` is tied to `covers/<id>/` by the CHECK `courses_cover_path_no_locator`.
   `diario_posts.cover_path` is tied to `diario/<post_id>/` by `diario_posts_cover_path_no_locator`
   (B3); there is no Storage policy for `diario/`: upload, sign (panel) and delete go through
   `service_role` after `assertOwnsPost`.
   Every `uploads` URL is signed server-side for 1 h; public pages sign through
   `signPublicUploadUrls`, which calls `connection()`: a page that shows a signed URL must never
   be prerendered.
5. **`lesson_progress.completed` is derived, never declared.** It is computed from
   `seconds_watched` against `lessons.duration_seconds` at 90%, in INSERT and UPDATE, with no
   `service_role` bypass. **With `duration_seconds = 0` nobody can ever complete a lesson** —
   load the duration first.
6. **Money and time are integers in their smallest unit.** `price_cents`, `duration_seconds`.
   Never float, never string. Formatting belongs to the view.
7. **Q&A text is read by the whole cohort, so it carries both R-3 halves.** `lesson_questions`
   and `lesson_answers` have no `anon` grant; their columns live in the "session" class
   (`columnasConSesion`, `tests/locator-session-class.test.mjs`), not in the anon one. The
   owner teacher (`teacher_id` **and** `profiles.role = 'teacher'`) and the admin open the player
   to answer and moderate, but never write progress or notes (ADR-003 as extended by T-030).
8. **A published announcement is frozen, even for `service_role`.** It already went out by mail:
   `course_announcements_freeze_published` rejects any change to `title`, `body`, `status` or
   `published_at` once published. Publishing is a Server Action with `service_role` after
   `assertOwnsCourse`; the mail runs in `after()` and never blocks or breaks the publish.
9. **A role change outside `updateUserRoleAction` exists only in `accept_teacher_invitation`**
   (T-049; `service_role` only, mail confirmed and equal to the invited one, only
   `student -> teacher`). `teacher_invitations` has no client access at all. The invitation
   token lives only in the mail; the DB keeps its sha256. The mail link also carries a one-time
   GoTrue access (`?acceso=<hashed_token>&tipo=magiclink|signup`, from `auth.admin.generateLink`;
   for a mail without account GoTrue creates it): `/invitacion/[token]` redeems it with
   `verifyOtp` only when the browser has no session (T-096 S-02: an open session is never replaced;
   it goes straight to the accept, which fails for any other account and sends it to «salí
   primero»), and a `signup`
   account goes to `/entrar/nueva-clave?invitacion=1` to choose its password; a `magiclink` one
   lands on its panel with `?invitacion=1`. Both landings show the account's mail with «¿No sos
   vos? Salir» (`InvitedAccountNotice`, T-097 NB-1), so whoever opened a forwarded link notices. When the access
   expired (OTP expiry) the link still works by logging in by hand. The admin lists (`admin_list_*`,
   `admin_user_by_email`) are `service_role`-only SQL functions: the mail lives in `auth.users`.
10. **The CSP lives in `src/proxy.ts`, built by `buildCsp` (`src/lib/security/csp.ts`), with a
    nonce per request** (T-052). That is why the root layout calls `await connection()`: a
    prerendered page has no nonce and its scripts die under enforce. Do not make a page static.
    `style-src 'unsafe-inline'` is deliberate (inline `style={{}}` everywhere) until the reskin.
    It is **enforced by default** since 2026-11-09 (`cspEnforced`); `CSP_ENFORCE=false` turns it
    back to Report-Only, only renaming the header: the emergency switch, no code deploy needed.
    Playwright runs with `CSP_ENFORCE=false` on purpose: every test imports `test` from
    `e2e/fixtures.ts`, whose `cspGuard` fails the test on any violation (the same policy, so zero
    violations means nothing is blocked), and the csp.spec tests need an injected script to run.
    A new third-party origin goes into `buildCsp` with its test, never into a page. Netlify's own
    `/.netlify/scripts/hud` has no nonce and is blocked: that is intended.
11. **Every write a client can trigger is rate-limited** (T-050). Each export of a `"use server"`
    file and each `route.ts` method goes through `withRateLimit("<its own name>", fn, onLimited)`
    with a limit in `src/lib/rate-limit/limits.ts`, or sits in `RATE_LIMIT_EXEMPT` with a written
    reason; `src/lib/rate-limit/coverage.test.ts` fails otherwise (and on `export default`/`{ }`/`*`
    in those files). Counters live in `rate_limit_buckets` (`check_rate_limit`, `service_role`
    only, fixed window). The quota is per `getClaims().sub`, else per IP: `x-nf-client-connection-ip` (set by Netlify, T-091), then
    `x-forwarded-for` (a non-Netlify proxy must REPLACE both). If the limiter is down or mute the action
    proceeds and logs `rate_limit_backend_down` (fail-open, on purpose). `sendMail` has its own
    global and per-recipient cap. Auth flows are limited by GoTrue, not here.
12. **Disciplines and Diario categories are closed lists** (B1/B3, migrations 0074/0076).
    `courses.discipline` stores a key from `src/lib/taxonomy/disciplines.ts` and
    `diario_posts.category` one from `src/lib/taxonomy/diario.ts`; each list is mirrored by a CHECK
    and `src/lib/taxonomy/*.test.ts` reads the migration and fails if they differ. Adding a
    discipline is a migration plus the list, never one of the two. Server mappers return the
    label (`disciplineLabel`); only the teacher form, the catalog filter and the brand image
    (`brandImageForDiscipline`) use the key. An unknown `?disciplina=`/`?categoria=` is ignored.
13. **The founder is curated, not self-declared** (B4, migration 0077). `profiles.is_founder` has no
    client UPDATE grant; only `setFounderAction` writes it, through `admin_set_founder`
    (`service_role` only, one transaction, at most one founder, `role = 'teacher'` by CHECK). A role
    change away from teacher unmarks her (`profiles_founder_follows_role`).
14. **Birth data is reinforced personal data** (T-024). `natal_charts` has no grant for `anon`;
    the owner reads and deletes; no client inserts or updates: writing is `save_natal_chart` /
    `set_self_natal_chart`, `service_role` only, after `getUser()` and the consent.
    `profiles.sun_sign/moon_sign/asc_sign` are public and only those functions and the trigger
    that clears them when the own chart is deleted write them. Birth date, time and place never
    go in the URL. `src/lib/astro/time.ts` is the only place that converts local time.

**Course modality** (B2, migration 0075): `includes_*`, `access_terms`, `issues_certificate` are
public course data written by the owner teacher. `includes_live` is informative only (ADR-004
intact). `guard_certificates_insert` rejects a certificate for a course with
`issues_certificate = false`, also for `service_role`; switching it off never revokes issued ones.
`ensureCertificate` returns null before the insert for such a course.

**Review moderation** (T-037, ADR-012): only the course's teacher or an admin can report a review
(`course_review_reports`, RLS via `can_report_review`, which reads `profiles.role`). Hiding,
unhiding and dismissing go ONLY through the `moderate_*` SQL functions (execute for
`service_role` only), called from `panel/admin/actions.ts` after `requireAdmin()`
(`src/lib/server/admin.ts`). They are the only writers of `hidden_*` and `resolved_*`. A teacher
cannot review her own course (D-20, enforced by the `course_reviews` guard with no bypass).

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

## External dependencies not yet provisioned
Several things block work and require the repo owner's accounts:
- **Supabase cloud project** exists (ref `ovjxgggytdajadlxqety`, production since 2026-11-01).
  Locally the schema runs on PGlite (`npm test`, no PostgREST) and on the Supabase stack
  (`supabase start`, where
  `harness/b1-postgrest-attacks.sh` exercises the HTTP surface). **Never run b1 against the
  cloud**: it creates users, publishes an attack course and weakens a CHECK for a while. Instead,
  with b1 green locally, `bash supabase/harness/cloud-parity.sh` compares, in a READ ONLY
  transaction, the cloud's security surface (`security-surface.sql`: grants, RLS, policies,
  function execute + body hash, triggers, constraints, migrations, POSIX classes of 0012) with
  the local stack. Same surface, same b1 result. Run it before any release; a `<` line is a
  migration not applied in the cloud yet.
- **YouTube Data API v3 key** (`YOUTUBE_API_KEY`, server-side, no `NEXT_PUBLIC_` prefix) —
  lesson duration is resolved by the server from the video, not typed by the teacher.
- **Google OAuth client** (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, in
  `webApp/.env.local`; read by the Supabase CLI on `supabase start`, not by Next). Local
  authorised redirect URI: `http://127.0.0.1:54321/auth/v1/callback`. Without them the Google
  button ends in a Google error page.
- **`places` load in the cloud** (T-024): run `npm run places:load` (in `webApp/supabase`) with the
  project's `DATABASE_URL` after applying `0072`; without it the place search returns nothing.
  Check `select extname, extnamespace::regnamespace from pg_extension` first (`pg_trgm`/`unaccent`).
- **Legal consultation on birth data** and **the owner's review of the 78 texts**
  (`templates.json`, `_meta.estado`): they block the T-024 release, not development.
- **Owner's review of the tarot texts** (`docs/TAROT/fuente/revision.json` in `pendiente`): blocks the tarot release.
- **Auth OTP expiry = 86400** (24 h) in the cloud dashboard (Authentication > Email): the direct
  access of the teacher-invitation mail lives that long (default 1 h). Local: `config.toml`.
- **`CRON_SECRET` in Netlify** (T-098, scopes Functions and Runtime): without it the `mail-retry`
  Scheduled Function calls nothing (`missing_env` in its log) and stuck mails are never retried.
  Its first run re-sends what is stuck from the last 3 days (runbook section 6).
- **Gmail App Password** (T-090, stopgap until a domain exists): 2-step verification on
  `despiertohumano@gmail.com`, an App Password, then `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
  `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_ADDRESS=despiertohumano@gmail.com`.
  About 500 mails/day; no SPF/DKIM work needed. Replaces Resend until a domain is bought.
- **Resend** (ADR-014, needs a domain): account, `RESEND_API_KEY`, and the domain of `MAIL_FROM_ADDRESS` verified
  with SPF (`TXT` + `MX`, or `CNAME`, on `send.<domain>`) and DKIM (`TXT` on
  `resend._domainkey.<domain>`), checkable with `nslookup -type=TXT resend._domainkey.<domain>`.
  Without it every real send is a `403`, which retires the slot (see recovery above).

Secrets go in `webApp/.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY`
must **never** carry the `NEXT_PUBLIC_` prefix: the first bypasses RLS entirely, the second sends
mail as the school, and the prefix would ship either to the browser.

## History
On 2026-11-13 T-098 (post-audit robustness, `engram/qa/AUDIT-general-2026-11-13.md`): typed confirmation for module/lesson deletes (G-01), Netlify mail-retry cron and mails in `after()` (G-02, D-127), `npm test` in the Netlify build (G-03), player actions return results (G-04), login redirect for `/leccion` (G-06), `cache()` on `getCurrentUser` (G-07), Vitest glob include (G-10), note body cap (0082, G-11).
On 2026-11-13 T-097 (part A) paid debt: account shown after an invitation link (NB-1), minimatch override, neutral action errors (D-120), drafts cut for a downgraded teacher (0081, D-121), retry of capped transactional mails (D-128).
On 2026-11-13 T-096 closed the session-isolation audit (`engram/qa/AUDIT-sesiones-2026-11-13.md`, S-01..S-07): migration 0080, invitation access never replaces an open session, session refresh on every document, one service_role factory (`createServiceRoleClient`).
On 2026-11-12 T-094: lectura interpretada por lentes, tensiones y respuesta reflexiva (`src/lib/tarot/interpret/`).
On 2026-11-12 the tarot was rebuilt on the owner's course material (78 rewritten cards, suits, 9 spreads with groups and reflection, migration 0079).
On 2026-11-08 the owner's content document replaced the landing, footer, catalogue, teachers, journal and tarot copy and added the cosmic surfaces (blocks A and C of `docs/superpowers/specs/2026-11-08-contenidos-duena-design.md`).
On 2026-10-22 T-060 replaced the Cosmos design language (dark theme, Cinzel, no raster, three.js
login canvas) with «Brote» (ADR-015); the old rules were deleted, not kept as an alternative.
Until 2026-10-21 this file still described the state of 2026-08-06 (3.6k LOC, 11 routes, "the
player has no video"); corrected by T-038 after QA rejected it.
Until 2026-08-06 this file claimed Phase 1, "webApp: scaffold only, Landing not started", and
"mobileApp: Landing implemented, ZodiacWheel built". All three were false in both directions:
the webApp had 11 routes and the mobileApp was an empty directory. It also pointed at a
`Gentleman-Skills/curated/` skill set that does not exist. Corrected by ticket T-009.

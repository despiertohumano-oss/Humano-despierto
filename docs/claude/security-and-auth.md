# Architecture, auth and security rules

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (section «Architecture»). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

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
authority. Adding a port means adding its exact entry there. With a session, `GET /entrar` never renders: `src/proxy.ts` redirects to the internal `next` or to the home page (`/entrar/recuperar`, `/entrar/nueva-clave` and the login's Server Action POST are left alone). Local e2e needs
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
    A new third-party origin goes into `buildCsp` with its test, never into a page. Cloudflare Turnstile
    (`https://challenges.cloudflare.com`) enters only when both Turnstile keys are set (`turnstile` input, T-106). Netlify's own
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

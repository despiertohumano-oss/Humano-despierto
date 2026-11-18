# Known gaps

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (section «Known gaps», measured 2026-10-21 and updated since). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

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

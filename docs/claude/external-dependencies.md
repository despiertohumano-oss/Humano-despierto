# External dependencies not yet provisioned

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (section of the same name). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

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
- **Owner's review of the natal-chart position texts** (`docs/ASTROLOGIA/fuente/revision.json` in `pendiente`, questions in `PREGUNTAS-DUENA.md`): written from her course material in `docs/ASTROLOGIA/` (originals outside git, never copied: `verificar-copia.py` fails on 8+ equal words in a row). They never predict and never speak of health, death, money or marriage as fate (`posiciones-cobertura.test.ts`); house 6 speaks of routines and daily work until she decides otherwise.
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

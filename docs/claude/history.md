# History of this guide

> Moved verbatim from `CLAUDE.md` on 2026-11-18 (section «History»). Same rule as there: if you change
> the code, change this file — a wrong guide is worse than none, because it is trusted.

## History
On 2026-11-18 T-101: the natal chart reads a text of its own per planet in sign and in house (240 entries with light and shadow) instead of three generic phrases glued together.
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

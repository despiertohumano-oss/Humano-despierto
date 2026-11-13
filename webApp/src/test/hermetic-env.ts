// T-098 ronda 1 (B-1): Netlify corre `npm test` en el build con las variables del sitio cargadas
// (scope Builds): `SITE_URL` de producción, `NETLIFY`, `CONTEXT`, `URL`, las de mail y hasta los
// secretos. Un test que asume el valor por defecto de una de ellas (p. ej. el host del sitemap) se
// ponía rojo SOLO ahí, y el build de producción fallaba siempre. Antes de cada archivo de test el
// entorno queda como en una máquina limpia; quien necesite un valor lo fija con `vi.stubEnv`.
// Se ejecuta como `setupFiles` de Vitest (antes de los imports de cada archivo de test).

/** Variables del entorno de deploy que ningún test puede heredar. La lista la vigila
 *  `hermetic-env.test.ts` contra la tabla de `docs/deploy-netlify.md`. */
export const DEPLOY_ENV_VARS = [
  // Netlify (build y runtime)
  "NETLIFY",
  "CONTEXT",
  "URL",
  "DEPLOY_URL",
  "DEPLOY_PRIME_URL",
  "DEPLOY_ID",
  "SITE_ID",
  "SITE_NAME",
  "BRANCH",
  "HEAD",
  "COMMIT_REF",
  // Runbook docs/deploy-netlify.md §2
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SITE_URL",
  "MAIL_TRANSPORT",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_REQUIRE_TLS",
  "MAIL_FROM_ADDRESS",
  "MAIL_FROM_NAME",
  "RESEND_API_KEY",
  "YOUTUBE_API_KEY",
  "CRON_SECRET",
  "CSP_ENFORCE",
  "ERROR_ALERT_EMAIL",
  "RATE_LIMIT_BACKEND",
  "NEXT_PUBLIC_WHATSAPP_URL",
  "SUPABASE_DB_URL",
] as const;

for (const name of DEPLOY_ENV_VARS) delete process.env[name];

// El limitador de unidad es el de memoria (no hay base); el resto de la app ve un entorno de test.
process.env.RATE_LIMIT_BACKEND = "memory";
(process.env as Record<string, string>).NODE_ENV = "test";

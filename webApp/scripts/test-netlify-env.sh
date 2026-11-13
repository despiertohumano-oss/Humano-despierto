#!/usr/bin/env bash
# T-098 ronda 1 (B-1) · Corre la suite unitaria con el entorno que ve el build de Netlify.
#
# Netlify ejecuta `npm test` antes de `npm run build` (netlify.toml) con las variables del sitio
# cargadas en scope Builds. Si un test hereda una de ellas (el SITE_URL de producción, por ejemplo)
# y se pone rojo, el deploy de producción se cae. Este script reproduce ese entorno con valores
# falsos (ningún secreto real) para probar que la suite es hermética (src/test/hermetic-env.ts).
#
# Uso (desde webApp/):  npm run test:netlify-env
# Toda variable de la tabla de docs/deploy-netlify.md §2 tiene que estar acá:
# src/test/hermetic-env.test.ts lo verifica.
set -euo pipefail
cd "$(dirname "$0")/.."

export NETLIFY=true
export CONTEXT=production
export URL=https://humano-despierto.netlify.app
export DEPLOY_URL=https://0000000000000000--humano-despierto.netlify.app
export DEPLOY_PRIME_URL=https://humano-despierto.netlify.app
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

export NEXT_PUBLIC_SUPABASE_URL=https://example-ref.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key-falsa
export SUPABASE_SERVICE_ROLE_KEY=service-role-falsa
export SITE_URL=https://humano-despierto.netlify.app
export MAIL_TRANSPORT=smtp
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=465
export SMTP_SECURE=true
export SMTP_USER=escuela@example.com
export SMTP_PASS=app-password-falsa
export MAIL_FROM_ADDRESS=escuela@example.com
export MAIL_FROM_NAME="Humano Despierto"
export YOUTUBE_API_KEY=youtube-key-falsa
export CRON_SECRET=cron-secret-falso-de-32-caracteres
export CSP_ENFORCE=
export ERROR_ALERT_EMAIL=escuela@example.com
export RATE_LIMIT_BACKEND=
export NEXT_PUBLIC_WHATSAPP_URL=https://wa.me/5490000000000

exec npm test

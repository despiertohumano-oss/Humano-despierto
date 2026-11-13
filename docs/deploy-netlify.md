# Deploy en Netlify (plan gratuito) — runbook

T-091. Netlify + Supabase Cloud, URL `*.netlify.app`, sin dominio propio. El mail real es T-090.

## 1. Conectar el repo

1. Netlify > Add new project > Import an existing project > GitHub > este repo, rama `main`.
2. No toques los campos de build: los fija `netlify.toml` en la raíz (`base = "webApp"`,
   `npm test && npm run build`, `publish = ".next"`, Node 22). Desde T-098 (G-03) el build corre
   los tests unitarios (Vitest, ~25 s) antes de `next build`: un test rojo corta el deploy y
   producción sigue en la versión anterior. La suite PGlite de `webApp/supabase` no corre acá.
   La suite corre con las variables del sitio cargadas (scope Builds: `SITE_URL` de producción,
   `NETLIFY`, `CONTEXT`, `URL`, las de mail y los secretos). Es hermética: `src/test/hermetic-env.ts`
   (`setupFiles` de Vitest) borra esas variables antes de cada archivo de test. Para comprobarlo
   antes de un release, desde `webApp/`: `npm run test:netlify-env` (corre `npm test` con ese
   entorno y valores falsos). Una variable nueva en la tabla de §2 tiene que sumarse a
   `hermetic-env.ts` y a `scripts/test-netlify-env.sh`; `hermetic-env.test.ts` falla si falta. Netlify instala solo el adaptador
   `@netlify/plugin-nextjs` (OpenNext v5) al detectar Next.
3. Antes del primer deploy cargá las variables (sección 2). Las `NEXT_PUBLIC_*` y `SITE_URL` se
   **hornean en el build**: si cambian, hay que redeployar (Deploys > Trigger deploy > Clear cache
   and deploy).

## 2. Variables de entorno

Site configuration > Environment variables. Scopes: **Builds, Functions y Runtime** (el proxy corre
como Edge Function y lee `SITE_URL`, `CSP_ENFORCE` y las de Supabase en cada request).

| Variable | Tipo | Valor / de dónde sale |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | Supabase > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Supabase > API > `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta** | Supabase > API > `service_role`. Nunca con `NEXT_PUBLIC_` |
| `SITE_URL` | no secreta | `https://<tu-sitio>.netlify.app`, sin `/` final |
| `MAIL_TRANSPORT` | no secreta | `smtp` (Gmail, T-090) |
| `SMTP_HOST` | no secreta | `smtp.gmail.com` |
| `SMTP_PORT` | no secreta | `465` |
| `SMTP_SECURE` | no secreta | `true` (TLS directo en 465) |
| `SMTP_USER` | no secreta | La cuenta de Gmail de la escuela (`despiertohumano@gmail.com`) |
| `SMTP_PASS` | **secreta** | Contraseña de aplicación de esa cuenta (exige verificación en 2 pasos). Nunca la clave de la cuenta |
| `MAIL_FROM_ADDRESS` | no secreta | **La misma dirección de Gmail** que `SMTP_USER`: Gmail reescribe cualquier otro From |
| `MAIL_FROM_NAME` | no secreta | `Humano Despierto` |
| `YOUTUBE_API_KEY` | **secreta** | Google Cloud, YouTube Data API v3. Sin ella no se publica una lección |
| `CRON_SECRET` | **secreta** | ≥16 caracteres al azar (`openssl rand -hex 32`). **Obligatoria desde T-098:** la usa la Scheduled Function `mail-retry` para llamar a `/api/mail/retry` (sección 6). Scope: Functions y Runtime |
| `CSP_ENFORCE` | no secreta | Vacía (= enforce desde 2026-11-09). `false` vuelve a Report-Only sin redeploy de código: interruptor de emergencia |
| `ERROR_ALERT_EMAIL` | no secreta, opcional | Adónde llegan los avisos de error (0078). Vacía = `MAIL_FROM_ADDRESS` |
| `RATE_LIMIT_BACKEND` | no secreta | Vacía (= `postgres`). Nunca `memory` en producción |
| `NEXT_PUBLIC_WHATSAPP_URL` | pública, opcional | `https://wa.me/...`; vacía oculta el botón |

"Pública" = viaja al navegador (prefijo `NEXT_PUBLIC_`, horneada en el build). "No secreta" = solo
la lee el servidor, pero su valor no da acceso a nada.

No van a Netlify: `SUPABASE_DB_URL` (solo seed y scripts locales), `SMTP_REQUIRE_TLS` (es para 587
con STARTTLS; con 465 va `SMTP_SECURE`, no las dos), `RESEND_API_KEY` (solo con
`MAIL_TRANSPORT=resend`, cuando haya dominio propio; entonces es **secreta**),
`SUPABASE_AUTH_EXTERNAL_GOOGLE_*` (las lee el CLI local; en la nube el cliente OAuth se carga en
Supabase > Authentication > Providers > Google).

**Mail:** `src/instrumentation.ts` valida la config al arrancar y, si es inválida, el server no
atiende (`config_invalid` en los logs). Fuera de loopback el SMTP exige `SMTP_USER` + `SMTP_PASS` y
TLS: si falta cualquiera de las de Gmail, el sitio entero da error, no solo el mail. Gmail permite
unos 500 destinatarios por día; el exceso queda en `mail_log` y se reintenta.

Marcá como secretas (Contains secret values) solo las cuatro **secretas** de la tabla
(`SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS`, `YOUTUBE_API_KEY`, `CRON_SECRET`). Si marcás una
`NEXT_PUBLIC_*` como secreta, el secret scanning de Netlify corta el build, porque su valor está
(a propósito) en el bundle del navegador.

## 3. Supabase Cloud

- Authentication > URL Configuration: **Site URL** = el mismo `SITE_URL`; **Redirect URLs** =
  `https://<tu-sitio>.netlify.app/auth/callback**` (exacta, sin comodín en el host).
- **Deploy previews:** cada preview vive en otro host (`deploy-preview-<N>--<tu-sitio>.netlify.app`)
  y GoTrue rechaza el redirect a un host que no está en la lista. Si querés probar login o mails
  de confirmación en una preview, agregá su URL exacta (`https://deploy-preview-<N>--<tu-sitio>.netlify.app/auth/callback**`)
  y sacala después. Nunca un comodín en el host. Ojo: las previews usan las mismas variables (y la
  misma base) que producción salvo que las separes por contexto en Netlify.
- Las migraciones de `webApp/supabase/migrations/` aplicadas; nada de `seed.fixtures.sql`,
  `seed.sql` ni `demo.sql` en la nube.
- Re-correr `webApp/supabase/harness/b1-postgrest-attacks.sh` contra el proyecto cloud (CLAUDE.md).

## 4. Qué verificar después del primer deploy

1. `curl -sI https://<sitio>/` → 200 y `content-security-policy-report-only` con `nonce-...`
   distinto en dos requests seguidos, y con la URL real de Supabase en `connect-src` (prueba de
   que el proxy ve las variables).
2. `/`, `/cursos`, `/entrar`, `/sitemap.xml` (URLs con `https://<sitio>`), `/robots.txt`,
   `/opengraph-image` y el OG de un curso (`/cursos/<slug>/opengraph-image-<hash>`, link en el
   `<head>` de la ficha) → 200.
3. `/panel` sin sesión → 307 a `/entrar?next=%2Fpanel`.
4. Una foto de Unsplash del landing carga por `/_next/image` (Netlify la reescribe a su Image CDN,
   `/.netlify/images`) sin violación de CSP en la consola.
5. **IP del rate limit** (la app confía en `x-nf-client-connection-ip`, T-091). Desde tu máquina:

   ```bash
   for i in $(seq 1 21); do
     curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<sitio>/api/csp-report \
       -H 'Content-Type: application/csp-report' \
       -H 'x-nf-client-connection-ip: 203.0.113.99' \
       -H "X-Forwarded-For: 198.51.100.$i" \
       --data '{"csp-report":{}}'
   done
   ```

   Los 20 primeros dan 400 (el reporte vacío no es válido, pero cuenta igual: el límite va antes
   del parseo) y el 21° tiene que dar 429 (límite 20/min por IP). Después, en el SQL editor de Supabase:
   `select key, hits from rate_limit_buckets where key like 'cspReportPost:%' order by window_start desc limit 5;`
   → **una sola** clave, `cspReportPost:ip:<tu IP pública real>` (compará con `curl -s https://api.ipify.org`).
   Si aparece `203.0.113.99`, Netlify deja pasar la cabecera del cliente: el rate limit por IP se
   esquiva. Si aparecen `198.51.100.*`, se está leyendo `X-Forwarded-For`. En los dos casos, **no
   está listo**: abrir ticket antes de anunciar el sitio.
6. Registro + mail de confirmación (llega desde la cuenta de Gmail) + login, y un anuncio publicado:
   el mail sale en `after()`; revisar `mail_log.sent_at`.
7. Publicar un curso desde el panel y ver que la portada cambia (`revalidateTag`) sin redeploy.
8. Netlify > Logs > Functions y Edge Functions: sin `config_invalid` ni `site_url_missing`.

## 5. Límites del plan gratuito que importan

- Functions sincrónicas cortan a los ~10 s por defecto; `maxDuration = 300` de `/api/mail/retry`
  no se respeta. Por eso la corrida de reintento se acota sola a ~8 s (sección 6).
- Lo que corre en `after()` (mails) sigue después de la respuesta, pero dentro del mismo tope de la
  función. El envío de un anuncio deja de empezar mails a los ~6 s y lo que falta lo retoma el cron.
- Si la build falla por secret scanning con una variable pública, ver arriba; no apagues el scanning
  entero.

## 6. Reintento de mails: Scheduled Function `mail-retry` (T-098, G-02)

`webApp/netlify/functions/mail-retry.mts` corre **cada 15 minutos** (`*/15 * * * *`, UTC) y hace
`POST /api/mail/retry` con `Authorization: Bearer $CRON_SECRET`. Netlify la detecta sola
(directorio por defecto `netlify/functions` dentro de `base`); no hace falta tocar `netlify.toml`.
Solo corre en el deploy publicado de `main`, nunca en previews.

- **Requisito:** `CRON_SECRET` cargada en Site configuration > Environment variables, con scope
  **Functions** (la lee la función) y **Runtime** (la valida la ruta). Sin ella la función no llama
  a nada y deja `mail_retry_cron` con `reason: "missing_env"` en los logs; la ruta respondería 503.
- **Qué hace cada corrida:** retoma hasta 2 anuncios con turnos pendientes y hasta 25 mails
  transaccionales (bienvenida, inscripción aprobada o rechazada, aviso a la docente, certificado),
  con un plazo de ~8 s: deja de empezar envíos cuando quedan menos de 2,5 s y lo demás queda en
  `mail_log` para la corrida siguiente. Un mail ya confirmado nunca se repite (dedupe de
  `mail_log`).
- **Primera corrida después del deploy:** reenvía todo lo que haya quedado trabado de los
  **últimos 3 días** (transaccionales con `sent_at` nulo, con intentos y turno vencido) y los
  anuncios con turnos pendientes, sin límite de antigüedad. Los datos se leen de hoy: no sale un
  «te aprobaron» de una inscripción que ya no está activa. Si hay mucho acumulado se reparte en
  varias corridas de 15 min. Para ver qué va a salir antes de activarla:

  ```sql
  select mail_type, count(*) from mail_log
   where sent_at is null and attempts < 3 and claimed_at < now() - interval '10 minutes'
     and (mail_type = 'course_announcement' or created_at > now() - interval '3 days')
   group by 1;
  ```
- **Cómo verificar:** Netlify > Logs > Functions > `mail-retry`: una línea `mail_retry_cron` con
  `ok: true` y el conteo `{ announcements, transactional }` cada 15 min. Para dispararla a mano:
  `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<sitio>/api/mail/retry`.
- **Conexión SMTP por lote:** no se reutiliza. El cliente SMTP propio abre, conversa y cierra en
  cada envío (un solo plazo de 5 s para todo el diálogo); reutilizarla exigiría reescribirlo (ver
  el informe de T-098).

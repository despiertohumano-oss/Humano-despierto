// G-02 (T-098) · Scheduled Function de Netlify: cada 15 min reintenta los mails trabados (anuncios y
// transaccionales de los últimos 3 días) llamando a /api/mail/retry. Corre solo en el deploy
// publicado (no en previews ni branch deploys). Necesita CRON_SECRET en las variables del sitio;
// sin ella no llama a nada y lo deja en el log. Runbook: docs/deploy-netlify.md.
// Sin `@netlify/functions`: el tipo `Config` es solo `{ schedule }` y no justifica una dependencia.
import { triggerMailRetry } from "../../src/lib/deploy/mail-retry-cron";

export default async function mailRetry(): Promise<void> {
  const outcome = await triggerMailRetry({
    env: { SITE_URL: process.env.SITE_URL, URL: process.env.URL, CRON_SECRET: process.env.CRON_SECRET },
  });
  const line = JSON.stringify({ event: "mail_retry_cron", ts: new Date().toISOString(), ...outcome });
  if (outcome.ok) console.info(line);
  else console.error(line);
}

// Literal y no la constante importada: Netlify lee `config` por análisis estático del archivo.
// `mail-retry-cron.test.ts` verifica que coincida con MAIL_RETRY_SCHEDULE.
export const config = {
  schedule: "*/15 * * * *",
};

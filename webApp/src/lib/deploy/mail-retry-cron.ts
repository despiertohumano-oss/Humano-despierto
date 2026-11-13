// G-02 (T-098) · lo que hace la Scheduled Function de Netlify (`netlify/functions/mail-retry.mts`):
// un POST a `/api/mail/retry` con el mismo `Authorization: Bearer $CRON_SECRET` que ya valida la ruta.
// Sin alias `@/` ni `server-only`: Netlify empaqueta la función por su cuenta con esbuild.
// La ruta acota su propia corrida a ~8 s (`MAIL_RUN_BUDGET_MS`); este fetch solo espera ese resultado.

export const MAIL_RETRY_SCHEDULE = "*/15 * * * *";
const REQUEST_TIMEOUT_MS = 20_000;

export type MailRetryEnv = Partial<Record<"SITE_URL" | "URL" | "CRON_SECRET", string>>;

export type MailRetryOutcome =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; body: unknown }
  | { ok: false; reason: string };

export async function triggerMailRetry({
  env,
  fetchFn = fetch,
}: {
  env: MailRetryEnv;
  fetchFn?: (url: string, init: RequestInit) => Promise<Response>;
}): Promise<MailRetryOutcome> {
  const base = (env.SITE_URL || env.URL || "").replace(/\/$/, "");
  const secret = env.CRON_SECRET;
  if (!base || !secret) return { ok: false, reason: "missing_env" };

  try {
    const res = await fetchFn(`${base}/api/mail/retry`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // La ruta siempre responde JSON; un HTML acá es una página de error del proveedor.
    }
    return res.ok ? { ok: true, status: res.status, body } : { ok: false, status: res.status, body };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

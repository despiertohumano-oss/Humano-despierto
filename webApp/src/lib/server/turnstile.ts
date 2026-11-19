import "server-only";
import { TURNSTILE_ACTION, TURNSTILE_ORIGIN, turnstileConfig } from "@/lib/security/turnstile-config";

// siteverify según developers.cloudflare.com/turnstile (verificado con Context7 el 2026-11-18):
// token de un solo uso, vence a los 300 s, hasta 2048 caracteres.
const SITEVERIFY = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`;
const MAX_TOKEN = 2048;
// Corto a propósito: la verificación va antes del modelo, dentro del mismo tope de 60 s de Netlify.
export const TURNSTILE_TIMEOUT_MS = 5000;

export type HumanCheckResult = { ok: true } | { ok: false; reason: "missing" | "invalid" | "action" | "network" | "timeout"; codes?: string[] };
/** Verifica que el pedido lo hizo una persona. `ip` puede ser "unknown". */
export type HumanCheck = (token: unknown, ip: string) => Promise<HumanCheckResult>;

type VerifyDeps = { secretKey: string; timeoutMs: number; remoteIp?: string; fetch?: typeof fetch };

export async function verifyTurnstile(token: unknown, deps: VerifyDeps): Promise<HumanCheckResult> {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN) return { ok: false, reason: "missing" };
  const doFetch = deps.fetch ?? fetch;
  const body = new URLSearchParams({ secret: deps.secretKey, response: token });
  if (deps.remoteIp && deps.remoteIp !== "unknown") body.set("remoteip", deps.remoteIp);

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const res = await Promise.race([
      doFetch(SITEVERIFY, { method: "POST", body, signal: controller.signal, cache: "no-store" }),
      // Plazo propio además de la señal, como en la llamada al modelo.
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort(new Error("timeout"));
          reject(new Error("timeout"));
        }, deps.timeoutMs);
      }),
    ]);
    if (!res.ok) return { ok: false, reason: "network" };
    const data = (await res.json()) as { success?: unknown; action?: unknown; "error-codes"?: unknown };
    if (data?.success !== true) {
      const codes = Array.isArray(data?.["error-codes"]) ? data["error-codes"].filter((c): c is string => typeof c === "string") : [];
      return { ok: false, reason: "invalid", codes };
    }
    // Las claves de prueba pueden no devolver `action`: se compara solo si viene.
    if (typeof data.action === "string" && data.action !== "" && data.action !== TURNSTILE_ACTION) return { ok: false, reason: "action" };
    return { ok: true };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** null = Turnstile apagado (falta alguna de las dos claves). */
export function humanCheckFromEnv(env: Record<string, string | undefined> = process.env): HumanCheck | null {
  const config = turnstileConfig(env);
  if (!config) return null;
  return (token, ip) => verifyTurnstile(token, { secretKey: config.secretKey, timeoutMs: TURNSTILE_TIMEOUT_MS, remoteIp: ip });
}

// T-106 · Cloudflare Turnstile delante de la lectura redactada. Sin `server-only`: lo leen el proxy
// (para la CSP), las páginas y el cliente (solo las constantes).
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
// Se le pasa al widget y se compara en siteverify: un token sacado para otra cosa no sirve acá.
export const TURNSTILE_ACTION = "lectura-ia";

export type TurnstileConfig = { siteKey: string; secretKey: string };

/** Encendido solo con las dos claves; si falta cualquiera, el endpoint funciona sin captcha. */
export function turnstileConfig(env: Record<string, string | undefined>): TurnstileConfig | null {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

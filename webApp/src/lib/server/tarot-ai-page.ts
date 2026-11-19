import "server-only";
import { headers } from "next/headers";
import type { TurnstileProps } from "@/hooks/useTarotAiReading";
import { turnstileConfig } from "@/lib/security/turnstile-config";
import { encodeReading, type Reading } from "@/lib/tarot/codec";
import type { AiReadingRequest } from "@/lib/tarot/ai/cache";
import { isTarotAiEnabled } from "@/lib/server/tarot-ai";

/** Lo que las páginas de lectura le pasan a ReadingView para la lectura redactada (T-106). */
export async function tarotAiProps(reading: Reading, question: string | null): Promise<{ ai: AiReadingRequest | null; turnstile: TurnstileProps | null }> {
  if (!isTarotAiEnabled()) return { ai: null, turnstile: null };
  const ai = { t: reading.spread, c: encodeReading(reading), q: question };
  const config = turnstileConfig(process.env);
  // El nonce de la CSP de este pedido (lo escribe src/proxy.ts) va en el script de Turnstile.
  return { ai, turnstile: config ? { siteKey: config.siteKey, nonce: (await headers()).get("x-nonce") } : null };
}

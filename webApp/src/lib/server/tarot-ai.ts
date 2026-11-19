import "server-only";
import { NextResponse } from "next/server";
import { log } from "@/lib/server/log";
import { geminiModel, GeminiError, type ModelCall } from "@/lib/server/gemini";
import { guardReading } from "@/lib/tarot/ai/guard";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/tarot/ai/prompt";
import { decodeReading } from "@/lib/tarot/codec";
import { sanitizeQuestion } from "@/lib/tarot/question";
import { buildReading, type ReadingFacts } from "@/lib/tarot/reading";

export type { ModelCall };

// Netlify corta las funciones sincrónicas a los 60 s (docs/deploy-netlify.md §5); el limitador
// suma hasta 2 s. 20 s deja margen de sobra y es lo más que tiene sentido esperar con la lectura
// por plantillas ya en pantalla.
export const TAROT_AI_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export type TarotAiConfig = { apiKey: string; model: string };

export function tarotAiConfig(env: Record<string, string | undefined>): TarotAiConfig | null {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, model: env.GEMINI_MODEL?.trim() || DEFAULT_MODEL };
}

/** La única lectura de `process.env` de la función; sin clave queda apagada. */
export function isTarotAiEnabled(): boolean {
  return tarotAiConfig(process.env) !== null;
}

function modelFromEnv(): ModelCall | null {
  const config = tarotAiConfig(process.env);
  return config ? geminiModel(config) : null;
}

function fail(reason: string, extra: Record<string, unknown> = {}): null {
  // Nunca la pregunta ni el texto del modelo: son de la persona.
  void log.warn("tarot_ai_failed", { reason, ...extra });
  return null;
}

/** Párrafos ya validados, o null ante cualquier fallo: la página se queda con la lectura por plantillas. */
export async function writeTarotReading(facts: ReadingFacts, deps: { model: ModelCall | null; timeoutMs: number }): Promise<string[] | null> {
  if (!deps.model) return null;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      deps.model({ system: SYSTEM_PROMPT, user: buildUserMessage(facts), signal: controller.signal }),
      // Plazo propio además de la señal: un cliente que la ignore no puede colgar la función.
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort(new Error("timeout"));
          reject(new Error("timeout"));
        }, deps.timeoutMs);
      }),
    ]);
    if (raw === null) return fail("empty");
    const checked = guardReading(raw, facts);
    return checked.ok ? checked.paragraphs : fail("guard", { guard: checked.reason });
  } catch (err) {
    if (err instanceof GeminiError) return fail("http", { status: err.status });
    return fail(controller.signal.aborted ? "timeout" : "network", { error: err instanceof Error ? err.name : "unknown" });
  } finally {
    clearTimeout(timer);
  }
}

const MAX_FIELD = 400;
const bad = () => NextResponse.json({ parrafos: null }, { status: 400 });

/** POST /api/tarot/lectura-ia sin el limitador (lo pone route.ts). El modelo se inyecta para probarlo sin red. */
export async function handleTarotAiRequest(request: Request, model: ModelCall | null = modelFromEnv()): Promise<Response> {
  // Gasta cuota de la escuela: solo desde el propio sitio. Sin la cabecera (navegador viejo) pasa, y el cupo lo frena.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ parrafos: null }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad();
  }
  const { t, c, q } = (body ?? {}) as Record<string, unknown>;
  if (typeof t !== "string" || typeof c !== "string" || t.length > MAX_FIELD || c.length > MAX_FIELD) return bad();
  if (q !== undefined && q !== null && (typeof q !== "string" || q.length > MAX_FIELD)) return bad();

  // Se vuelve a decodificar la tirada: del cliente solo llega la misma codificación que la URL.
  const reading = decodeReading(t, c);
  if (!reading) return bad();
  const facts = buildReading(reading, sanitizeQuestion(typeof q === "string" ? q : null));
  const parrafos = await writeTarotReading(facts, { model, timeoutMs: TAROT_AI_TIMEOUT_MS });
  return NextResponse.json({ parrafos });
}

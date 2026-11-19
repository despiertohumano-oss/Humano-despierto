import "server-only";
import { NextResponse } from "next/server";
import { readCapped } from "@/lib/http/read-capped";
import { log } from "@/lib/server/log";
import { geminiModel, GeminiError, type ModelCall } from "@/lib/server/gemini";
import { guardReading, type GuardReason } from "@/lib/tarot/ai/guard";
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

// Fallos que otra redacción puede corregir (el modelo varía de una vez a otra). Contenido y método no:
// señalan una pregunta o un modelo que empuja hacia lo prohibido.
const RETRYABLE: ReadonlySet<GuardReason> = new Set(["largo", "formato", "inventa", "cartas", "prediccion"]);
const MAX_ATTEMPTS = 2;

/** Párrafos ya validados, o null ante cualquier fallo: la página se queda con la lectura por plantillas. */
export async function writeTarotReading(facts: ReadingFacts, deps: { model: ModelCall | null; timeoutMs: number }): Promise<string[] | null> {
  if (!deps.model) return null;
  // La guarda rechaza cualquier mención de enfermedades: una consulta de salud no gasta cuota.
  if (facts.domain === "salud") return null;
  const model = deps.model;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Un solo plazo para todos los intentos; además de la señal, por si el cliente la ignora.
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Error("timeout"));
      reject(new Error("timeout"));
    }, deps.timeoutMs);
  });
  try {
    const request = { system: SYSTEM_PROMPT, user: buildUserMessage(facts), signal: controller.signal };
    for (let attempt = 1; ; attempt++) {
      const raw = await Promise.race([model(request), deadline]);
      if (raw === null) return fail("empty");
      const checked = guardReading(raw, facts);
      if (checked.ok) return checked.paragraphs;
      if (attempt >= MAX_ATTEMPTS || !RETRYABLE.has(checked.reason)) return fail("guard", { guard: checked.reason, attempt });
    }
  } catch (err) {
    if (err instanceof GeminiError) return fail("http", { status: err.status });
    return fail(controller.signal.aborted ? "timeout" : "network", { error: err instanceof Error ? err.name : "unknown" });
  } finally {
    clearTimeout(timer);
  }
}

const MAX_FIELD = 400;
// t + c + q (≤ 400 cada uno) y el token de Turnstile (≤ 2048) entran holgados.
const MAX_BODY_BYTES = 4096;
const bad = () => NextResponse.json({ parrafos: null }, { status: 400 });
const tooLarge = () => NextResponse.json({ parrafos: null }, { status: 413 });

/** POST /api/tarot/lectura-ia sin el limitador (lo pone route.ts). El modelo se inyecta para probarlo sin red. */
export async function handleTarotAiRequest(request: Request, model: ModelCall | null = modelFromEnv()): Promise<Response> {
  // Gasta cuota de la escuela: solo desde el propio sitio. Sin la cabecera (navegador viejo) pasa, y el cupo lo frena.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return NextResponse.json({ parrafos: null }, { status: 403 });

  // Tope antes de parsear: `content-length` puede faltar (chunked) o mentir, así que también se lee con tope.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLarge();
  const raw = await readCapped(request, MAX_BODY_BYTES);
  if (raw === null) return tooLarge();
  let body: unknown;
  try {
    body = JSON.parse(raw);
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

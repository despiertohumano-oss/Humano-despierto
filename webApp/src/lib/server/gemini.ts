import "server-only";

// T-106 · Cliente mínimo de generateContent (REST v1beta de la API de Gemini, verificado con la
// documentación de ai.google.dev el 2026-11-18). Sin SDK: una sola llamada no justifica sumar
// @google/genai con sus dependencias, y el `fetch` inyectable deja probarlo sin red.

export type ModelRequest = { system: string; user: string; signal: AbortSignal };
/** Texto del modelo, o null si no hay una respuesta completa y utilizable. */
export type ModelCall = (req: ModelRequest) => Promise<string | null>;

export class GeminiError extends Error {
  override name = "GeminiError";
  constructor(readonly status: number) {
    super(`gemini respondió ${status}`);
  }
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// ~450 palabras en castellano son ~800 tokens; el margen evita cortar una lectura apenas larga.
// Una salida cortada (MAX_TOKENS) se descarta igual.
const MAX_OUTPUT_TOKENS = 2048;
// Los filtros vienen apagados por defecto desde Gemini 2.5; una consulta angustiada no tiene que
// volver con contenido peligroso. Bloqueado = sin texto = lectura por plantillas.
const SAFETY = ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map(
  (category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" }),
);

type Part = { text?: unknown; thought?: unknown };
type Body = { candidates?: { content?: { parts?: Part[] }; finishReason?: unknown }[] };

export function geminiModel({ apiKey, model, fetch: doFetch = fetch }: { apiKey: string; model: string; fetch?: typeof fetch }): ModelCall {
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`;
  return async ({ system, user, signal }) => {
    const res = await doFetch(url, {
      method: "POST",
      // La clave por cabecera y no en `?key=`: una URL termina en logs de proxies.
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
        safetySettings: SAFETY,
      }),
      signal,
      cache: "no-store",
    });
    if (!res.ok) throw new GeminiError(res.status);
    const body = (await res.json()) as Body;
    const cand = body?.candidates?.[0];
    if (!cand || cand.finishReason !== "STOP" || !Array.isArray(cand.content?.parts)) return null;
    const text = cand.content.parts
      .filter((p) => p.thought !== true && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("")
      .trim();
    return text.length ? text : null;
  };
}

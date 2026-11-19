import { describe, expect, it } from "vitest";
import { GeminiError, geminiModel } from "./gemini";

type Call = { url: string; init: RequestInit };

function fakeFetch(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const OK_BODY = {
  candidates: [{ content: { parts: [{ text: "Primer párrafo." }, { text: " Sigue." }] }, finishReason: "STOP" }],
};

const req = () => ({ system: "SISTEMA", user: "USUARIO", signal: new AbortController().signal });

describe("geminiModel", () => {
  it("manda la clave por cabecera, el sistema aparte, tope de tokens y filtros de seguridad", async () => {
    const calls: Call[] = [];
    const model = geminiModel({ apiKey: "k-secreta", model: "gemini-3.5-flash-lite", fetch: fakeFetch(200, OK_BODY, calls) });
    await expect(model(req())).resolves.toBe("Primer párrafo. Sigue.");
    const [{ url, init }] = calls;
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("k-secreta");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k-secreta");
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction).toEqual({ parts: [{ text: "SISTEMA" }] });
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "USUARIO" }] }]);
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(0);
    expect(body.safetySettings.map((s: { category: string }) => s.category)).toContain("HARM_CATEGORY_DANGEROUS_CONTENT");
    expect(init.signal).toBeDefined();
  });

  it("un 429 es un GeminiError con su estado", async () => {
    const model = geminiModel({ apiKey: "k", model: "m", fetch: fakeFetch(429, { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "cuota" } }) });
    const err = await model(req()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GeminiError);
    expect((err as GeminiError).status).toBe(429);
  });

  it.each([
    ["cortada por tope de tokens", { candidates: [{ content: { parts: [{ text: "a medias" }] }, finishReason: "MAX_TOKENS" }] }],
    ["bloqueada por seguridad", { candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }] }],
    ["prompt bloqueado", { promptFeedback: { blockReason: "SAFETY" } }],
    ["sin texto", { candidates: [{ content: { parts: [{ text: "   " }] }, finishReason: "STOP" }] }],
    ["forma inesperada", { foo: 1 }],
  ])("respuesta %s da null", async (_n, body) => {
    const model = geminiModel({ apiKey: "k", model: "m", fetch: fakeFetch(200, body) });
    await expect(model(req())).resolves.toBeNull();
  });

  it("descarta las partes de razonamiento", async () => {
    const body = { candidates: [{ content: { parts: [{ text: "pensando", thought: true }, { text: "Texto." }] }, finishReason: "STOP" }] };
    const model = geminiModel({ apiKey: "k", model: "m", fetch: fakeFetch(200, body) });
    await expect(model(req())).resolves.toBe("Texto.");
  });
});

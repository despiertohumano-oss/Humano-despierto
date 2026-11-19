import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import * as route from "./route";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/limits";
import { handleTarotAiRequest, type ModelCall } from "@/lib/server/tarot-ai";

const URL_ = "http://localhost:3000/api/tarot/lectura-ia";
const BODY = { t: "cruz-simple", c: "9.66r.16.37.17", q: "¿Qué hago con mi trabajo?" };

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "ip", ip: "203.0.113.9" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/tarot/lectura-ia", () => {
  it("sin GEMINI_API_KEY responde sin lectura redactada", async () => {
    const res = await route.POST(req(BODY));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ parrafos: null });
  });

  it("al pasar el cupo responde 429 sin lectura", async () => {
    const { max } = RATE_LIMITS.interpretTarotReadingPost;
    for (let i = 0; i < max; i++) await route.POST(req(BODY));
    const res = await route.POST(req(BODY));
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ parrafos: null });
  });
});

describe("handleTarotAiRequest", () => {
  const never: ModelCall = async () => {
    throw new Error("no debía llamarse");
  };

  it.each([
    ["JSON roto", "{", 400],
    ["tirada inexistente", { ...BODY, t: "inventada" }, 400],
    ["cartas repetidas", { ...BODY, c: "9.9.16.37.17" }, 400],
    ["cantidad de cartas incorrecta", { ...BODY, c: "9.37" }, 400],
    ["campos con tipo incorrecto", { t: 1, c: ["9"] }, 400],
  ])("rechaza %s sin llamar al modelo", async (_n, body, status) => {
    const res = await handleTarotAiRequest(req(body), never);
    expect(res.status).toBe(status);
  });

  it("corta un cuerpo demasiado grande antes de parsearlo (B11)", async () => {
    const big = JSON.stringify({ ...BODY, relleno: "x".repeat(20_000) });
    const declared = await handleTarotAiRequest(req(big), never);
    expect(declared.status).toBe(413);
    // Sin content-length (chunked): se corta leyendo.
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
    const chunked = new Request(URL_, { method: "POST", headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" }, body: stream, duplex: "half" } as RequestInit);
    expect((await handleTarotAiRequest(chunked, never)).status).toBe(413);
  });

  it("rechaza un pedido de otro sitio", async () => {
    const res = await handleTarotAiRequest(req(BODY, { "sec-fetch-site": "cross-site" }), never);
    expect(res.status).toBe(403);
  });

  it("vuelve a decodificar la tirada y no usa hechos del cliente", async () => {
    let user = "";
    const model: ModelCall = async (r) => {
      user = r.user;
      return null;
    };
    const res = await handleTarotAiRequest(req({ ...BODY, facts: { placed: [{ card: { nombre_es: "Carta Falsa" } }] } }), model);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ parrafos: null });
    expect(user).toContain("El Ermitaño");
    expect(user).not.toContain("Carta Falsa");
  });

  it("sanea la pregunta antes de mandarla", async () => {
    let user = "";
    const model: ModelCall = async (r) => {
      user = r.user;
      return null;
    };
    await handleTarotAiRequest(req({ ...BODY, q: "  ¿Qué‮hago?\n\n" + "x".repeat(300) }), model);
    const q = user.slice(user.indexOf("<pregunta>\n") + 11, user.indexOf("\n</pregunta>"));
    expect(q.startsWith("¿Qué hago?")).toBe(true);
    expect(Array.from(q).length).toBeLessThanOrEqual(140);
  });

describe("handleTarotAiRequest con Turnstile encendido", () => {
  const model: ModelCall = async () => null;

  it("sin token responde 403 y no llama al modelo ni a Cloudflare", async () => {
    let modelCalls = 0;
    let verifyCalls = 0;
    const res = await handleTarotAiRequest(req(BODY), async () => (modelCalls++, null), async () => (verifyCalls++, { ok: true }));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ parrafos: null });
    expect(modelCalls).toBe(0);
    expect(verifyCalls).toBe(0);
  });

  it("con un token que Cloudflare rechaza responde 403 sin llamar al modelo", async () => {
    let modelCalls = 0;
    const res = await handleTarotAiRequest(req({ ...BODY, token: "malo" }), async () => (modelCalls++, null), async () => ({ ok: false, reason: "invalid", codes: [] }));
    expect(res.status).toBe(403);
    expect(modelCalls).toBe(0);
  });

  it("con token válido sigue hasta el modelo, con la IP del pedido", async () => {
    let modelCalls = 0;
    const seen: { token: unknown; ip: string }[] = [];
    const res = await handleTarotAiRequest(
      req({ ...BODY, token: "XXXX.DUMMY.TOKEN.XXXX" }, { "x-nf-client-connection-ip": "203.0.113.5" }),
      async () => (modelCalls++, null),
      async (token, ip) => (seen.push({ token, ip }), { ok: true }),
    );
    expect(res.status).toBe(200);
    expect(modelCalls).toBe(1);
    expect(seen).toEqual([{ token: "XXXX.DUMMY.TOKEN.XXXX", ip: "203.0.113.5" }]);
  });

  it("apagado (null), el token se ignora y todo sigue como antes", async () => {
    let modelCalls = 0;
    const res = await handleTarotAiRequest(req(BODY), async () => (modelCalls++, null), null);
    expect(res.status).toBe(200);
    expect(modelCalls).toBe(1);
    void model;
  });
});
});

import { describe, expect, it } from "vitest";
import { humanCheckFromEnv, verifyTurnstile } from "./turnstile";

type Call = { url: string; init: RequestInit };
const ok = (body: unknown, calls: Call[] = [], status = 200): typeof fetch =>
  (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

const base = { secretKey: "1x0000000000000000000000000000000AA", timeoutMs: 1000 };

describe("verifyTurnstile", () => {
  it("valida contra siteverify con el secreto, el token y la IP", async () => {
    const calls: Call[] = [];
    const r = await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", { ...base, remoteIp: "203.0.113.9", fetch: ok({ success: true, hostname: "localhost" }, calls) });
    expect(r).toEqual({ ok: true });
    expect(calls[0]!.url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(String(calls[0]!.init.body));
    expect(body.get("secret")).toBe(base.secretKey);
    expect(body.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX");
    expect(body.get("remoteip")).toBe("203.0.113.9");
  });

  it("sin IP conocida no la manda", async () => {
    const calls: Call[] = [];
    await verifyTurnstile("t", { ...base, remoteIp: "unknown", fetch: ok({ success: true }, calls) });
    expect(new URLSearchParams(String(calls[0]!.init.body)).has("remoteip")).toBe(false);
  });

  it("token inválido o vencido: falla con sus códigos", async () => {
    const r = await verifyTurnstile("t", { ...base, fetch: ok({ success: false, "error-codes": ["timeout-or-duplicate"] }) });
    expect(r).toEqual({ ok: false, reason: "invalid", codes: ["timeout-or-duplicate"] });
  });

  it("acción distinta de la del widget: falla", async () => {
    const r = await verifyTurnstile("t", { ...base, fetch: ok({ success: true, action: "login" }) });
    expect(r).toMatchObject({ ok: false, reason: "action" });
  });

  it.each([
    ["vacío", ""],
    ["no texto", 42],
    ["más largo que 2048", "x".repeat(2049)],
  ])("token %s: falla sin llamar a Cloudflare", async (_n, token) => {
    const calls: Call[] = [];
    expect(await verifyTurnstile(token, { ...base, fetch: ok({ success: true }, calls) })).toEqual({ ok: false, reason: "missing" });
    expect(calls).toHaveLength(0);
  });

  it("error de red: falla", async () => {
    const boom = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await verifyTurnstile("t", { ...base, fetch: boom })).toEqual({ ok: false, reason: "network" });
  });

  it("respuesta no 2xx o rara: falla", async () => {
    expect(await verifyTurnstile("t", { ...base, fetch: ok({ success: true }, [], 500) })).toEqual({ ok: false, reason: "network" });
    expect(await verifyTurnstile("t", { ...base, fetch: ok("hola") })).toEqual({ ok: false, reason: "invalid", codes: [] });
  });

  it("si Cloudflare no contesta, el plazo propio corta", async () => {
    const hang = ((_u: unknown, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)))) as typeof fetch;
    expect(await verifyTurnstile("t", { ...base, timeoutMs: 20, fetch: hang })).toEqual({ ok: false, reason: "timeout" });
    const deaf = (() => new Promise(() => {})) as typeof fetch;
    expect(await verifyTurnstile("t", { ...base, timeoutMs: 20, fetch: deaf })).toEqual({ ok: false, reason: "timeout" });
  });
});

describe("humanCheckFromEnv", () => {
  it("con las dos claves, Turnstile es obligatorio; si falta cualquiera, queda apagado", () => {
    const both = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" };
    expect(humanCheckFromEnv(both)).toBeTypeOf("function");
    expect(humanCheckFromEnv({ ...both, TURNSTILE_SECRET_KEY: "" })).toBeNull();
    expect(humanCheckFromEnv({ ...both, NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined })).toBeNull();
    expect(humanCheckFromEnv({})).toBeNull();
  });
});

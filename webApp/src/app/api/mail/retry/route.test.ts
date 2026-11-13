import { beforeEach, describe, expect, it, vi } from "vitest";

const retry = vi.hoisted(() => vi.fn(async () => ({ announcements: 2, transactional: 3 })));
vi.mock("@/lib/server/mail/notify", () => ({ retryPendingMail: retry }));

import { GET, POST } from "./route";

const req = (auth?: string) =>
  new Request("https://humano.example/api/mail/retry", { headers: auth ? { authorization: auth } : {} });

describe("GET /api/mail/retry", () => {
  beforeEach(() => {
    retry.mockClear();
    vi.stubEnv("CRON_SECRET", "s3creto-de-prueba-largo-1234567890");
  });

  it("sin secreto configurado responde 503 y no corre", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(req("Bearer x"))).status).toBe(503);
    expect(retry).not.toHaveBeenCalled();
  });

  it.each([[undefined], ["Bearer otro"], ["s3creto-de-prueba-largo-1234567890"]])("credencial %s responde 401", async (a) => {
    expect((await GET(req(a))).status).toBe(401);
    expect(retry).not.toHaveBeenCalled();
  });

  it("con el secreto correcto corre y devuelve el conteo", async () => {
    const res = await GET(req("Bearer s3creto-de-prueba-largo-1234567890"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ announcements: 2, transactional: 3 });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

// G-02 (T-098): la Scheduled Function de Netlify llama con POST y el mismo header.
describe("POST /api/mail/retry", () => {
  const post = (auth?: string) =>
    new Request("https://humano.example/api/mail/retry", { method: "POST", headers: auth ? { authorization: auth } : {} });

  beforeEach(() => {
    retry.mockClear();
    vi.stubEnv("CRON_SECRET", "s3creto-de-prueba-largo-1234567890");
  });

  it("sin el secreto responde 401 y no corre", async () => {
    expect((await POST(post("Bearer otro"))).status).toBe(401);
    expect(retry).not.toHaveBeenCalled();
  });

  it("sin CRON_SECRET configurado responde 503", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(post("Bearer x"))).status).toBe(503);
  });

  it("con el secreto corre una vez y devuelve el conteo", async () => {
    const res = await POST(post("Bearer s3creto-de-prueba-largo-1234567890"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ announcements: 2, transactional: 3 });
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

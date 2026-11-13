import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MAIL_RETRY_SCHEDULE, triggerMailRetry } from "./mail-retry-cron";

const SECRET = "s3creto-de-prueba-largo-1234567890";

describe("triggerMailRetry (G-02)", () => {
  it("hace POST a /api/mail/retry del sitio con Bearer CRON_SECRET", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ announcements: 1, transactional: 2 }), { status: 200 }));
    const r = await triggerMailRetry({ env: { URL: "https://escuela.example/", CRON_SECRET: SECRET }, fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://escuela.example/api/mail/retry");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${SECRET}`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(r).toEqual({ ok: true, status: 200, body: { announcements: 1, transactional: 2 } });
  });

  it("SITE_URL manda sobre URL de Netlify", async () => {
    const fetchFn = vi.fn(async (_url: string, _init: RequestInit) => new Response("{}", { status: 200 }));
    await triggerMailRetry({ env: { SITE_URL: "https://propio.example", URL: "https://x.netlify.app", CRON_SECRET: SECRET }, fetchFn });
    expect(fetchFn.mock.calls[0][0]).toBe("https://propio.example/api/mail/retry");
  });

  it("sin CRON_SECRET o sin URL no llama a nada", async () => {
    const fetchFn = vi.fn();
    await expect(triggerMailRetry({ env: { URL: "https://escuela.example" }, fetchFn })).resolves.toEqual({
      ok: false,
      reason: "missing_env",
    });
    await expect(triggerMailRetry({ env: { CRON_SECRET: SECRET }, fetchFn })).resolves.toMatchObject({ ok: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("un 401 o un corte de red vuelven como resultado, sin lanzar y sin el secreto", async () => {
    const r401 = await triggerMailRetry({
      env: { URL: "https://escuela.example", CRON_SECRET: SECRET },
      fetchFn: async () => new Response('{"error":"unauthorized"}', { status: 401 }),
    });
    expect(r401).toMatchObject({ ok: false, status: 401 });
    const caido = await triggerMailRetry({
      env: { URL: "https://escuela.example", CRON_SECRET: SECRET },
      fetchFn: async () => {
        throw new Error("fetch failed");
      },
    });
    expect(caido).toEqual({ ok: false, reason: "fetch failed" });
    expect(JSON.stringify([r401, caido])).not.toContain(SECRET);
  });
});

describe("Scheduled Function de Netlify", () => {
  const source = readFileSync(join(__dirname, "..", "..", "..", "netlify", "functions", "mail-retry.mts"), "utf8");

  it("corre cada 15 minutos", () => {
    expect(MAIL_RETRY_SCHEDULE).toBe("*/15 * * * *");
    expect(source).toContain(`schedule: "${MAIL_RETRY_SCHEDULE}"`);
  });

  it("delega en triggerMailRetry (no duplica la llamada ni el formato de auth)", () => {
    expect(source).toContain("triggerMailRetry");
    expect(source).not.toMatch(/Bearer/);
  });
});

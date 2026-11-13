import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/server/mail/send", () => ({ sendMail: mocks.sendMail }));

import { errorFingerprint, normalizeErrorPath, recordErrorEvent } from "./error-events";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://escuela.test");
  vi.stubEnv("MAIL_FROM_ADDRESS", "escuela@example.com");
  vi.stubEnv("ERROR_ALERT_EMAIL", "");
  mocks.sendMail.mockResolvedValue({ ok: true });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  mocks.rpc.mockReset();
  mocks.sendMail.mockReset();
});

describe("normalizeErrorPath / errorFingerprint", () => {
  it("agrupa ids y números, conserva slugs y saca query y hash", () => {
    expect(normalizeErrorPath("/leccion/8b0c7e7a-1f7e-4c55-9f0e-3a2b1c0d9e8f?t=1")).toBe("/leccion/:id");
    expect(normalizeErrorPath("/certificado/123#x")).toBe("/certificado/:id");
    expect(normalizeErrorPath("/cursos/tarot-iniciatico")).toBe("/cursos/tarot-iniciatico");
  });

  it("la misma falla en dos lecciones da la misma huella; otra ruta, otra", () => {
    const a = errorFingerprint("server", "/leccion/8b0c7e7a-1f7e-4c55-9f0e-3a2b1c0d9e8f", "boom");
    const b = errorFingerprint("server", "/leccion/00000000-1f7e-4c55-9f0e-3a2b1c0d9e8f", "boom");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(errorFingerprint("client", "/leccion/:id", "boom")).not.toBe(a);
  });
});

describe("recordErrorEvent", () => {
  it("guarda el error redactado y avisa por mail cuando la base lo pide", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await recordErrorEvent({ source: "server", path: "/panel?code=x", message: "falló para ana@correo.com", routeType: "render", digest: "d1" });

    const [fn, args] = mocks.rpc.mock.calls[0];
    expect(fn).toBe("record_error_event");
    expect(args).toMatchObject({ p_source: "server", p_path: "/panel", p_route_type: "render", p_digest: "d1" });
    expect(args.p_message).not.toContain("ana@correo.com");

    const mail = mocks.sendMail.mock.calls[0][0];
    expect(mail.to.email).toBe("escuela@example.com");
    expect(mail.subject).toBe("Error en el sitio: /panel");
    expect(mail.text).toContain("https://escuela.test/panel/admin/errores");
    expect(mail.text).not.toContain("ana@correo.com");
  });

  it("ERROR_ALERT_EMAIL cambia el destinatario", async () => {
    vi.stubEnv("ERROR_ALERT_EMAIL", "alertas@example.com");
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await recordErrorEvent({ source: "client", path: "/", message: "x" });
    expect(mocks.sendMail.mock.calls[0][0].to.email).toBe("alertas@example.com");
  });

  it("sin pedido de aviso no manda mail", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await recordErrorEvent({ source: "server", path: "/", message: "x" });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("nunca lanza: ni con la base caída ni con un error de la función", async () => {
    mocks.rpc.mockRejectedValueOnce(new Error("sin red"));
    await expect(recordErrorEvent({ source: "server", path: "/", message: "x" })).resolves.toBeUndefined();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denegado" } });
    await expect(recordErrorEvent({ source: "server", path: "/", message: "x" })).resolves.toBeUndefined();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});

describe("listErrorEvents", () => {
  it("devuelve null si la base todavía no tiene la tabla (0078 sin aplicar)", async () => {
    const { listErrorEvents } = await import("./error-events");
    const chain = { select: () => chain, order: () => chain, limit: () => Promise.resolve({ data: null, error: { code: "PGRST205", message: "no table" } }) };
    const mod = await import("@/lib/supabase/service");
    vi.spyOn(mod, "createServiceRoleClient").mockReturnValue({ from: () => chain } as never);
    expect(await listErrorEvents()).toBeNull();
  });
});

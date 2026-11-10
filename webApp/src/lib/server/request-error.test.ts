import { afterEach, describe, expect, it, vi } from "vitest";

const recordErrorEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/error-events", () => ({ recordErrorEvent }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { reportRequestError } from "./request-error";

afterEach(() => vi.restoreAllMocks());

const CTX = { routerKind: "App Router", routePath: "/panel", routeType: "render" };

describe("reportRequestError", () => {
  it("loguea request_error con el digest que Next le puso al error, sin query", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = Object.assign(new Error("boom"), { digest: "d123" });
    await reportRequestError(err, { path: "/panel?code=secreto", method: "GET", headers: {} }, CTX);
    const line = JSON.parse(String(spy.mock.calls[0][0]));
    expect(line).toMatchObject({
      level: "error",
      event: "request_error",
      digest: "d123",
      path: "/panel",
      routerKind: "App Router",
      routeType: "render",
      err: { message: "boom" },
    });
    expect(String(spy.mock.calls[0][0])).not.toContain("secreto");
  });

  it("no lanza con un error que no es Error y deja digest en null", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      reportRequestError("texto", { path: "/", method: "GET", headers: {} }, { ...CTX, routeType: "route" }),
    ).resolves.toBeUndefined();
    expect(JSON.parse(String(spy.mock.calls[0][0])).digest).toBeNull();
  });
});

describe("reportRequestError · error_events", () => {
  it("guarda la falla del servidor con su mensaje real", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    recordErrorEvent.mockClear();
    const err = Object.assign(new TypeError("x is undefined"), { digest: "d9" });
    await reportRequestError(err, { path: "/cursos/a?q=1", method: "GET", headers: {} }, CTX);
    expect(recordErrorEvent).toHaveBeenCalledWith({
      source: "server",
      path: "/cursos/a",
      message: "TypeError: x is undefined",
      routeType: "render",
      digest: "d9",
    });
  });

  it("notFound y redirect no se guardan", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    recordErrorEvent.mockClear();
    const err = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/x;307;" });
    await reportRequestError(err, { path: "/", method: "GET", headers: {} }, CTX);
    expect(recordErrorEvent).not.toHaveBeenCalled();
  });
});

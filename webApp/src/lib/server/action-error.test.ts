import { describe, expect, it, vi } from "vitest";

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/log", () => ({ log: { warn } }));

import { actionError, UserFacingError } from "./action-error";

describe("actionError (D-120)", () => {
  it("un error del motor queda en el log y la usuaria recibe el mensaje neutro", () => {
    const err = { code: "42501", message: "permission denied for table lesson_notes" };
    expect(actionError(err, "No se pudo guardar.")).toBe("No se pudo guardar.");
    expect(warn).toHaveBeenCalledWith("action_failed", { context: "No se pudo guardar.", err });
  });

  it("un Error común tampoco pasa su texto", () => {
    expect(actionError(new Error("relation courses does not exist"), "No se pudo.")).toBe("No se pudo.");
  });

  it("un UserFacingError pasa tal cual, sin ruido en el log", () => {
    warn.mockClear();
    expect(actionError(new UserFacingError("No autorizado: ese curso no te pertenece."), "x")).toBe("No autorizado: ese curso no te pertenece.");
    expect(warn).not.toHaveBeenCalled();
  });
});

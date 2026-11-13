import { describe, expect, it, vi } from "vitest";
import { createSessionMirror, type MirrorProfile } from "./session-mirror";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const A = { id: "a", email: "a@x" };
const B = { id: "b", email: "b@x" };

describe("createSessionMirror (S-05, T-096)", () => {
  it("pinta el perfil de la sesión vigente", async () => {
    const setUser = vi.fn();
    const mirror = createSessionMirror({
      loadProfile: async () => ({ full_name: "Ana", glyph: "○", role: "teacher" }),
      setUser,
    });
    await mirror(A);
    expect(setUser).toHaveBeenCalledWith({ id: "a", email: "a@x", fullName: "Ana", glyph: "○", role: "teacher" });
  });

  it("sin sesión vacía el espejo", async () => {
    const setUser = vi.fn();
    await createSessionMirror({ loadProfile: vi.fn(), setUser })(null);
    expect(setUser).toHaveBeenCalledWith(null);
  });

  it("la respuesta tardía del perfil de A no pisa la sesión de B", async () => {
    const setUser = vi.fn();
    const perfilA = deferred<MirrorProfile | null>();
    const loadProfile = vi.fn((id: string) =>
      id === "a" ? perfilA.promise : Promise.resolve({ full_name: "Bea", glyph: null, role: "student" as const }),
    );
    const mirror = createSessionMirror({ loadProfile, setUser });

    const a = mirror(A);
    await mirror(null);
    await mirror(B);
    perfilA.resolve({ full_name: "Ana", glyph: null, role: "admin" });
    await a;

    expect(setUser).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b", fullName: "Bea" }));
    expect(setUser).not.toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("la respuesta tardía de A tampoco pinta nada después de salir", async () => {
    const setUser = vi.fn();
    const perfilA = deferred<MirrorProfile | null>();
    const mirror = createSessionMirror({ loadProfile: () => perfilA.promise, setUser });
    const a = mirror(A);
    await mirror(null);
    perfilA.resolve({ full_name: "Ana", glyph: null, role: "student" });
    await a;
    expect(setUser.mock.calls).toEqual([[null]]);
  });

  it("sin fila de perfil cae en student, sin nombre", async () => {
    const setUser = vi.fn();
    await createSessionMirror({ loadProfile: async () => null, setUser })(A);
    expect(setUser).toHaveBeenCalledWith({ id: "a", email: "a@x", fullName: null, glyph: null, role: "student" });
  });
});

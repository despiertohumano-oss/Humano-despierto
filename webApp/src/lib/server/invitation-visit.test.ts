import { describe, expect, it, vi } from "vitest";
import { INVALID_INVITATION_PATH, INVALID_WITH_SESSION_PATH, INVITED_NEW_PASSWORD_PATH, resolveInvitationVisit, type VisitDeps } from "./invitation-visit";

const TOKEN = "A".repeat(43);

function deps(over: Partial<VisitDeps> = {}) {
  const calls: string[] = [];
  const d: VisitDeps = {
    signInWithAccess: vi.fn(async () => (calls.push("access"), true)),
    userId: vi.fn(async () => (calls.push("userId"), "u-1")),
    accept: vi.fn(async () => (calls.push("accept"), true)),
    refreshSession: vi.fn(async () => void calls.push("refresh")),
    roleOf: vi.fn(async () => (calls.push("roleOf"), "teacher")),
    ...over,
  };
  return { d, calls };
}

describe("resolveInvitationVisit", () => {
  it("token con otra forma: página neutra sin mirar la sesión", async () => {
    const { d } = deps();
    await expect(resolveInvitationVisit("corto", d)).resolves.toBe(INVALID_INVITATION_PATH);
    expect(d.userId).not.toHaveBeenCalled();
  });

  it("sin sesión: a /entrar con next codificado, sin aceptar nada", async () => {
    const { d } = deps({ userId: vi.fn(async () => null) });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe(`/entrar?next=%2Finvitacion%2F${TOKEN}`);
    expect(d.accept).not.toHaveBeenCalled();
  });

  it("ajena, vencida o revocada (accept=false): página neutra que sugiere salir, sin refrescar (c.3, c.4)", async () => {
    const { d } = deps({ accept: vi.fn(async () => false) });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe(INVALID_WITH_SESSION_PATH);
    expect(d.refreshSession).not.toHaveBeenCalled();
  });

  it("aceptada: refresca la sesión ANTES de decidir el destino por rol (c.2)", async () => {
    const { d, calls } = deps();
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/docente");
    expect(calls).toEqual(["userId", "accept", "refresh", "roleOf"]);
    expect(d.accept).toHaveBeenCalledWith(TOKEN, "u-1");
  });

  it("una admin que acepta va a su panel (c.10)", async () => {
    const { d } = deps({ roleOf: vi.fn(async () => "admin") });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/admin");
  });

  it("si el refresh falla, igual redirige: el layout lee profiles y el claim se corrige solo", async () => {
    const { d } = deps({
      refreshSession: vi.fn(async () => {
        throw new Error("refresh");
      }),
    });
    await expect(resolveInvitationVisit(TOKEN, d)).resolves.toBe("/panel/docente");
  });

  describe("con acceso en el link", () => {
    const ACCESO = { hash: "h".repeat(56), type: "magiclink" as const };

    /** Navegador sin sesión: la sesión aparece solo si el canje funcionó. */
    function sinSesion(over: Partial<VisitDeps> = {}) {
      let canjeado = false;
      const calls: string[] = [];
      const base = deps(over);
      const d: VisitDeps = {
        ...base.d,
        signInWithAccess: vi.fn(async (a) => {
          calls.push("access");
          canjeado = await (over.signInWithAccess ?? (async () => true))(a);
          return canjeado;
        }),
        userId: vi.fn(async () => (calls.push("userId"), canjeado ? "u-1" : null)),
        accept: vi.fn(async (t: string, u: string) => (calls.push("accept"), await (over.accept ?? (async () => true))(t, u))),
        refreshSession: vi.fn(async () => void calls.push("refresh")),
        roleOf: vi.fn(async () => (calls.push("roleOf"), "teacher")),
      };
      return { d, calls };
    }

    it("sin sesión previa: entra con la cuenta invitada y acepta", async () => {
      const { d, calls } = sinSesion();
      await expect(resolveInvitationVisit(TOKEN, d, ACCESO)).resolves.toBe("/panel/docente");
      expect(d.signInWithAccess).toHaveBeenCalledWith(ACCESO);
      expect(calls).toEqual(["userId", "access", "userId", "accept", "refresh", "roleOf"]);
    });

    it("cuenta creada por la invitación: va a elegir su clave", async () => {
      const { d } = sinSesion();
      await expect(resolveInvitationVisit(TOKEN, d, { ...ACCESO, type: "signup" as const })).resolves.toBe(INVITED_NEW_PASSWORD_PATH);
    });

    it("acceso vencido o usado, sin sesión: a entrar a mano, como sin acceso", async () => {
      const { d } = sinSesion({ signInWithAccess: vi.fn(async () => false) });
      await expect(resolveInvitationVisit(TOKEN, d, { ...ACCESO, type: "signup" as const })).resolves.toBe(`/entrar?next=%2Finvitacion%2F${TOKEN}`);
      expect(d.accept).not.toHaveBeenCalled();
    });

    it("si el canje tira error, sigue como sin acceso", async () => {
      const { d } = sinSesion({
        signInWithAccess: vi.fn(async () => {
          throw new Error("red");
        }),
      });
      await expect(resolveInvitationVisit(TOKEN, d, ACCESO)).resolves.toBe(`/entrar?next=%2Finvitacion%2F${TOKEN}`);
    });

    // S-02 (T-096): canjear con otra sesión abierta la reemplazaba en silencio, y lo que esa
    // persona cargara después quedaba en la cuenta invitada (login-CSRF por link reenviado).
    it("con la sesión de OTRA cuenta abierta: no canjea y la manda a salir primero", async () => {
      const { d } = deps({ userId: vi.fn(async () => "otra"), accept: vi.fn(async () => false) });
      await expect(resolveInvitationVisit(TOKEN, d, ACCESO)).resolves.toBe(INVALID_WITH_SESSION_PATH);
      expect(d.signInWithAccess).not.toHaveBeenCalled();
      expect(d.accept).toHaveBeenCalledWith(TOKEN, "otra");
      expect(d.refreshSession).not.toHaveBeenCalled();
    });

    it("con la sesión de la cuenta invitada ya abierta: acepta sin canjear", async () => {
      const { d, calls } = deps();
      await expect(resolveInvitationVisit(TOKEN, d, ACCESO)).resolves.toBe("/panel/docente");
      expect(d.signInWithAccess).not.toHaveBeenCalled();
      expect(calls).toEqual(["userId", "accept", "refresh", "roleOf"]);
    });

    it("sesión propia abierta y acceso signup: al panel, nunca a elegir clave", async () => {
      const { d } = deps();
      await expect(resolveInvitationVisit(TOKEN, d, { ...ACCESO, type: "signup" as const })).resolves.toBe("/panel/docente");
    });

    it("token con otra forma: ni siquiera canjea el acceso", async () => {
      const { d } = deps();
      await expect(resolveInvitationVisit("corto", d, ACCESO)).resolves.toBe(INVALID_INVITATION_PATH);
      expect(d.signInWithAccess).not.toHaveBeenCalled();
    });
  });
});

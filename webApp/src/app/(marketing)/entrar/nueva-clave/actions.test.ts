import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  createClient: vi.fn(),
  role: { value: "student" as string | null },
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { updatePasswordAction } from "./actions";
import { PASSWORD_UPDATE_INITIAL_STATE } from "@/lib/auth/action-state";
import { AUTH_COPY } from "@/lib/auth/messages";

const submit = (password: string, confirm = password) => {
  const fd = new FormData();
  fd.set("password", password);
  fd.set("confirm", confirm);
  return updatePasswordAction(PASSWORD_UPDATE_INITIAL_STATE, fd);
};

describe("updatePasswordAction", () => {
  beforeEach(() => {
    [mocks.getUser, mocks.updateUser, mocks.createClient, mocks.redirect].forEach((m) => m.mockClear());
    mocks.role.value = "student";
    const perfil = { select: () => perfil, eq: () => perfil, maybeSingle: async () => ({ data: mocks.role.value ? { role: mocks.role.value } : null, error: null }) };
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser, updateUser: mocks.updateUser }, from: () => perfil });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("claves distintas no tocan Supabase", async () => {
    expect((await submit("clave-uno", "clave-dos")).error).toMatch(/no coinciden/);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("sin sesión (link vencido o pantalla abierta a mano) no actualiza", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await submit("clave-nueva")).toEqual({ error: AUTH_COPY.linkExpired });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("misma clave que la anterior da el copy propio", async () => {
    mocks.updateUser.mockResolvedValue({ data: { user: null }, error: { code: "same_password" } });
    expect(await submit("clave-vieja")).toEqual({ error: AUTH_COPY.samePassword });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("éxito: actualiza con la clave y redirige a /panel", async () => {
    await expect(submit("clave-nueva")).rejects.toThrow(/NEXT_REDIRECT:\/panel$/);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "clave-nueva" });
  });

  it("una docente (recién invitada) va a su panel", async () => {
    mocks.role.value = "teacher";
    await expect(submit("clave-nueva")).rejects.toThrow(/NEXT_REDIRECT:\/panel\/docente$/);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryChain } from "@/test/query-chain";

const { createClient, createServiceRoleClient } = vi.hoisted(() => ({ createClient: vi.fn(), createServiceRoleClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { ensureCertificate } from "./certificates";

function session(tables: Record<string, unknown>) {
  const from = vi.fn((t: string) => queryChain(() => tables[t] ?? { data: null, error: null }).chain);
  createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) }, from });
  return from;
}

describe("ensureCertificate · issues_certificate (B2)", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
  });

  it("un curso que no emite: null, sin leer lecciones ni insertar", async () => {
    const from = session({
      certificates: { data: null, error: null },
      courses: { data: { issues_certificate: false }, error: null },
    });
    expect(await ensureCertificate("c1")).toBeNull();
    expect(from).not.toHaveBeenCalledWith("lessons");
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("lo emitido antes de apagar el flag se sigue devolviendo", async () => {
    const from = session({ certificates: { data: { code: "abc" }, error: null } });
    expect(await ensureCertificate("c1")).toBe("abc");
    expect(from).not.toHaveBeenCalledWith("courses");
  });

  it("un error al leer el curso no se traga: no emite a ciegas", async () => {
    session({ certificates: { data: null, error: null }, courses: { data: null, error: { message: "boom" } } });
    await expect(ensureCertificate("c1")).rejects.toThrow(/curso/);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

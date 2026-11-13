import { describe, expect, it, vi } from "vitest";
import { queryChain } from "@/test/query-chain";

const { createServiceRoleClient } = vi.hoisted(() => ({ createServiceRoleClient: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { getFounderId } from "./admin";

describe("getFounderId (B4)", () => {
  it("lee el perfil con is_founder y devuelve su id, o null", async () => {
    const { chain, calls } = queryChain(() => ({ data: { id: "f1" }, error: null }));
    createServiceRoleClient.mockReturnValue({ from: () => chain });
    expect(await getFounderId()).toBe("f1");
    expect(calls).toContainEqual({ method: "eq", args: ["is_founder", true] });

    createServiceRoleClient.mockReturnValue({ from: () => queryChain(() => ({ data: null, error: null })).chain });
    expect(await getFounderId()).toBeNull();
  });
});

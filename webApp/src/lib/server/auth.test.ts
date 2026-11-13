import { describe, expect, it, vi } from "vitest";

// Fuera de un render de servidor `cache()` de React no memoriza; acá se simula el alcance de UN
// request para afirmar que `getCurrentUser` pasa por él (G-07).
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
      let memo: { value: R } | null = null;
      return (...args: A) => (memo ??= { value: fn(...args) }).value;
    },
  };
});

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { getCurrentUser } from "./auth";

describe("getCurrentUser (G-07)", () => {
  it("dentro de un mismo request, GoTrue y profiles se consultan una sola vez", async () => {
    const getUser = vi.fn(async () => ({ data: { user: { id: "u-1", email: "a@b.c" } }, error: null }));
    const single = vi.fn(async () => ({ data: { full_name: "Ana", glyph: null, role: "student" }, error: null }));
    createClient.mockResolvedValue({
      auth: { getUser },
      from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    });

    const [a, b] = await Promise.all([getCurrentUser(), getCurrentUser()]);
    const c = await getCurrentUser();

    expect(a).toEqual({ id: "u-1", email: "a@b.c", fullName: "Ana", glyph: null, role: "student" });
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(single).toHaveBeenCalledTimes(1);
  });
});

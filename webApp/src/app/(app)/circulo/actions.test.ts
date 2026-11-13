import { beforeEach, describe, expect, it, vi } from "vitest";

const { rateLimitSubject, getCurrentUser, createClient } = vi.hoisted(() => ({
  rateLimitSubject: vi.fn(),
  getCurrentUser: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createCampusPostAction, moderateCampusPostAction, updateCampusPostAction } from "./actions";
import { CAMPUS_ACTION_INITIAL_STATE } from "@/lib/campus/action-state";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const FULL = form({ postId: "p1", courseSlug: "tarot", body: "hola", reason: "spam" });

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
  getCurrentUser.mockReset();
  createClient.mockReset();
});

// G-04 (T-098): `requireSession()` lanzaba fuera de todo try y el UserFacingError terminaba en la
// pantalla de error (y en error_events) en vez de volver en el estado del formulario.
describe("Círculo sin sesión", () => {
  it.each([
    ["createCampusPostAction", createCampusPostAction],
    ["updateCampusPostAction", updateCampusPostAction],
    ["moderateCampusPostAction", moderateCampusPostAction],
  ])("%s devuelve el aviso en el estado y no toca la base", async (_name, action) => {
    getCurrentUser.mockResolvedValue(null);
    await expect(action(CAMPUS_ACTION_INITIAL_STATE, FULL)).resolves.toEqual({
      error: "No autorizado: iniciá sesión.",
      success: null,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("si leer la sesión falla, mensaje neutro en vez de lanzar", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getCurrentUser.mockRejectedValue(new Error("fetch failed: gotrue"));
    const r = await createCampusPostAction(CAMPUS_ACTION_INITIAL_STATE, FULL);
    expect(r.error).toBe("No se pudo publicar.");
  });
});

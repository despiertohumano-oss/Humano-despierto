import type { AppRole, AuthUser } from "@/lib/stores/useAuthStore";

export interface MirrorProfile {
  full_name: string | null;
  glyph: string | null;
  role: AppRole;
}

interface MirrorDeps {
  loadProfile(userId: string): PromiseLike<MirrorProfile | null>;
  setUser(user: AuthUser | null): void;
}

/**
 * Traduce cada cambio de sesión a `useAuthStore`. El perfil llega asíncrono: si mientras tanto la
 * sesión cambió (salió A y entró B en el mismo dispositivo), la respuesta de A se descarta en vez
 * de pintar su nombre en el header de B (S-05, T-096). Solo UI: la autoridad sigue en el servidor.
 */
export function createSessionMirror(deps: MirrorDeps) {
  let currentUserId: string | null = null;

  return async function mirror(user: { id: string; email?: string | null } | null): Promise<void> {
    currentUserId = user?.id ?? null;
    if (!user) {
      deps.setUser(null);
      return;
    }
    const profile = await deps.loadProfile(user.id);
    if (currentUserId !== user.id) return;
    deps.setUser({
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      glyph: profile?.glyph ?? null,
      role: profile?.role ?? "student",
    });
  };
}

"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/useAuthStore";
import { createSessionMirror, type MirrorProfile } from "@/lib/auth/session-mirror";

/**
 * Puebla `useAuthStore` con la sesión real vía `onAuthStateChange` (dispara
 * de inmediato con el estado actual al suscribirse — cubre login, logout y
 * refresh de token sin recargar). Solo pinta UI (Nav): la autoridad de
 * permisos vive en el servidor contra `profiles.role`, nunca acá.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const supabase = createClient();
    const mirror = createSessionMirror({
      loadProfile: (userId) =>
        supabase
          .from("profiles")
          .select("full_name, glyph, role")
          .eq("id", userId)
          .single()
          .then(({ data }: { data: MirrorProfile | null }) => data),
      setUser,
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      void mirror(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}

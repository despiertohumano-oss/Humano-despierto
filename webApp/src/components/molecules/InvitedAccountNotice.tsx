"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

export const INVITED_FLAG = "invitacion";

// NB-1 (T-097): el link de invitación deja la sesión de la cuenta invitada en un navegador limpio.
// Si lo abrió otra persona (link reenviado), tiene que ver de qué cuenta se trata y poder salir
// antes de cargar datos suyos en ella.
export function InvitedAccountNotice({ email, className }: { email: string; className?: string }) {
  const [leaving, setLeaving] = useState(false);

  async function salir() {
    setLeaving(true);
    await createClient().auth.signOut();
    window.location.assign("/entrar");
  }

  return (
    <div role="status" className={cn("rounded-md border border-linea bg-papel px-4 py-3 text-sm text-tinta", className)}>
      Entraste como <strong className="break-all font-semibold text-bosque">{email}</strong>.{" "}
      ¿No sos vos?{" "}
      <button
        type="button"
        onClick={salir}
        disabled={leaving}
        className="font-semibold text-miel-800 underline underline-offset-2 disabled:opacity-60"
      >
        Salir
      </button>
    </div>
  );
}

/** Solo en el aterrizaje del link de invitación (`?invitacion=1`); el resto del panel no lo muestra. */
export function InvitedAccountBanner({ email }: { email: string }) {
  const flagged = useSearchParams().get(INVITED_FLAG) === "1";
  if (!flagged) return null;
  return (
    // pt-20: el SiteHeader es fijo (h-16) y taparía el aviso.
    <div className="bg-fondo px-4 pt-20">
      <InvitedAccountNotice email={email} className="mx-auto max-w-[1200px]" />
    </div>
  );
}

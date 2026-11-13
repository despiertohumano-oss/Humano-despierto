import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthShell from "@/components/molecules/AuthShell";
import { RECOVER_PATH } from "@/lib/auth/paths";
import { InvitedAccountNotice } from "@/components/molecules/InvitedAccountNotice";
import NuevaClaveForm from "./NuevaClaveForm";

export const metadata: Metadata = {
  title: "Nueva clave",
  robots: { index: false, follow: false },
};

// La sesión la deja /auth/callback al canjear el code de recuperación. Sin ella no hay a quién
// cambiarle la clave: se vuelve a pedir el enlace.
export default async function NuevaClavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ?invitacion=1: la cuenta la creó una invitación de docente y entró por el link del mail.
  const invitacion = (await searchParams).invitacion === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(RECOVER_PATH);

  return (
    <AuthShell
      aside="nuevaClave"
      title={invitacion ? "Elegí tu" : "Elegí una clave"}
      accent={invitacion ? "clave" : "nueva"}
      lead={invitacion ? "Ya sos docente de Humano Despierto. Con esta clave y tu mail vas a entrar las próximas veces." : "La vas a usar desde tu próximo ingreso."}
    >
      {invitacion && user.email && <InvitedAccountNotice email={user.email} className="mb-6" />}
      <NuevaClaveForm />
    </AuthShell>
  );
}

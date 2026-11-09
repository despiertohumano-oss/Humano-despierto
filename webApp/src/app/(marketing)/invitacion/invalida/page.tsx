import type { Metadata } from "next";
import { ButtonLink } from "@/components/atoms/Button";
import AuthShell from "@/components/molecules/AuthShell";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

// Un solo mensaje para ajena, vencida, revocada o inexistente (SP-4 c.3, c.4): distinguirlas
// le diría a quien tiene un link ajeno qué probar. Con una sesión abierta, la causa más común es
// haberlo abierto con otra cuenta: se sugiere salir, sin decir de quién era la invitación.
export default async function InvitacionInvalidaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const conSesion = (await searchParams).sesion === "1";
  return (
    <AuthShell
      aside="invitacion"
      title="Esta invitación"
      accent="no es válida o venció"
      lead={
        conSesion
          ? "Puede que la hayas abierto con otra cuenta. Salí desde el menú de tu cuenta y volvé a abrir el link del mail, o pedile a quien te invitó que te mande una nueva."
          : "Pedile a quien te invitó que te mande una nueva, o entrá con el mail al que te llegó."
      }
    >
      <ButtonLink href={conSesion ? "/panel" : "/entrar"} variant="outline">
        {conSesion ? "Ir a mi panel" : "Ir a entrar"}
      </ButtonLink>
    </AuthShell>
  );
}

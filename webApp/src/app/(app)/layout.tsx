import { Suspense } from "react";
import { redirect } from "next/navigation";
import { InvitedAccountBanner } from "@/components/molecules/InvitedAccountNotice";
import { getCurrentUser } from "@/lib/server/auth";

// Guard de servidor (defensa en profundidad — el middleware ya protege estas
// rutas antes de llegar acá). Reemplaza a `AuthGate`, que solo redirigía en
// un useEffect: con JS desactivado el contenido protegido se servía igual.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/entrar");
  }

  return (
    <>
      {user.email && (
        <Suspense fallback={null}>
          <InvitedAccountBanner email={user.email} />
        </Suspense>
      )}
      {children}
    </>
  );
}

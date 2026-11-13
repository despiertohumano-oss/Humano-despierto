import { notFound, redirect } from "next/navigation";
import { getLessonPlayerData } from "@/lib/server/lesson-player";
import { getCurrentUser } from "@/lib/server/auth";
import { safeNext } from "@/lib/auth/safe-next";
import { isUuid } from "@/lib/validation/image";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Decide el 404 ANTES de que empiece el streaming — mismo patrón y misma causa que
 * `(app)/circulo/[curso]/layout.tsx`.
 *
 * `loading.tsx` envuelve a `page.tsx` en un Suspense, y una respuesta que ya empezó a streamear
 * salió con `200` en los headers: para cuando corre el `notFound()` de la página, el status ya
 * no se puede cambiar. Una lección inexistente devolvía `200`, mientras `/cursos/no-existe` y
 * `/guias/no-existe` devuelven `404` — esas rutas no tienen `loading.tsx`.
 *
 * Esto era la deuda que el engram arrastraba como "notFound() da 200 en dev" sin causa
 * identificada. No era del modo dev: era el Suspense.
 *
 * El orden de anidado es layout → Suspense(loading) → page, así que la verificación de acá pasa
 * por afuera del boundary. `getLessonPlayerData` está envuelta en `cache()`, así que la página
 * la vuelve a pedir sin una segunda resolución.
 *
 * Se mantiene la no-distinción de T-006 c.2/c.3: "no existe" y "no tenés acceso" devuelven lo
 * mismo. El 404 no confirma la existencia de una lección a quien no puede verla.
 */
export default async function LeccionLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  // Un id que no es UUID reventaba en Postgres (500); acá se corta antes de consultar.
  if (!isUuid(id)) notFound();
  if (await getLessonPlayerData(id)) return <>{children}</>;
  // G-06 (T-098): sin sesión, el login con vuelta a la lección. No revela nada: toda lección
  // (exista o no) responde igual. Con sesión y sin acceso sigue el 404.
  if (!(await getCurrentUser())) redirect(`/entrar?next=${encodeURIComponent(safeNext(`/leccion/${id}`))}`);
  notFound();
}

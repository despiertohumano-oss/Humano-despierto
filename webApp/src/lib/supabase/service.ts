import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de service_role (bypassa RLS) — ADR-001: nunca se mezcla con el de sesión.
 * Uso EXCLUSIVO: leer/escribir columnas localizadoras de contenido pago
 * (`lessons.video_id`, `lesson_resources.drive_file_id`/`.url`) y otros campos de servidor
 * (`courses.status`, `lessons.is_published`/`duration_seconds`, `enrollments`,
 * `profiles.role`) — ADR-003 regla A. También firma el avatar de la ficha pública
 * (`/guias/[slug]`, T-042), nunca lee datos de `profiles`; firma las portadas de cursos
 * PUBLICADOS (`signPublicUploadUrls`, T-047) y las de los cursos en los que la alumna tiene inscripción
 * activa, con el path leído por su sesión (`getStudentDashboard`, D-90); y es el único que sube a `uploads` (D-34: avatar y
 * portada, después de validar bytes y titularidad) y el que borra la portada de un curso recién
 * borrado (`deleteCourseAction`). Lee los bytes de la portada de un curso PUBLICADO para su
 * imagen Open Graph (`loadCoverForOg`, T-052; el path sale de la fila, nunca del request).
 * Guarda y marca cartas natales (`save_natal_chart`, `set_self_natal_chart`, T-024) después de
 * `getUser()` y del consentimiento, con el `user.id` de la sesión, nunca uno del request.
 * Las acciones de admin lo usan después de `requireAdmin()` (que lee `profiles.role`, nunca el
 * claim del JWT, ADR-006). Cualquier otro uso de este cliente anula RLS sin que
 * nadie lo note; el llamador es responsable de verificar el permiso ANTES de invocarlo (este
 * cliente no verifica nada por sí mismo, sólo bypassa).
 *
 * Única fábrica de service_role (S-07, T-096: `getAdminSupabaseClient` era un duplicado). Sin
 * estado: un cliente por llamada, sin sesión persistida ni refresco. `import 'server-only'` es la
 * única barrera entre esta key y el bundle del browser.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

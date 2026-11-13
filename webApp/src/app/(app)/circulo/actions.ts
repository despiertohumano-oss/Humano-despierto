"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/server/auth";
import type { AuthUser } from "@/lib/stores/useAuthStore";
import { CAMPUS_ACTION_INITIAL_STATE, type CampusActionState } from "@/lib/campus/action-state";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";
import { actionError, UserFacingError } from "@/lib/server/action-error";

// T-021 · Campus. Los tres Server Actions del hilo (crear, editar, moderar) son deliberadamente
// finos: la autoridad real de "quién puede escribir/editar/borrar qué" vive en RLS + el guard
// trigger `campus_posts_guard` (migración 0014), no acá — la UI ya oculta lo que el usuario no
// puede hacer, pero si igual llega el intento (JS manipulado, ruta directa), el `error.code` que
// vuelve del INSERT/UPDATE ES el rechazo real, no un adorno.
//
// Los dos códigos, y la diferencia importa para el mensaje que se le muestra a la persona:
//   · `42501` — RLS, el guard trigger, o que el cuerpo contenga un localizador REAL de material
//     pago de la plataforma (coincidencia exacta contra `lessons.video_id` /
//     `lesson_resources.drive_file_id`, migración 0016).
//   · `23514` — el CHECK anti-localizador de ADR-009: el cuerpo TIENE FORMA de enlace.
// Rige en TODOS los hilos, no solo en el general. Una versión anterior de este comentario decía
// lo contrario y describía el bug que QA rechazó: condicionar el CHECK por hilo dejaba filtrar
// el material de un curso dentro del hilo de otro.

const PRIV_DENIED = "42501";
const CHECK_VIOLATION = "23514";

async function requireSession() {
  const user = await getCurrentUser();
  if (!user) throw new UserFacingError("No autorizado: iniciá sesión.");
  return user;
}

// G-04 (T-098): la sesión se resuelve dentro de un try para que su UserFacingError vuelva en el
// estado del formulario (y no como pantalla de error ni como error del sitio).
async function sessionOrState(
  fallback: string,
): Promise<{ user: AuthUser; state: null } | { user: null; state: CampusActionState }> {
  try {
    return { user: await requireSession(), state: null };
  } catch (err) {
    return { user: null, state: { error: actionError(err, fallback), success: null } };
  }
}

function threadPath(courseSlug: string | null): string {
  return courseSlug ? `/circulo/${courseSlug}` : "/circulo";
}

export const createCampusPostAction = withRateLimit(
  "createCampusPostAction",
  async function createCampusPostAction(
    _prevState: CampusActionState,
    formData: FormData
  ): Promise<CampusActionState> {
    const { user, state } = await sessionOrState("No se pudo publicar.");
    if (state) return state;

    const courseId = String(formData.get("courseId") ?? "").trim() || null;
    const courseSlug = String(formData.get("courseSlug") ?? "").trim() || null;
    const body = String(formData.get("body") ?? "").trim();

    if (!body) return { error: "Escribí algo antes de publicar.", success: null };
    if (body.length > 4000) return { error: "El mensaje es demasiado largo (máximo 4000 caracteres).", success: null };

    const supabase = await createClient();
    const { error } = await supabase.from("campus_posts").insert({
      course_id: courseId,
      author_id: user.id,
      body,
    });

    if (error) {
      if (error.code === PRIV_DENIED) {
        return {
          error: courseId
            ? "No podés escribir en este hilo: hace falta inscripción activa en el curso."
            : "No se pudo publicar — ¿tenés sesión iniciada?",
          success: null,
        };
      }
      if (error.code === CHECK_VIOLATION) {
        return { error: "Ese mensaje no se puede guardar: revisá que no tenga un link (acá no están permitidos).", success: null };
      }
      return { error: actionError(error, "No se pudo publicar."), success: null };
    }

    revalidatePath(threadPath(courseSlug));
    return { ...CAMPUS_ACTION_INITIAL_STATE, success: "Publicado." };
  },
  limitedState,
);

export const updateCampusPostAction = withRateLimit(
  "updateCampusPostAction",
  async function updateCampusPostAction(
    _prevState: CampusActionState,
    formData: FormData
  ): Promise<CampusActionState> {
    const { state } = await sessionOrState("No se pudo editar.");
    if (state) return state;

    const postId = String(formData.get("postId") ?? "");
    const courseSlug = String(formData.get("courseSlug") ?? "").trim() || null;
    const body = String(formData.get("body") ?? "").trim();

    if (!postId) return { error: "Falta el mensaje a editar.", success: null };
    if (!body) return { error: "El mensaje no puede quedar vacío.", success: null };
    if (body.length > 4000) return { error: "El mensaje es demasiado largo (máximo 4000 caracteres).", success: null };

    const supabase = await createClient();
    const { error } = await supabase.from("campus_posts").update({ body }).eq("id", postId);

    if (error) {
      if (error.code === PRIV_DENIED) {
        return { error: "Solo quien escribió el mensaje puede editarlo.", success: null };
      }
      if (error.code === CHECK_VIOLATION) {
        return { error: "Ese mensaje no se puede guardar: revisá que no tenga un link (acá no están permitidos).", success: null };
      }
      return { error: actionError(error, "No se pudo editar."), success: null };
    }

    revalidatePath(threadPath(courseSlug));
    return { ...CAMPUS_ACTION_INITIAL_STATE, success: "Editado." };
  },
  limitedState,
);

export const moderateCampusPostAction = withRateLimit(
  "moderateCampusPostAction",
  async function moderateCampusPostAction(
    _prevState: CampusActionState,
    formData: FormData
  ): Promise<CampusActionState> {
    const { user, state } = await sessionOrState("No se pudo borrar.");
    if (state) return state;

    const postId = String(formData.get("postId") ?? "");
    const courseSlug = String(formData.get("courseSlug") ?? "").trim() || null;
    const reason = String(formData.get("reason") ?? "").trim();

    if (!postId) return { error: "Falta el mensaje a borrar.", success: null };
    // Defensa en profundidad: el guard trigger (0014) exige lo mismo con el mismo mensaje de
    // fondo ("sin eso no hay forma de discutir una decisión de moderación") — esto solo evita
    // el viaje de ida y vuelta cuando el motivo quedó vacío.
    if (!reason) return { error: "Borrar exige un motivo — así se puede discutir la decisión después.", success: null };

    const supabase = await createClient();
    const { error } = await supabase
      .from("campus_posts")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, deleted_reason: reason })
      .eq("id", postId);

    if (error) {
      if (error.code === PRIV_DENIED) {
        return { error: "No tenés permiso para moderar este hilo.", success: null };
      }
      return { error: actionError(error, "No se pudo borrar."), success: null };
    }

    revalidatePath(threadPath(courseSlug));
    return { ...CAMPUS_ACTION_INITIAL_STATE, success: "Mensaje borrado." };
  },
  limitedState,
);

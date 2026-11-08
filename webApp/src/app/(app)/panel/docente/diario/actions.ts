"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireTeacher } from "@/lib/server/teacher";
import { assertOwnsPost, syncRelatedCourses } from "@/lib/server/diario";
import { log } from "@/lib/server/log";
import { UPLOADS_BUCKET, uploadAsServer } from "@/lib/server/uploads";
import { buildDiarioCoverPath, checkCoverBytes, IMAGE_MIME, isUuid } from "@/lib/validation/image";
import { diarioPostFormSchema } from "@/lib/validation/diario";
import { firstIssue } from "@/lib/validation/teacher";
import type { TeacherActionState } from "@/lib/teacher/action-state";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";

function readPostForm(formData: FormData) {
  return diarioPostFormSchema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    body: String(formData.get("body") ?? ""),
    category: String(formData.get("category") ?? ""),
    relatedCourseIds: formData.getAll("relatedCourseIds").map(String),
  });
}

const RELATED_ERROR: TeacherActionState = {
  error: "Solo podés vincular tus cursos publicados.",
  success: null,
  field: "relatedCourseIds",
};

function invalid(error: Parameters<typeof firstIssue>[0]): TeacherActionState {
  const { field, message } = firstIssue(error);
  return { error: message, success: null, ...(field ? { field } : {}) };
}

// El 23514/42501 lo levanta el guard del cuerpo (0018): título y resumen ya los frenó Zod.
const BODY_LOCATOR: TeacherActionState = {
  error: "El cuerpo no puede contener el link o id de un material pago de la plataforma.",
  success: null,
  field: "body",
};

// Criterio 1: nace en draft. `teacher_id` viaja en el INSERT (0018 lo permite) pero
// `diario_posts_insert_own` (RLS) exige `teacher_id = auth.uid()`, y `guard_diario_posts`
// rechaza cualquier `status`/`published_at` que el cliente intente declarar — nace en
// borrador sin que este código tenga que repetirlo.
export const createPostAction = withRateLimit(
  "createPostAction",
  async function createPostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const parsed = readPostForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;

    let newPostId: string | null = null;
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("diario_posts")
        .insert({
          teacher_id: teacher.id,
          slug: v.slug,
          title: v.title,
          excerpt: v.excerpt || null,
          body: v.body,
          category: v.category,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") return { error: "Ya existe un post con ese slug. Elegí otro.", success: null, field: "slug" };
        if (error.code === "23514" || error.code === "42501") return BODY_LOCATOR;
        return { error: `No se pudo crear el post: ${error.message}`, success: null };
      }
      newPostId = data.id;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo crear el post.", success: null };
    }

    revalidatePath("/panel/docente/diario");
    redirect(`/panel/docente/diario/${newPostId}`);
  },
  limitedState,
);

export const updatePostAction = withRateLimit(
  "updatePostAction",
  async function updatePostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return { error: "Falta el post.", success: null };

    const parsed = readPostForm(formData);
    if (!parsed.success) return invalid(parsed.error);
    const v = parsed.data;

    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { error } = await supabase
        .from("diario_posts")
        .update({ slug: v.slug, title: v.title, excerpt: v.excerpt || null, body: v.body, category: v.category })
        .eq("id", postId);

      if (error) {
        if (error.code === "23505") return { error: "Ya existe un post con ese slug.", success: null, field: "slug" };
        if (error.code === "23514" || error.code === "42501") return BODY_LOCATOR;
        return { error: `No se pudo guardar: ${error.message}`, success: null };
      }
      const link = await syncRelatedCourses(postId, v.relatedCourseIds);
      if (link.error) return RELATED_ERROR;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar el post.", success: null };
    }

    revalidatePath(`/panel/docente/diario/${postId}`);
    revalidatePath("/panel/docente/diario");
    revalidatePath("/diario");
    revalidatePath("/diario/[slug]", "page");
    return { error: null, success: "Post actualizado." };
  },
  limitedState,
);

export const deletePostAction = withRateLimit(
  "deletePostAction",
  async function deletePostAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return { error: "Falta el post.", success: null };

    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).maybeSingle();
      const { error } = await supabase.from("diario_posts").delete().eq("id", postId);
      if (error) return { error: `No se pudo borrar el post: ${error.message}`, success: null };
      if (current?.cover_path) {
        const { error: removeError } = await createServiceRoleClient().storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
        if (removeError) log.error("diario_cover_orphan", { reason: "post_deleted", path: current.cover_path, message: removeError.message });
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo borrar el post.", success: null };
    }

    revalidatePath("/panel/docente/diario");
    redirect("/panel/docente/diario");
  },
  limitedState,
);

// Criterio 1/3: publicar es explícito y es privilegio de service_role — `status`/`published_at`
// están fuera del grant de UPDATE del cliente (0018) y bloqueados además por `guard_diario_posts`
// (ADR-008: whitelist + guard). Mismo patrón que `setCoursePublishedAction`.
export const setPostPublishedAction = withRateLimit(
  "setPostPublishedAction",
  async function setPostPublishedAction(
    _prevState: TeacherActionState,
    formData: FormData
  ): Promise<TeacherActionState> {
    const teacher = await requireTeacher();
    const postId = String(formData.get("postId") ?? "");
    const nextStatus = String(formData.get("nextStatus") ?? "");
    if (!postId || (nextStatus !== "published" && nextStatus !== "draft")) {
      return { error: "Datos inválidos.", success: null };
    }

    try {
      await assertOwnsPost(postId, teacher.id);
      const service = createServiceRoleClient();
      const { error } = await service.from("diario_posts").update({ status: nextStatus }).eq("id", postId);
      if (error) return { error: `No se pudo actualizar el post: ${error.message}`, success: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo actualizar el post.", success: null };
    }

    revalidatePath(`/panel/docente/diario/${postId}`);
    revalidatePath("/panel/docente/diario");
    revalidatePath("/diario");
    return { error: null, success: nextStatus === "published" ? "Post publicado." : "Post pasado a borrador." };
  },
  limitedState,
);

// ==================================================================== portada (B3)

function revalidatePostCover(postId: string) {
  revalidatePath(`/panel/docente/diario/${postId}`);
  revalidatePath("/diario");
  revalidatePath("/diario/[slug]", "page");
}

export const uploadPostCoverAction = withRateLimit(
  "uploadPostCoverAction",
  async function uploadPostCoverAction(_prevState: TeacherActionState, formData: FormData): Promise<TeacherActionState> {
    const postId = String(formData.get("postId") ?? "");
    if (!isUuid(postId)) return { error: "Falta el post.", success: null };
    const file = formData.get("cover");
    if (!(file instanceof File)) return { error: "Elegí una imagen.", success: null };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkCoverBytes(bytes);
    if (!check.ok) return { error: check.error, success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).single();
      const path = buildDiarioCoverPath(postId, crypto.randomUUID(), check.kind);

      // D-34: sube service_role con el path armado acá; el UPDATE va con la sesión y el CHECK de 0075.
      const { error: uploadError } = await uploadAsServer(path, bytes, IMAGE_MIME[check.kind]);
      if (uploadError) return { error: "No se pudo subir la portada.", success: null };

      const service = createServiceRoleClient();
      const { error: updateError } = await supabase.from("diario_posts").update({ cover_path: path }).eq("id", postId);
      if (updateError) {
        await service.storage.from(UPLOADS_BUCKET).remove([path]);
        return { error: "No se pudo guardar la portada en el post.", success: null };
      }
      if (current?.cover_path) {
        const { error: removeError } = await service.storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
        if (removeError) log.error("diario_cover_orphan", { reason: "replaced", path: current.cover_path, message: removeError.message });
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo subir la portada.", success: null };
    }

    revalidatePostCover(postId);
    return { error: null, success: "Portada actualizada." };
  },
  limitedState,
);

export const removePostCoverAction = withRateLimit(
  "removePostCoverAction",
  async function removePostCoverAction(_prevState: TeacherActionState, formData: FormData): Promise<TeacherActionState> {
    const postId = String(formData.get("postId") ?? "");
    if (!isUuid(postId)) return { error: "Falta el post.", success: null };

    const teacher = await requireTeacher();
    try {
      await assertOwnsPost(postId, teacher.id);
      const supabase = await createClient();
      const { data: current } = await supabase.from("diario_posts").select("cover_path").eq("id", postId).single();
      if (!current?.cover_path) return { error: null, success: "El post no tenía portada." };

      const { error } = await supabase.from("diario_posts").update({ cover_path: null }).eq("id", postId);
      if (error) return { error: "No se pudo quitar la portada.", success: null };

      // Sin policy de Storage para `diario/`: borra service_role tras verificar la titularidad.
      const { error: removeError } = await createServiceRoleClient().storage.from(UPLOADS_BUCKET).remove([current.cover_path]);
      if (removeError) log.error("diario_cover_orphan", { reason: "removed", path: current.cover_path, message: removeError.message });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo quitar la portada.", success: null };
    }

    revalidatePostCover(postId);
    return { error: null, success: "Portada quitada." };
  },
  limitedState,
);

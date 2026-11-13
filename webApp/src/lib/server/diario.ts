import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseClient } from "@/lib/server/supabase-public";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { signPublicUploadUrls, signUploadUrl } from "@/lib/server/uploads";
import { diarioCategoryLabel, type DiarioCategoryKey } from "@/lib/taxonomy/diario";
import { UserFacingError } from "@/lib/server/action-error";

// T-022 · Diario — reemplaza el mock `blog.ts`. Lectura pública (sin sesión, `getPublicSupabaseClient`)
// y lectura/escritura del panel docente (cliente de sesión, RLS `diario_posts_*`, migración 0018)
// conviven en el mismo módulo — mismo criterio que `lib/server/campus.ts` (un solo dominio).

export interface PublicDiarioPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  teacherName: string;
  teacherSlug: string | null;
  teacherGlyph: string | null;
  category: string;
  categoryLabel: string;
  /** El path, no la URL: se firma por página con `signDiarioCovers`. */
  coverPath: string | null;
}

export interface PublicDiarioPost extends PublicDiarioPostSummary {
  body: string;
  relatedCourses: { slug: string; title: string; titleEm: string | null }[];
}

interface TeacherRef {
  full_name: string;
  slug: string | null;
  glyph: string | null;
}

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  category: string;
  cover_path: string | null;
  teacher: TeacherRef | TeacherRef[] | null;
}

function firstOf<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toSummary(row: PostRow): PublicDiarioPostSummary {
  const teacher = firstOf(row.teacher);
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    // `status = 'published'` ya garantiza `published_at is not null` (CHECK de la migración
    // 0018) — el `!` es seguro, no un supuesto.
    publishedAt: row.published_at!,
    teacherName: teacher?.full_name ?? "—",
    teacherSlug: teacher?.slug ?? null,
    teacherGlyph: teacher?.glyph ?? null,
    category: row.category,
    categoryLabel: diarioCategoryLabel(row.category),
    coverPath: row.cover_path,
  };
}

/** Criterio 2: `/diario` lista solo publicados, más recientes primero. B3: filtra por categoría. */
export async function getPublishedPosts(category?: DiarioCategoryKey): Promise<PublicDiarioPostSummary[]> {
  const supabase = getPublicSupabaseClient();
  let query = supabase
    .from("diario_posts")
    .select(
      `slug, title, excerpt, published_at, category, cover_path, teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph)`
    )
    .eq("status", "published");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.order("published_at", { ascending: false });

  if (error) throw new Error(`No se pudo leer el diario: ${error.message}`);
  return ((data ?? []) as unknown as PostRow[]).map(toSummary);
}

/**
 * Criterio 2: `null` si no existe O si existe pero no está publicado — misma no-distinción que
 * `getCourseBySlug`/`getTeacherBySlug` (T-017): quien pide `/diario/<slug>` de un borrador ajeno
 * no puede usar la diferencia de respuesta para enumerar. La página hace `notFound()` con esto.
 */
export async function getPostBySlug(slug: string): Promise<PublicDiarioPost | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select(
      `slug, title, excerpt, body, published_at, category, cover_path,
       teacher:profiles!diario_posts_teacher_id_fkey(full_name, slug, glyph),
       related:diario_post_courses(course:courses(slug, title, title_em))`
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el post "${slug}": ${error.message}`);
  if (!data) return null;

  type RelatedCourse = { slug: string; title: string; title_em: string | null };
  const row = data as unknown as PostRow & { body: string; related: { course: RelatedCourse | RelatedCourse[] | null }[] | null };
  return {
    ...toSummary(row),
    body: row.body,
    // RLS esconde el vínculo y el curso despublicado; el filtro de null es defensa en profundidad.
    relatedCourses: (row.related ?? [])
      .map((r) => firstOf(r.course))
      .filter((c): c is RelatedCourse => Boolean(c))
      .map((c) => ({ slug: c.slug, title: c.title, titleEm: c.title_em })),
  };
}

/** Una firma por página; los paths salen de posts publicados que `anon` ya lee. */
export async function signDiarioCovers(posts: { coverPath: string | null }[]): Promise<Map<string, string>> {
  return signPublicUploadUrls(posts.map((p) => p.coverPath));
}

// ==================================================================== panel docente

export interface TeacherDiarioPostSummary {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
}

export interface TeacherDiarioPostFields {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: "draft" | "published";
  teacherId: string;
  category: DiarioCategoryKey;
  coverPath: string | null;
  relatedCourseIds: string[];
}

interface TeacherPostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: "draft" | "published";
  teacher_id: string;
  published_at: string | null;
  updated_at: string;
}

/** Criterio 1: solo los posts DE la docente autenticada — `diario_posts_read` (RLS) ya filtra. */
export async function listTeacherPosts(teacherId: string): Promise<TeacherDiarioPostSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id, slug, title, status, published_at, updated_at")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`No se pudieron leer tus posts: ${error.message}`);
  return ((data ?? []) as unknown as TeacherPostRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Post propio completo para el editor. `null` si no existe o no es de la docente que llama —
 * misma no-distinción que `getTeacherCourseDetail` (criterio 6 de T-005).
 */
export async function getTeacherPost(postId: string, teacherId: string): Promise<TeacherDiarioPostFields | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id, slug, title, excerpt, body, status, teacher_id, category, cover_path, diario_post_courses(course_id)")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el post: ${error.message}`);
  if (!data || data.teacher_id !== teacherId) return null;

  const row = data as unknown as Omit<TeacherPostRow, "published_at" | "updated_at"> & {
    category: DiarioCategoryKey;
    cover_path: string | null;
    diario_post_courses: { course_id: string }[] | null;
  };
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    status: row.status,
    teacherId: row.teacher_id,
    category: row.category,
    coverPath: row.cover_path,
    relatedCourseIds: (row.diario_post_courses ?? []).map((r) => r.course_id),
  };
}

/**
 * Confirma titularidad con el cliente de SESIÓN — mismo patrón que `assertOwnsCourse`: los
 * Server Actions de escritura con `service_role` (publicar/despublicar) no pueden confiar en
 * que RLS los proteja, porque ELLOS son el bypass.
 */
export async function assertOwnsPost(postId: string, teacherId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diario_posts")
    .select("id")
    .eq("id", postId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo verificar la titularidad del post: ${error.message}`);
  if (!data) throw new UserFacingError("No autorizado: ese post no te pertenece.");
}

/**
 * Deja los vínculos post↔curso iguales a `courseIds`, con la sesión: la policy exige post propio y
 * el guard de 0075, curso propio y publicado (también para service_role). El llamador ya verificó
 * la titularidad con `assertOwnsPost`.
 */
export async function syncRelatedCourses(postId: string, courseIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("diario_post_courses").select("course_id").eq("post_id", postId);
  if (error) return { error: error.code ?? "read" };
  const current = new Set((data ?? []).map((r) => r.course_id as string));
  const wanted = new Set(courseIds);
  const toDelete = [...current].filter((id) => !wanted.has(id));
  const toInsert = [...wanted].filter((id) => !current.has(id));
  if (toDelete.length > 0) {
    const { error: delError } = await supabase.from("diario_post_courses").delete().eq("post_id", postId).in("course_id", toDelete);
    if (delError) return { error: delError.code ?? "delete" };
  }
  if (toInsert.length > 0) {
    const { error: insError } = await supabase
      .from("diario_post_courses")
      .insert(toInsert.map((course_id) => ({ post_id: postId, course_id })));
    if (insError) return { error: insError.code ?? "insert" };
  }
  return { error: null };
}

/** Firma la portada del post propio para el editor. No hay policy de Storage para `diario/`. */
export async function signOwnPostCover(path: string | null): Promise<string | null> {
  return signUploadUrl(createServiceRoleClient(), path);
}

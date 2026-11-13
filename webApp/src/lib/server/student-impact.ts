import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertOwnsCourse } from "@/lib/server/teacher";
import { countStudentsWithProgress, type StudentImpact } from "@/lib/teacher/student-impact";

const PAGE = 1000;

/**
 * G-01 (T-098): cuántas alumnas tienen avance en cada lección y módulo de un curso propio, para el
 * texto de confirmación de los borrados. `lesson_progress` solo deja leer filas propias, así que se
 * lee con service_role DESPUÉS de `assertOwnsCourse` (mismo orden que `getCourseRoster`), y solo
 * `user_id, lesson_id`: ni segundos ni fechas. Paginado: PostgREST corta en 1000 filas sin avisar.
 */
export async function getStudentProgressCounts(
  courseId: string,
  teacherId: string,
  modules: { id: string; lessonIds: string[] }[],
): Promise<StudentImpact> {
  await assertOwnsCourse(courseId, teacherId);

  const db = createServiceRoleClient();
  const rows: { userId: string; lessonId: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("lesson_progress")
      .select("user_id, lesson_id")
      .eq("course_id", courseId)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`No se pudo contar el avance de las alumnas: ${error.message}`);
    const page = (data ?? []) as { user_id: string; lesson_id: string }[];
    for (const r of page) rows.push({ userId: r.user_id, lessonId: r.lesson_id });
    if (page.length < PAGE) break;
  }
  return countStudentsWithProgress(modules, rows);
}

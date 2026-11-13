// G-01 (T-098): borrar un módulo o una lección arrastra por cascada (FK de 0001 y 0031) el progreso,
// las notas y las preguntas de las alumnas. Antes de confirmar, la docente ve a cuántas afecta.
// Puro: el conteo lo arma el servidor (`getStudentProgressCounts`) y la vista solo lo muestra.

export interface StudentImpact {
  byLesson: Record<string, number>;
  byModule: Record<string, number>;
}

export function countStudentsWithProgress(
  modules: { id: string; lessonIds: string[] }[],
  progress: { userId: string; lessonId: string }[],
): StudentImpact {
  const usersByLesson = new Map<string, Set<string>>();
  for (const { userId, lessonId } of progress) {
    let users = usersByLesson.get(lessonId);
    if (!users) usersByLesson.set(lessonId, (users = new Set()));
    users.add(userId);
  }

  const byLesson: Record<string, number> = {};
  for (const [lessonId, users] of usersByLesson) byLesson[lessonId] = users.size;

  const byModule: Record<string, number> = {};
  for (const m of modules) {
    const users = new Set<string>();
    for (const lessonId of m.lessonIds) for (const u of usersByLesson.get(lessonId) ?? []) users.add(u);
    byModule[m.id] = users.size;
  }
  return { byLesson, byModule };
}

export function studentLossText(count: number | null, scope: "module" | "lesson"): string {
  const where = scope === "module" ? "este módulo" : "esta lección";
  // Sin conteo (la lectura falló) no se calla el riesgo: se dice qué se pierde igual.
  if (count === null) return `No pudimos contar cuántas alumnas tienen avance en ${where}. Si alguna lo tiene, pierde su avance, sus notas y sus preguntas.`;
  if (count === 0) return `Ninguna alumna tiene avance en ${where} todavía.`;
  if (count === 1) return `1 alumna tiene avance en ${where}: pierde su avance, sus notas y sus preguntas.`;
  return `${count} alumnas tienen avance en ${where}: pierden su avance, sus notas y sus preguntas.`;
}

/** Texto del `confirm()` de «Borrar lección» en el editor de la lección (PublishLessonControl). */
export function lessonDeleteConfirmText(count: number | null): string {
  return `¿Borrar esta lección? Se pierden sus capítulos y recursos. ${studentLossText(count, "lesson")}`;
}

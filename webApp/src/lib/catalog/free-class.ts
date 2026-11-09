// La clase de muestra de un curso es la primera lección `is_preview` en orden de módulos.

export function firstPreviewLesson<T extends { isPreview: boolean }>(modules: { lessons: T[] }[]): T | null {
  for (const m of modules) {
    const hit = m.lessons.find((l) => l.isPreview);
    if (hit) return hit;
  }
  return null;
}

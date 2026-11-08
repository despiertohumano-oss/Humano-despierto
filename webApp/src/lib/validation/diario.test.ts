import { describe, expect, it } from "vitest";
import { diarioPostFormSchema } from "./diario";

describe("diarioPostFormSchema · revista (B3)", () => {
  const base = { slug: "un-post", title: "T", body: "cuerpo" };
  it("exige una categoría de la lista", () => {
    expect(diarioPostFormSchema.safeParse({ ...base, category: "astrologia" }).success).toBe(true);
    const r = diarioPostFormSchema.safeParse({ ...base, category: "reiki" });
    expect(r.error?.issues[0]).toMatchObject({ path: ["category"], message: "Elegí una categoría de la lista." });
  });
  it("cursos relacionados: uuids, hasta 6, vacío por defecto", () => {
    const ok = diarioPostFormSchema.safeParse({ ...base, category: "conciencia" });
    expect(ok.success && ok.data.relatedCourseIds).toEqual([]);
    expect(diarioPostFormSchema.safeParse({ ...base, category: "conciencia", relatedCourseIds: ["x"] }).success).toBe(false);
    const siete = Array.from({ length: 7 }, (_, i) => `40000000-0000-4000-8000-00000000000${i}`);
    expect(diarioPostFormSchema.safeParse({ ...base, category: "conciencia", relatedCourseIds: siete }).success).toBe(false);
  });
});

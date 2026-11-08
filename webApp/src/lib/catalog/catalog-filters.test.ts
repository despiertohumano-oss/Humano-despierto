import { describe, expect, it } from "vitest";
import {
  annotateCourses,
  buildDisciplineFacets,
  emptyDisciplineLabel,
  filterCourses,
  parseCatalogFilterState,
} from "@/app/(marketing)/cursos/catalog-filters";
import type { PublishedCourseSummary } from "@/lib/server/courses";

const curso = (slug: string, disciplineKey: string, discipline: string): PublishedCourseSummary => ({
  id: slug, slug, title: `Curso ${slug}`, titleEm: null, subtitle: null, desc: null,
  discipline, disciplineKey, level: "Inicial", priceCents: 100, currency: "ARS", moonGlyph: null,
  featured: false, teacherName: "Sol", totalDurationSeconds: 0, publishedAt: null, coverPath: null, hasPreview: false,
});

const cursos = annotateCourses([curso("a", "tarot", "Tarot"), curso("b", "tarot", "Tarot"), curso("c", "astrologia", "Astrología")]);

describe("catálogo · disciplinas cerradas (B1)", () => {
  it("una clave desconocida en ?disciplina= se ignora", () => {
    expect(parseCatalogFilterState({ disciplina: "reiki,tarot" }).disciplines).toEqual(["tarot"]);
    expect(parseCatalogFilterState({ disciplina: "xyz" }).disciplines).toEqual([]);
  });

  it("?disciplina=tarot (el CTA de /tarot) filtra por la clave", () => {
    expect(filterCourses(cursos, parseCatalogFilterState({ disciplina: "tarot" })).map((c) => c.slug)).toEqual(["a", "b"]);
  });

  it("las siete disciplinas, en el orden de la lista, con conteo 0 incluido", () => {
    const facets = buildDisciplineFacets(cursos, parseCatalogFilterState({}));
    expect(facets.map((f) => [f.key, f.count])).toEqual([
      ["astrologia", 1], ["tarot", 2], ["constelaciones", 0], ["magia", 0],
      ["gemoterapia", 0], ["simbologia", 0], ["talleres-lunares", 0],
    ]);
    expect(facets[2].label).toBe("Constelaciones familiares");
  });

  it("leyenda solo con una disciplina elegida que no tiene cursos", () => {
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "gemoterapia" }))).toBe("Gemoterapia");
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "tarot" }))).toBeNull();
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({ disciplina: "tarot,gemoterapia" }))).toBeNull();
    expect(emptyDisciplineLabel(cursos, parseCatalogFilterState({}))).toBeNull();
  });

  it("la búsqueda encuentra por disciplina, con o sin tildes", () => {
    expect(filterCourses(cursos, parseCatalogFilterState({ q: "astrolog" })).map((c) => c.slug)).toEqual(["c"]);
    expect(filterCourses(cursos, parseCatalogFilterState({ q: "astrologia" })).map((c) => c.slug)).toEqual(["c"]);
    expect(filterCourses(cursos, parseCatalogFilterState({ q: "ASTROLOGÍA" })).map((c) => c.slug)).toEqual(["c"]);
  });
});

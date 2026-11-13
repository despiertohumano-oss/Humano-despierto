import { describe, expect, it } from "vitest";
import { countStudentsWithProgress, lessonDeleteConfirmText, studentLossText } from "./student-impact";

describe("countStudentsWithProgress (G-01)", () => {
  const modules = [
    { id: "m1", lessonIds: ["l1", "l2"] },
    { id: "m2", lessonIds: ["l3"] },
    { id: "m3", lessonIds: [] },
  ];

  it("cuenta alumnas distintas por lección y por módulo (una alumna en dos lecciones del módulo cuenta una vez)", () => {
    const counts = countStudentsWithProgress(modules, [
      { userId: "a", lessonId: "l1" },
      { userId: "a", lessonId: "l2" },
      { userId: "b", lessonId: "l2" },
      { userId: "c", lessonId: "l3" },
    ]);
    expect(counts.byLesson).toEqual({ l1: 1, l2: 2, l3: 1 });
    expect(counts.byModule).toEqual({ m1: 2, m2: 1, m3: 0 });
  });

  it("una fila de una lección que ya no está en el currículum no suma a ningún módulo", () => {
    const counts = countStudentsWithProgress(modules, [{ userId: "a", lessonId: "otra" }]);
    expect(counts.byModule).toEqual({ m1: 0, m2: 0, m3: 0 });
  });
});

describe("studentLossText (G-01)", () => {
  it("sin alumnas con avance lo dice, sin alarmar", () => {
    expect(studentLossText(0, "lesson")).toBe("Ninguna alumna tiene avance en esta lección todavía.");
  });

  it("con una alumna, en singular, nombra avance, notas y preguntas", () => {
    expect(studentLossText(1, "module")).toBe(
      "1 alumna tiene avance en este módulo: pierde su avance, sus notas y sus preguntas.",
    );
  });

  it("sin conteo (falló la lectura) igual nombra lo que se pierde", () => {
    expect(studentLossText(null, "module")).toMatch(/No pudimos contar.*pierde su avance, sus notas y sus preguntas/);
  });

  it("con varias, en plural", () => {
    expect(studentLossText(12, "lesson")).toBe(
      "12 alumnas tienen avance en esta lección: pierden su avance, sus notas y sus preguntas.",
    );
  });
});

describe("lessonDeleteConfirmText (G-01, PublishLessonControl)", () => {
  it("además de capítulos y recursos, menciona a las alumnas", () => {
    expect(lessonDeleteConfirmText(2)).toBe(
      "¿Borrar esta lección? Se pierden sus capítulos y recursos. 2 alumnas tienen avance en esta lección: pierden su avance, sus notas y sus preguntas.",
    );
  });
});

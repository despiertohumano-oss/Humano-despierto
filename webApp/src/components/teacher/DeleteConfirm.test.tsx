import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/(app)/panel/docente/cursos/[courseId]/actions", () => ({
  updateModuleAction: vi.fn(),
  deleteModuleAction: vi.fn(),
  moveModuleAction: vi.fn(),
  moveLessonAction: vi.fn(),
  deleteLessonAction: vi.fn(),
  setLessonPublishedAction: vi.fn(),
  createLessonAction: vi.fn(),
}));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import ModuleBlock from "./ModuleBlock";
import LessonRow from "./LessonRow";
import { DeleteConfirmZone } from "./DeleteConfirm";

const LESSON = { id: "l1", position: 1, title: "Arcanos mayores", isPreview: false, isPublished: true, durationSeconds: 60, hasVideo: true };
const MODULE = { id: "m1", position: 1, title: "Primer módulo", description: null, lessons: [LESSON] };

// G-01 (T-098): borrar un módulo o una lección con un clic arrastraba el progreso, las notas y las
// preguntas de las alumnas. El botón del listado ya no envía nada: abre la confirmación.
describe("borrar módulo y lección exige confirmación escrita", () => {
  it("«Borrar módulo» es un botón que abre la confirmación, no un submit", () => {
    const html = renderToStaticMarkup(<ModuleBlock courseId="c1" module={MODULE} isFirst isLast impact={{ byLesson: { l1: 3 }, byModule: { m1: 3 } }} />);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Borrar módulo<\/button>/);
    expect(html).not.toMatch(/type="submit"[^>]*>Borrar módulo/);
  });

  it("«Borrar» de la lección en la lista tampoco envía directo", () => {
    const html = renderToStaticMarkup(<LessonRow courseId="c1" moduleId="m1" lesson={LESSON} isFirst isLast studentsWithProgress={2} />);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>Borrar<\/button>/);
    expect(html).not.toMatch(/type="submit"[^>]*>Borrar</);
  });

  it("la zona pide escribir el título y dice cuántas alumnas pierden avance, notas y preguntas", () => {
    const html = renderToStaticMarkup(
      <DeleteConfirmZone
        scope="module"
        title="Primer módulo"
        detail="Se borran sus 2 lecciones, con capítulos y recursos."
        studentsWithProgress={3}
        action={() => {}}
        isPending={false}
        error={null}
        hidden={{ courseId: "c1", moduleId: "m1" }}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain("Escribí &quot;Primer módulo&quot; para confirmar");
    expect(html).toContain("3 alumnas tienen avance en este módulo: pierden su avance, sus notas y sus preguntas.");
    expect(html).toContain("Cancelar");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });

});

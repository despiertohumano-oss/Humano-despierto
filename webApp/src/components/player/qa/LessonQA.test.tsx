import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/leccion/[id]/actions", () => ({ askQuestion: vi.fn() }));

import LessonQA from "./LessonQA";
import { PREVIEW_QA_NOTICE } from "./QuestionComposer";
import type { LessonQaData } from "@/lib/lesson-qa/types";

const QA: LessonQaData = { isAuthenticated: true, canAsk: true, canModerate: false, questions: [] };

// S-06 (T-096): en una vista previa el Q&A lo lee cualquier cuenta registrada, no solo la cohorte.
describe("LessonQA · aviso de vista previa", () => {
  it("el texto es el acordado", () => {
    expect(PREVIEW_QA_NOTICE).toBe("Esta pregunta la puede leer cualquier persona registrada.");
  });

  it("en una vista previa el formulario avisa quién lee la pregunta", () => {
    const html = renderToStaticMarkup(<LessonQA lessonId="l-1" data={QA} isPreview />);
    expect(html).toContain(PREVIEW_QA_NOTICE);
    expect(html).toMatch(/<p[^>]*class="[^"]*text-suave[^"]*"[^>]*>Esta pregunta/);
  });

  it("en una lección del curso no aparece", () => {
    const html = renderToStaticMarkup(<LessonQA lessonId="l-1" data={QA} isPreview={false} />);
    expect(html).not.toContain(PREVIEW_QA_NOTICE);
  });

  it("sin compositor (no puede preguntar) no hay aviso", () => {
    const html = renderToStaticMarkup(<LessonQA lessonId="l-1" data={{ ...QA, canAsk: false, canModerate: true }} isPreview />);
    expect(html).not.toContain(PREVIEW_QA_NOTICE);
  });
});

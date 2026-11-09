import { describe, expect, it } from "vitest";
import { firstPreviewLesson } from "./free-class";

describe("firstPreviewLesson", () => {
  const m = (...flags: boolean[]) => ({ lessons: flags.map((isPreview, i) => ({ id: `l${i}`, isPreview })) });
  it("devuelve la primera lección preview en orden de módulos", () => {
    expect(firstPreviewLesson([m(false, false), m(false, true, true)])?.id).toBe("l1");
  });
  it("null si ninguna es preview o no hay módulos", () => {
    expect(firstPreviewLesson([m(false), m()])).toBeNull();
    expect(firstPreviewLesson([])).toBeNull();
  });
});

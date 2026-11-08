import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getPublicTeachers } = vi.hoisted(() => ({ getPublicTeachers: vi.fn(async () => []) }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers, signTeacherAvatars: vi.fn(async () => new Map()) }));

import GuiasPage, { metadata } from "./page";

describe("Nuestros docentes (pantalla 6)", () => {
  it("título y bajada de la dueña; el <title> dice «Docentes»", async () => {
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).toContain("Nuestros docentes");
    expect(html).toContain("Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje.");
    expect(metadata.title).toBe("Docentes");
  });

  it("sin docentes publicados no muestra mensaje de ausencia: sólo el encabezado", async () => {
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).not.toMatch(/Todavía no hay|no hay docentes|no hay guías/i);
    expect(html).not.toContain("<ul");
  });
});

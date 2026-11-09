import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicFounderCard, PublicTeacherCard } from "@/lib/server/guias";

type Directory = { founder: PublicFounderCard | null; teachers: PublicTeacherCard[] };
const { getGuiasDirectory } = vi.hoisted(() => ({
  getGuiasDirectory: vi.fn(async (): Promise<Directory> => ({ founder: null, teachers: [] })),
}));
vi.mock("@/lib/server/guias", () => ({ getGuiasDirectory, signTeacherAvatars: vi.fn(async () => new Map()) }));

import GuiasPage, { metadata } from "./page";

const card = (slug: string, fullName: string, isFounder = false): PublicTeacherCard => ({
  id: slug, slug, fullName, glyph: null, headline: null, location: null, quote: null, yearsPractice: null,
  discipline: "Tarot", coursesCount: 1, isFounder, avatarPath: null,
});

describe("Nuestros docentes (pantalla 6)", () => {
  beforeEach(() => getGuiasDirectory.mockClear());

  it("título y bajada de la dueña; el <title> dice \"Docentes\"", async () => {
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

describe("Nuestros docentes · creadora (B4)", () => {
  it("la creadora va primera, en su tarjeta, y no se repite en la grilla", async () => {
    getGuiasDirectory.mockResolvedValueOnce({
      founder: { ...card("ana", "Ana", true), bio: "Fundó la escuela.", disciplines: ["Tarot"], courses: [{ slug: "t", title: "Tarot", titleEm: "inicial" }] },
      teachers: [card("luna", "Luna")],
    });
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).toContain("Creadora de Humano Despierto");
    expect(html.indexOf("Ana")).toBeLessThan(html.indexOf("Luna"));
    expect(html.match(/href="\/guias\/ana"/g)).toHaveLength(1);
    expect(html).toContain('href="/cursos/t"');
    expect(html).toContain("Fundó la escuela.");
  });

  it("sin creadora, nada la nombra", async () => {
    getGuiasDirectory.mockResolvedValueOnce({ founder: null, teachers: [card("luna", "Luna")] });
    const html = renderToStaticMarkup(await GuiasPage());
    expect(html).not.toContain("Creadora");
    expect(html).toContain('href="/guias/luna"');
  });
});

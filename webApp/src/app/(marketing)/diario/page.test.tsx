import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicDiarioPostSummary } from "@/lib/server/diario";

const { getPublishedPosts, signDiarioCovers } = vi.hoisted(() => ({
  getPublishedPosts: vi.fn(async (_category?: string): Promise<PublicDiarioPostSummary[]> => []),
  signDiarioCovers: vi.fn(async () => new Map<string, string>()),
}));
vi.mock("@/lib/server/diario", () => ({ getPublishedPosts, signDiarioCovers }));

import DiarioPage, { metadata } from "./page";

const render = async (sp: Record<string, string> = {}) =>
  renderToStaticMarkup(await DiarioPage({ searchParams: Promise.resolve(sp) }));

describe("Diario (pantalla 7)", () => {
  beforeEach(() => getPublishedPosts.mockClear());

  it("bajada de la dueña y metadata acorde", async () => {
    const html = await render();
    expect(html).toContain("Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos");
    expect(metadata.description).toContain("profundizar en los misterios del universo");
  });

  it("sin publicaciones muestra el mensaje de la dueña, entero y sin el texto viejo", async () => {
    const html = await render();
    expect(html).toContain(
      "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
    );
    expect(html).not.toMatch(/Todavía no hay escritos|Las guías están escribiendo|entre clase y clase/);
  });
});

describe("Diario · revista (B3)", () => {
  beforeEach(() => getPublishedPosts.mockClear());

  it("las seis categorías como filtro, con «Todas» marcada sin categoría", async () => {
    const html = await render();
    for (const label of ["Astrología", "Tarot y arquetipos", "Gemoterapia y minerales", "Simbología y símbolos de poder", "Ciclos lunares", "Conciencia y transformación personal"]) {
      expect(html).toContain(label);
    }
    const todas = html.match(/<a[^>]*>Todas<\/a>/)?.[0] ?? "";
    expect(todas).toContain('href="/diario"');
    expect(todas).toContain('aria-current="page"');
    expect(getPublishedPosts).toHaveBeenCalledWith(undefined);
  });

  it("?categoria= válida filtra; una desconocida se ignora", async () => {
    await render({ categoria: "tarot-arquetipos" });
    expect(getPublishedPosts).toHaveBeenLastCalledWith("tarot-arquetipos");
    await render({ categoria: "reiki" });
    expect(getPublishedPosts).toHaveBeenLastCalledWith(undefined);
  });

  it("cada post muestra su categoría y la portada firmada", async () => {
    getPublishedPosts.mockResolvedValueOnce([
      {
        slug: "p", title: "Post", excerpt: null, publishedAt: "2026-11-01", teacherName: "Sol", teacherSlug: "sol",
        teacherGlyph: null, category: "ciclos-lunares", categoryLabel: "Ciclos lunares", coverPath: "diario/x/y.jpg",
      },
    ]);
    signDiarioCovers.mockResolvedValueOnce(new Map([["diario/x/y.jpg", "https://s/firmada"]]));
    const html = await render();
    expect(html).toMatch(/<span class="[^"]*">Ciclos lunares<\/span> · Sol/);
    expect(html).toContain('src="https://s/firmada"');
  });
});

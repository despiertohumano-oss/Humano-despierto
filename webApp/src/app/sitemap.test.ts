import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, getPublishedCourses, getPublishedPosts, getPublicTeachers } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  getPublishedCourses: vi.fn(async () => [{ slug: "tarot-1", updatedAt: "2026-11-01T10:00:00Z" }]),
  getPublishedPosts: vi.fn(async () => []),
  getPublicTeachers: vi.fn(async () => []),
}));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/lib/server/courses", () => ({ getPublishedCourses }));
vi.mock("@/lib/server/diario", () => ({ getPublishedPosts }));
vi.mock("@/lib/server/guias", () => ({ getPublicTeachers }));

import sitemap from "./sitemap";

describe("T-091 · /sitemap.xml no se prerenderiza", () => {
  beforeEach(() => {
    connection.mockReset();
    getPublishedCourses.mockClear();
  });

  it("espera un request antes de leer la base: el build no necesita Supabase", async () => {
    // Así se ve connection() durante el prerender del build: corta antes de seguir.
    connection.mockRejectedValue(new Error("PRERENDER_BAIL"));
    await expect(sitemap()).rejects.toThrow("PRERENDER_BAIL");
    expect(getPublishedCourses).not.toHaveBeenCalled();
  });

  it("con request sigue listando el contenido publicado", async () => {
    connection.mockResolvedValue(undefined);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/cursos/tarot-1");
  });
});

describe("T-024 · fichas de carta natal en el sitemap", () => {
  it("lista la portada y las 37 fichas", async () => {
    connection.mockResolvedValue(undefined);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("http://localhost:3000/carta-natal");
    expect(urls).toContain("http://localhost:3000/carta-natal/signos/aries");
    expect(urls).toContain("http://localhost:3000/carta-natal/planetas/lilith-media");
    expect(urls).toContain("http://localhost:3000/carta-natal/casas/12");
    expect(urls.filter((u) => u.includes("/carta-natal/")).length).toBe(37);
  });

  it("no incluye cartas personales", async () => {
    connection.mockResolvedValue(undefined);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.filter((u) => /\/carta-natal\/(?!signos|planetas|casas)/.test(u))).toEqual([]);
  });
});

describe("T-099 · lastmod solo donde hay fecha real", () => {
  it("los cursos llevan su updated_at; las páginas estáticas no inventan fecha", async () => {
    connection.mockResolvedValue(undefined);
    const entries = await sitemap();
    const curso = entries.find((e) => e.url.endsWith("/cursos/tarot-1"))!;
    expect(curso.lastModified).toEqual(new Date("2026-11-01T10:00:00Z"));
    for (const path of ["/", "/cursos", "/tarot", "/tarot/cartas/el-sol", "/carta-natal"]) {
      expect(entries.find((e) => e.url === `http://localhost:3000${path === "/" ? "/" : path}`)!.lastModified).toBeUndefined();
    }
  });
});

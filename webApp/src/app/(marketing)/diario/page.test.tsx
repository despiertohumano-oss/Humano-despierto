import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getPublishedPosts } = vi.hoisted(() => ({ getPublishedPosts: vi.fn(async () => []) }));
vi.mock("@/lib/server/diario", () => ({ getPublishedPosts }));

import DiarioPage, { metadata } from "./page";

describe("Diario (pantalla 7)", () => {
  it("bajada de la dueña y metadata acorde", async () => {
    const html = renderToStaticMarkup(await DiarioPage());
    expect(html).toContain("Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos");
    expect(metadata.description).toContain("profundizar en los misterios del universo");
  });

  it("sin publicaciones muestra el mensaje de la dueña, entero y sin el texto viejo", async () => {
    const html = renderToStaticMarkup(await DiarioPage());
    expect(html).toContain(
      "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
    );
    expect(html).not.toMatch(/Todavía no hay escritos|Las guías están escribiendo|entre clase y clase/);
  });
});

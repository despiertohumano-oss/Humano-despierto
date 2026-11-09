import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Empezar from "./Empezar";

describe("portada · programa", () => {
  const html = renderToStaticMarkup(<Empezar />);

  it("trae título, bajada y los tres pasos numerados de la dueña", () => {
    expect(html).toContain("Explorá cada propuesta y elegí tu camino de aprendizaje.");
    expect(html).toContain("Cada formación tiene su propio recorrido.");
    for (const t of ["01", "Elegí tu formación", "02", "Conocé cómo vas a aprender", "03", "Comenzá tu recorrido"]) {
      expect(html).toContain(t);
    }
  });

  it("conserva el botón «Elegir un curso» hacia el catálogo y es el destino del ancla #empezar", () => {
    expect(html).toContain('id="empezar"');
    expect(html).toMatch(/href="\/cursos"[^>]*>Elegir un curso/);
  });

  it("ya no promete clase gratuita, certificado ni vencimiento, ni usa hojas", () => {
    expect(html).not.toMatch(/clase gratuita|certificado|vencimiento/i);
    expect(html).not.toContain('d="M75 185V60"');
  });
});

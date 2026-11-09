import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Hero from "./Hero";

const TITULO =
  "\"Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú\".";

describe("portada · hero cósmico", () => {
  const html = renderToStaticMarkup(<Hero />);

  it("tiene exactamente un h1, visible, con el título de la dueña", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    const h1 = /<h1[^>]*>/.exec(html)![0];
    expect(h1).not.toContain("sr-only");
    expect(html).toContain(TITULO.replaceAll("\"", "&quot;"));
  });

  it("subtítulo y botones literales", () => {
    expect(html).toContain(
      "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    );
    expect(html).toMatch(/href="\/cursos"[^>]*>Explorar los cursos/);
    expect(html).toMatch(/href="#nuestra-mirada"[^>]*>Conocé Humano Despierto/);
  });

  it("es superficie cósmica con velo sobre la imagen de la dueña, sin viejos términos", () => {
    expect(html).toContain("cosmico");
    expect(html).toContain("cosmico-velo");
    expect(html).toMatch(/hero-nebulosa/);
    expect(html).not.toMatch(/herbolaria|reiki|oficios|unsplash/i);
  });
});

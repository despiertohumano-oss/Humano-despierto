import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TarotPage from "./page";

describe("Tarot (pantalla 8)", () => {
  const html = renderToStaticMarkup(<TarotPage />);

  it("título y subtítulo nuevos, en una cabecera cósmica con un solo h1", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain("El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.");
    expect(html).toContain(
      "Explorá el universo de los 78 arcanos del Tarot Rider-Waite. Elegí una tirada, descubrí sus símbolos y encontrá nuevas perspectivas a través de la lectura de las cartas.",
    );
    expect(html).toContain("cosmico");
    expect(html).toContain("hero-galaxia");
  });

  it("\"Qué es el tarot y cómo leerlo\": título conservado y texto nuevo", () => {
    expect(html).toContain("Qué es el tarot y cómo leerlo");
    expect(html).toContain("El Tarot es un lenguaje de imágenes, símbolos y arquetipos que nos invita a explorar distintas dimensiones de la experiencia humana.");
    expect(html).toContain("Sus 78 arcanos conforman un universo simbólico que puede ayudarnos a reflexionar sobre situaciones, procesos, desafíos y posibilidades.");
    expect(html).toContain("Leer el Tarot implica aprender a observar, relacionar e interpretar.");
    expect(html).not.toContain("Italia del siglo XV");
  });

  it("conserva \"Cómo leer esto\", las cuatro tiradas y el enlace a las 78 cartas", () => {
    expect(html).toContain("Cómo leer esto");
    expect(html).toContain("No reemplaza a una profesional");
    expect(html).toContain("Ver las 78 cartas y sus significados");
    expect(html.match(/>Tirar</g)).toHaveLength(4);
  });

  it("bloque final: título, texto y botón hacia el catálogo filtrado por Tarot", () => {
    expect(html).toContain("¿Querés profundizar en el lenguaje del Tarot?");
    expect(html).toContain("Descubrí nuestras formaciones y aprendé a interpretar los arcanos, sus símbolos y sus múltiples relaciones.");
    expect(html).toMatch(/href="\/cursos\?disciplina=tarot"[^>]*>Conocé nuestros cursos de Tarot/);
    expect(html).toMatch(/alt="Cuatro cartas de tarot/);
  });
});

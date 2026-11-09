import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./BackToTop", () => ({ default: () => null }));
vi.mock("./WhatsAppFloat", () => ({ default: () => null }));

import SiteFooter from "./SiteFooter";

describe("footer (pantalla 4)", () => {
  const html = renderToStaticMarkup(<SiteFooter />);

  it("primera columna con el texto nuevo", () => {
    expect(html).toContain(
      "Un espacio de aprendizaje, autoconocimiento y transformación. Astrología, tarot, constelaciones familiares, magia, gemoterapia y el universo de los símbolos.",
    );
  });

  it("\"Guías\" pasa a \"Docentes\" y la ruta no cambia; el resto de las columnas se conserva", () => {
    expect(html).toMatch(/href="\/guias"[^>]*>Docentes</);
    for (const l of ["Cursos", "Diario", "Círculo", "Entrar", "Mi panel", "Mi perfil"]) expect(html).toContain(`>${l}<`);
    expect(html).not.toContain(">Guías<");
  });

  it("columna de certificados con el texto condicional", () => {
    expect(html).toContain(
      "Al finalizar determinadas formaciones, podrás acceder a tu certificado de participación o aprobación, según las condiciones de cada curso.",
    );
  });

  it("conserva el copyright y retira la frase de cursos sin vencimiento", () => {
    expect(html).toMatch(/© \d{4} Humano Despierto/);
    expect(html).not.toMatch(/sin vencimiento|primer día|oficios|herbolaria|reiki/i);
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Manifiesto from "./Manifiesto";

describe("portada · nuestra mirada", () => {
  const html = renderToStaticMarkup(<Manifiesto />);

  it("es el ancla del botón del hero y trae el título y los párrafos de la dueña", () => {
    expect(html).toContain('id="nuestra-mirada"');
    expect(html).toContain("La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.");
    expect(html).toContain("A través de la carta natal, los arquetipos y los ciclos planetarios");
    expect(html).toContain("el universo de los símbolos de poder, sanación y protección");
  });

  it("el botón lleva a la sección siguiente, no a instrucciones de acceso", () => {
    expect(html).toMatch(/href="#empezar"[^>]*>Descubrí nuestra propuesta/);
  });

  it("la imagen es una carta astral con alt real y la ilustración es de cielo, nunca hierbas", () => {
    expect(html).toMatch(/carta-astral-azul/);
    expect(html).toMatch(/alt="Carta astral/);
    expect(html).not.toMatch(/romero|hierbas|unsplash|herbolaria/i);
    expect(html).not.toContain('d="M75 185V60"');
  });
});

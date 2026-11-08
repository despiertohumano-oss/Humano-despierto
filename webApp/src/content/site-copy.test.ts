import { describe, expect, it } from "vitest";
import { CATALOGO, DIARIO, DOCENTES } from "./site-copy";

describe("site-copy · textos literales del documento de la dueña", () => {
  it("Nuestros docentes (pantalla 6)", () => {
    expect(DOCENTES.title).toBe("Nuestros docentes");
    expect(DOCENTES.lead).toBe(
      "Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje. Conocé a quienes comparten sus saberes y acompañan cada recorrido.",
    );
    expect(DOCENTES.navLabel).toBe("Docentes");
  });

  it("Catálogo (pantalla 5)", () => {
    expect(CATALOGO.title).toBe("Cursos");
    expect(CATALOGO.lead).toBe(
      "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
    );
    expect(CATALOGO.searchPlaceholder).toBe("¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.");
    expect(CATALOGO.empty).toBe(
      "No encontramos formaciones con esos criterios. Probá con otra búsqueda o explorá todas nuestras propuestas.",
    );
  });

  it("Catálogo · disciplina sin formaciones (B1, literal del plan)", () => {
    expect(CATALOGO.emptyDiscipline("Gemoterapia")).toBe(
      "Todavía no hay formaciones de Gemoterapia. Muy pronto vas a encontrar propuestas acá; mientras tanto, explorá todas nuestras formaciones.",
    );
    expect(CATALOGO.emptyDisciplineCta).toBe("Ver todas las formaciones");
  });

  it("Diario (pantalla 7)", () => {
    expect(DIARIO.title).toBe("Diario");
    expect(DIARIO.lead).toBe(
      "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
    );
    expect(DIARIO.empty).toBe(
      "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
    );
  });
});

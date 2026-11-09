import { describe, expect, it } from "vitest";
import { COURSE_FAQ, LANDING } from "./landing";

describe("LANDING · portada (pantallas 1 y 2)", () => {
  it("hero: título con sus comillas, subtítulo y botones", () => {
    expect(LANDING.hero.title).toBe(
      "\"Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú\".",
    );
    expect(LANDING.hero.lead).toBe(
      "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    );
    expect(LANDING.hero.ctaCursos).toBe("Explorar los cursos");
    expect(LANDING.hero.ctaProyecto).toBe("Conocé Humano Despierto");
  });

  it("nuestra mirada: título, dos párrafos y botón", () => {
    expect(LANDING.manifiesto.title).toBe(
      "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.",
    );
    expect(LANDING.manifiesto.paragraphs).toEqual([
      "La astrología nos invita a descubrir los símbolos del cielo y su relación con nuestra experiencia humana. A través de la carta natal, los arquetipos y los ciclos planetarios, podemos explorar nuestra personalidad, nuestros procesos y las posibilidades de transformación.",
      "En Humano Despierto también nos acercamos al tarot, las constelaciones familiares, la magia, la gemoterapia y el universo de los símbolos de poder, sanación y protección. Diferentes caminos que nos permiten ampliar la mirada, despertar preguntas y profundizar en el conocimiento de nosotros mismos.",
    ]);
    expect(LANDING.manifiesto.cta).toBe("Descubrí nuestra propuesta");
  });

  it("la sección de cursos reusa la bajada del catálogo y la de docentes, la de Nuestros docentes", () => {
    expect(LANDING.cursos.lead).toBe(
      "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
    );
    expect(LANDING.guias.title).toBe("Nuestros docentes");
    expect(LANDING.guias.verTodas).toBe("Ver todos los docentes");
  });
});

describe("LANDING · programa (pantalla 3)", () => {
  it("título, bajada y los tres pasos", () => {
    expect(LANDING.empezar.title).toBe("Explorá cada propuesta y elegí tu camino de aprendizaje.");
    expect(LANDING.empezar.lead).toBe(
      "Cada formación tiene su propio recorrido. Conocé los contenidos, explorá los módulos y descubrí qué herramientas y conocimientos vas a incorporar en cada propuesta.",
    );
    expect(LANDING.empezar.pasos).toEqual([
      { n: "01", title: "Elegí tu formación", detail: "Explorá las propuestas y conocé sus contenidos, objetivos y modalidades." },
      { n: "02", title: "Conocé cómo vas a aprender", detail: "Cada curso detalla su modalidad, materiales, clases y recursos disponibles." },
      { n: "03", title: "Comenzá tu recorrido", detail: "Inscribite y accedé a los contenidos de tu formación." },
    ]);
    expect(LANDING.empezar.cta).toBe("Elegir un curso");
  });

  it("el calendario lunar conserva su título", () => {
    expect(LANDING.lunar.title).toBe("Calendario lunar");
  });
});

describe("el texto de la portada y la ficha no promete acceso ilimitado ni certificado general", () => {
  const BANNED = /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado|queda tu certificado|certificado con tu nombre|no vence/i;
  it("LANDING y COURSE_FAQ", () => {
    expect(JSON.stringify(LANDING)).not.toMatch(BANNED);
    expect(JSON.stringify(COURSE_FAQ)).not.toMatch(BANNED);
  });
});

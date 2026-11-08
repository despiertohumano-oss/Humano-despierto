/**
 * Textos del documento maestro de la dueña (2026-11-08) que comparten más de una pantalla.
 * Literales: no se parafrasean. Los `meta*` son texto derivado de la bajada de cada pantalla.
 */

export const DOCENTES = {
  title: "Nuestros docentes",
  lead: "Detrás de cada formación hay conocimientos, experiencias y diferentes caminos de aprendizaje. Conocé a quienes comparten sus saberes y acompañan cada recorrido.",
  navLabel: "Docentes",
  verTodos: "Ver todos los docentes",
  volver: "Todos los docentes",
  metaTitle: "Docentes",
  metaDescription: "Conocé a quienes comparten sus saberes y acompañan cada formación en Humano Despierto.",
} as const;

export const CATALOGO = {
  title: "Cursos",
  lead: "Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.",
  searchPlaceholder: "¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.",
  empty: "No encontramos formaciones con esos criterios. Probá con otra búsqueda o explorá todas nuestras propuestas.",
  emptyDiscipline: (discipline: string) =>
    `Todavía no hay formaciones de ${discipline}. Muy pronto vas a encontrar propuestas acá; mientras tanto, explorá todas nuestras formaciones.`,
  emptyDisciplineCta: "Ver todas las formaciones",
  metaDescription:
    "Explorá las formaciones de Humano Despierto: astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
} as const;

export const DIARIO = {
  title: "Diario",
  lead: "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
  empty: "Estamos preparando contenidos para compartir conocimientos, reflexiones y nuevas perspectivas. Muy pronto vas a encontrar aquí nuestras primeras publicaciones.",
  metaDescription:
    "Un espacio para explorar el conocimiento, descubrir el lenguaje de los símbolos y profundizar en los misterios del universo y de nuestra propia naturaleza.",
} as const;

import { CATALOGO, DOCENTES } from "@/content/site-copy";

/**
 * Texto editorial de la portada y de la ficha. Lo edita la escuela; las cifras, cursos, docentes y
 * testimonios NO viven acá: salen de la base. Los textos de la portada son literales del documento
 * maestro de la dueña (2026-11-08).
 */

export interface LandingContent {
  hero: { title: string; lead: string; ctaCursos: string; ctaProyecto: string };
  manifiesto: { title: string; paragraphs: readonly string[]; cta: string };
  cursos: { title: string; lead: string; verTodos: (n: number) => string };
  cifra: { verbo: string; nota: string };
  guias: { title: string; lead: string; verPerfil: string; verTodas: string };
  testimonios: { title: string };
  lunar: { title: string; lead: string };
  empezar: {
    title: string;
    lead: string;
    pasos: readonly { n: string; title: string; detail: string }[];
    cta: string;
  };
}

export const LANDING: LandingContent = {
  hero: {
    title: "«Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú».",
    lead: "Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento.",
    ctaCursos: "Explorar los cursos",
    ctaProyecto: "Conocé Humano Despierto",
  },
  manifiesto: {
    title: "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo.",
    paragraphs: [
      "La astrología nos invita a descubrir los símbolos del cielo y su relación con nuestra experiencia humana. A través de la carta natal, los arquetipos y los ciclos planetarios, podemos explorar nuestra personalidad, nuestros procesos y las posibilidades de transformación.",
      "En Humano Despierto también nos acercamos al tarot, las constelaciones familiares, la magia, la gemoterapia y el universo de los símbolos de poder, sanación y protección. Diferentes caminos que nos permiten ampliar la mirada, despertar preguntas y profundizar en el conocimiento de nosotros mismos.",
    ],
    cta: "Descubrí nuestra propuesta",
  },
  cursos: {
    title: "Cursos",
    lead: CATALOGO.lead,
    verTodos: (n) => (n === 1 ? "Ver el curso" : `Ver los ${n} cursos`),
  },
  cifra: {
    verbo: "para aprender",
    nota: "Todo lo que ves en esta página sale de los cursos publicados hoy.",
  },
  guias: {
    title: DOCENTES.title,
    lead: DOCENTES.lead,
    verPerfil: "Ver su perfil",
    verTodas: DOCENTES.verTodos,
  },
  testimonios: { title: "Lo que dicen las alumnas" },
  lunar: {
    title: "Calendario lunar",
    lead: "Las próximas fases de la luna, para acompañar la práctica. No son fechas de clase.",
  },
  empezar: {
    title: "Explorá cada propuesta y elegí tu camino de aprendizaje.",
    lead: "Cada formación tiene su propio recorrido. Conocé los contenidos, explorá los módulos y descubrí qué herramientas y conocimientos vas a incorporar en cada propuesta.",
    pasos: [
      { n: "01", title: "Elegí tu formación", detail: "Explorá las propuestas y conocé sus contenidos, objetivos y modalidades." },
      { n: "02", title: "Conocé cómo vas a aprender", detail: "Cada curso detalla su modalidad, materiales, clases y recursos disponibles." },
      { n: "03", title: "Comenzá tu recorrido", detail: "Inscribite y accedé a los contenidos de tu formación." },
    ],
    cta: "Elegir un curso",
  },
};

/** Preguntas frecuentes de la ficha (B1). Cada respuesta describe lo que el producto hace hoy. */
export const COURSE_FAQ = [
  {
    q: "¿Cuánto tiempo tengo para ver el curso?",
    a: "Depende de cada formación: en su ficha están la modalidad y las condiciones de acceso. Cuando la escuela habilita tu inscripción, el curso queda en tu panel y tu avance se guarda solo.",
  },
  {
    q: "¿Cómo me inscribo?",
    a: "Desde esta página pedís la inscripción. La escuela revisa el pedido y te avisa por mail cuando el curso está habilitado.",
  },
  {
    q: "¿El certificado tiene validez oficial?",
    a: "No. Cuando una formación ofrece certificado, acredita que recorriste el curso completo, no que rendiste una evaluación. Lleva tu nombre, la fecha y un código que cualquiera puede verificar.",
  },
  {
    q: "¿Le puedo hacer preguntas a la guía?",
    a: "Sí. Cada clase tiene una pestaña de preguntas. La guía responde ahí y la respuesta queda visible para las alumnas del curso.",
  },
] as const;

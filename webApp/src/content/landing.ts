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
  empezar: {
    title: string;
    /** Por FreeClassClaim: sólo «todos» afirma que cada curso tiene una. */
    lead: { todos: string; prudente: string; ninguno: string };
    titleSinClase: string;
    pasos: readonly { title: string; detail: string }[];
    pasosSinClase: readonly { title: string; detail: string }[];
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
  empezar: {
    title: "Empezá por la clase gratuita.",
    lead: {
      todos: "Cada curso tiene una para ver sin inscribirte. Mirala, y si te gusta cómo enseña la guía, pedí el curso entero.",
      prudente: "Muchos cursos tienen una clase gratuita. Mirala, y si te gusta cómo enseña la guía, pedí el curso entero.",
      ninguno: "En la página de cada curso está el programa completo: cada clase, cuánto dura y qué material trae.",
    },
    titleSinClase: "Empezá por el programa.",
    pasos: [
      { title: "Mirás la clase gratuita", detail: "En la página del curso, cuando el curso la tiene." },
      { title: "Pedís la inscripción", detail: "La escuela la revisa y te avisa por mail." },
      { title: "Lo ves a tu ritmo", detail: "Completo desde el primer día y sin vencimiento. Al terminar queda tu certificado." },
    ],
    pasosSinClase: [
      { title: "Mirás el programa", detail: "Cada clase, su duración y su material." },
      { title: "Pedís la inscripción", detail: "La escuela la revisa y te avisa por mail." },
      { title: "Lo ves a tu ritmo", detail: "Completo desde el primer día y sin vencimiento. Al terminar queda tu certificado." },
    ],
    cta: "Elegir un curso",
  },
};

/** Preguntas frecuentes de la ficha (B1). Cada respuesta describe lo que el producto hace hoy. */
export const COURSE_FAQ = [
  {
    q: "¿Cuánto tiempo tengo para ver el curso?",
    a: "Todo el que quieras. Cuando la escuela habilita tu inscripción, el curso queda completo en tu panel y no vence. Tu avance se guarda solo.",
  },
  {
    q: "¿Cómo me inscribo?",
    a: "Desde esta página pedís la inscripción. La escuela revisa el pedido y te avisa por mail cuando el curso está habilitado.",
  },
  {
    q: "¿El certificado tiene validez oficial?",
    a: "No. Acredita que recorriste el curso completo, no que rendiste una evaluación. Lleva tu nombre, la fecha y un código que cualquiera puede verificar.",
  },
  {
    q: "¿Le puedo hacer preguntas a la guía?",
    a: "Sí. Cada clase tiene una pestaña de preguntas. La guía responde ahí y la respuesta queda visible para las alumnas del curso.",
  },
] as const;

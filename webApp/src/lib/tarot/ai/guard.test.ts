import { describe, expect, it } from "vitest";
import { cardBySlug } from "../cards";
import { buildReading } from "../reading";
import { guardReading } from "./guard";

const idx = (slug: string) => cardBySlug(slug)!.indice;

const facts = buildReading(
  {
    spread: "cruz-simple",
    cards: ["el-ermitano", "tres-de-oros", "la-torre", "dos-de-copas", "la-estrella"].map((s, i) => ({ indice: idx(s), reversed: i === 1 })),
  },
  "¿Qué hago con mi trabajo?",
);

const P1 =
  "Tu pregunta por el trabajo llega en un momento en que las cartas piden pausa antes que movimiento. El Ermitaño en el pasado muestra que ya venías mirando hacia adentro, buscando una respuesta propia y no la que esperan los demás, y esa búsqueda sigue teniendo sentido hoy.";
const P2 =
  "El Tres de Oros invertido habla de un trabajo en equipo que no termina de encajar: tareas que se pisan, reconocimiento que no llega, la sensación de poner más de lo que vuelve. La Torre, como información del pasado, explica por qué: algo se rompió en la forma en que entendías tu lugar, y lo que parecía firme dejó de sostenerte.";
const P3 =
  "Frente a eso, el Dos de Copas trae otra pista. Lo que se asoma no es una solución técnica sino un vínculo: alguien con quien el trabajo vuelva a sentirse compartido, un acuerdo más parejo, una conversación pendiente con quien trabaja a tu lado. La Estrella en el presente sostiene todo el cuadro con una calma serena, como si ya supieras hacia dónde querés ir aunque todavía no lo digas.";
const P4 =
  "Las cartas no te dicen que te quedes ni que te vayas. Te muestran que la decisión madura cuando dejás de pelear con lo que se cayó y empezás a cuidar lo que te da confianza. Hay algo de esperanza en esta tirada, pero es una esperanza que pide gestos concretos y conversaciones claras, no un salto a ciegas.";
const P5 = "¿Qué conversación sobre tu trabajo venís postergando y qué cambiaría si la tuvieras esta semana?";
const GOOD = [P1, P2, P3, P4, P5].join("\n\n");

describe("guardReading", () => {
  it("acepta una lectura buena y la devuelve en párrafos", () => {
    const r = guardReading(GOOD, facts);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.paragraphs).toHaveLength(5);
  });

  it("limpia negritas y pasa las comillas angulares a dobles tipográficas", () => {
    const r = guardReading(GOOD.replace("El Ermitaño", "**El Ermitaño**").replace("calma serena", "«calma serena»"), facts);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.paragraphs.join(" ")).not.toContain("**");
      expect(r.paragraphs.join(" ")).toContain("“calma serena”");
    }
  });

  it.each([
    ["demasiado corta", P1, "largo"],
    ["demasiado larga", [GOOD, GOOD, GOOD].join("\n\n"), "largo"],
    ["con títulos", `# Tu lectura\n\n${GOOD}`, "formato"],
    ["con listas", `${GOOD}\n\n- primero\n- segundo`, "formato"],
    ["con emojis", GOOD.replace("serena", "serena ✨"), "formato"],
    ["término prohibido del sitio", GOOD.replace("conversaciones claras", "un poco de reiki"), "contenido"],
    ["nombra el método (máscara)", GOOD.replace("calma serena", "máscara de la esencia"), "metodo"],
    ["nombra el método (etiqueta)", GOOD.replace("Hay algo de", "Equilibrio: hay algo de"), "metodo"],
    ["nombra el método (verbo)", GOOD.replace("Te muestran que", "Vale preguntarse si"), "metodo"],
    ["predice salud", GOOD.replace("un salto a ciegas", "una enfermedad que se acerca"), "prediccion"],
    ["predice muerte", GOOD.replace("no un salto a ciegas", "alguien va a morir"), "prediccion"],
    ["predice embarazo", GOOD.replace("un salto a ciegas", "un embarazo"), "prediccion"],
    ["da fechas (mes)", GOOD.replace("esta semana", "en marzo"), "prediccion"],
    ["da fechas (plazo)", GOOD.replace("un salto a ciegas", "algo que llega en tres meses"), "prediccion"],
    ["da fechas (año)", GOOD.replace("un salto a ciegas", "algo que llega en 2027"), "prediccion"],
    ["asegura dinero", GOOD.replace("no un salto a ciegas", "y vas a ganar mucho dinero"), "prediccion"],
    ["habla de sí misma", GOOD.replace("Las cartas no", "Como modelo de lenguaje, las cartas no"), "contenido"],
    ["inventa una carta que no salió", GOOD.replace("El Tres de Oros invertido", "El Siete de Espadas"), "inventa"],
    ["deja la marca de la pregunta", `${GOOD}\n\n<pregunta>`, "formato"],
    ["menciona pocas cartas", [P1, P4, P4.replace("Las cartas", "Esta tirada"), P5].join("\n\n"), "cartas"],
  ])("rechaza: %s", (_name, text, reason) => {
    const r = guardReading(text, facts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });

  it("no confunde la carta de la Muerte con una predicción", () => {
    const f = buildReading({ spread: "cruz-simple", cards: ["la-muerte", "tres-de-oros", "la-torre", "dos-de-copas", "la-estrella"].map((s) => ({ indice: idx(s), reversed: false })) }, null);
    const r = guardReading(GOOD.replace("El Ermitaño", "La Muerte"), f);
    expect(r.ok).toBe(true);
  });

  it("no confunde palabras comunes con meses ni con dinero", () => {
    const r = guardReading(GOOD.replace("calma serena", "generosidad y una mayor calma"), facts);
    expect(r.ok).toBe(true);
  });
});

describe("guardReading · tirada de una carta", () => {
  const one = buildReading({ spread: "carta-del-dia", cards: [{ indice: idx("la-estrella"), reversed: false }] }, null);
  const corto = (n: number) =>
    `La Estrella llega hoy como una pausa clara. ${Array.from({ length: n }, () => "Mirá con calma lo que ya tenés cerca").join(". ")}.\n\n¿Qué te devuelve la confianza hoy?`;

  it("acepta una lectura breve que en una tirada larga sería corta", () => {
    const text = corto(16);
    expect(text.split(/\s+/).length).toBeGreaterThan(110);
    expect(text.split(/\s+/).length).toBeLessThan(180);
    expect(guardReading(text, one).ok).toBe(true);
    expect(guardReading(text.replace("La Estrella", "El Ermitaño"), facts)).toEqual({ ok: false, reason: "largo" });
  });

  it("igual rechaza una demasiado corta", () => {
    expect(guardReading(corto(5), one)).toEqual({ ok: false, reason: "largo" });
  });
});

// Ronda 2 (QA D1-D3, O1, O6, O7): cada variante parte de la lectura buena y cambia una frase.
const swap = (x: string) => GOOD.replace("no un salto a ciegas", x);

describe("guardReading · predicciones (A1)", () => {
  it.each([
    // plazos
    "algo que se resuelve en un mes",
    "algo que se aclara dentro de un año",
    "una respuesta en pocos días",
    "un cambio en pocas semanas",
    "una noticia dentro de unos días",
    "un cambio el mes que viene",
    "una charla la semana que viene",
    "un giro el año que viene",
    "una llamada el lunes",
    "una firma el 15/03",
    "una firma el 15 de marzo",
    "un cambio el próximo mes",
    "algo que se define dentro de poco",
    // salud y muerte
    "y enfermedades que se van",
    "y enfermos alrededor",
    "un riesgo de enfermarte",
    "y vas a enfermarte",
    "el miedo a morirte",
    "y te vas a morir",
    "la muerte de tu madre",
    "una operación quirúrgica",
    "y vas a sanar",
    "y te vas a curar",
    // dinero
    "una herencia",
    "y va a llegar mucha plata",
    "y te va a llegar dinero",
    // desenlaces prometidos (regla general: futuro + desenlace concreto)
    "y pronto vas a conseguir trabajo",
    "y te vas a casar",
    "y vas a quedar embarazada",
    "y conseguirás ese puesto",
    "y te va a ir bien",
    "y él va a volver",
  ])("rechaza «%s»", (x) => {
    expect(guardReading(swap(x), facts)).toEqual({ ok: false, reason: "prediccion" });
  });

  it.each([
    "porque nada está garantizado",
    "y no te aseguro nada",
    "como las instrucciones de tu jefe",
    "como un accidente de recorrido",
    "una pausa para mirar esta semana",
  ])("no rechaza de más (A2): «%s»", (x) => {
    expect(guardReading(swap(x), facts).ok).toBe(true);
  });

  it("garantías afirmadas siguen fuera", () => {
    expect(guardReading(swap("y te aseguro que sale"), facts)).toEqual({ ok: false, reason: "prediccion" });
    expect(guardReading(swap("y está garantizado"), facts)).toEqual({ ok: false, reason: "prediccion" });
  });
});

describe("guardReading · arcanos mayores (A3, A4)", () => {
  it("rechaza un mayor que no salió", () => {
    expect(guardReading(GOOD.replace("La Estrella en el presente", "El Diablo en el presente"), facts)).toEqual({ ok: false, reason: "inventa" });
    expect(guardReading(swap("como pide la carta del Sol"), facts)).toEqual({ ok: false, reason: "inventa" });
    expect(guardReading(swap("como pide la carta de la fuerza"), facts)).toEqual({ ok: false, reason: "inventa" });
    expect(guardReading(swap("como dice La Rueda de la Fortuna"), facts)).toEqual({ ok: false, reason: "inventa" });
  });

  it.each(["con la fuerza que tenés", "en el mundo que te rodea", "con la justicia de tus reclamos", "sin un juicio apurado", "como el sol de la mañana", "bajo la luna", "con la muerte de un ciclo"])(
    "no confunde la palabra común con la carta: «%s»",
    (x) => {
      expect(guardReading(swap(x), facts).ok).toBe(true);
    },
  );

  it("un mayor en minúscula no cuenta como nombrado", () => {
    const sol = buildReading({ spread: "carta-del-dia", cards: [{ indice: idx("el-sol"), reversed: false }] }, null);
    const body = (name: string) =>
      `${name} llega hoy como una pausa clara. ${Array.from({ length: 16 }, () => "Mirá con calma lo que ya tenés cerca").join(". ")}.\n\n¿Qué te devuelve la confianza hoy?`;
    expect(guardReading(body("El Sol"), sol).ok).toBe(true);
    expect(guardReading(body("El sol"), sol)).toEqual({ ok: false, reason: "cartas" });
    expect(guardReading(body("La carta del sol"), sol).ok).toBe(true);
  });

  it("acepta «Paje» como la Sota que salió, y solo esa", () => {
    const f = buildReading({ spread: "cruz-simple", cards: ["el-ermitano", "sota-de-copas", "la-torre", "dos-de-copas", "la-estrella"].map((s) => ({ indice: idx(s), reversed: false })) }, null);
    const text = GOOD.replace("El Tres de Oros invertido", "El Paje de Copas");
    expect(guardReading(text, f).ok).toBe(true);
    expect(guardReading(text.replace("Paje de Copas", "Paje de Espadas"), f)).toEqual({ ok: false, reason: "inventa" });
  });
});

describe("guardReading · enlaces y contactos (A5)", () => {
  it.each(["escribí a www.estafa.com", "mirá https://estafa.example", "mirá [esto](http://x.example)", "escribí a hola@estafa.com", "llamá al 11 5555 1234", "visitá estafa.com.ar", "llamá al +54 9 11 5555-1234"])(
    "rechaza «%s»",
    (x) => {
      expect(guardReading(swap(x), facts)).toEqual({ ok: false, reason: "contenido" });
    },
  );
});

describe("guardReading · marcas sueltas (A6)", () => {
  it("limpia la cursiva con un solo asterisco o guion bajo", () => {
    const r = guardReading(GOOD.replace("calma serena", "*calma* _serena_"), facts);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.paragraphs.join(" ")).not.toMatch(/[*_]/);
  });

  it("rechaza corchetes sueltos", () => {
    expect(guardReading(swap("un [salto] a ciegas"), facts)).toEqual({ ok: false, reason: "formato" });
  });
});

describe("guardReading · términos prohibidos del sitio (A7)", () => {
  // La misma lista literal que src/content/forbidden-terms.test.ts: los dos tests usan FORBIDDEN_TERMS.
  it.each(["herbolaria", "herboristas", "reiki", "oficios", "sin vencimiento", "acceso ilimitado", "queda tu certificado", "certificado con tu nombre"])(
    "rechaza «%s»",
    (term) => {
      expect(guardReading(swap(`y ${term}`), facts)).toEqual({ ok: false, reason: "contenido" });
    },
  );
});

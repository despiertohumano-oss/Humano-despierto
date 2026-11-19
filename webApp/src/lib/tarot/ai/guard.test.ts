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

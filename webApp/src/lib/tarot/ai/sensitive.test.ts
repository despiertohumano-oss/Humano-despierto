import { describe, expect, it } from "vitest";
import { isSensitiveQuestion, readVerdict } from "./sensitive";

describe("isSensitiveQuestion", () => {
  it.each([
    "¿Voy a quedar embarazada?",
    "¿Voy a quedar embarazada de mi novio?",
    "¿Voy a quedar embarazada este año?",
    "¿Mi pareja y yo vamos a tener un hijo?",
    "¿Vamos a tener hijos?",
    "¿Voy a ser mamá?",
    "¿Viene un bebé?",
    "¿Mi mamá se va a curar?",
    "¿Me van a operar y sale bien?",
    "¿Cómo sigue mi salud?",
    "¿Tengo cáncer?",
    "¿Se va a morir mi abuelo?",
    "¿Cómo salgo de la depresión?",
    "¿Funciona el tratamiento de fertilidad?",
    "¿Qué me dice el diagnóstico?",
  ])("«%s» no va al modelo", (q) => {
    expect(isSensitiveQuestion(q)).toBe(true);
  });

  it.each([null, "", "¿Qué hago con mi trabajo?", "¿Cómo me llevo con mi hijo?", "¿Me conviene mudarme?", "¿Qué siente él por mí?", "¿Cómo curo esta relación?".replace("curo", "cuido")])(
    "%j sí va al modelo",
    (q) => {
      expect(isSensitiveQuestion(q)).toBe(false);
    },
  );
});

describe("isSensitiveQuestion · variantes de la ronda 3", () => {
  it.each([
    "¿Vamos a ser papás?", "¿Vamos a ser padres este año?", "¿Voy a quedar preñada?", "¿Me quedo en cinta?", "¿Voy a quedar embarzada?",
    "¿voy a quedar embarasada este año?", "¿Voy a quedar enbarazada?", "¿Voy a poder concebir?", "¿Mi hija está esperando?", "¿Voy a ser abuela?",
    "¿Mi papá va a sobrevivir?", "¿Se salva mi hermano?", "¿Cuánto le queda de vida a mi papá?", "¿Mi viejo se va a ir de este mundo?",
    "¿Me voy a recuperar del covid?", "¿Sale bien la biopsia?", "¿Mi tío pasa la quimio?", "¿Mi viejo supera el infarto?",
    "¿Mi mamá sale de terapia intensiva?", "¿Tengo algo grave?", "¿Me va a dar positivo el test?", "¿El resultado del análisis da bien?",
    "¿Me quiero matar, qué hago?", "¿Sale bien la cirujia?", "¿Voy a tener un nieto?",
  ])("«%s» no va al modelo", (q) => {
    expect(isSensitiveQuestion(q)).toBe(true);
  });
});

describe("readVerdict", () => {
  it("NO: devuelve el texto sin la línea", () => {
    expect(readVerdict("SENSIBLE: NO\n\nUna lectura.\n\nOtro párrafo.")).toEqual({ sensitive: false, text: "Una lectura.\n\nOtro párrafo." });
  });
  it.each(["SENSIBLE: SI", "SENSIBLE: SÍ\n\ntexto de más", "sensible: sí", "  SENSIBLE:SI  \n"])("%j es sensible", (raw) => {
    expect(readVerdict(raw)).toEqual({ sensitive: true });
  });
  it.each(["Una lectura sin veredicto.", "", "SENSIBLE: QUIZÁS\n\ntexto", "Texto.\n\nSENSIBLE: NO", "SENSIBLE: NO"])("%j no trae veredicto válido", (raw) => {
    expect(readVerdict(raw)).toBeNull();
  });
});

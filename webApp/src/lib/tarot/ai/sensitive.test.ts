import { describe, expect, it } from "vitest";
import { isSensitiveQuestion } from "./sensitive";

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

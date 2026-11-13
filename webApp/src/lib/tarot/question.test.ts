import { describe, expect, it } from "vitest";
import { MAX_QUESTION, sanitizeQuestion } from "./question";
import { classifyQuestion, type QuestionType } from "./question";

describe("sanitizeQuestion", () => {
  it("vacío, null o solo espacios → null", () => {
    expect(sanitizeQuestion("")).toBeNull();
    expect(sanitizeQuestion("   ")).toBeNull();
    expect(sanitizeQuestion(null)).toBeNull();
    expect(sanitizeQuestion(undefined)).toBeNull();
  });
  it("recorta, colapsa espacios y quita saltos de línea", () => {
    expect(sanitizeQuestion("  ¿Vuelve \n mi   ex? ")).toBe("¿Vuelve mi ex?");
  });
  it("corta a 140 caracteres", () => {
    expect(sanitizeQuestion("a".repeat(200))).toHaveLength(MAX_QUESTION);
  });
  it("no deja espacios al final después de cortar", () => {
    const q = sanitizeQuestion("palabra ".repeat(40))!;
    expect(q.length).toBeLessThanOrEqual(MAX_QUESTION);
    expect(q).toBe(q.trimEnd());
  });
  it("solo caracteres de ancho cero → null", () => {
    expect(sanitizeQuestion("\u200B\u200C\u200D\uFEFF\u2028\u2029")).toBeNull();
  });
  it("colapsa un NBSP interior en un espacio normal", () => {
    expect(sanitizeQuestion("hola\u00A0\u00A0mundo")).toBe("hola mundo");
  });
  it("quita caracteres de control y de dirección bidi", () => {
    expect(sanitizeQuestion("ho\u0000la\u202E mun\u2066do")).toBe("ho la mun do");
    expect(sanitizeQuestion("\u0000\u202E")).toBeNull();
  });
  it("nunca deja un surrogate suelto, ni al cortar ni en la entrada", () => {
    const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
    expect(sanitizeQuestion("a\ud83d")).toBe("a");
    const cortada = sanitizeQuestion("a".repeat(MAX_QUESTION - 1) + "\u{1F52E}\u{1F52E}")!;
    expect(lone.test(cortada)).toBe(false);
    expect(Array.from(cortada)).toHaveLength(MAX_QUESTION);
  });
});

const CASOS: [string | null, QuestionType][] = [
  ["¿Cuándo voy a conseguir trabajo?", "cuando"],
  ["¿Para cuándo se resuelve lo de la casa?", "cuando"],
  ["¿En cuánto tiempo me mudo?", "cuando"],
  ["¿Cuánto falta para que vuelva?", "cuando"],
  ["¿cuando llega la plata?", "cuando"],
  ["¿Cuándo conozco a alguien?", "cuando"],
  ["¿Qué siente por mí?", "el_otro"],
  ["¿Piensa en mí?", "el_otro"],
  ["¿Me quiere?", "el_otro"],
  ["¿Me extraña?", "el_otro"],
  ["¿Qué le pasa a mi ex conmigo?", "el_otro"],
  ["¿Qué piensa mi jefa de mi trabajo?", "el_otro"],
  ["¿Siente algo por mí?", "el_otro"],
  ["¿Qué hago con mi pareja?", "que_hacer"],
  ["¿Debo aceptar la oferta?", "que_hacer"],
  ["¿Debería mudarme?", "que_hacer"],
  ["¿Me conviene renunciar?", "que_hacer"],
  ["¿Qué puedo hacer para mejorar mi salud?", "que_hacer"],
  ["¿Cómo hago para ahorrar?", "que_hacer"],
  ["¿Qué camino tomo?", "que_hacer"],
  ["¿Cómo me va a ir en el examen?", "como_sale"],
  ["¿Cómo va a terminar esto?", "como_sale"],
  ["¿Qué va a pasar con mi relación?", "como_sale"],
  ["¿Cómo sigue lo del juicio?", "como_sale"],
  ["¿Qué pasará con el negocio?", "como_sale"],
  ["¿Cómo viene el año?", "como_sale"],
  ["¿Vuelve conmigo?", "si_no"],
  ["¿Consigo el trabajo?", "si_no"],
  ["¿Va a funcionar?", "si_no"],
  ["¿Me van a ascender?", "si_no"],
  ["¿Es la persona indicada?", "si_no"],
  ["¿Hay futuro con él?", "si_no"],
  ["¿Puedo confiar en ella?", "si_no"],
  ["¿Tengo que preocuparme?", "si_no"],
  ["Mi situación laboral", "general"],
  ["Quiero saber sobre mi familia", "general"],
  ["Amor", "general"],
  ["¿Qué me dicen las cartas sobre este mes?", "general"],
  ["Contame de mi salud", "general"],
  [null, "general"],
];

describe("classifyQuestion", () => {
  for (const [q, tipo] of CASOS) it(`${q} → ${tipo}`, () => expect(classifyQuestion(q)).toBe(tipo));
});

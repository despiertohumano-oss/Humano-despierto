import { describe, expect, it } from "vitest";
import { checkListFrom } from "./migration-check";
import { DISCIPLINES, DISCIPLINE_KEYS, disciplineLabel, isDisciplineKey } from "./disciplines";

describe("disciplinas · paridad con la migración 0073", () => {
  it("la lista del código y la del CHECK son la misma, en el mismo orden", () => {
    expect(checkListFrom("_0073_disciplinas_cerradas.sql", "courses_discipline_closed")).toEqual([...DISCIPLINE_KEYS]);
  });

  it("siete disciplinas con su etiqueta", () => {
    expect(DISCIPLINES.map((d) => d.label)).toEqual([
      "Astrología",
      "Tarot",
      "Constelaciones familiares",
      "Magia",
      "Gemoterapia",
      "Simbología y símbolos de poder",
      "Talleres lunares",
    ]);
  });

  it("isDisciplineKey y disciplineLabel", () => {
    expect(isDisciplineKey("talleres-lunares")).toBe(true);
    expect(isDisciplineKey("Tarot")).toBe(false);
    expect(disciplineLabel("simbologia")).toBe("Simbología y símbolos de poder");
    expect(disciplineLabel("desconocida")).toBe("desconocida");
  });
});

import { describe, expect, it } from "vitest";
import { headerLinks } from "./nav-links";

const hrefs = (s: Parameters<typeof headerLinks>[0]) => headerLinks(s).map((l) => l.href);

describe("headerLinks", () => {
  it("la ruta /guias se rotula \"Docentes\" en el menú", () => {
    const labels = headerLinks(null).map((l) => l.label);
    expect(labels).toEqual(["Cursos", "Docentes", "Diario", "Tarot", "Carta natal"]);
  });

  it("sin sesión: sólo destinos públicos", () => {
    expect(hrefs(null)).toEqual(["/cursos", "/guias", "/diario", "/tarot", "/carta-natal"]);
  });

  it("con sesión suma Círculo, y cada panel sólo para su rol", () => {
    expect(hrefs({ role: "student" })).toEqual(["/cursos", "/guias", "/diario", "/tarot", "/carta-natal", "/circulo"]);
    expect(hrefs({ role: "teacher" })).toContain("/panel/docente");
    expect(hrefs({ role: "teacher" })).not.toContain("/panel/admin");
    expect(hrefs({ role: "admin" })).toContain("/panel/admin");
    expect(hrefs({ role: "admin" })).not.toContain("/panel/docente");
  });
});

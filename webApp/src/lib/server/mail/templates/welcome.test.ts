import { describe, expect, it } from "vitest";
import { renderWelcomeMail } from "./welcome";

const BANNED = /herbolar|reiki|oficios|sin vencimiento/i;

describe("renderWelcomeMail", () => {
  const { html, text } = renderWelcomeMail({ studentName: "Ana", catalogUrl: "http://localhost:3000/cursos" });

  it("describe el espacio con los textos nuevos, en HTML y en texto plano", () => {
    expect(html).toContain("constelaciones familiares");
    expect(text).toContain("constelaciones familiares");
  });

  it("no menciona herbolaria, reiki ni oficios (cuerpo ni pie)", () => {
    expect(html).not.toMatch(BANNED);
    expect(text).not.toMatch(BANNED);
  });
});

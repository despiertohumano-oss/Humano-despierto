import { describe, expect, it } from "vitest";
import { modalityItems, modalitySummary, toModality } from "./modality";

describe("modalidad (B2)", () => {
  it("defaults de la base cuando la fila no trae las columnas", () => {
    expect(toModality({})).toEqual({ recorded: true, pdf: false, downloads: false, live: false, accessTerms: null, issuesCertificate: true });
  });

  it("items en orden fijo, solo lo marcado", () => {
    const m = toModality({ includes_recorded: true, includes_pdf: true, includes_live: true });
    expect(modalityItems(m)).toEqual(["Clases grabadas", "Material en PDF", "Encuentros en vivo"]);
  });

  it("resumen de tarjeta: modalidad y duración", () => {
    const m = toModality({ includes_recorded: true, includes_downloads: true });
    expect(modalitySummary(m, 3 * 3600 + 20 * 60)).toBe("Clases grabadas · Recursos descargables · 3h 20m");
    expect(modalitySummary(toModality({ includes_recorded: false }), 0)).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ModalityBlock from "./ModalityBlock";
import { toModality } from "@/lib/catalog/modality";

describe("ModalityBlock (B2)", () => {
  it("lista lo marcado, las condiciones y el certificado solo si se emite", () => {
    const html = renderToStaticMarkup(
      <ModalityBlock modality={toModality({ includes_pdf: true, access_terms: "Acceso por un año.", issues_certificate: true })} />,
    );
    expect(html).toContain("Modalidad");
    expect(html).toContain("Material en PDF");
    expect(html).toContain("Acceso por un año.");
    expect(html).toContain("Incluye certificado");
  });

  it("sin certificado no lo promete", () => {
    const html = renderToStaticMarkup(<ModalityBlock modality={toModality({ issues_certificate: false })} />);
    expect(html).not.toMatch(/certificado/i);
  });
});

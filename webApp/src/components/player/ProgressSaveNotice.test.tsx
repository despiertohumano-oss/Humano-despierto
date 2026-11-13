import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProgressSaveNotice from "./ProgressSaveNotice";

describe("ProgressSaveNotice (G-04)", () => {
  it("sin error deja la región viva vacía: un lector de pantalla anuncia cuando aparece", () => {
    const html = renderToStaticMarkup(<ProgressSaveNotice error={null} />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain("<p");
  });

  it("con error muestra el texto en castellano, con color de error y sin opacidad", () => {
    const html = renderToStaticMarkup(<ProgressSaveNotice error="Tu sesión se cerró. Volvé a iniciar sesión para guardar." />);
    expect(html).toContain("Tu sesión se cerró. Volvé a iniciar sesión para guardar.");
    expect(html).toContain("text-error");
    expect(html).not.toMatch(/opacity-/);
  });
});

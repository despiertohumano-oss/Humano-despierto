import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, SOL } from "./fixtures";

const SLUG = "arcanos-menores";
const TERMINOS = `Acceso por un año e2e ${Date.now()}`;
const RESET = `update public.courses set includes_recorded = true, includes_pdf = false, includes_downloads = false,
  includes_live = false, access_terms = null, issues_certificate = true where slug = '${SLUG}'`;

test.afterEach(() => {
  psql(RESET);
});

test("B2 · la docente carga la modalidad y la ficha y la tarjeta la muestran; sin certificado no se promete", async ({ page, browser, request }) => {
  await assertStackUp(request);
  psql(RESET);
  await loginAs(page, SOL, "/panel/docente");
  await page.locator(`a[href^="/panel/docente/cursos/"]`, { hasText: "Arcanos" }).first().click();
  await page.getByLabel("Material en PDF").check();
  await page.getByLabel("Encuentros en vivo").check();
  await page.getByLabel("Condiciones de acceso (opcional)").fill(TERMINOS);
  await page.getByLabel("Emite certificado al completar").uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Curso actualizado.")).toBeVisible();

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto(`/cursos/${SLUG}`);
    const bloque = pub.getByRole("region", { name: "Modalidad" });
    await expect(bloque).toContainText("Clases grabadas");
    await expect(bloque).toContainText("Material en PDF");
    await expect(bloque).toContainText("Encuentros en vivo");
    await expect(bloque).toContainText(TERMINOS);
    await expect(bloque).not.toContainText(/certificado/i);
    // La FAQ general habla de certificados en abstracto; lo que no puede aparecer es la promesa.
    await expect(pub.getByText(/Incluye certificado|Certificado de finalización/)).toHaveCount(0);

    await pub.goto("/cursos?disciplina=tarot");
    await expect(pub.locator(`a[href="/cursos/${SLUG}"]`)).toContainText("Material en PDF");
  } finally {
    await anon.close();
  }
});

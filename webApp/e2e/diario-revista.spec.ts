import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, SOL } from "./fixtures";

const STAMP = Date.now();
const SLUG = `e2e-revista-${STAMP}`;
const TITULO = `Revista e2e ${STAMP}`;
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const FIRMADA = /\/storage\/v1\/object\/sign\/uploads\/diario\//;

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: la limpieza de Storage se saltea.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

test.afterAll(async ({ request }) => {
  const path = psql(`select coalesce(cover_path, '') from public.diario_posts where slug = '${SLUG}'`);
  if (path && SERVICE) {
    await request.delete(`${SUPABASE}/storage/v1/object/uploads/${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } });
  }
  psql(`delete from public.diario_posts where slug = '${SLUG}'`);
});

test("B3 · post con categoría, portada y curso relacionado; /diario filtra por categoría", async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  await assertStackUp(request);
  await loginAs(page, SOL, "/panel/docente");

  await page.goto("/panel/docente/diario/nuevo");
  await page.getByLabel("Slug (URL)").fill(SLUG);
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page.getByLabel("Categoría").selectOption("tarot-arquetipos");
  await page.getByLabel("Cuerpo").fill("Un texto sobre los arcanos menores.");
  await page.getByRole("button", { name: "Crear post" }).click();
  await expect(page).toHaveURL(/\/panel\/docente\/diario\/[0-9a-f-]{36}$/);

  await page.getByLabel("Arcanos", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Post actualizado.")).toBeVisible();

  await page.getByLabel(/Elegir portada/).setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: PNG_1X1 });
  await page.getByRole("button", { name: "Subir portada" }).click();
  await expect(page.getByText("Portada actualizada.")).toBeVisible();

  await page.getByRole("button", { name: "Publicar post" }).click();
  await expect(page.getByText("Post publicado.")).toBeVisible();

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto("/diario?categoria=tarot-arquetipos");
    const card = pub.locator("li", { has: pub.locator(`a[href="/diario/${SLUG}"]`) });
    await expect(card).toContainText("Tarot y arquetipos");
    await expect(card.locator("img")).toHaveAttribute("src", FIRMADA);

    await pub.goto("/diario?categoria=gemoterapia");
    await expect(pub.locator(`a[href="/diario/${SLUG}"]`)).toHaveCount(0);

    await pub.goto("/diario?categoria=xyz");
    await expect(pub.locator(`a[href="/diario/${SLUG}"]`)).toHaveCount(1);

    await pub.goto(`/diario/${SLUG}`);
    await expect(pub.getByRole("img", { name: `Portada de «${TITULO}»` })).toHaveAttribute("src", FIRMADA);
    const relacionados = pub.getByRole("region", { name: "Cursos relacionados" });
    await expect(relacionados.locator('a[href="/cursos/arcanos-menores"]')).toBeVisible();
  } finally {
    await anon.close();
  }
});

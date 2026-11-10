import { expect, test, loginAs } from "./fixtures";
import { DOCENTE } from "./account";
import { psql } from "./db";

// La dirección sale del título. Un título que ya usa otro curso no da error: nace con -2, -3…
const REPETIDOS = "slug ~ '^tarot-iniciatico-[0-9]+$'";

test.afterEach(() => {
  psql(`delete from public.courses where ${REPETIDOS}`);
});

test("un curso con el título de otro nace con la dirección numerada, sin error", async ({ page }) => {
  psql(`delete from public.courses where ${REPETIDOS}`);
  await loginAs(page, DOCENTE, /\/panel/);
  await page.goto("/panel/docente/nuevo");
  await expect(page.getByLabel("Slug (URL)")).toHaveCount(0);
  await page.getByLabel("Título", { exact: true }).fill("Tarot");
  await page.getByLabel("Título en énfasis (opcional)").fill("Iniciático");
  await page.getByLabel("Disciplina").selectOption("tarot");
  await page.getByLabel("Nivel").fill("Iniciación");
  await page.getByLabel("Precio").fill("240");
  await page.getByRole("button", { name: "Crear curso" }).click();

  await expect(page).toHaveURL(/\/panel\/docente\/cursos\/[0-9a-f-]{36}$/);
  await expect(page.locator("p", { hasText: "Dirección:" })).toContainText("/cursos/tarot-iniciatico-2");
  expect(psql(`select count(*) from public.courses where slug = 'tarot-iniciatico-2'`)).toBe("1");
});

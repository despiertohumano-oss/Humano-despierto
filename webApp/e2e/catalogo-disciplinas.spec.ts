import { expect, test, assertStackUp } from "./fixtures";

const ORDEN = [
  "Astrología", "Tarot", "Constelaciones familiares", "Magia",
  "Gemoterapia", "Simbología y símbolos de poder", "Talleres lunares",
];

test("B1 · el catálogo muestra las siete disciplinas en orden, con conteo", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/cursos");
  const chips = page.getByRole("list", { name: "Filtrar por disciplina" }).getByRole("link");
  await expect(chips).toHaveCount(7);
  for (let i = 0; i < ORDEN.length; i++) await expect(chips.nth(i)).toContainText(ORDEN[i]);
});

test("B1 · una disciplina sin cursos muestra la leyenda y el link a todas", async ({ page }) => {
  await page.goto("/cursos?disciplina=gemoterapia");
  await expect(page.getByText(/Todavía no hay formaciones de Gemoterapia\. Muy pronto/)).toBeVisible();
  await page.getByRole("link", { name: "Ver todas las formaciones" }).click();
  await expect(page).toHaveURL(/\/cursos$/);
});

test("B1 · una clave desconocida se ignora y ?disciplina=tarot filtra", async ({ page }) => {
  const res = await page.goto("/cursos?disciplina=xyz");
  expect(res?.status()).toBe(200);
  await expect(page.getByText(/Todavía no hay formaciones/)).toHaveCount(0);
  await page.goto("/cursos?disciplina=tarot");
  await expect(page.locator('a[href="/cursos/tarot-iniciatico"]')).toBeVisible();
  await expect(page.locator('a[href="/cursos/carta-natal-esencial"]')).toHaveCount(0);
});

test("B1 · la búsqueda sin tildes encuentra por disciplina", async ({ page }) => {
  await page.goto("/cursos?q=astrologia");
  await expect(page.locator('a[href="/cursos/carta-natal-esencial"]')).toBeVisible();
  await expect(page.locator('a[href="/cursos/tarot-iniciatico"]')).toHaveCount(0);
});

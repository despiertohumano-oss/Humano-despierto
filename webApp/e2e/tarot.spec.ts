import { expect, test, ALUMNA, assertStackUp, login } from "./fixtures";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const limpiar = () => psql(`delete from public.tarot_readings where user_id = '${ALUMNA_ID}';`);

test.describe.configure({ mode: "serial" });
test.beforeAll(limpiar);
test.afterAll(limpiar);

test("anónima: cruz simple de punta a punta, la URL lleva la tirada y el enlace de compartir no lleva la pregunta", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/cruz-simple");
  await page.getByLabel("Tu pregunta (opcional)").fill("¿Qué viene?");
  await page.getByRole("button", { name: "Mezclar" }).click();
  await expect(page.getByText("Elegí la carta para: Pasado")).toBeVisible();
  for (const n of [3, 17, 33, 48, 60]) await page.getByRole("button", { name: `Carta ${n} del mazo` }).click();
  await expect(page).toHaveURL(/\/tarot\/lectura\?t=cruz-simple&c=\d+r?\.\d+r?\.\d+r?\.\d+r?\.\d+r?&q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("¿Qué viene?");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Qué viene?");
  const share = await page.getByTestId("compartir").getAttribute("href");
  expect(share).not.toContain("q=");
  await expect(page.getByRole("heading", { name: "Síntesis" })).toBeVisible();
});

test("una codificación inválida es 404", async ({ page }) => {
  const res = await page.goto("/tarot/lectura?t=cruz-celta&c=1.2");
  expect(res?.status()).toBe(404);
});

test("la ficha de una carta tiene su título y JSON-LD", async ({ page }) => {
  await page.goto("/tarot/cartas/la-luna");
  await expect(page).toHaveTitle(/La Luna/);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain('"Article"');
  await expect(page.getByRole("figure", { name: "La Luna" })).toBeVisible();
});

test("alumna: guarda la tirada, la ve en el panel y la borra", async ({ page }) => {
  await login(page, ALUMNA);
  await page.goto("/tarot/lectura?t=cruz-simple&c=0r.45.12.20.30&q=Hola");
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: /Guardada/ })).toBeVisible();
  await expect.poll(() => psql(`select count(*) from public.tarot_readings where user_id = '${ALUMNA_ID}';`)).toBe("1");
  await page.goto("/panel/tarot");
  await expect(page.getByRole("link", { name: "Hola" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar tirada" }).click();
  await expect.poll(() => psql(`select count(*) from public.tarot_readings where user_id = '${ALUMNA_ID}';`)).toBe("0");
});

test("/tarot lista las nueve tiradas", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot");
  await expect(page.getByRole("link", { name: "Tirar", exact: true })).toHaveCount(9);
});

test("la tirada retirada redirige a la cruz simple", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/pasado-presente-futuro");
  await expect(page).toHaveURL(/\/tarot\/cruz-simple$/);
});

test("karma: ocho cartas y la síntesis cierra con una pregunta de reflexión", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/karma?listo=1");
  for (const n of [3, 11, 17, 24, 31, 40, 52, 60]) await page.getByRole("button", { name: `Carta ${n} del mazo` }).click();
  await expect(page).toHaveURL(/\/tarot\/lectura\?t=karma/);
  const sintesis = page.getByRole("heading", { name: "Síntesis" });
  await expect(sintesis).toBeVisible();
  await expect(page.getByText(/^(Una última pregunta|Una pregunta|Te dejo)/).first()).toBeVisible();
});

test("relaciones: la lectura se ve por grupos, Persona A y Persona B", async ({ page, request }) => {
  await assertStackUp(request);
  await page.goto("/tarot/lectura?t=relaciones&c=0.1.2.3.4.5");
  await expect(page.getByRole("heading", { name: "Por grupos" })).toBeVisible();
  await expect(page.getByText("Persona A").first()).toBeVisible();
  await expect(page.getByText("Persona B").first()).toBeVisible();
});

test("astrológica en móvil: lista numerada de las doce casas", async ({ page, request }) => {
  await assertStackUp(request);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/tarot/lectura?t=astrologica&c=0.1.2.3.4.5.6.7.8.9.10.11");
  await expect(page.getByRole("listitem").filter({ hasText: "1. Casa I · Identidad" })).toBeVisible();
});

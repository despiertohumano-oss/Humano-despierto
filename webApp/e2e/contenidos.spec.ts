import axe from "axe-core";
import type { Page } from "@playwright/test";
import { expect, test, assertStackUp, gotoHome } from "./fixtures";

type AxeResult = { violations: { id: string; nodes: { target: unknown }[] }[] };
type AxeWindow = { axe: { run: (ctx: unknown, opts: unknown) => Promise<AxeResult> } };

// axe se inyecta por CDP (evaluate), no con <script>: así no cuenta como violación de CSP.
// `reduce` deja visible todo lo que `Reveal` esconde antes de entrar en pantalla.
// Sobre una imagen axe no puede calcular el contraste (lo marca «incomplete»): eso lo cubre la
// aritmética del velo en src/lib/ui/cosmic-tokens.test.ts; acá se vigilan las superficies sólidas.
// Movimiento reducido ANTES de abrir la página: con él, Reveal no esconde nada debajo del pliegue
// (`reveal-pre` deja el texto en opacidad 0 y axe lo mide como contraste roto).
async function gotoHomeStill(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoHome(page);
}

async function axeViolations(page: Page, include?: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(axe.source);
  const result = await page.evaluate(
    ({ inc }) =>
      (window as unknown as AxeWindow).axe.run(inc ? { include: [inc] } : document, {
        runOnly: { type: "rule", values: ["color-contrast", "image-alt", "link-name", "button-name"] },
      }),
    { inc: include ?? null },
  );
  return result.violations.map((v) => `${v.id}: ${JSON.stringify(v.nodes.map((n) => n.target))}`);
}

const BANNED = /herbolar|herborist|reiki|\boficios\b|sin vencimiento|acceso ilimitado/i;

test.beforeEach(async ({ request }) => {
  await assertStackUp(request);
});

test("portada: textos de la dueña, ancla del hero y sin términos viejos en el chrome", async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "\"Solo hay una pequeña parte del universo que sabrás con certeza que puede ser mejorada, y esa parte eres tú\".",
  );
  await expect(
    page.getByText("Un espacio de aprendizaje y transformación que integra astrología, tarot, constelaciones familiares, magia y herramientas para el autoconocimiento."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explorar los cursos" })).toHaveAttribute("href", "/cursos");

  await page.getByRole("link", { name: "Conocé Humano Despierto" }).click();
  await expect(page).toHaveURL(/#nuestra-mirada$/);
  await expect(page.getByRole("heading", { name: "La astrología es un lenguaje para comprendernos y descubrir nuestro propio universo." })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Explorá cada propuesta y elegí tu camino de aprendizaje." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Docentes" }).first()).toBeVisible();
  await expect(page.getByText("Al finalizar determinadas formaciones")).toBeVisible();

  // Las cifras y las tarjetas traen datos de la base (el seed local aún tiene «Reiki»): el barrido
  // de texto sólo cubre lo que es texto de la escuela. Los datos los remapea el bloque B.
  for (const sel of ['section[aria-label="Presentación"]', "#nuestra-mirada", "#empezar", "footer"]) {
    expect(await page.locator(sel).innerText(), sel).not.toMatch(BANNED);
  }
});

test("portada: axe sin violaciones de contraste, alt ni nombres", async ({ page }) => {
  await gotoHomeStill(page);
  expect(await axeViolations(page)).toEqual([]);
});

test("calendario lunar: banda cósmica, \"Hoy\" en oro y axe limpio", async ({ page }) => {
  await gotoHomeStill(page);
  const luna = page.locator('section[aria-labelledby="luna-titulo"]');
  await expect(luna.getByRole("heading", { name: "Calendario lunar" })).toBeVisible();
  await expect(luna).toHaveCSS("background-color", "rgb(14, 20, 48)");
  await expect(luna.getByText("Hoy", { exact: true })).toHaveCSS("color", "rgb(217, 180, 90)");
  expect(await axeViolations(page, 'section[aria-labelledby="luna-titulo"]')).toEqual([]);
});

test("/tarot: textos nuevos, cabecera cósmica, axe limpio y CTA hacia los cursos de Tarot", async ({ page }) => {
  await page.goto("/tarot");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("El lenguaje de los arquetipos. Un encuentro con los símbolos del Tarot.");
  await expect(page.getByRole("heading", { name: "Qué es el tarot y cómo leerlo" })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toMatch(BANNED);
  expect(await axeViolations(page)).toEqual([]);

  await page.getByRole("link", { name: "Conocé nuestros cursos de Tarot" }).click();
  await expect(page).toHaveURL(/\/cursos\?disciplina=tarot$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cursos" })).toBeVisible();
});

test("catálogo, docentes y diario: bajadas y buscador de la dueña", async ({ page }) => {
  await page.goto("/cursos");
  await expect(page.getByText("Explorá nuestras formaciones y descubrí nuevos caminos de conocimiento, autoconocimiento y transformación personal.").first()).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Buscar cursos" })).toHaveAttribute(
    "placeholder",
    "¿Qué te gustaría aprender? Buscá por curso, disciplina o temática.",
  );

  await page.goto("/guias");
  await expect(page.getByRole("heading", { level: 1, name: "Nuestros docentes" })).toBeVisible();

  await page.goto("/diario");
  await expect(page.getByText("Un espacio para explorar el conocimiento", { exact: false })).toBeVisible();
});

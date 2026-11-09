import type { Page } from "@playwright/test";
import { expect, test, ADMIN, assertStackUp, loginAs } from "./fixtures";

// Ningún ítem del menú de arriba se parte en dos líneas ni se sale de la pantalla, con el menú más
// largo (admin) y en todos los anchos donde se muestra; por debajo de 1280 va la hamburguesa.
async function sinCortes(page: Page) {
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav).toBeVisible();
  const items = await nav.locator(":scope > a, :scope > div > button, :scope > button").evaluateAll((els) =>
    els.map((el) => {
      // Líneas reales de cada texto (no del ícono): alturas distintas de sus rectángulos.
      let lineas = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const tops = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top / 4)));
        lineas = Math.max(lineas, tops.size);
      }
      return { text: (el.textContent ?? "").trim(), lineas, right: el.getBoundingClientRect().right };
    }),
  );
  expect(items.length).toBeGreaterThan(5);
  const ancho = page.viewportSize()!.width;
  for (const it of items) {
    expect(it.lineas, `"${it.text}" en una línea`).toBeLessThanOrEqual(1);
    expect(it.right, `"${it.text}" dentro de la pantalla`).toBeLessThanOrEqual(ancho);
  }
  const marca = await page.getByRole("link", { name: "Humano Despierto, inicio" }).boundingBox();
  expect(marca!.height).toBeLessThan(40);
}

test("el menú de la admin nunca parte palabras ni se desborda", async ({ page, request }) => {
  await assertStackUp(request);
  await loginAs(page, ADMIN, "/panel/admin");
  for (const width of [1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/", { waitUntil: "networkidle" });
    await sinCortes(page);
  }
  await page.setViewportSize({ width: 1279, height: 800 });
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
});

test("la cuenta se abre en un menú: panel, perfil y salir", async ({ page, request }) => {
  await assertStackUp(request);
  await loginAs(page, ADMIN, "/panel/admin");
  const nav = page.getByRole("navigation", { name: "Principal" });
  const cuenta = nav.locator("button[aria-expanded]");
  await cuenta.click();
  await expect(cuenta).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: "Mi perfil" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cuenta).toHaveAttribute("aria-expanded", "false");
  await expect(cuenta).toBeFocused();
  await cuenta.click();
  await nav.getByRole("link", { name: "Mi perfil" }).click();
  await expect(page).toHaveURL(/\/panel\/perfil$/);
});

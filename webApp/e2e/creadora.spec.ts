import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, ADMIN } from "./fixtures";

const UNMARK = `update public.profiles set is_founder = false where is_founder`;

test.afterEach(() => {
  psql(UNMARK);
});

test("B4 · la admin marca a una docente como creadora y /guias la destaca primero", async ({ page, browser, request }) => {
  await assertStackUp(request);
  psql(UNMARK);
  await loginAs(page, ADMIN, "/panel/admin");
  await page.goto("/panel/admin/usuarios?q=sol.mayor");
  await page.getByRole("button", { name: "Marcar como creadora" }).first().click();
  await expect(page.getByText("Listo: es la creadora destacada.")).toBeVisible();
  expect(psql(`select count(*) from public.profiles where is_founder`)).toBe("1");

  const anon = await browser.newContext();
  const pub = await anon.newPage();
  try {
    await pub.goto("/guias");
    const destacada = pub.getByRole("article", { name: "Sol Mayor" });
    await expect(destacada).toContainText("Creadora de Humano Despierto");
    await expect(destacada.locator('a[href^="/cursos/"]').first()).toBeVisible();
    await expect(pub.locator('a[href="/guias/sol-mayor"]')).toHaveCount(1);
  } finally {
    await anon.close();
  }
});

test("B4 · sin creadora, /guias muestra solo la grilla", async ({ page, request }) => {
  await assertStackUp(request);
  psql(UNMARK);
  await page.goto("/guias");
  await expect(page.getByText("Creadora de Humano Despierto")).toHaveCount(0);
  await expect(page.locator('a[href^="/guias/"]').first()).toBeVisible();
});

import { psql } from "./db";
import { expect, test, assertStackUp, loginAs, ADMIN } from "./fixtures";

const FP = "e2e0000000000000000000000000e2e0";
const CLEAN = `delete from public.error_events where fingerprint = '${FP}'`;

test.afterEach(() => {
  psql(CLEAN);
});

test("0078 · la admin ve un error agrupado y lo marca como resuelto", async ({ page, request }) => {
  await assertStackUp(request);
  psql(CLEAN);
  psql(`insert into public.error_events (fingerprint, source, path, message, last_digest, hits)
        values ('${FP}', 'server', '/cursos/:id', 'TypeError: e2e roto', 'dig-e2e', 3)`);

  await loginAs(page, ADMIN, "/panel/admin");
  await page.getByRole("link", { name: "Errores" }).click();
  await expect(page).toHaveURL(/\/panel\/admin\/errores$/);
  const fila = page.getByRole("listitem").filter({ hasText: "TypeError: e2e roto" });
  await expect(fila).toContainText("/cursos/:id");
  await expect(fila).toContainText("3 veces");
  await expect(fila).toContainText("Referencia: dig-e2e");

  await fila.getByRole("button", { name: "Ya está resuelto" }).click();
  await expect(page.getByText("TypeError: e2e roto")).toHaveCount(0);
  expect(psql(`select count(*) from public.error_events where fingerprint = '${FP}'`)).toBe("0");
});

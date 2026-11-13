import type { Page } from "@playwright/test";
import { expect, test, ALUMNA, assertStackUp, userIdByEmail } from "./fixtures";
import { ADMIN, PASSWORD, fillLogin, freshEmail, loginAt, register } from "./account";
import { authLinkFor, invitationLinkFor } from "./mailpit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin archivo: el skip de abajo lo dice.
}
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

// D-113: 5 mails por hora por admin con ventana fija. El spec hace más de 5 por corrida y no limpiaba su cubo:
// dos corridas en la misma hora fallaban. Se vacía al entrar y al salir.
async function limpiarCupo(request: import("@playwright/test").APIRequestContext): Promise<void> {
  const uid = await userIdByEmail(request, ADMIN.email);
  for (const accion of ["inviteTeacherAction", "resendInvitationAction", "revokeInvitationAction"]) {
    await request.delete(`${SUPABASE}/rest/v1/rate_limit_buckets?key=eq.${accion}:u:${uid}`, { headers: H });
  }
}

test.beforeAll(async ({ request }) => {
  test.skip(!SERVICE, "falta SUPABASE_SERVICE_ROLE_KEY (webApp/.env.local)");
  await limpiarCupo(request);
});

test.afterAll(async ({ request }) => {
  if (SERVICE) await limpiarCupo(request);
});

async function invite(page: Page, email: string): Promise<void> {
  await loginAt(page, "/entrar", ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/panel\/admin$/);
  await page.goto("/panel/admin/invitaciones", { waitUntil: "networkidle" });
  await page.getByLabel("Mail de la docente").fill(email);
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByRole("status").first()).toContainText(/Invitación enviada a .+, vence el \d+ de \w+ de \d{4}/);
}

// Cada test invita al menos una vez y el spec supera el tope de 5 por hora: el cupo se vacía antes de cada uno.
test.beforeEach(async ({ page }) => {
  await assertStackUp(page.request);
  if (SERVICE) await limpiarCupo(page.request);
});

// El link del mail trae un acceso de un solo uso (?acceso=…&tipo=…): entra con la cuenta invitada sin pasar por /entrar.
const sinAcceso = (link: string) => link.replace(/\?.*$/, "");

test("c.1 c.2 cuenta nueva: el link del mail entra solo, elige su clave y queda en /panel/docente", async ({ page, browser }) => {
  const email = freshEmail("invitada");
  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);
  expect(link).toMatch(/\?acceso=[^&]+&tipo=signup$/);

  const ctx = await browser.newContext();
  const invitada = await ctx.newPage();
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/entrar\/nueva-clave\?invitacion=1$/);
  await expect(invitada.getByText("Ya sos docente de Humano Despierto.", { exact: false })).toBeVisible();
  // NB-1 (T-097): quien abrió el link ve con qué cuenta quedó.
  await expect(invitada.getByRole("status").filter({ hasText: email })).toContainText("¿No sos vos?");
  await invitada.getByLabel("Clave nueva", { exact: true }).fill(PASSWORD);
  await invitada.getByLabel(/Repet/).fill(PASSWORD);
  await invitada.getByRole("button", { name: /Guardar/ }).click();
  await expect(invitada).toHaveURL(/\/panel\/docente$/);

  // Recargar el link (acceso ya usado) es idempotente para quien ya aceptó.
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/panel\/docente$/);
  await ctx.close();

  // Y la clave que eligió sirve para entrar.
  const otra = await browser.newContext();
  const vuelta = await otra.newPage();
  await loginAt(vuelta, "/entrar", email, PASSWORD);
  await expect(vuelta).toHaveURL(/\/panel\/docente$/);
  await otra.close();
});

test("c.2 cuenta existente: el link entra directo con su cuenta y queda docente", async ({ page, browser }) => {
  const email = freshEmail("existente");
  const previa = await browser.newContext();
  const alumna = await previa.newPage();
  await register(alumna, email);
  await alumna.goto(await authLinkFor(alumna.request, email, "signup"));
  await expect(alumna).toHaveURL(/\/panel$/);
  await previa.close();

  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);
  expect(link).toMatch(/\?acceso=[^&]+&tipo=magiclink$/);

  const ctx = await browser.newContext();
  const invitada = await ctx.newPage();
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/panel\/docente\?invitacion=1$/);
  // NB-1 (T-097): un link reenviado deja a otra persona en esta cuenta; el aterrizaje lo dice y deja salir.
  const aviso = invitada.getByRole("status").filter({ hasText: email });
  await expect(aviso).toContainText("¿No sos vos?");
  await aviso.getByRole("button", { name: "Salir" }).click();
  await expect(invitada).toHaveURL(/\/entrar$/);
  await invitada.goto("/panel/docente");
  await expect(invitada).toHaveURL(/\/entrar/);
  await ctx.close();
});

test("sin acceso (vencido): el link pide entrar a mano y después acepta", async ({ page, browser }) => {
  const email = freshEmail("vencido");
  const previa = await browser.newContext();
  const alumna = await previa.newPage();
  await register(alumna, email);
  await alumna.goto(await authLinkFor(alumna.request, email, "signup"));
  await previa.close();

  await invite(page, email);
  const link = sinAcceso(await invitationLinkFor(page.request, email));

  const ctx = await browser.newContext();
  const invitada = await ctx.newPage();
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/entrar\?next=%2Finvitacion%2F/);
  await fillLogin(invitada, email, PASSWORD);
  await expect(invitada).toHaveURL(/\/panel\/docente$/);
  await ctx.close();
});

// S-02 (T-096): con otra sesión abierta el acceso no se canjea; antes la reemplazaba en silencio.
test("abierto con otra sesión: no canjea el acceso, pide salir primero y sigue alumna", async ({ page, browser }) => {
  const email = freshEmail("otrasesion");
  await invite(page, email);
  const link = await invitationLinkFor(page.request, email);

  const ctx = await browser.newContext();
  const nav = await ctx.newPage();
  await loginAt(nav, "/entrar", ALUMNA.email, ALUMNA.password);
  await expect(nav).toHaveURL(/\/panel$/);
  await nav.goto(link);
  await expect(nav).toHaveURL(/\/invitacion\/invalida\?sesion=1$/);
  await nav.goto("/panel/docente");
  await expect(nav).toHaveURL(/\/panel$/);

  // El mismo link, en un navegador sin sesión, todavía entra: el acceso no se gastó.
  const limpio = await browser.newContext();
  const invitada = await limpio.newPage();
  await invitada.goto(link);
  await expect(invitada).toHaveURL(/\/entrar\/nueva-clave\?invitacion=1$/);
  await limpio.close();
  await ctx.close();
});

test("c.3 otra cuenta sin acceso: mensaje neutro que sugiere salir, y sigue alumna", async ({ page, browser }) => {
  const email = freshEmail("ajena");
  await invite(page, email);
  const link = sinAcceso(await invitationLinkFor(page.request, email));

  const ctx = await browser.newContext();
  const intrusa = await ctx.newPage();
  await loginAt(intrusa, "/entrar", ALUMNA.email, ALUMNA.password);
  await expect(intrusa).toHaveURL(/\/panel$/);
  await intrusa.goto(link);
  await expect(intrusa).toHaveURL(/\/invitacion\/invalida\?sesion=1$/);
  await expect(intrusa.getByRole("heading", { level: 1 })).toContainText("no es válida o venció");
  await expect(intrusa.getByText(/Puede que la hayas abierto con otra cuenta/)).toBeVisible();
  await intrusa.goto("/panel/docente");
  await expect(intrusa).toHaveURL(/\/panel$/);
  await ctx.close();
});

test("c.7 c.8 invitar dos veces ofrece reenviar; la búsqueda muestra la revocada y la nueva", async ({ page }) => {
  const email = freshEmail("reenviar");
  await invite(page, email);
  await page.getByLabel("Mail de la docente").fill(email);
  await page.getByRole("button", { name: "Invitar" }).click();
  await expect(page.getByRole("status").first()).toContainText("Ya hay una invitación pendiente");
  await page.getByRole("button", { name: "Reenviar invitación" }).click();
  await expect(page.getByText(/Invitación reenviada a/)).toBeVisible();

  await page.goto(`/panel/admin/invitaciones?q=${encodeURIComponent(email)}`, { waitUntil: "networkidle" });
  const filas = page.locator("li", { hasText: email });
  await expect(filas).toHaveCount(2);
  await expect(filas.filter({ hasText: "Pendiente" })).toHaveCount(1);
  await expect(filas.filter({ hasText: "Revocada" })).toHaveCount(1);
});

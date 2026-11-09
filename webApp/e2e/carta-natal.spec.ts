import type { Page } from "@playwright/test";
import { expect, test, ALUMNA, assertStackUp, login, loginAs } from "./fixtures";
import { DOCENTE } from "./account";
import { psql } from "./db";

const ALUMNA_ID = "d0000000-0000-4000-8000-000000000003";
const DOCENTE_ID = "d0000000-0000-4000-8000-000000000002";
const LUGAR = 999000001;
// Purmamarca real de GeoNames: si `places` no está cargada, el spec la inserta y la borra al final.
const PURMAMARCA = 3839841;
const SIN_HORA = "Sin hora de nacimiento no se calculan Ascendente, Medio Cielo ni casas.";
const INEXISTENTE = "Esa hora no existió en el reloj oficial de ese lugar";
const BLOQUEO = "Antes de entrar, cargá tu carta natal";

const contarCartas = (userId: string) => psql(`select count(*) from public.natal_charts where user_id = '${userId}';`);

// Deja a la docente como la deja seed.fixtures.sql: su carta propia y Sol/Luna en el perfil.
function restaurarDocente() {
  psql(`delete from public.natal_charts where user_id = '${DOCENTE_ID}';`);
  psql(`insert into public.natal_charts (user_id, label, birth_date, birth_time, place_id, lat, lon, timezone, utc_offset_seconds, tzdata_version, house_system, is_self, consented_at)
        values ('${DOCENTE_ID}', 'Mi carta', date '1990-07-01', null, null, -34.60372, -58.38159, 'America/Argentina/Buenos_Aires', -10800, '2026e', 'placidus', true, now());`);
  psql(`update public.profiles set sun_sign = 'cancer', moon_sign = 'libra', asc_sign = null where id = '${DOCENTE_ID}';`);
}

let purmamarcaInsertada = false;

test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  psql(`insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
        values (${LUGAR}, 'Ciudad de Prueba', 'Ciudad de Prueba', 'Buenos Aires', 'AR', -34.60372, -58.38159, 'America/Argentina/Buenos_Aires', 1)
        on conflict (id) do nothing;`);
  purmamarcaInsertada =
    psql(`insert into public.places (id, name, ascii_name, admin1, country_code, lat, lon, timezone, population)
          values (${PURMAMARCA}, 'Purmamarca', 'Purmamarca', 'Jujuy', 'AR', -23.74595, -65.49976, 'America/Argentina/Jujuy', 2000)
          on conflict (id) do nothing returning id;`) !== "";
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
  // Guardar admite 10 por hora: dos corridas seguidas del spec ya la agotan para la alumna.
  psql(`delete from public.rate_limit_buckets where split_part(key, ':', 1) in ('calcularCarta', 'guardarCarta', 'buscarLugar', 'borrarCarta', 'marcarMiCarta');`);
});
test.afterAll(() => {
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
  restaurarDocente();
  psql(`delete from public.places where id = ${LUGAR};`);
  if (purmamarcaInsertada) psql(`delete from public.places where id = ${PURMAMARCA};`);
});

async function elegirLugar(page: Page, busqueda = "Ciudad de Pru", nombre: RegExp = /Ciudad de Prueba/) {
  await page.getByLabel("Lugar de nacimiento").fill(busqueda);
  await page.getByRole("button", { name: nombre }).first().click();
}

async function datosConLugar(page: Page, { fecha = "1990-06-15", hora = "09:00" }: { fecha?: string; hora?: string } = {}) {
  await page.getByLabel("Fecha de nacimiento").fill(fecha);
  if (hora) await page.getByLabel("Hora de nacimiento").fill(hora);
  else await page.getByLabel("No sé la hora").check();
  await elegirLugar(page);
}

async function lugarAMano(page: Page) {
  await page.getByRole("button", { name: "No encuentro mi localidad" }).click();
  await page.getByLabel("Latitud").fill("-34.60372");
  await page.getByLabel("Longitud").fill("-58.38159");
  await page.getByLabel("Huso horario (IANA)").fill("America/Argentina/Buenos_Aires");
}

// networkidle espera la hidratación: lo que se escribe antes queda en el DOM pero no en el estado de React.
const abrir = (page: Page, path: string) => page.goto(path, { waitUntil: "networkidle" });
const calcular = (page: Page) => page.getByRole("button", { name: "Calcular mi carta" }).click();
const posiciones = (page: Page) => page.getByRole("table", { name: "Posiciones" });
const preguntaAmbigua = (page: Page) => page.getByText("Esa hora existió dos veces");

test("anónima con hora: lugar de la lista, rueda y tablas, y nada viaja en la URL", async ({ page, request }) => {
  await assertStackUp(request);
  await abrir(page, "/carta-natal");
  await datosConLugar(page);
  await calcular(page);
  await expect(page.getByRole("img", { name: "Rueda de la carta natal" })).toBeVisible();
  await expect(posiciones(page)).toBeVisible();
  await expect(page.getByRole("table", { name: "Aspectos" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Ascendente" })).toBeVisible();
  await expect(page.getByText("Hora de Ciudad de Prueba, UTC−3").last()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/carta-natal");
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/Para guardarla/)).toBeVisible();
});

test("la búsqueda \"purma\" encuentra Purmamarca y calcula con su huso", async ({ page }) => {
  await abrir(page, "/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  await page.getByLabel("Hora de nacimiento").fill("09:00");
  await page.getByLabel("Lugar de nacimiento").fill("purma");
  // Aviso para lectores de pantalla (sr-only): se afirma que está, no que se ve.
  await expect(page.getByText(/^\d+ lugare?s? encontrados?$/)).toBeAttached();
  // Una lista de botones, sin combobox/listbox: role="option" no puede envolver un botón.
  await expect(page.getByLabel("Lugar de nacimiento")).not.toHaveAttribute("role", /./);
  await expect(page.locator('[role="option"] button, [role="listbox"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Purmamarca, Jujuy/ }).first().click();
  await expect(page.getByText(/^Hora de Purmamarca, UTC−4\./)).toBeVisible();
  await calcular(page);
  await expect(posiciones(page)).toBeVisible();
  await expect(page.getByText(/Purmamarca, Jujuy/).last()).toBeVisible();
  // En junio de 1990 Jujuy estaba en UTC−4 y Buenos Aires en UTC−3 (tzdata): el huso es el del lugar, no el del país.
  // El resultado nombra el huso igual que el aviso previo: por la ciudad.
  await expect(page.getByText("Hora de Purmamarca, UTC−4").last()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/carta-natal");
});

test("anónima sin hora, lugar a mano: sin Ascendente ni casas y con el aviso", async ({ page }) => {
  await abrir(page, "/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  await page.getByLabel("No sé la hora").check();
  await lugarAMano(page);
  await calcular(page);
  await expect(page.getByText(SIN_HORA)).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Ascendente" })).toHaveCount(0);
});

test("hora ambigua: pregunta antes o después del atraso, nunca elige sola, y vuelve a preguntar si cambia la hora", async ({ page }) => {
  await abrir(page, "/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("2008-03-15");
  await page.getByLabel("Hora de nacimiento").fill("23:30");
  await lugarAMano(page);
  await calcular(page);
  await expect(preguntaAmbigua(page)).toBeVisible();
  await expect(posiciones(page)).toHaveCount(0);
  await page.getByLabel("Después del atraso (UTC−3)").check();
  await calcular(page);
  await expect(posiciones(page)).toBeVisible();
  await expect(page.getByText("Huso America/Argentina/Buenos_Aires, UTC−3").last()).toBeVisible();

  await page.getByLabel("Hora de nacimiento").fill("23:45");
  await expect(posiciones(page)).toHaveCount(0);
  await calcular(page);
  await expect(preguntaAmbigua(page)).toBeVisible();
  await expect(page.getByLabel("Después del atraso (UTC−3)")).not.toBeChecked();
  await expect(page.getByLabel("Antes del atraso (UTC−2)")).not.toBeChecked();
  await expect(posiciones(page)).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/carta-natal");
});

test("hora inexistente: avisa que esa hora no existió y no calcula", async ({ page }) => {
  await abrir(page, "/carta-natal");
  await page.getByLabel("Fecha de nacimiento").fill("2007-12-30");
  await page.getByLabel("Hora de nacimiento").fill("00:30");
  await lugarAMano(page);
  await calcular(page);
  await expect(page.getByRole("alert").filter({ hasText: INEXISTENTE })).toBeVisible();
  await expect(posiciones(page)).toHaveCount(0);
});

test("alumna: sin consentimiento no guarda; con consentimiento guarda, reabre recalculada, la marca como suya y la borra", async ({ page }) => {
  await login(page, ALUMNA);
  await abrir(page, "/carta-natal");
  await datosConLugar(page);
  await calcular(page);
  await expect(posiciones(page)).toBeVisible();

  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /aceptar/ })).toBeVisible();
  expect(contarCartas(ALUMNA_ID)).toBe("0");

  await page.getByLabel("Nombre para esta carta (opcional)").fill("Prueba e2e");
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toBeVisible();
  await expect.poll(() => contarCartas(ALUMNA_ID)).toBe("1");
  expect(new URL(page.url()).pathname).toBe("/carta-natal");

  await page.getByRole("link", { name: "Guardada. Verla" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prueba e2e");
  await expect(posiciones(page)).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Ascendente" })).toBeVisible();

  await abrir(page, "/panel/carta-natal");
  await expect(page.getByRole("link", { name: "Prueba e2e" })).toBeVisible();
  await page.getByRole("button", { name: "Marcar como mi carta" }).click();
  await expect.poll(() => psql(`select is_self from public.natal_charts where user_id = '${ALUMNA_ID}';`)).toBe("t");
  await page.reload();
  await expect(page.getByText(/· Mi carta/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como mi carta" })).toHaveCount(0);

  await page.getByRole("button", { name: "Borrar carta" }).click();
  await expect.poll(() => contarCartas(ALUMNA_ID)).toBe("0");
});

test("guardar, cambiar la hora y recalcular vuelve a ofrecer guardar, sin el consentimiento anterior", async ({ page }) => {
  await login(page, ALUMNA);
  await abrir(page, "/carta-natal");
  await datosConLugar(page);
  await calcular(page);
  await page.getByLabel("Nombre para esta carta (opcional)").fill("Primera");
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toBeVisible();
  await expect.poll(() => contarCartas(ALUMNA_ID)).toBe("1");

  await page.getByLabel("Hora de nacimiento").fill("10:00");
  await calcular(page);
  await expect(page.getByRole("heading", { name: "Guardar esta carta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toHaveCount(0);
  await expect(page.getByLabel(/Acepto que guarden mis datos de nacimiento/)).not.toBeChecked();
  await expect(page.getByLabel("Nombre para esta carta (opcional)")).toHaveValue("");

  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toBeVisible();
  await expect.poll(() => contarCartas(ALUMNA_ID)).toBe("2");
  const segunda = psql(`select id from public.natal_charts where user_id = '${ALUMNA_ID}' and birth_time = '10:00';`);
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toHaveAttribute("href", `/carta-natal/${segunda}`);
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
});

test("lo que se escribe antes de hidratar cuenta: el desfase aparece antes de calcular", async ({ page }) => {
  // Se retiene el JS hasta haber escrito: la fecha y la hora quedan en el DOM antes de que React exista.
  let soltar!: () => void;
  const js = new Promise<void>((r) => (soltar = r));
  await page.route("**/_next/static/**/*.js", async (route) => {
    await js;
    await route.continue();
  });
  await page.goto("/carta-natal", { waitUntil: "commit" });
  await page.getByLabel("Fecha de nacimiento").fill("1990-06-15");
  await page.getByLabel("Hora de nacimiento").fill("09:00");
  soltar();
  await page.waitForLoadState("networkidle");
  await elegirLugar(page);
  await expect(page.getByText(/^Hora de Ciudad de Prueba, UTC−3\./)).toBeVisible();
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("1990-06-15");
  await calcular(page);
  await expect(posiciones(page)).toBeVisible();
});

test("hora ambigua elegida: al guardar se conserva la elección", async ({ page }) => {
  await login(page, ALUMNA);
  await abrir(page, "/carta-natal");
  await datosConLugar(page, { fecha: "2008-03-15", hora: "23:30" });
  await calcular(page);
  await expect(preguntaAmbigua(page)).toBeVisible();
  await page.getByLabel("Después del atraso (UTC−3)").check();
  await calcular(page);
  await expect(posiciones(page)).toBeVisible();
  await expect(preguntaAmbigua(page)).toHaveCount(0);

  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect(page.getByRole("link", { name: "Guardada. Verla" })).toBeVisible();
  await expect
    .poll(() => psql(`select ambiguity_choice || '|' || utc_offset_seconds || '|' || birth_time from public.natal_charts where user_id = '${ALUMNA_ID}';`))
    .toBe("later|-10800|23:30:00");

  await page.getByRole("link", { name: "Guardada. Verla" }).click();
  await expect(page.getByText("Huso usado: UTC−3")).toBeVisible();
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
});

test("una carta ajena, una inexistente y una sin sesión dan el mismo 404", async ({ page, browser }) => {
  const ajena = psql(`select id from public.natal_charts where user_id = '${DOCENTE_ID}' and is_self;`);
  expect(ajena).toMatch(/^[0-9a-f-]{36}$/);

  const anonima = await browser.newPage();
  const sinSesion = await anonima.goto(`/carta-natal/${ajena}`);
  expect(sinSesion?.status()).toBe(404);
  const cuerpoSinSesion = await anonima.getByRole("heading", { level: 1 }).textContent();
  await anonima.close();

  await login(page, ALUMNA);
  const deOtra = await page.goto(`/carta-natal/${ajena}`);
  expect(deOtra?.status()).toBe(404);
  const cuerpoAjena = await page.getByRole("heading", { level: 1 }).textContent();
  const inexistente = await page.goto("/carta-natal/11111111-1111-4111-8111-111111111111");
  expect(inexistente?.status()).toBe(404);
  const cuerpoInexistente = await page.getByRole("heading", { level: 1 }).textContent();

  expect(cuerpoAjena).toBe(cuerpoInexistente);
  expect(cuerpoSinSesion).toBe(cuerpoInexistente);
  await expect(page.getByRole("table", { name: "Posiciones" })).toHaveCount(0);
  // Next suma su propio noindex al 404: puede haber más de una meta, y todas tienen que decirlo.
  const robots = await page.locator('meta[name="robots"]').evaluateAll((ms) => ms.map((m) => m.getAttribute("content") ?? ""));
  expect(robots.length).toBeGreaterThan(0);
  for (const r of robots) expect(r).toMatch(/noindex/);
});

test("docente sin carta ve el bloqueo y al guardarla entra al panel", async ({ page }) => {
  psql(`delete from public.natal_charts where user_id = '${DOCENTE_ID}';`);
  await loginAs(page, DOCENTE, "/panel/docente");
  await abrir(page, "/panel/docente");
  await expect(page.getByRole("heading", { name: BLOQUEO })).toBeVisible();
  await page.getByLabel("Fecha de nacimiento").fill("1985-03-21");
  await page.getByLabel("No sé la hora").check();
  await elegirLugar(page);
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar mi carta" }).click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
  await expect(page.getByRole("heading", { name: BLOQUEO })).toHaveCount(0);
  expect(psql(`select count(*) from public.natal_charts where user_id = '${DOCENTE_ID}' and is_self;`)).toBe("1");
  expect(psql(`select sun_sign is not null and moon_sign is not null and asc_sign is null from public.profiles where id = '${DOCENTE_ID}';`)).toBe("t");
  restaurarDocente();
});

test("la ficha de un signo es indexable", async ({ page }) => {
  const res = await page.goto("/carta-natal/signos/aries");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Aries/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/carta-natal\/signos\/aries$/);
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('"Article"');
  // getAttribute esperaría una meta robots que una página indexable puede no tener.
  const robots = await page.locator('meta[name="robots"]').evaluateAll((ms) => ms.map((m) => m.getAttribute("content") ?? ""));
  for (const r of robots) expect(r).not.toMatch(/noindex/);
});

test("alumna edita una carta guardada: abre precargada, cambia la hora y la reemplaza", async ({ page }) => {
  psql(`delete from public.natal_charts where user_id = '${ALUMNA_ID}';`);
  await login(page, ALUMNA);
  await abrir(page, "/carta-natal");
  await datosConLugar(page);
  await calcular(page);
  await page.getByLabel("Nombre para esta carta (opcional)").fill("Para editar");
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar en mi panel" }).click();
  await expect.poll(() => contarCartas(ALUMNA_ID)).toBe("1");
  const vieja = psql(`select id from public.natal_charts where user_id = '${ALUMNA_ID}';`);

  await abrir(page, "/panel/carta-natal");
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Editar carta natal");
  await expect(page.getByLabel("Fecha de nacimiento")).toHaveValue("1990-06-15");
  await expect(page.getByLabel("Hora de nacimiento")).toHaveValue("09:00");
  await expect(page.getByLabel("Lugar de nacimiento")).toHaveValue(/Ciudad de Prueba/);

  await page.getByLabel("Hora de nacimiento").fill("10:30");
  await calcular(page);
  await expect(page.getByLabel("Nombre para esta carta (opcional)")).toHaveValue("Para editar");
  await page.getByLabel(/Acepto que guarden mis datos de nacimiento/).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL(/\/carta-natal\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Para editar");
  await expect(page.getByText(/10:30/).first()).toBeVisible();
  expect(contarCartas(ALUMNA_ID)).toBe("1");
  expect(psql(`select count(*) from public.natal_charts where id = '${vieja}';`)).toBe("0");
  expect(psql(`select to_char(birth_time, 'HH24:MI') from public.natal_charts where user_id = '${ALUMNA_ID}';`)).toBe("10:30");
});

test("el menú de arriba lleva a la carta natal", async ({ page }) => {
  await abrir(page, "/cursos");
  await page.getByRole("navigation").getByRole("link", { name: "Carta natal" }).first().click();
  await expect(page).toHaveURL(/\/carta-natal$/);
});

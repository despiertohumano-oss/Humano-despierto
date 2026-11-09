import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

// Los campos de fecha y hora (molecules/DateField, TimeField) son segmentos de React Aria, no un
// <input>: se escriben como una persona (dígitos seguidos, el foco salta solo) y el valor se lee
// del campo oculto que viaja con el form.

function campo(page: Page, label: string) {
  return page.getByRole("group", { name: label, exact: true });
}

/** `iso` = AAAA-MM-DD, o "" para borrarla. */
export async function escribirFecha(page: Page, label: string, iso: string) {
  const segmentos = campo(page, label).getByRole("spinbutton");
  if (iso === "") {
    for (let i = (await segmentos.count()) - 1; i >= 0; i--) {
      await segmentos.nth(i).click();
      for (let k = 0; k < 4; k++) await page.keyboard.press("Backspace");
    }
    return;
  }
  const [y, m, d] = iso.split("-");
  await segmentos.first().click();
  await page.keyboard.type(`${d}${m}${y}`);
}

/** `hhmm` = HH:MM en 24 h. */
export async function escribirHora(page: Page, label: string, hhmm: string) {
  await campo(page, label).getByRole("spinbutton").first().click();
  await page.keyboard.type(hhmm.replace(":", ""));
}

export async function esperarValor(page: Page, name: string, valor: string) {
  await expect(page.locator(`input[name="${name}"]`).first()).toHaveValue(valor);
}

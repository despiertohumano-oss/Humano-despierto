// Contraste WCAG 2.x (luminancia relativa). Sin dependencias: lo usan los tests de tokens.
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`color hex inválido: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const asRgb = (c: string | Rgb): Rgb => (typeof c === "string" ? hexToRgb(c) : c);

export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const la = luminance(asRgb(a));
  const lb = luminance(asRgb(b));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** `fg` con opacidad `alpha` sobre `bg`: el color que ve el ojo bajo un velo. */
export function blend(fg: Rgb, bg: Rgb, alpha: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(fg[i] * alpha + bg[i] * (1 - alpha))) as Rgb;
}

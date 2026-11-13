// Pares de lentes que se oponen (spec T-094 §5.4). Máximo 3; 2 si la tirada ya tiene contraste de grupos.
import { baseElement } from "../cards";
import { dignityBetween, type Dignity } from "../dignities";
import type { PlacedCard } from "../reading";
import type { Lens } from "./lenses";

export type Tension = { a: PlacedCard; b: PlacedCard; dignity: Dignity };

const PAIRS: [Lens, Lens][] = [
  ["nucleo", "cruce"],
  ["raiz", "transito"],
  ["yo", "otros"],
  ["meta", "consejo"],
  ["sosten", "cruce"],
];

export function tensionsOf(placed: PlacedCard[], hasContrast: boolean): Tension[] {
  const first = (l: Lens) => [...placed].sort((x, y) => x.position.n - y.position.n).find((p) => p.position.lente === l);
  const out: Tension[] = [];
  for (const [la, lb] of PAIRS) {
    if (hasContrast && la === "yo" && lb === "otros") continue;
    const a = first(la);
    const b = first(lb);
    if (!a || !b || a === b) continue;
    out.push({ a, b, dignity: dignityBetween(baseElement(a.card), baseElement(b.card)) });
  }
  return out.slice(0, hasContrast ? 2 : 3);
}

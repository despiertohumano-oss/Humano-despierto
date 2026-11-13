// Dignidades por vecinos (Golden Dawn, Book T) y los tres estados de la spec T-094 §5.3.
import type { Element } from "../cards";
import { dignityBetween } from "../dignities";

export type Estado = "pleno" | "en_proceso" | "trabada";

export function neighborEffect(self: Element, prev: Element | null, next: Element | null): { weakened: boolean; reinforced: number } {
  if (prev && next && dignityBetween(prev, next) === "debilita") return { weakened: false, reinforced: 0 };
  let score = 0;
  let reinforced = 0;
  for (const n of [prev, next]) {
    if (!n) continue;
    const d = dignityBetween(n, self);
    if (d === "intensifica" || d === "refuerza") {
      score += 1;
      reinforced += 1;
    } else if (d === "debilita") score -= 1;
  }
  return { weakened: score < 0, reinforced };
}

export function estadoOf(reversed: boolean, weakened: boolean): Estado {
  if (weakened) return "trabada";
  return reversed ? "en_proceso" : "pleno";
}

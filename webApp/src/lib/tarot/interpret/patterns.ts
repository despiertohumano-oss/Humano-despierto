// Patrones de tirada y carta dominante (spec T-094 §5.1, §5.2).
import type { PlacedCard } from "../reading";

export type Patterns = {
  repeated: { numero: number; cartas: PlacedCard[] }[];
  progression: "avanza" | "retrocede" | null;
  people: PlacedCard[];
  facets: PlacedCard[];
};

const byN = (a: PlacedCard, b: PlacedCard) => a.position.n - b.position.n;
const isCourt = (p: PlacedCard) => p.card.arcano === "menor" && p.card.numero >= 11;
const numbered = (p: PlacedCard) => p.card.arcano === "menor" && p.card.numero <= 10;

export function patternsOf(placed: PlacedCard[], hasGroups = false): Patterns {
  const ordered = [...placed].sort(byN);
  const byNum = new Map<number, PlacedCard[]>();
  for (const p of ordered.filter(numbered)) byNum.set(p.card.numero, [...(byNum.get(p.card.numero) ?? []), p]);
  const repeated = [...byNum.entries()].filter(([, cs]) => cs.length >= 2).map(([numero, cartas]) => ({ numero, cartas })).sort((a, b) => a.numero - b.numero);

  const nums = ordered.filter(numbered).map((p) => p.card.numero);
  let progression: Patterns["progression"] = null;
  if (nums.length >= 3 && !hasGroups) {
    const steps = nums.length - 1;
    let up = 0;
    let down = 0;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i]! > nums[i - 1]!) up++;
      else if (nums[i]! < nums[i - 1]!) down++;
    }
    if (up * 3 >= steps * 2) progression = "avanza";
    else if (down * 3 >= steps * 2) progression = "retrocede";
  }

  const courts = ordered.filter(isCourt);
  return {
    repeated,
    progression,
    people: courts.filter((p) => ["otros", "sosten", "cruce"].includes(p.position.lente)),
    facets: courts.filter((p) => ["yo", "sombra"].includes(p.position.lente)),
  };
}

export function dominantOf(placed: PlacedCard[]): PlacedCard {
  const ordered = [...placed].sort(byN);
  const majors = ordered.filter((p) => p.card.arcano === "mayor");
  const enCentro = majors.find((p) => p.position.lente === "nucleo" || p.position.lente === "cruce");
  if (enCentro) return enCentro;
  if (majors.length) return majors[0]!;
  const max = Math.max(...ordered.map((p) => p.reinforced));
  if (max > 0) return ordered.find((p) => p.reinforced === max)!;
  return ordered.find((p) => p.position.lente === "nucleo") ?? ordered[0]!;
}

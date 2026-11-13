// webApp/src/lib/tarot/prose.ts
import type { Card } from "./cards";

export function articulo(card: Card): "el" | "la" | "los" {
  if (card.arcano === "mayor") return card.nombre_es.split(" ")[0]!.toLowerCase() as "el" | "la" | "los";
  return card.numero === 11 || card.numero === 13 ? "la" : "el";
}

export function nombrar(card: Card): string {
  return card.arcano === "mayor" ? card.nombre_es.charAt(0).toLowerCase() + card.nombre_es.slice(1) : `${articulo(card)} ${card.nombre_es}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function de(card: Card): string {
  const n = nombrar(card);
  return n.startsWith("el ") ? `del ${n.slice(3)}` : `de ${n}`;
}

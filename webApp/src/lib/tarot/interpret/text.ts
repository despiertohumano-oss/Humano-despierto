// mulberry32: chico, determinista, suficiente para elegir variantes.
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined) throw new Error(`plantilla sin valor para {${k}}`);
    return v;
  });
}

export function pick(rng: () => number, options: readonly string[]): string {
  return options[Math.floor(rng() * options.length)]!;
}

export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function joinY(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}`;
}

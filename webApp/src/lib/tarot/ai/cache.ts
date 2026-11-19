// T-106 · Caché por pestaña de la lectura redactada: recargar no vuelve a gastar cuota del modelo.
export type AiReadingRequest = { t: string; c: string; q: string | null };
type Store = Pick<Storage, "getItem" | "setItem">;

// cyrb53: hash corto y síncrono. La pregunta no queda en claro en el almacenamiento de la pestaña.
function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function aiCacheKey({ t, c, q }: AiReadingRequest): string {
  return `tarot-ia:${t}:${c}:${hash(q ?? "")}`;
}

// El almacenamiento puede faltar o tirar (ventana privada, sitio bloqueado): sin caché la lectura sale igual.
export function readCachedReading(store: Store | null, key: string): string[] | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) && v.length > 0 && v.every((p) => typeof p === "string") ? v : null;
  } catch {
    return null;
  }
}

export function writeCachedReading(store: Store | null, key: string, paragraphs: string[]): void {
  try {
    store?.setItem(key, JSON.stringify(paragraphs));
  } catch {
    // Sin lugar o bloqueado: la próxima recarga vuelve a pedirla, nada más.
  }
}

// T-106 · Caché por pestaña de la lectura redactada: recargar no vuelve a gastar cuota del modelo.
export type AiReadingRequest = { t: string; c: string; q: string | null };
type Store = Pick<Storage, "getItem" | "setItem">;

export function aiCacheKey({ t, c, q }: AiReadingRequest): string {
  return `tarot-ia:${t}:${c}:${q ?? ""}`;
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

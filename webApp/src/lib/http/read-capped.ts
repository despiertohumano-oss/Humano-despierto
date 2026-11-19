// Compartido por los Route Handlers que aceptan un cuerpo sin sesión (csp-report, lectura-ia).

/** Lee el cuerpo cortando apenas pasa `max` bytes (D-46): `content-length` puede faltar (chunked) o
 * mentir, y `request.text()` cargaria todo en memoria antes de poder medirlo. `null` = demasiado grande. */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

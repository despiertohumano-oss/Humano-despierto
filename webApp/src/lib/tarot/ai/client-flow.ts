// T-106 · Orden del pedido desde el navegador: primero el token de Turnstile (si está encendido),
// recién después la lectura. Cualquier fallo es `null`: la persona se queda con la de plantillas.
import type { AiReadingRequest } from "./cache";

export type AiReadingDeps = {
  getToken: (() => Promise<string | null>) | null;
  post: (body: AiReadingRequest & { token?: string }) => Promise<string[] | null>;
};

export async function fetchAiReading(req: AiReadingRequest, deps: AiReadingDeps): Promise<string[] | null> {
  try {
    if (!deps.getToken) return await deps.post(req);
    const token = await deps.getToken();
    if (!token) return null;
    return await deps.post({ ...req, token });
  } catch {
    return null;
  }
}

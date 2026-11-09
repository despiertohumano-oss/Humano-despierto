// La dirección pública de un curso o un post la arma el servidor desde el título: la docente no
// tiene que inventarla. Se fija al crear y no cambia al editar, para no romper links compartidos.

const MAX = 70;
const MAX_TRIES = 20;

export function slugFromTitle(title: string, fallback = "pagina"): string {
  let s = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > MAX) {
    s = s.slice(0, MAX);
    const cut = s.lastIndexOf("-");
    s = cut > MAX / 2 ? s.slice(0, cut) : s.replace(/-+$/, "");
  }
  if (!s) return fallback;
  return s.length < 3 ? `${s}-${fallback}` : s;
}

export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`;
}

interface InsertResult {
  error: { code?: string; message: string } | null;
}

/** Inserta probando `base`, `base-2`, `base-3`… mientras choque la clave única del slug. No se
 *  puede consultar antes: los borradores de otras docentes no se ven por RLS. */
export async function insertWithUniqueSlug<R extends InsertResult>(
  base: string,
  insert: (slug: string) => PromiseLike<R>,
): Promise<R> {
  let result!: R;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    result = await insert(slugCandidate(base, attempt));
    const e = result.error;
    if (!(e?.code === "23505" && e.message.includes("slug_key"))) return result;
  }
  return result;
}

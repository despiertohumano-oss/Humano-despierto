import "server-only";
import { createHash, randomBytes } from "node:crypto";

// 32 bytes en base64url sin relleno: 43 caracteres que safeNext acepta tal cual en un path.
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

function sha256Hex(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** El token en claro sale una sola vez, en el mail; la base guarda solo el hash. */
export function newInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: sha256Hex(token) };
}

export function hashInvitationToken(token: string): string | null {
  return TOKEN_SHAPE.test(token) ? sha256Hex(token) : null;
}

export function invitationPath(token: string): string {
  return `/invitacion/${token}`;
}

// El acceso de GoTrue (hashed_token + su tipo de verificación) viaja en la query del link. Para un
// mail sin cuenta GoTrue la crea y el tipo es `signup`: esa cuenta todavía no tiene clave.
const ACCESS_SHAPE = /^[A-Za-z0-9_-]{20,128}$/;
export const ACCESS_TYPES = ["magiclink", "signup"] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export interface InvitationAccess {
  hash: string;
  type: AccessType;
}

export function accessQuery(access: InvitationAccess): string {
  return `?acceso=${encodeURIComponent(access.hash)}&tipo=${access.type}`;
}

export function readAccess(params: URLSearchParams): InvitationAccess | null {
  const hash = params.get("acceso");
  const type = params.get("tipo") as AccessType | null;
  if (!hash || !ACCESS_SHAPE.test(hash) || !type || !ACCESS_TYPES.includes(type)) return null;
  return { hash, type };
}

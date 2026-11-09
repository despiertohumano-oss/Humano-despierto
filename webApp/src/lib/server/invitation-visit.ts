import "server-only";
import { hashInvitationToken, invitationPath, type InvitationAccess } from "@/lib/server/invitation-token";
import { homeForRole } from "@/lib/auth/paths";
import { log } from "@/lib/server/log";

export const INVALID_INVITATION_PATH = "/invitacion/invalida";
/** Hay una sesión y no es la de la invitación (o venció): se le dice que pruebe saliendo. */
export const INVALID_WITH_SESSION_PATH = "/invitacion/invalida?sesion=1";
/** La cuenta la creó la invitación: elige su clave y después va a su panel. */
export const INVITED_NEW_PASSWORD_PATH = "/entrar/nueva-clave?invitacion=1";

export interface VisitDeps {
  /** Canjea el acceso del mail: deja la sesión de la cuenta invitada. false si venció o ya se usó. */
  signInWithAccess(access: InvitationAccess): Promise<boolean>;
  userId(): Promise<string | null>;
  accept(token: string, userId: string): Promise<boolean>;
  refreshSession(): Promise<void>;
  roleOf(userId: string): Promise<string | null>;
}

/** Orquesta la visita al link del mail. Con acceso vigente, el link entra con la cuenta invitada
 *  (reemplaza cualquier otra sesión del navegador); sin él, hace falta entrar a mano. La decisión
 *  de aceptar la toma siempre accept_teacher_invitation en la base, con una sesión validada. */
export async function resolveInvitationVisit(
  token: string,
  deps: VisitDeps,
  access: InvitationAccess | null = null,
): Promise<string> {
  if (!hashInvitationToken(token)) return INVALID_INVITATION_PATH;

  let viaAccess = false;
  if (access) {
    try {
      viaAccess = await deps.signInWithAccess(access);
    } catch (err) {
      log.warn("invitation_access_failed", { err });
    }
  }

  const userId = await deps.userId();
  if (!userId) return `/entrar?next=${encodeURIComponent(invitationPath(token))}`;

  if (!(await deps.accept(token, userId))) return INVALID_WITH_SESSION_PATH;

  // El proxy rutea por el claim user_role, que sigue diciendo student hasta que el token se
  // reemite; sin esto /panel/docente rebota a /panel hasta una hora. El permiso real lo sigue
  // decidiendo profiles.role (R-2), así que un refresh fallido degrada el ruteo, no la seguridad.
  try {
    await deps.refreshSession();
  } catch (err) {
    log.error("invitation_session_refresh_failed", { err });
  }
  // `signup`: la cuenta la creó la invitación y no tiene clave todavía.
  if (viaAccess && access?.type === "signup") return INVITED_NEW_PASSWORD_PATH;
  return homeForRole(await deps.roleOf(userId));
}

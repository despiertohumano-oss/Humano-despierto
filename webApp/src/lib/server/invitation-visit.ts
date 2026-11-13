import "server-only";
import { hashInvitationToken, invitationPath, type InvitationAccess } from "@/lib/server/invitation-token";
import { homeForRole } from "@/lib/auth/paths";
import { log } from "@/lib/server/log";

export const INVALID_INVITATION_PATH = "/invitacion/invalida";
/** Hay una sesión y no es la de la invitación (o venció): se le dice que pruebe saliendo. */
export const INVALID_WITH_SESSION_PATH = "/invitacion/invalida?sesion=1";
/** La cuenta la creó la invitación: elige su clave y después va a su panel. */
export const INVITED_LANDING_QUERY = "invitacion=1";
export const INVITED_NEW_PASSWORD_PATH = `/entrar/nueva-clave?${INVITED_LANDING_QUERY}`;

export interface VisitDeps {
  /** Canjea el acceso del mail: deja la sesión de la cuenta invitada. false si venció o ya se usó. */
  signInWithAccess(access: InvitationAccess): Promise<boolean>;
  userId(): Promise<string | null>;
  accept(token: string, userId: string): Promise<boolean>;
  refreshSession(): Promise<void>;
  roleOf(userId: string): Promise<string | null>;
}

/** Orquesta la visita al link del mail. Sin sesión en el navegador, un acceso vigente entra con la
 *  cuenta invitada; sin él, hace falta entrar a mano. Con una sesión ya abierta el acceso NO se
 *  canjea (S-02, T-096): reemplazarla en silencio dejaba a quien abrió un link reenviado logueada
 *  como la invitada, y lo que cargara después quedaba en esa cuenta. Esa sesión va directo a
 *  accept_teacher_invitation, que exige el mail invitado: si es la misma cuenta acepta, si es otra
 *  rechaza y la página le dice que salga primero. La base decide "misma cuenta", no esta función. */
export async function resolveInvitationVisit(
  token: string,
  deps: VisitDeps,
  access: InvitationAccess | null = null,
): Promise<string> {
  if (!hashInvitationToken(token)) return INVALID_INVITATION_PATH;

  let viaAccess = false;
  let userId = await deps.userId();
  if (!userId && access) {
    try {
      viaAccess = await deps.signInWithAccess(access);
    } catch (err) {
      log.warn("invitation_access_failed", { err });
    }
    if (viaAccess) userId = await deps.userId();
  }

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
  const home = homeForRole(await deps.roleOf(userId));
  // NB-1 (T-097): si la sesión la dejó el acceso del link, el aterrizaje muestra qué cuenta es.
  return viaAccess ? `${home}?${INVITED_LANDING_QUERY}` : home;
}

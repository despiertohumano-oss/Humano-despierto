import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, cspEnforced, generateNonce } from "@/lib/security/csp";
import { updateSession } from "@/lib/supabase/proxy";

// T-006 (rechazo 1): `/leccion` sale de acá. El proxy no puede saber sin ir a la base si una
// lección es `is_preview` (T-004 ya promete que una vista previa se ve sin inscripción), y una
// consulta por request en el middleware sale cara. La página ya resuelve el acceso del lado del
// servidor (`getLessonPlayerData`: inscripción activa o `is_preview`, ADR-003) — la decisión
// queda donde ya está la lógica, no duplicada acá. Por eso además `leccion/[id]` se movió fuera
// del grupo `(app)`: su layout también redirigía a cualquier anónimo antes de llegar a la página.
const PROTECTED_PREFIXES = ["/panel"];

// Rutas de T-005/T-008 (paneles docente/admin) — el guard ya existe aunque
// las páginas todavía no. Claim del JWT (ADR-006: autoridad "orientativa"
// para ruteo, nunca para permisos sobre datos).
const ROLE_GUARDED: { prefix: string; role: string }[] = [
  { prefix: "/panel/admin", role: "admin" },
  { prefix: "/panel/docente", role: "teacher" },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// S-03 (T-096): fuera de /panel, getUser() de un Server Component refresca el token pero no puede
// escribir la cookie; el refresh token quedaba consumido y GoTrue revocaba la sesión después. Por
// eso el refresco corre acá para todo documento que pueda leer la sesión. Quedan fuera los Route
// Handlers que arman su propia sesión (`/auth/callback` canjea el código, `/invitacion/[token]`
// el acceso: dos Set-Cookie del mismo nombre en una respuesta) y lo que no es HTML.
const SESSION_SELF_MANAGED = ["/auth", "/invitacion", "/api"];

function refreshesSession(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (SESSION_SELF_MANAGED.some((prefix) => matchesPrefix(pathname, prefix))) return false;
  if (/\/opengraph-image(-[\w-]+)?$/.test(pathname)) return false;
  // Archivos con extensión: estáticos de public/, sitemap.xml, robots.txt.
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  // Sin cookie de auth no hay nada que refrescar: el anónimo no paga una consulta.
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    siteUrl: process.env.SITE_URL,
    isDev: process.env.NODE_ENV === "development",
    enforce: cspEnforced(process.env.CSP_ENFORCE),
  });
  // Next toma el nonce de la cabecera CSP del REQUEST (CSP o CSP-Report-Only) y lo pone en sus
  // <script>. Se escribe sobre request.headers para que tambien lo vea el NextResponse.next({ request })
  // que arma updateSession al refrescar cookies.
  request.headers.set(csp.name, csp.value);
  request.headers.set("x-nonce", nonce);
  // Lo lee lib/server/log.ts para atar cada linea de log a su request (T-051).
  const requestId = crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  const response = await route(request);
  response.headers.set("x-request-id", requestId);
  // Un redirect no tiene documento: no necesita politica.
  if (!response.headers.has("location")) response.headers.set(csp.name, csp.value);
  return response;
}

async function route(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    // updateSession arma su NextResponse.next({ request }) con las cabeceras ya escritas (nonce).
    if (refreshesSession(request)) return (await updateSession(request)).proxyResponse;
    // Sin `request` el override de cabeceras (nonce) no llega al render.
    return NextResponse.next({ request });
  }

  const { proxyResponse, claims } = await updateSession(request);

  if (!claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(url);
    proxyResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const roleRule = ROLE_GUARDED.find((rule) => matchesPrefix(pathname, rule.prefix));
  if (roleRule && claims.user_role !== roleRule.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    const redirectResponse = NextResponse.redirect(url);
    proxyResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return proxyResponse;
}

export const config = {
  // Todo menos estaticos: la CSP va en cada documento. updateSession corre en /panel siempre y en
  // el resto solo con cookie de auth y fuera de lo que excluye `refreshesSession` (S-03).
  // Sin `missing: next-router-prefetch`: excluir prefetches saltearia tambien el guard de auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock("@/lib/supabase/proxy", () => ({ updateSession }));

import { proxy } from "./proxy";

const SESSION_COOKIE = "sb-127-auth-token=base64-abc";

function request(path: string, cookie: string | null = SESSION_COOKIE): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

/** Lo que devuelve updateSession: la respuesta "next" con la cookie refrescada y las claims. */
function session(claims: Record<string, unknown> | null) {
  updateSession.mockImplementation(async (req: NextRequest) => {
    const proxyResponse = NextResponse.next({ request: req });
    proxyResponse.cookies.set("sb-127-auth-token", "refrescada");
    return { proxyResponse, claims };
  });
}

describe("proxy · refresco de sesión (S-03, T-096)", () => {
  beforeEach(() => updateSession.mockReset());

  it.each(["/", "/leccion/abc", "/circulo/tarot", "/tarot/lectura/x", "/carta-natal/y", "/cursos/z"])(
    "%s con cookie de sesión refresca y devuelve la cookie nueva",
    async (path) => {
      session({ sub: "u-1", user_role: "student" });
      const res = await proxy(request(path));
      expect(updateSession).toHaveBeenCalledTimes(1);
      expect(res.cookies.get("sb-127-auth-token")?.value).toBe("refrescada");
      expect(res.headers.get("location")).toBeNull();
    },
  );

  it("una página pública sin sesión no se redirige aunque las claims sean nulas", async () => {
    session(null);
    const res = await proxy(request("/leccion/abc"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("sin cookie de sesión no consulta nada fuera de /panel", async () => {
    const res = await proxy(request("/tarot", null));
    expect(updateSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it.each([
    "/auth/callback",
    "/invitacion/AAAA",
    "/api/csp-report",
    "/opengraph-image",
    "/cursos/x/opengraph-image-abc123",
    "/brand/hero.webp",
    "/tarot/rws/00-fool.webp",
    "/sitemap.xml",
    "/robots.txt",
  ])("%s no pasa por el refresco (maneja su propia sesión o no es HTML)", async (path) => {
    session({ sub: "u-1" });
    await proxy(request(path));
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("la CSP con nonce sigue en el documento y llega al render", async () => {
    session({ sub: "u-1" });
    const res = await proxy(request("/tarot"));
    const policy = res.headers.get("content-security-policy") ?? res.headers.get("content-security-policy-report-only");
    expect(policy).toMatch(/'nonce-[^']+'/);
    const forwarded = updateSession.mock.calls[0][0] as NextRequest;
    expect(forwarded.headers.get("x-nonce")).toBeTruthy();
  });
});

describe("proxy · /panel sigue protegido", () => {
  beforeEach(() => updateSession.mockReset());

  it("sin sesión redirige a /entrar con next y copia las cookies", async () => {
    session(null);
    const res = await proxy(request("/panel/perfil", null));
    expect(updateSession).toHaveBeenCalledTimes(1);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/entrar");
    expect(location.searchParams.get("next")).toBe("/panel/perfil");
    expect(res.cookies.get("sb-127-auth-token")?.value).toBe("refrescada");
  });

  it("una alumna en /panel/docente vuelve a /panel", async () => {
    session({ sub: "u-1", user_role: "student" });
    const res = await proxy(request("/panel/docente"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/panel");
  });

  it("una admin entra a /panel/admin", async () => {
    session({ sub: "u-1", user_role: "admin" });
    const res = await proxy(request("/panel/admin"));
    expect(res.headers.get("location")).toBeNull();
  });
});

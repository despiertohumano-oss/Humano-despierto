import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { resolveAuthCallback, notifyWelcome } = vi.hoisted(() => ({
  resolveAuthCallback: vi.fn(),
  notifyWelcome: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/server/auth-callback", () => ({ resolveAuthCallback }));
vi.mock("@/lib/server/mail/notify", () => ({ notifyWelcome }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

import { GET } from "./route";

const req = () => new NextRequest("http://localhost:3000/auth/callback?code=abc");

// S-04 (T-096): el redirect del callback lleva el Set-Cookie de la sesión nueva; ninguna caché
// intermedia puede guardarlo, ni con revalidación.
describe("/auth/callback · Cache-Control", () => {
  beforeEach(() => resolveAuthCallback.mockReset());

  it.each([
    ["sesión nueva", { kind: "session", userId: "u-1", sendWelcome: true, destination: "/panel" }],
    ["sesión sin bienvenida", { kind: "session", userId: "u-1", sendWelcome: false, destination: "/panel/docente" }],
    ["código inválido", { kind: "error", destination: "/entrar?error=link" }],
  ])("%s: redirect con private, no-store", async (_caso, outcome) => {
    resolveAuthCallback.mockResolvedValue(outcome);
    const res = await GET(req());
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe(outcome.destination.split("?")[0]);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
});

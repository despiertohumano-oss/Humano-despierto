import { describe, expect, it } from "vitest";
import { authReturnRedirect, entrarError } from "./paths";

describe("authReturnRedirect (vuelta de GoTrue a la Site URL)", () => {
  it("sin code ni error la portada sigue normal", () => {
    expect(authReturnRedirect({})).toBeNull();
    expect(authReturnRedirect({ utm_source: "ig" })).toBeNull();
  });

  it("con code reenvía al callback con el code (y el flow id si vino)", () => {
    expect(authReturnRedirect({ code: "abc", sb_flow_id: "f1" })).toBe("/auth/callback?code=abc&sb_flow_id=f1");
  });

  it("con error reenvía los datos del error y descarta el resto de la query", () => {
    expect(
      authReturnRedirect({ error: "access_denied", error_code: "signup_disabled", error_description: "Signups not allowed", next: "https://evil.example" }),
    ).toBe("/auth/callback?error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed");
  });

  it("ignora valores repetidos (arrays)", () => {
    expect(authReturnRedirect({ code: ["a", "b"] })).toBeNull();
  });
});

describe("entrarError", () => {
  it("solo acepta los errores conocidos", () => {
    expect(entrarError("link")).toBe("link");
    expect(entrarError("signup")).toBe("signup");
    expect(entrarError("oauth")).toBe("oauth");
    expect(entrarError("otro")).toBeNull();
    expect(entrarError(undefined)).toBeNull();
  });
});

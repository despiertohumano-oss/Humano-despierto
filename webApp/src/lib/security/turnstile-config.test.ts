import { describe, expect, it } from "vitest";
import { turnstileConfig } from "./turnstile-config";

describe("turnstileConfig", () => {
  it("encendido solo con las dos claves", () => {
    expect(turnstileConfig({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " s ", TURNSTILE_SECRET_KEY: " k " })).toEqual({ siteKey: "s", secretKey: "k" });
    expect(turnstileConfig({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: "s" })).toBeNull();
    expect(turnstileConfig({ TURNSTILE_SECRET_KEY: "k" })).toBeNull();
    expect(turnstileConfig({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " ", TURNSTILE_SECRET_KEY: "k" })).toBeNull();
  });
});

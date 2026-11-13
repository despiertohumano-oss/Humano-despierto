import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let query = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: vi.fn() } }) }));

import { InvitedAccountBanner, InvitedAccountNotice } from "./InvitedAccountNotice";

describe("InvitedAccountNotice (NB-1)", () => {
  it("dice con qué mail se entró y ofrece salir", () => {
    const html = renderToStaticMarkup(<InvitedAccountNotice email="docente@test.local" />);
    expect(html).toContain('role="status"');
    expect(html).toContain("docente@test.local");
    expect(html).toContain("¿No sos vos?");
    expect(html).toMatch(/<button[^>]*>Salir<\/button>/);
  });

  it("el banner del panel solo aparece en el aterrizaje del link (?invitacion=1)", () => {
    query = "";
    expect(renderToStaticMarkup(<InvitedAccountBanner email="a@test.local" />)).toBe("");
    query = "invitacion=0";
    expect(renderToStaticMarkup(<InvitedAccountBanner email="a@test.local" />)).toBe("");
    query = "invitacion=1";
    expect(renderToStaticMarkup(<InvitedAccountBanner email="a@test.local" />)).toContain("a@test.local");
  });
});

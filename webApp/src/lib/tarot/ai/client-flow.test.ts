import { describe, expect, it } from "vitest";
import { fetchAiReading } from "./client-flow";

const REQ = { t: "cruz-simple", c: "9.66.16.37.17", q: null };

describe("fetchAiReading", () => {
  it("sin Turnstile pide la lectura directo", async () => {
    const bodies: unknown[] = [];
    const r = await fetchAiReading(REQ, { getToken: null, post: async (b) => (bodies.push(b), ["Uno."]) });
    expect(r).toEqual(["Uno."]);
    expect(bodies).toEqual([REQ]);
  });

  it("con Turnstile manda el token en el cuerpo", async () => {
    const bodies: unknown[] = [];
    await fetchAiReading(REQ, { getToken: async () => "tok", post: async (b) => (bodies.push(b), ["Uno."]) });
    expect(bodies).toEqual([{ ...REQ, token: "tok" }]);
  });

  it.each([
    ["el desafío falla", async () => null],
    ["el script no carga", async () => {
      throw new Error("no cargó");
    }],
  ])("si %s, no pide la lectura y queda la de plantillas", async (_n, getToken) => {
    let posted = false;
    const r = await fetchAiReading(REQ, { getToken, post: async () => ((posted = true), ["x"]) });
    expect(r).toBeNull();
    expect(posted).toBe(false);
  });

  it("un error del pedido termina en null", async () => {
    const r = await fetchAiReading(REQ, { getToken: null, post: async () => {
      throw new Error("red");
    } });
    expect(r).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { checkNoteBody, NOTE_BODY_MAX, PLAYER_ERRORS, playerLimited } from "./action-result";

describe("checkNoteBody (G-11)", () => {
  it("recorta y acepta hasta el tope", () => {
    expect(checkNoteBody("  hola  ")).toEqual({ ok: true, body: "hola" });
    expect(checkNoteBody("a".repeat(NOTE_BODY_MAX))).toMatchObject({ ok: true });
  });

  it("vacía o sólo espacios se rechaza con mensaje en castellano", () => {
    expect(checkNoteBody("   ")).toEqual({ ok: false, error: PLAYER_ERRORS.emptyNote });
    expect(checkNoteBody(undefined)).toEqual({ ok: false, error: PLAYER_ERRORS.emptyNote });
  });

  it("pasado el tope se rechaza y el mensaje nombra el límite", () => {
    const r = checkNoteBody("a".repeat(NOTE_BODY_MAX + 1));
    expect(r).toEqual({ ok: false, error: PLAYER_ERRORS.noteTooLong });
    expect(PLAYER_ERRORS.noteTooLong).toContain("4.000");
  });

  it("cuenta puntos de código como char_length: 4000 emojis entran", () => {
    expect(checkNoteBody("🌙".repeat(NOTE_BODY_MAX))).toMatchObject({ ok: true });
  });

  it("el tope coincide con el CHECK de la migración 0082", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sql = readFileSync(
      join(__dirname, "..", "..", "..", "supabase", "migrations", "20261113140000_0082_lesson_notes_body_max.sql"),
      "utf8",
    );
    expect(sql).toContain(`char_length(body) <= ${NOTE_BODY_MAX}`);
  });
});

describe("playerLimited", () => {
  it("devuelve el mensaje humano del límite, sin lanzar", () => {
    expect(playerLimited({ ok: false, remaining: 0, retryAfter: 300 })).toEqual({
      ok: false,
      error: "Demasiados intentos. Esperá 5 minutos y volvé a probar.",
    });
  });
});

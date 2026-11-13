import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLessonPlayerData, getCurrentUser } = vi.hoisted(() => ({ getLessonPlayerData: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@/lib/server/lesson-player", () => ({ getLessonPlayerData }));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

import LeccionLayout from "./layout";

const UUID = "0b9c1a52-6f0e-4d57-9a3e-2f1d8c7b6a41";
const run = (id: string) => LeccionLayout({ children: null, params: Promise.resolve({ id }) });

describe("D-29 · /leccion/[id]", () => {
  beforeEach(() => {
    getLessonPlayerData.mockReset();
    getCurrentUser.mockReset().mockResolvedValue({ id: "u-1", role: "student" });
  });

  it("un id que no es UUID da 404 sin consultar la base", async () => {
    await expect(run("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getLessonPlayerData).not.toHaveBeenCalled();
  });

  it("un UUID sin lección (o sin acceso) da 404 a quien tiene sesión", async () => {
    getLessonPlayerData.mockResolvedValue(null);
    await expect(run(UUID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("un UUID con acceso deja pasar", async () => {
    getLessonPlayerData.mockResolvedValue({ lessonId: UUID });
    await expect(run(UUID)).resolves.toBeDefined();
  });
});

describe("G-06 · /leccion/[id] sin sesión", () => {
  beforeEach(() => {
    getLessonPlayerData.mockReset().mockResolvedValue(null);
    getCurrentUser.mockReset().mockResolvedValue(null);
  });

  it("redirige al login con next a la lección", async () => {
    await expect(run(UUID)).rejects.toThrow(`NEXT_REDIRECT /entrar?next=${encodeURIComponent(`/leccion/${UUID}`)}`);
  });

  it("una lección de vista previa se abre sin sesión", async () => {
    getLessonPlayerData.mockResolvedValue({ lessonId: UUID });
    await expect(run(UUID)).resolves.toBeDefined();
  });

  it("un id que no es UUID sigue dando 404, sin login", async () => {
    await expect(run("abc")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

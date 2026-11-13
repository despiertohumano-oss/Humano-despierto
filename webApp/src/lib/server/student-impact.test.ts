import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertOwnsCourse, createServiceRoleClient } = vi.hoisted(() => ({
  assertOwnsCourse: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/server/teacher", () => ({ assertOwnsCourse }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { getStudentProgressCounts } from "./student-impact";

const COURSE = "40000000-0000-4000-8000-00000000000a";
const TEACHER = "20000000-0000-4000-8000-00000000000a";
const MODULES = [{ id: "m1", lessonIds: ["l1", "l2"] }];

function service(rows: { user_id: string; lesson_id: string }[]) {
  const calls: { select?: string; eq?: [string, unknown]; ranges: [number, number][] } = { ranges: [] };
  const from = vi.fn(() => {
    const c: Record<string, unknown> = {};
    let range: [number, number] = [0, 0];
    Object.assign(c, {
      select: (cols: string) => ((calls.select = cols), c),
      eq: (k: string, v: unknown) => ((calls.eq = [k, v]), c),
      order: () => c,
      range: (a: number, b: number) => ((range = [a, b]), calls.ranges.push([a, b]), c),
      then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows.slice(range[0], range[1] + 1), error: null }).then(ok),
    });
    return c;
  });
  createServiceRoleClient.mockReturnValue({ from });
  return { from, calls };
}

describe("getStudentProgressCounts (G-01)", () => {
  beforeEach(() => {
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
    createServiceRoleClient.mockReset();
  });

  it("verifica la titularidad con la sesión ANTES de leer progreso ajeno con service_role", async () => {
    assertOwnsCourse.mockRejectedValue(new Error("no es tuyo"));
    await expect(getStudentProgressCounts(COURSE, TEACHER, MODULES)).rejects.toThrow("no es tuyo");
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("lee solo user_id y lesson_id del curso y cuenta alumnas distintas", async () => {
    const { calls } = service([
      { user_id: "a", lesson_id: "l1" },
      { user_id: "a", lesson_id: "l2" },
      { user_id: "b", lesson_id: "l2" },
    ]);
    const r = await getStudentProgressCounts(COURSE, TEACHER, MODULES);
    expect(calls.select).toBe("user_id, lesson_id");
    expect(calls.eq).toEqual(["course_id", COURSE]);
    expect(r).toEqual({ byLesson: { l1: 1, l2: 2 }, byModule: { m1: 2 } });
  });

  it("pagina: más de 1000 filas no se cortan en la primera página de PostgREST", async () => {
    const rows = Array.from({ length: 1500 }, (_, i) => ({ user_id: `u${i}`, lesson_id: "l1" }));
    const { calls } = service(rows);
    const r = await getStudentProgressCounts(COURSE, TEACHER, MODULES);
    expect(calls.ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(r.byModule.m1).toBe(1500);
  });
});

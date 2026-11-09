import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, createServiceRoleClient, requireTeacher, assertOwnsCourse, redirect, revalidateTag } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsCourse: vi.fn(),
  redirect: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher, assertOwnsCourse }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag }));
vi.mock("next/navigation", () => ({ redirect }));

import { createCourseAction, deleteCourseAction, setCoursePublishedAction, updateCourseAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

const INITIAL = { error: null, success: null };
const COURSE = "40000000-0000-4000-8000-00000000000a";
const COVER = `covers/${COURSE}/11111111-2222-4333-8444-555555555555.jpg`;

function form() {
  const fd = new FormData();
  fd.set("courseId", COURSE);
  return fd;
}

function setup({ deleteError = null as unknown, cover = COVER as string | null } = {}) {
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { cover_path: cover }, error: null }) }) }),
      delete: () => ({ eq: async () => ({ error: deleteError }) }),
    }),
  });
  const remove = vi.fn().mockResolvedValue({ error: null });
  createServiceRoleClient.mockReturnValue({ storage: { from: () => ({ remove }) } });
  return { remove };
}

describe("deleteCourseAction · portada (T-047)", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    redirect.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("borrado el curso, borra su portada con service_role (la sesion ya no es duena)", async () => {
    const { remove } = setup();
    await deleteCourseAction(INITIAL, form());
    expect(remove).toHaveBeenCalledWith([COVER]);
    expect(redirect).toHaveBeenCalledWith("/panel/docente");
  });

  it("si el curso no se pudo borrar (publicado), la portada queda", async () => {
    const { remove } = setup({ deleteError: { message: "rls" } });
    const r = await deleteCourseAction(INITIAL, form());
    expect(r?.error).toBeTruthy();
    expect(remove).not.toHaveBeenCalled();
  });

  it("sin portada no toca Storage", async () => {
    setup({ cover: null });
    await deleteCourseAction(INITIAL, form());
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});

describe("course actions · error por campo (D-100)", () => {
  function courseForm(overrides: Record<string, string> = {}) {
    const fd = new FormData();
    const base: Record<string, string> = {
      courseId: COURSE, slug: "tarot-iniciatico", title: "Tarot", discipline: "tarot", level: "Inicial", price: "240", currency: "ARS", language: "es",
    };
    for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
    return fd;
  }

  beforeEach(() => {
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("un campo inválido vuelve con su nombre, sin tocar la base", async () => {
    const r = await createCourseAction(INITIAL, courseForm({ price: "doscientos" }));
    expect(r).toMatchObject({ field: "price", error: "El precio es un número (ej: 240 o 240.00)." });
    const u = await updateCourseAction(INITIAL, courseForm({ promoVideoId: "https://youtu.be/x" }));
    expect(u.field).toBe("promoVideoId");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("el slug sale del título; si existe, el curso nace con el siguiente número", async () => {
    const slugs: string[] = [];
    let n = 0;
    createClient.mockResolvedValue({
      from: () => ({
        insert: (row: { slug: string }) => {
          slugs.push(row.slug);
          const res = n++ === 0
            ? { data: null, error: { code: "23505", message: 'unique constraint "courses_slug_key"' } }
            : { data: { id: "c-nuevo" }, error: null };
          return { select: () => ({ single: async () => res }) };
        },
      }),
    });
    await createCourseAction(INITIAL, courseForm({ title: "Tarot", titleEm: "Iniciático" }));
    expect(slugs).toEqual(["tarot-iniciatico", "tarot-iniciatico-2"]);
  });

  it("editar no toca el slug aunque el form lo traiga", async () => {
    let patch: Record<string, unknown> = {};
    createClient.mockResolvedValue({
      from: () => ({ update: (p: Record<string, unknown>) => ((patch = p), { eq: async () => ({ error: null }) }) }),
    });
    await updateCourseAction(INITIAL, courseForm({ slug: "otro" }));
    expect(patch).not.toHaveProperty("slug");
  });

  it("un error que no es de un campo no inventa uno", async () => {
    createClient.mockResolvedValue({
      from: () => ({ update: () => ({ eq: async () => ({ error: { code: "42501", message: "locator" } }) }) }),
    });
    const r = await updateCourseAction(INITIAL, courseForm());
    expect(r.error).toBeTruthy();
    expect(r.field).toBeUndefined();
  });

  it("B2 · la modalidad viaja en el update; checkbox ausente = false", async () => {
    const update = vi.fn((_row: Record<string, unknown>) => ({ eq: async () => ({ error: null }) }));
    createClient.mockResolvedValue({ from: () => ({ update }) });
    await updateCourseAction(INITIAL, courseForm({ includesPdf: "on", includesLive: "on", accessTerms: "Un año de acceso." }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      includes_recorded: false, includes_pdf: true, includes_downloads: false, includes_live: true,
      access_terms: "Un año de acceso.", issues_certificate: false,
    }));
  });

  it("B2 · el insert lleva la modalidad; condiciones vacías = null", async () => {
    const insert = vi.fn((_row: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { id: "nuevo" }, error: null }) }) }));
    createClient.mockResolvedValue({ from: () => ({ insert }) });
    await createCourseAction(INITIAL, courseForm({ includesRecorded: "on", issuesCertificate: "on" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      includes_recorded: true, includes_pdf: false, access_terms: null, issues_certificate: true,
    }));
  });

  it("B2 · condiciones de acceso solo con espacios se guardan como null", async () => {
    const update = vi.fn((_row: Record<string, unknown>) => ({ eq: async () => ({ error: null }) }));
    createClient.mockResolvedValue({ from: () => ({ update }) });
    await updateCourseAction(INITIAL, courseForm({ accessTerms: "   \n  " }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ access_terms: null }));
  });

  it("B2 · condiciones de acceso con un link marcan el campo", async () => {
    const r = await updateCourseAction(INITIAL, courseForm({ accessTerms: "ver drive.google.com/file/d/X" }));
    expect(r.field).toBe("accessTerms");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("B2 · condiciones de acceso de más de 500 caracteres marcan el campo", async () => {
    const r = await updateCourseAction(INITIAL, courseForm({ accessTerms: "a".repeat(501) }));
    expect(r).toMatchObject({ field: "accessTerms", error: "Las condiciones de acceso tienen hasta 500 caracteres." });
  });
});

describe("setCoursePublishedAction · portada (DT2)", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    revalidateTag.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  function publishForm(nextStatus: string) {
    const fd = new FormData();
    fd.set("courseId", COURSE);
    fd.set("nextStatus", nextStatus);
    return fd;
  }

  it.each(["published", "draft"])("pasar a %s invalida la caché de la portada", async (nextStatus) => {
    createClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq: async () => ({ count: 1, error: null }) }) }),
    });
    createServiceRoleClient.mockReturnValue({ from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) });
    const r = await setCoursePublishedAction(INITIAL, publishForm(nextStatus));
    expect(r.error).toBeNull();
    expect(revalidateTag).toHaveBeenCalledWith("landing", { expire: 0 });
  });

  it("si no se pudo publicar, la portada no se toca", async () => {
    createClient.mockResolvedValue({
      from: () => ({ select: () => ({ eq: async () => ({ count: 0, error: null }) }) }),
    });
    const r = await setCoursePublishedAction(INITIAL, publishForm("published"));
    expect(r.error).toMatch(/al menos un módulo/);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

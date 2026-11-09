import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSupabaseClient, signPublicUploadUrls } = vi.hoisted(() => ({
  getPublicSupabaseClient: vi.fn(),
  signPublicUploadUrls: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase-public", () => ({ getPublicSupabaseClient }));
vi.mock("@/lib/server/uploads", () => ({ signPublicUploadUrls }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: vi.fn() }));
vi.mock("@/lib/server/avatar", () => ({ signAvatarUrl: vi.fn() }));

import { getGuiasDirectory, getPublicTeachers, getTeacherBySlug, signTeacherAvatars } from "./guias";

const AVATAR = "avatars/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";

function client(teachers: unknown[], courses: unknown[]) {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not"]) b[m] = vi.fn(() => b);
    b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(ok);
    return b;
  };
  const select = vi.fn();
  return {
    select,
    from: (t: string) => {
      const b = builder(t === "profiles" ? teachers : courses);
      if (t === "profiles") (b.select as ReturnType<typeof vi.fn>).mockImplementation((cols: string) => (select(cols), b));
      return b;
    },
  };
}

describe("getPublicTeachers · avatar (D-62)", () => {
  beforeEach(() => {
    getPublicSupabaseClient.mockReset();
    signPublicUploadUrls.mockReset();
  });

  it("trae el path del avatar sin firmarlo: el sitemap también lee esta lista", async () => {
    const c = client(
      [{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: AVATAR }, { id: "t2", full_name: "Sol", slug: "sol", avatar_path: null }],
      [{ slug: "a", teacher_id: "t1", discipline: "tarot" }, { slug: "b", teacher_id: "t2", discipline: "magia" }],
    );
    getPublicSupabaseClient.mockReturnValue(c);
    const teachers = await getPublicTeachers();
    expect(c.select.mock.calls[0][0]).toMatch(/avatar_path/);
    expect(teachers.map((t) => [t.slug, t.avatarPath])).toEqual([["luna", AVATAR], ["sol", null]]);
    expect(signPublicUploadUrls).not.toHaveBeenCalled();
  });

  it("la disciplina de la tarjeta es la etiqueta de su clave mas frecuente", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client([{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: null }], [
        { slug: "a", teacher_id: "t1", discipline: "talleres-lunares" },
        { slug: "b", teacher_id: "t1", discipline: "talleres-lunares" },
        { slug: "c", teacher_id: "t1", discipline: "tarot" },
      ]),
    );
    const [t] = await getPublicTeachers();
    expect(t.discipline).toBe("Talleres lunares");
  });
});

describe("signTeacherAvatars", () => {
  it("firma en una sola llamada los avatares de las tarjetas que se dibujan", async () => {
    signPublicUploadUrls.mockReset().mockResolvedValue(new Map([[AVATAR, "https://s/a?token=1"]]));
    const urls = await signTeacherAvatars([{ avatarPath: AVATAR }, { avatarPath: null }]);
    expect(signPublicUploadUrls).toHaveBeenCalledTimes(1);
    expect(signPublicUploadUrls).toHaveBeenCalledWith([AVATAR, null]);
    expect(urls.get(AVATAR)).toBe("https://s/a?token=1");
  });
});

describe("getGuiasDirectory · creadora (B4)", () => {
  beforeEach(() => getPublicSupabaseClient.mockReset());

  it("separa a la creadora, aunque no tenga cursos, con sus disciplinas y cursos", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client(
        [
          { id: "f", full_name: "Ana", slug: "ana", is_founder: true, bio: "Fundó la escuela.", avatar_path: null },
          { id: "t1", full_name: "Luna", slug: "luna", is_founder: false, avatar_path: null },
          { id: "t2", full_name: "Sin cursos", slug: "sin", is_founder: false, avatar_path: null },
        ],
        [{ slug: "a", title: "Astro", title_em: null, teacher_id: "t1", discipline: "astrologia" }],
      ),
    );
    const { founder, teachers } = await getGuiasDirectory();
    expect(founder).toMatchObject({ slug: "ana", isFounder: true, bio: "Fundó la escuela.", disciplines: [], courses: [] });
    expect(teachers.map((t) => t.slug)).toEqual(["luna"]);
  });

  it("las disciplinas de la creadora son etiquetas, sin repetir, y sus cursos van enlazables", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client(
        [{ id: "f", full_name: "Ana", slug: "ana", is_founder: true, bio: null, avatar_path: null }],
        [
          { slug: "a", title: "Tarot", title_em: "inicial", teacher_id: "f", discipline: "tarot" },
          { slug: "b", title: "Más tarot", title_em: null, teacher_id: "f", discipline: "tarot" },
          { slug: "c", title: "Luna", title_em: null, teacher_id: "f", discipline: "talleres-lunares" },
        ],
      ),
    );
    const { founder } = await getGuiasDirectory();
    expect(founder?.disciplines).toEqual(["Tarot", "Talleres lunares"]);
    expect(founder?.courses[0]).toEqual({ slug: "a", title: "Tarot", titleEm: "inicial" });
  });

  it("sin creadora, solo la grilla", async () => {
    getPublicSupabaseClient.mockReturnValue(client([{ id: "t1", full_name: "Luna", slug: "luna", is_founder: false, avatar_path: null }], [{ slug: "a", teacher_id: "t1", discipline: "tarot" }]));
    const { founder, teachers } = await getGuiasDirectory();
    expect(founder).toBeNull();
    expect(teachers).toHaveLength(1);
  });

  it("la creadora sin cursos tiene ficha pública; otra docente sin cursos no", async () => {
    getPublicSupabaseClient.mockReturnValue(
      client(
        [
          { id: "f", full_name: "Ana", slug: "ana", is_founder: true, avatar_path: null },
          { id: "t2", full_name: "Sin cursos", slug: "sin", is_founder: false, avatar_path: null },
        ],
        [],
      ),
    );
    expect((await getPublicTeachers()).map((t) => t.slug)).toEqual(["ana"]);
    expect(await getTeacherBySlug("sin")).toBeNull();
    });
  });
});

describe("T-024 · signos públicos de la guía", () => {
  it("pide sun_sign, moon_sign y asc_sign y descarta valores que no son signos", async () => {
    const c = client(
      [{ id: "t1", full_name: "Luna", slug: "luna", avatar_path: null, sun_sign: "leo", moon_sign: "piscis", asc_sign: "ofiuco" }],
      [{ slug: "a", teacher_id: "t1", discipline: "Astrología" }],
    );
    getPublicSupabaseClient.mockReturnValue(c);
    const t = await getTeacherBySlug("luna");
    expect(c.select.mock.calls[0][0]).toMatch(/sun_sign, moon_sign, asc_sign/);
    expect(t?.signs).toEqual({ sun: "leo", moon: "piscis", asc: null });
  });
});

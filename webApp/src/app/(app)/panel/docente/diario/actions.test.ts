import { beforeEach, describe, expect, it, vi } from "vitest";
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, createServiceRoleClient, requireTeacher, assertOwnsPost, syncRelatedCourses, uploadAsServer } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsPost: vi.fn(),
  syncRelatedCourses: vi.fn(),
  uploadAsServer: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher }));
vi.mock("@/lib/server/diario", () => ({ assertOwnsPost, syncRelatedCourses }));
vi.mock("@/lib/server/uploads", () => ({ UPLOADS_BUCKET: "uploads", uploadAsServer }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createPostAction, removePostCoverAction, updatePostAction, uploadPostCoverAction } from "./actions";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

const INITIAL = { error: null, success: null };

function postForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ postId: "p1", slug: "sobre-eclipses", title: "Eclipses", excerpt: "", body: "Texto", category: "conciencia", ...overrides })) fd.set(k, v);
  return fd;
}

function updateFailingWith(code: string) {
  createClient.mockResolvedValue({ from: () => ({ update: () => ({ eq: async () => ({ error: { code, message: code } }) }) }) });
}

describe("post actions · error por campo (D-100)", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsPost.mockReset().mockResolvedValue(undefined);
    syncRelatedCourses.mockReset().mockResolvedValue({ error: null });
  });

  it("un campo inválido vuelve con su nombre", async () => {
    expect(await createPostAction(INITIAL, postForm({ title: "" }))).toMatchObject({ field: "title" });
    expect(await updatePostAction(INITIAL, postForm({ body: "   " }))).toMatchObject({ field: "body" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un localizador en el cuerpo marca el cuerpo; editar no toca el slug", async () => {
    let patch: Record<string, unknown> = {};
    createClient.mockResolvedValue({
      from: () => ({ update: (p: Record<string, unknown>) => ((patch = p), { eq: async () => ({ error: null }) }) }),
    });
    await updatePostAction(INITIAL, postForm());
    expect(patch).not.toHaveProperty("slug");
    updateFailingWith("42501");
    expect((await updatePostAction(INITIAL, postForm())).field).toBe("body");
  });
});

describe("createPostAction · error por campo desde la base (DT1)", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
  });

  function insertFailingWith(code: string) {
    createClient.mockResolvedValue({
      from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code, message: code } }) }) }) }),
    });
  }

  it("el slug sale del título; si existe, prueba el siguiente número", async () => {
    const slugs: string[] = [];
    let n = 0;
    createClient.mockResolvedValue({
      from: () => ({
        insert: (row: { slug: string }) => {
          slugs.push(row.slug);
          const res = n++ === 0
            ? { data: null, error: { code: "23505", message: 'unique constraint "diario_posts_slug_key"' } }
            : { data: { id: "p-nuevo" }, error: null };
          return { select: () => ({ single: async () => res }) };
        },
      }),
    });
    await createPostAction(INITIAL, postForm({ title: "Sobre los Eclipses" }));
    expect(slugs).toEqual(["sobre-los-eclipses", "sobre-los-eclipses-2"]);
  });

  it.each([
    ["42501", "body"],
    ["23514", "body"],
  ])("%s marca %s", async (code, field) => {
    insertFailingWith(code);
    const r = await createPostAction(INITIAL, postForm());
    expect(r.error).toBeTruthy();
    expect(r.field).toBe(field);
  });
});

describe("post actions · revista (B3)", () => {
  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsPost.mockReset().mockResolvedValue(undefined);
    syncRelatedCourses.mockReset().mockResolvedValue({ error: null });
  });

  it("una categoría fuera de la lista marca el campo sin tocar la base", async () => {
    createClient.mockReset();
    expect(await updatePostAction(INITIAL, postForm({ category: "reiki" }))).toMatchObject({ field: "category" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("el alta guarda la categoría", async () => {
    const insert = vi.fn((_row: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { id: "p9" }, error: null }) }) }));
    createClient.mockResolvedValue({ from: () => ({ insert }) });
    await createPostAction(INITIAL, postForm({ category: "ciclos-lunares" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ category: "ciclos-lunares" }));
  });

  it("guarda la categoría y sincroniza los cursos relacionados", async () => {
    const update = vi.fn((_row: Record<string, unknown>) => ({ eq: async () => ({ error: null }) }));
    createClient.mockResolvedValue({ from: () => ({ update }) });
    const fd = postForm({ category: "tarot-arquetipos" });
    fd.append("relatedCourseIds", "40000000-0000-4000-8000-00000000000a");
    const r = await updatePostAction(INITIAL, fd);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ category: "tarot-arquetipos" }));
    expect(syncRelatedCourses).toHaveBeenCalledWith("p1", ["40000000-0000-4000-8000-00000000000a"]);
    expect(r).toEqual({ error: null, success: "Post actualizado." });
  });

  it("un curso que el guard rechaza vuelve como error de cursos relacionados", async () => {
    createClient.mockResolvedValue({ from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) });
    syncRelatedCourses.mockResolvedValue({ error: "42501" });
    const fd = postForm();
    fd.append("relatedCourseIds", "40000000-0000-4000-8000-00000000000b");
    expect(await updatePostAction(INITIAL, fd)).toMatchObject({ field: "relatedCourseIds", error: "Solo podés vincular tus cursos publicados." });
  });
});

describe("portada del post (B3)", () => {
  const POST = "90000000-0000-4000-8000-00000000000a";
  const OLD = `diario/${POST}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg`;
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const remove = vi.fn(async (_paths: string[]) => ({ error: null }));

  function coverForm(bytes: Uint8Array | null, postId = POST) {
    const fd = new FormData();
    fd.set("postId", postId);
    if (bytes) fd.set("cover", new File([bytes.slice().buffer], "p.png", { type: "image/png" }));
    return fd;
  }

  // `affected` = filas que devuelve el UPDATE: 0 es lo que da RLS sobre un post que no es tuyo.
  function session(current: string | null, affected = 1) {
    const rows = Array.from({ length: affected }, () => ({ id: POST }));
    const update = vi.fn((_row: Record<string, unknown>) => ({ eq: () => ({ select: async () => ({ data: rows, error: null }) }) }));
    createClient.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { cover_path: current }, error: null }) }) }),
        update,
      }),
    });
    return update;
  }

  beforeEach(() => {
    __resetRateLimiterForTests();
    rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue({ id: "t", role: "teacher" });
    assertOwnsPost.mockReset().mockResolvedValue(undefined);
    uploadAsServer.mockReset().mockResolvedValue({ error: null });
    remove.mockClear();
    createServiceRoleClient.mockReset().mockReturnValue({ storage: { from: () => ({ remove }) } });
  });

  it("bytes que no son imagen: error sin subir ni tocar la base", async () => {
    const r = await uploadPostCoverAction(INITIAL, coverForm(new TextEncoder().encode("<svg/>")));
    expect(r.error).toBeTruthy();
    expect(uploadAsServer).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un post ajeno no sube nada", async () => {
    assertOwnsPost.mockRejectedValue(new Error("No autorizado: ese post no te pertenece."));
    const r = await uploadPostCoverAction(INITIAL, coverForm(PNG));
    expect(r.error).toMatch(/No autorizado/);
    expect(uploadAsServer).not.toHaveBeenCalled();
  });

  it("sube en la carpeta del post, guarda el path con la sesión y borra la anterior", async () => {
    const update = session(OLD);
    const r = await uploadPostCoverAction(INITIAL, coverForm(PNG));
    expect(r).toEqual({ error: null, success: "Portada actualizada." });
    const [path, , mime] = uploadAsServer.mock.calls[0] as [string, Uint8Array, string];
    expect(path).toMatch(new RegExp(`^diario/${POST}/[0-9a-f-]{36}\\.png$`));
    expect(mime).toBe("image/png");
    expect(update).toHaveBeenCalledWith({ cover_path: path });
    expect(remove).toHaveBeenCalledWith([OLD]);
  });

  it("quitar portada en un post ajeno no actualiza ni borra nada en Storage", async () => {
    // El post publicado es legible por todos: sin assertOwnsPost el select devolvería la portada ajena.
    const update = session(OLD);
    assertOwnsPost.mockRejectedValue(new Error("No autorizado: ese post no te pertenece."));
    const r = await removePostCoverAction(INITIAL, coverForm(null));
    expect(r.error).toMatch(/No autorizado/);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("subida: si el UPDATE no afecta filas, no borra la portada anterior y avisa", async () => {
    session(OLD, 0);
    const r = await uploadPostCoverAction(INITIAL, coverForm(PNG));
    expect(r).toEqual({ error: "No se pudo guardar la portada en el post.", success: null });
    expect(remove).not.toHaveBeenCalledWith([OLD]);
  });

  it("quitar: si el UPDATE no afecta filas, no toca Storage y avisa", async () => {
    session(OLD, 0);
    const r = await removePostCoverAction(INITIAL, coverForm(null));
    expect(r).toEqual({ error: "No se pudo quitar la portada.", success: null });
    expect(remove).not.toHaveBeenCalled();
  });

  it("quitar: pone null y borra el archivo", async () => {
    const update = session(OLD);
    const r = await removePostCoverAction(INITIAL, coverForm(null));
    expect(r).toEqual({ error: null, success: "Portada quitada." });
    expect(update).toHaveBeenCalledWith({ cover_path: null });
    expect(remove).toHaveBeenCalledWith([OLD]);
  });

  it("un postId que no es uuid no llega a la base", async () => {
    expect((await removePostCoverAction(INITIAL, coverForm(null, "x"))).error).toBe("Falta el post.");
    expect(createClient).not.toHaveBeenCalled();
  });
});

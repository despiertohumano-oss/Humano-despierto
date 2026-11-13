import { beforeEach, describe, expect, it, vi } from "vitest";
// T-050: sin esto el sujeto real abre un cliente de Supabase y gasta el cupo de "ip:unknown"
// compartido entre tests; acá cada test arranca con el limitador vacío y una usuaria fija.
const { rateLimitSubject } = vi.hoisted(() => ({ rateLimitSubject: vi.fn() }));
vi.mock("@/lib/server/rate-limit-subject", () => ({ currentRateLimitSubject: rateLimitSubject }));

const { createClient, createServiceRoleClient, requireTeacher, assertOwnsCourse } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  requireTeacher: vi.fn(),
  assertOwnsCourse: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));
vi.mock("@/lib/server/teacher", () => ({ requireTeacher, assertOwnsCourse }));
const { resolveYoutubeVideo } = vi.hoisted(() => ({ resolveYoutubeVideo: vi.fn() }));
vi.mock("@/lib/server/youtube", () => ({ resolveYoutubeVideo }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { attachLessonVideoAction, createLessonAction, removeCourseCoverAction, updateLessonAction, uploadCourseCoverAction } from "./actions";
import * as actions from "./actions";
import { UserFacingError } from "@/lib/server/action-error";
import { MAX_COVER_BYTES } from "@/lib/validation/image";
import { __resetRateLimiterForTests } from "@/lib/server/rate-limit";

beforeEach(() => {
  __resetRateLimiterForTests();
  rateLimitSubject.mockResolvedValue({ kind: "user", id: "u-test" });
});

const INITIAL = { error: null, success: null };
const TEACHER = { id: "20000000-0000-4000-8000-00000000000a", role: "teacher" };
const COURSE = "40000000-0000-4000-8000-00000000000a";
const OLD = `covers/${COURSE}/11111111-2222-4333-8444-555555555555.jpg`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function form(bytes: Uint8Array<ArrayBuffer> | null, courseId = COURSE, name = "portada.png", type = "image/png") {
  const fd = new FormData();
  fd.set("courseId", courseId);
  if (bytes) fd.set("cover", new File([bytes], name, { type }));
  return fd;
}

function sessionClient({ current = null as string | null, updateError = null as unknown } = {}) {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn(() => ({ eq: updateEq }));
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { cover_path: current }, error: null }) }) }),
      update,
    }),
    storage: { from: () => ({ upload, remove }) },
  };
  return { client, upload, remove, update, updateEq };
}

function serviceClient() {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const bucket = vi.fn(() => ({ upload, remove }));
  return { client: { storage: { from: bucket } }, upload, remove, bucket };
}

describe("uploadCourseCoverAction", () => {
  let service: ReturnType<typeof serviceClient>;
  beforeEach(() => {
    createClient.mockReset();
    service = serviceClient();
    createServiceRoleClient.mockReset().mockReturnValue(service.client);
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("c.2 · 3,1 MB con cabecera PNG: mensaje claro y Storage no recibe nada", async () => {
    const big = new Uint8Array(Math.ceil(MAX_COVER_BYTES * 1.04));
    big.set(PNG);
    const r = await uploadCourseCoverAction(INITIAL, form(big));
    expect(r.error).toMatch(/3 MB/);
    expect(createClient).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("c.2 · un PDF renombrado .png se rechaza por sus bytes sin abrir sesion ni tocar Storage", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n");
    const r = await uploadCourseCoverAction(INITIAL, form(pdf, COURSE, "portada.png", "image/png"));
    expect(r.error).toMatch(/JPG, PNG o WEBP/);
    expect(createClient).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("un courseId que no es uuid no llega a la base", async () => {
    const r = await uploadCourseCoverAction(INITIAL, form(PNG, "tarot-iniciatico"));
    expect(r.error).toBeTruthy();
    expect(assertOwnsCourse).not.toHaveBeenCalled();
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("curso ajeno: assertOwnsCourse corta antes de subir", async () => {
    const { client } = sessionClient();
    createClient.mockResolvedValue(client);
    assertOwnsCourse.mockRejectedValue(new UserFacingError("No autorizado: ese curso no te pertenece."));
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toMatch(/no te pertenece/);
    expect(assertOwnsCourse).toHaveBeenCalledWith(COURSE, TEACHER.id);
    expect(service.upload).not.toHaveBeenCalled();
  });

  it("c.1 · D-34: sube con service_role a covers/<course>/<uuid>.png, apunta la fila con la sesion y borra la anterior", async () => {
    const session = sessionClient({ current: OLD });
    createClient.mockResolvedValue(session.client);
    const r = await uploadCourseCoverAction(INITIAL, form(PNG, COURSE, "portada.jpg", "image/jpeg"));
    expect(r).toEqual({ error: null, success: "Portada actualizada." });
    expect(service.bucket).toHaveBeenCalledWith("uploads");
    const [path, , options] = service.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^covers/${COURSE}/[0-9a-f-]{36}\\.png$`));
    // El tipo sale de los bytes, no de lo que declaro el navegador.
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
    // La sesion nunca sube: no tiene policy de INSERT (D-34).
    expect(session.upload).not.toHaveBeenCalled();
    expect(session.update).toHaveBeenCalledWith({ cover_path: path });
    expect(session.updateEq).toHaveBeenCalledWith("id", COURSE);
    expect(session.remove).toHaveBeenCalledWith([OLD]);
  });

  it("si el UPDATE falla, borra lo recien subido y conserva la anterior", async () => {
    const session = sessionClient({ current: OLD, updateError: { code: "23514" } });
    createClient.mockResolvedValue(session.client);
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toBeTruthy();
    const [path] = service.upload.mock.calls[0];
    expect(service.remove).toHaveBeenCalledWith([path]);
    expect(session.remove).not.toHaveBeenCalled();
  });

  it("si la subida falla, no toca la fila", async () => {
    const session = sessionClient({ current: OLD });
    createClient.mockResolvedValue(session.client);
    service.upload.mockResolvedValue({ error: { message: "boom" } });
    const r = await uploadCourseCoverAction(INITIAL, form(PNG));
    expect(r.error).toMatch(/No se pudo subir/);
    expect(session.update).not.toHaveBeenCalled();
  });
});

describe("removeCourseCoverAction", () => {
  beforeEach(() => {
    createClient.mockReset();
    createServiceRoleClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  it("vacia cover_path y despues borra el objeto con la sesion de la duena", async () => {
    const { client, remove, update } = sessionClient({ current: OLD });
    createClient.mockResolvedValue(client);
    const r = await removeCourseCoverAction(INITIAL, form(null));
    expect(r).toEqual({ error: null, success: "Portada quitada." });
    expect(update).toHaveBeenCalledWith({ cover_path: null });
    expect(remove).toHaveBeenCalledWith([OLD]);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("curso ajeno: no toca nada", async () => {
    const { client, remove, update } = sessionClient({ current: OLD });
    createClient.mockResolvedValue(client);
    assertOwnsCourse.mockRejectedValue(new UserFacingError("No autorizado: ese curso no te pertenece."));
    const r = await removeCourseCoverAction(INITIAL, form(null));
    expect(r.error).toMatch(/no te pertenece/);
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("updateLessonAction · error por campo (D-100)", () => {
  beforeEach(() => {
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  function lessonForm(fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ courseId: COURSE, lessonId: "l1", title: "Clase", description: "", ...fields })) fd.set(k, v);
    return fd;
  }

  it("título vacío o descripción con link vuelven con el campo culpable", async () => {
    expect(await updateLessonAction(INITIAL, lessonForm({ title: "" }))).toMatchObject({ field: "title" });
    expect(await updateLessonAction(INITIAL, lessonForm({ description: "mirá https://x.com" }))).toMatchObject({ field: "description" });
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("createLessonAction · error por campo (DT1)", () => {
  beforeEach(() => {
    createClient.mockReset();
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
  });

  function newLessonForm(fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ courseId: COURSE, moduleId: "m1", title: "Clase", description: "", ...fields })) fd.set(k, v);
    return fd;
  }

  it("título vacío o descripción con link vuelven con el campo culpable, sin tocar la base", async () => {
    expect(await createLessonAction(INITIAL, newLessonForm({ title: "" }))).toMatchObject({ field: "title" });
    expect(await createLessonAction(INITIAL, newLessonForm({ description: "mirá https://x.com" }))).toMatchObject({ field: "description" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("el localizador exacto que frena la base no dice qué campo fue: no inventa uno", async () => {
    const chain: Record<string, unknown> = {};
    for (const m of ["select", "eq", "order"]) chain[m] = () => chain;
    chain.maybeSingle = async () => ({ data: { id: "m1" }, error: null });
    chain.limit = async () => ({ data: [], error: null });
    chain.insert = async () => ({ error: { code: "42501", message: "localizador de contenido pago" } });
    createClient.mockResolvedValue({ from: () => chain });
    const r = await createLessonAction(INITIAL, newLessonForm({}));
    expect(r.error).toBeTruthy();
    expect(r.field).toBeUndefined();
  });
});

describe("attachLessonVideoAction · D-120: el mensaje del motor no llega a la docente", () => {
  const LESSON = "50000000-0000-4000-8000-00000000000a";
  function videoForm() {
    const fd = new FormData();
    fd.set("courseId", COURSE);
    fd.set("lessonId", LESSON);
    fd.set("url", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    return fd;
  }
  function withUpdateError(updateError: unknown) {
    createClient.mockReset().mockResolvedValue({
      from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: LESSON }, error: null }) }) }) }) }),
    });
    createServiceRoleClient.mockReset().mockReturnValue({
      from: () => ({ update: () => ({ eq: () => ({ eq: async () => ({ error: updateError }) }) }) }),
    });
  }
  beforeEach(() => {
    requireTeacher.mockReset().mockResolvedValue(TEACHER);
    assertOwnsCourse.mockReset().mockResolvedValue(undefined);
    resolveYoutubeVideo.mockReset().mockResolvedValue({ ok: true, videoId: "dQw4w9WgXcQ", durationSeconds: 212 });
  });

  it("el barrido de 0038 rechaza: dice qué pasó y qué hacer, sin nombrar la tabla", async () => {
    withUpdateError({ code: "42501", message: "el localizador de lessons.video_id ya aparece en texto publico de lesson_notes" });
    const r = await attachLessonVideoAction(INITIAL, videoForm());
    expect(r.error).toMatch(/ya aparece citado en un texto de la escuela/);
    expect(r.error).toMatch(/administración/);
    expect(r.error).not.toMatch(/lesson_notes|video_id|publico/);
  });

  it("cualquier otro error del motor vuelve neutro", async () => {
    withUpdateError({ code: "XX000", message: 'relation "lessons" violates constraint lessons_secret_check' });
    const r = await attachLessonVideoAction(INITIAL, videoForm());
    expect(r.error).toBe("No se pudo guardar el video.");
  });

  it("un fallo inesperado de verificación no filtra su texto", async () => {
    assertOwnsCourse.mockRejectedValue(new Error("No se pudo verificar la titularidad del curso: permission denied for table courses"));
    const r = await attachLessonVideoAction(INITIAL, videoForm());
    expect(r.error).toBe("No se pudo cargar el video.");
  });

  it("el rechazo por titularidad sí llega con su texto", async () => {
    assertOwnsCourse.mockRejectedValue(new UserFacingError("No autorizado: ese curso no te pertenece."));
    const r = await attachLessonVideoAction(INITIAL, videoForm());
    expect(r.error).toBe("No autorizado: ese curso no te pertenece.");
  });
});

// G-04 (T-098): `requireTeacher()` corría fuera del try; su UserFacingError no llegaba a
// actionError y la docente degradada veía la pantalla de error en vez del mensaje.
describe("sin rol docente, toda acción devuelve el aviso en el estado", () => {
  const LESSON = "60000000-0000-4000-8000-00000000000a";
  const MODULE = "50000000-0000-4000-8000-00000000000a";
  const ITEM = "70000000-0000-4000-8000-00000000000a";

  function fullForm(): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries({
      courseId: COURSE,
      moduleId: MODULE,
      lessonId: LESSON,
      chapterId: ITEM,
      resourceId: ITEM,
      announcementId: ITEM,
      title: "Un título válido",
      description: "",
      body: "Un cuerpo de anuncio válido para la prueba.",
      reason: "Un motivo suficiente",
      direction: "up",
      nextPublished: "true",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      timestamp: "01:00",
      label: "Recurso",
      link: "https://drive.google.com/file/d/abcdefghijk1234/view",
      kind: "pdf",
      isPreview: "false",
    }))
      fd.set(k, v);
    fd.set("cover", new File([PNG], "portada.png", { type: "image/png" }));
    return fd;
  }

  beforeEach(() => {
    createClient.mockReset();
    requireTeacher.mockReset().mockRejectedValue(new UserFacingError("No autorizado: se requiere rol docente."));
  });

  it.each(
    Object.entries(actions).filter(([, fn]) => typeof fn === "function") as [string, (s: typeof INITIAL, f: FormData) => Promise<{ error: string | null }>][],
  )("%s", async (_name, action) => {
    const r = await action(INITIAL, fullForm());
    expect(r.error).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("el texto del rechazo llega tal cual (createModuleAction)", async () => {
    const r = await actions.createModuleAction(INITIAL, fullForm());
    expect(r.error).toBe("No autorizado: se requiere rol docente.");
  });
});

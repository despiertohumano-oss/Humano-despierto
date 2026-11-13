import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown, limit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => mocks.db }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "https://humano.example" }));
vi.mock("@/lib/server/rate-limit", () => ({ limit: mocks.limit }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { notifyAnnouncementPublished, retryPendingAnnouncementMail, retryPendingMail } from "./notify";
import { __setTransportForTests } from "./send";

const ANUNCIO = "a3100000-0000-4000-8000-000000000001";
const OK = { ok: true, remaining: 1, retryAfter: 0 };
const DENIED = { ok: false, remaining: 0, retryAfter: 60 };

// Una "base" mínima: mail_log con attempts reales para ver si un tope de envío gasta intentos.
type Slot = { id: string; attempts: number; sentAt: string | null; reclaimable: boolean; lastError?: string | null };

function fakeDb(n: number, opts: { status?: string; noEmail?: string[] } = {}) {
  const slots = new Map<string, Slot>();
  const released: string[] = [];
  const db = {
    slots,
    released,
    from(table: string) {
      const f: Record<string, unknown> = {};
      const res = () => {
        if (table === "course_announcements")
          return {
            data: { id: ANUNCIO, course_id: "c1", author_id: "autora", title: "t", body: "b", status: opts.status ?? "published", deleted_at: null },
            error: null,
          };
        if (table === "courses")
          return { data: { id: "c1", title: "Tarot", slug: "tarot", teacher_id: "autora", teacher: { full_name: "Sol" } }, error: null };
        if (table === "enrollments") {
          const [from, to] = f.__range as [number, number];
          return { data: Array.from({ length: n }, (_, i) => ({ user_id: `u-${i}` })).slice(from, to + 1), error: null };
        }
        if (table === "profiles") return { data: { id: f.id, full_name: `Alumna ${String(f.id)}` }, error: null };
        if (table === "mail_log") {
          // Con `.is("sent_at", null)` es la consulta del retry (pendientes vencidos); sin él, la
          // lectura de todas las filas del anuncio.
          const all = [...slots.entries()];
          const rows = f.sent_at === null ? all.filter(([, s]) => !s.sentAt && s.attempts < 3 && s.reclaimable) : all;
          return {
            data: rows.map(([recipient, s]) => ({ scope_key: ANUNCIO, recipient_user_id: recipient, sent_at: s.sentAt, attempts: s.attempts })),
            error: null,
          };
        }
        throw new Error(`tabla inesperada: ${table}`);
      };
      const c: Record<string, unknown> = {
        select: () => c, order: () => c, limit: () => c,
        update: (payload: Record<string, unknown>) => ((f.__update = payload), c),
        in: (k: string, v: unknown) => ((f[`in:${k}`] = v), c),
        eq: (k: string, v: unknown) => ((f[k] = v), c),
        is: (k: string, v: unknown) => ((f[k] = v), c),
        lt: (k: string, v: unknown) => ((f[k] = v), c),
        range: (a: number, b: number) => ((f.__range = [a, b]), c),
        maybeSingle: async () => res(),
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => {
          if (table === "mail_log" && f.id) {
            const s = [...slots.values()].find((x) => x.id === f.id);
            if (s) s.sentAt = "now";
            return Promise.resolve({ error: null, count: 1 }).then(ok, ko);
          }
          if (table === "mail_log" && f.__update) {
            const upd = f.__update as { attempts?: number; last_error?: string };
            const targets = (f["in:recipient_user_id"] as string[] | undefined) ?? [...slots.keys()];
            for (const r of targets) {
              const s = slots.get(r);
              if (!s || s.sentAt) continue;
              if (upd.attempts !== undefined) s.attempts = upd.attempts;
              if (upd.last_error !== undefined) s.lastError = upd.last_error;
            }
            return Promise.resolve({ error: null }).then(ok, ko);
          }
          return Promise.resolve(res()).then(ok, ko);
        },
      };
      return c;
    },
    async rpc(fn: string, a: Record<string, string>) {
      if (fn === "release_rate_limited_mail_slot") {
        released.push(a.p_id);
        const s = [...slots.values()].find((x) => x.id === a.p_id);
        if (s) { s.attempts -= 1; s.reclaimable = true; }
        return { data: null, error: null };
      }
      const key = a.p_recipient_user_id;
      const s = slots.get(key);
      if (!s) {
        slots.set(key, { id: `claim-${key}`, attempts: 1, sentAt: null, reclaimable: false });
      } else if (s.sentAt || s.attempts >= 3 || !s.reclaimable) {
        return { data: [], error: null };
      } else {
        s.attempts += 1; s.reclaimable = false;
      }
      return { data: [{ id: `claim-${key}`, claimed_at: "2026-10-27T10:00:00Z" }], error: null };
    },
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: opts.noEmail?.includes(id) ? null : { email: `${id}@humano.test` } },
          error: null,
        }),
      },
    },
  };
  return db;
}

describe("D-51 · anuncio contra el tope global de sendMail", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockReset();
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  it("el tope no gasta intentos: el turno se libera y la tanda diferida lo manda", async () => {
    const db = fakeDb(3);
    mocks.db = db;
    const send = vi.fn(async () => {});
    __setTransportForTests({ send });

    mocks.limit.mockResolvedValue(DENIED);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(send).not.toHaveBeenCalled();
    expect(db.released).toHaveLength(3);
    for (const s of db.slots.values()) expect(s.attempts).toBe(0);

    mocks.limit.mockResolvedValue(OK);
    const out = await retryPendingAnnouncementMail();
    expect(out.announcements).toBe(1);
    expect(send).toHaveBeenCalledTimes(3);
    for (const s of db.slots.values()) expect(s.sentAt).not.toBeNull();
  });

  it("varias tandas topadas seguidas no agotan los 3 intentos", async () => {
    const db = fakeDb(2);
    mocks.db = db;
    __setTransportForTests({ send: async () => {} });
    mocks.limit.mockResolvedValue(DENIED);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    await retryPendingAnnouncementMail();
    await retryPendingAnnouncementMail();
    await retryPendingAnnouncementMail();
    for (const s of db.slots.values()) expect(s.attempts).toBe(0);
  });

  it("una pasada retoma como mucho 2 anuncios aunque haya 4 pendientes", async () => {
    const db = fakeDb(0) as ReturnType<typeof fakeDb>;
    const base = db.from.bind(db);
    const pedidos: string[] = [];
    db.from = ((table: string) => {
      if (table === "mail_log") {
        const c: Record<string, unknown> = {};
        for (const k of ["select", "eq", "is", "lt", "order", "limit"]) c[k] = () => c;
        c.then = (ok: (v: unknown) => unknown) =>
          Promise.resolve({ data: ["a1", "a2", "a3", "a4"].map((scope_key) => ({ scope_key })), error: null }).then(ok);
        return c;
      }
      if (table === "course_announcements") {
        const c: Record<string, unknown> = {};
        c.select = () => c;
        c.eq = (_k: string, v: string) => (pedidos.push(v), c);
        c.maybeSingle = async () => ({ data: null, error: null });
        return c;
      }
      return base(table);
    }) as typeof db.from;
    mocks.db = db;
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 2 });
    expect(pedidos).toEqual(["a1", "a2"]);
  });

  it("sin nada pendiente no hace nada", async () => {
    mocks.db = fakeDb(0);
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 0 });
  });
});

// G-02 (T-098): una función de Netlify corta a ~10 s. El envío deja de EMPEZAR mails cerca del plazo
// y deja un turno pendiente para que la próxima corrida del cron sepa que el anuncio sigue.
describe("G-02 · anuncio con plazo", () => {
  const T0 = new Date("2026-11-13T12:00:00Z").getTime();
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockReset().mockResolvedValue(OK);
    vi.useFakeTimers({ now: T0, toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  it("pasado el plazo no empieza más envíos y deja el resto para la próxima corrida", async () => {
    const db = fakeDb(20);
    mocks.db = db;
    // Cada envío tarda 1 s de reloj.
    const send = vi.fn(async () => void vi.setSystemTime(Date.now() + 1000));
    __setTransportForTests({ send });

    await notifyAnnouncementPublished({ announcementId: ANUNCIO, deadline: T0 + 8000 });
    const first = send.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(20);
    // Ningún envío empezó con menos de la reserva por delante.
    expect(Date.now()).toBeLessThan(T0 + 8000 + 5 * 1000);
    // Un turno liberado marca el anuncio como pendiente sin gastar intentos.
    expect(db.released.length).toBeGreaterThan(0);

    vi.setSystemTime(T0 + 15 * 60_000);
    send.mockImplementation(async () => {});
    await retryPendingAnnouncementMail();
    expect(send).toHaveBeenCalledTimes(20);
    for (const s of db.slots.values()) expect(s.sentAt).not.toBeNull();
  });

  it("retryPendingMail con el plazo vencido no empieza nada", async () => {
    const db = fakeDb(3);
    mocks.db = db;
    const send = vi.fn(async () => {});
    __setTransportForTests({ send });
    mocks.limit.mockResolvedValue(DENIED);
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    mocks.limit.mockResolvedValue(OK);
    await expect(retryPendingMail({ budgetMs: 0 })).resolves.toEqual({ announcements: 0, transactional: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});

// N-2 (QA T-098): el retry toma 2 anuncios por corrida, ordenados por claimed_at. Un turno pendiente
// que nadie vuelve a reclamar (la alumna se dio de baja, no tiene mail, o el anuncio se retiró)
// ocupaba un cupo para siempre. Al pasar por su anuncio se retira con causa y deja de bloquear.
describe("N-2 · turnos huérfanos de anuncio", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockReset().mockResolvedValue(OK);
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  const orphan = (): Slot => ({ id: "claim-gone", attempts: 0, sentAt: null, reclaimable: true });

  it("una ex inscripta con turno pendiente se retira y el anuncio deja de ocupar el cupo", async () => {
    const db = fakeDb(2);
    db.slots.set("gone", orphan());
    mocks.db = db;
    __setTransportForTests({ send: async () => {} });

    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 1 });
    expect(db.slots.get("gone")).toMatchObject({ attempts: 3, lastError: "permanent:000/not_recipient", sentAt: null });
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 0 });
  });

  it("una inscripta sin mail resoluble con turno pendiente también se retira", async () => {
    const db = fakeDb(2, { noEmail: ["u-1"] });
    db.slots.set("u-1", { ...orphan(), id: "claim-u-1" });
    mocks.db = db;
    __setTransportForTests({ send: async () => {} });

    await retryPendingAnnouncementMail();
    expect(db.slots.get("u-1")).toMatchObject({ attempts: 3, lastError: "permanent:000/unresolved" });
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 0 });
  });

  it("un anuncio retirado retira sus turnos pendientes", async () => {
    const db = fakeDb(2, { status: "withdrawn" });
    db.slots.set("u-0", { ...orphan(), id: "claim-u-0" });
    mocks.db = db;
    await retryPendingAnnouncementMail();
    expect(db.slots.get("u-0")).toMatchObject({ attempts: 3, lastError: "permanent:000/not_published" });
    await expect(retryPendingAnnouncementMail()).resolves.toEqual({ announcements: 0 });
  });

  it("un turno vivo de otra corrida (inscripta vigente) no se toca", async () => {
    const db = fakeDb(1);
    db.slots.set("u-0", { id: "claim-u-0", attempts: 1, sentAt: null, reclaimable: false });
    mocks.db = db;
    __setTransportForTests({ send: async () => {} });
    await notifyAnnouncementPublished({ announcementId: ANUNCIO });
    expect(db.slots.get("u-0")).toMatchObject({ attempts: 1, sentAt: null });
  });
});

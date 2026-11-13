import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: null as unknown, limit: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient: () => mocks.db }));
vi.mock("@/lib/server/site-url", () => ({ getSiteUrl: () => "https://humano.example" }));
vi.mock("@/lib/server/rate-limit", () => ({ limit: mocks.limit }));
vi.mock("next/headers", () => ({ headers: () => Promise.reject(new Error("fuera de request")) }));

import { notifyCourseCompleted, notifyEnrollmentActivated, notifyEnrollmentRejected, notifyWelcome, retryPendingMail, retryPendingTransactionalMail } from "./notify";
import { __setTransportForTests } from "./send";

const OK = { ok: true, remaining: 1, retryAfter: 0 };
const DENIED = { ok: false, remaining: 0, retryAfter: 60 };
const ALUMNA = "a1000000-0000-4000-8000-000000000001";
const DOCENTE = "d1000000-0000-4000-8000-000000000001";
const CURSO = "c1000000-0000-4000-8000-000000000001";
const CODIGO = "cert0001";

interface Slot { id: string; recipient: string; type: string; scope: string; attempts: number; sentAt: string | null; reclaimable: boolean }

// mail_log con attempts reales + las tablas que leen los notify* y el re-disparo.
function fakeDb(opts: { enrollment?: { status: string; decided_reason: string | null }; certUser?: string } = {}) {
  const slots = new Map<string, Slot>();
  const queries: Record<string, unknown>[] = [];
  const db = {
    slots,
    queries,
    from(table: string) {
      const f: Record<string, unknown> = { __table: table };
      const res = () => {
        if (table === "profiles") return { data: { id: f.id, full_name: `Nombre ${String(f.id)}` }, error: null };
        if (table === "courses")
          return { data: { id: CURSO, title: "Tarot", slug: "tarot", teacher_id: DOCENTE, teacher: { full_name: "Sol" } }, error: null };
        if (table === "enrollments") return { data: opts.enrollment ?? null, error: null };
        if (table === "certificates")
          return { data: { user_id: opts.certUser ?? ALUMNA, course_id: CURSO, course_title: "Tarot" }, error: null };
        if (table === "mail_log") {
          queries.push({ ...f });
          const pend = [...slots.values()].filter((s) => !s.sentAt && s.attempts < 3 && s.reclaimable);
          return { data: pend.map((s) => ({ recipient_user_id: s.recipient, mail_type: s.type, scope_key: s.scope })), error: null };
        }
        throw new Error(`tabla inesperada: ${table}`);
      };
      const c: Record<string, unknown> = {
        select: () => c, order: () => c, limit: () => c, update: () => c,
        eq: (k: string, v: unknown) => ((f[k] = v), c),
        is: (k: string, v: unknown) => ((f[k] = v), c),
        lt: (k: string, v: unknown) => ((f[`lt:${k}`] = v), c),
        gt: (k: string, v: unknown) => ((f[`gt:${k}`] = v), c),
        in: (k: string, v: unknown) => ((f[`in:${k}`] = v), c),
        maybeSingle: async () => res(),
        then: (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => {
          if (table === "mail_log" && f.id) {
            const s = [...slots.values()].find((x) => x.id === f.id);
            if (s) s.sentAt = "now";
            return Promise.resolve({ error: null, count: 1 }).then(ok, ko);
          }
          return Promise.resolve(res()).then(ok, ko);
        },
      };
      return c;
    },
    async rpc(fn: string, a: Record<string, string>) {
      if (fn === "release_rate_limited_mail_slot") {
        const s = [...slots.values()].find((x) => x.id === a.p_id);
        if (s) { s.attempts -= 1; s.reclaimable = true; }
        return { data: null, error: null };
      }
      const key = `${a.p_recipient_user_id}|${a.p_mail_type}|${a.p_scope_key}`;
      const s = slots.get(key);
      if (!s) {
        slots.set(key, { id: `claim-${key}`, recipient: a.p_recipient_user_id, type: a.p_mail_type, scope: a.p_scope_key, attempts: 1, sentAt: null, reclaimable: false });
      } else if (s.sentAt || s.attempts >= 3 || !s.reclaimable) {
        return { data: [], error: null };
      } else {
        s.attempts += 1; s.reclaimable = false;
      }
      return { data: [{ id: `claim-${key}`, claimed_at: "2026-11-13T10:00:00Z" }], error: null };
    },
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: `${id}@humano.test` } }, error: null }) } },
  };
  return db;
}

describe("D-128 · transaccionales contra el tope por hora", () => {
  let send: ReturnType<typeof vi.fn<(m: unknown) => Promise<void>>>;
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.limit.mockReset();
    send = vi.fn(async (_m: unknown) => {});
    __setTransportForTests({ send });
  });
  afterEach(() => {
    __setTransportForTests(null);
    vi.restoreAllMocks();
  });

  const sentAll = (db: ReturnType<typeof fakeDb>) => [...db.slots.values()].every((s) => s.sentAt);

  it("bienvenida topada: no gasta intentos y la pasada diferida la manda", async () => {
    const db = fakeDb();
    mocks.db = db;
    mocks.limit.mockResolvedValue(DENIED);
    await notifyWelcome({ userId: ALUMNA });
    expect(send).not.toHaveBeenCalled();
    expect([...db.slots.values()][0].attempts).toBe(0);

    mocks.limit.mockResolvedValue(OK);
    await expect(retryPendingTransactionalMail()).resolves.toEqual({ transactional: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    expect(sentAll(db)).toBe(true);
  });

  it("inscripción topada: alumna y docente salen en la pasada, sin duplicar la activación", async () => {
    const db = fakeDb({ enrollment: { status: "active", decided_reason: null } });
    mocks.db = db;
    mocks.limit.mockResolvedValue(DENIED);
    await notifyEnrollmentActivated({ studentId: ALUMNA, courseId: CURSO });
    expect(db.slots.size).toBe(2);

    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).toHaveBeenCalledTimes(2);
    expect(sentAll(db)).toBe(true);
    // Una segunda pasada no encuentra nada que mandar.
    await expect(retryPendingTransactionalMail()).resolves.toEqual({ transactional: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("si la inscripción ya no está activa, no se avisa una aprobación vieja", async () => {
    const db = fakeDb({ enrollment: { status: "revoked", decided_reason: null } });
    mocks.db = db;
    mocks.limit.mockResolvedValue(DENIED);
    await notifyEnrollmentActivated({ studentId: ALUMNA, courseId: CURSO });
    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).not.toHaveBeenCalled();
  });

  it("rechazo topado: sale con el motivo vigente, y no si ya no está rechazada", async () => {
    const db = fakeDb({ enrollment: { status: "rejected", decided_reason: "Cupo completo" } });
    mocks.db = db;
    mocks.limit.mockResolvedValue(DENIED);
    await notifyEnrollmentRejected({ studentId: ALUMNA, courseId: CURSO, reason: "Cupo completo" });
    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(send.mock.calls[0])).toContain("Cupo completo");

    const otra = fakeDb({ enrollment: { status: "active", decided_reason: null } });
    mocks.db = otra;
    send.mockClear();
    mocks.limit.mockResolvedValue(DENIED);
    await notifyEnrollmentRejected({ studentId: ALUMNA, courseId: CURSO, reason: null });
    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).not.toHaveBeenCalled();
  });

  it("certificado topado: sale con el código; si el certificado es de otra cuenta, no", async () => {
    const db = fakeDb();
    mocks.db = db;
    mocks.limit.mockResolvedValue(DENIED);
    await notifyCourseCompleted({ userId: ALUMNA, courseTitle: "Tarot", courseSlug: "tarot", certificateCode: CODIGO });
    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(send.mock.calls[0])).toContain(`/certificado/${CODIGO}`);

    mocks.db = fakeDb({ certUser: "otra" });
    send.mockClear();
    mocks.limit.mockResolvedValue(DENIED);
    await notifyCourseCompleted({ userId: ALUMNA, courseTitle: "Tarot", courseSlug: "tarot", certificateCode: CODIGO });
    mocks.limit.mockResolvedValue(OK);
    await retryPendingTransactionalMail();
    expect(send).not.toHaveBeenCalled();
  });

  it("solo pide transaccionales recientes, sin confirmar, con intentos y turno vencido", async () => {
    const db = fakeDb();
    mocks.db = db;
    await retryPendingTransactionalMail();
    const q = db.queries[0];
    expect(q["in:mail_type"]).toEqual(["welcome", "enrollment_granted", "teacher_new_student", "course_completed", "enrollment_rejected"]);
    expect(q.sent_at).toBeNull();
    expect(q["lt:attempts"]).toBe(3);
    expect(Date.parse(String(q["lt:claimed_at"]))).toBeLessThanOrEqual(Date.now() - 10 * 60_000);
    expect(Date.parse(String(q["gt:created_at"]))).toBeGreaterThan(Date.now() - 4 * 24 * 60 * 60_000);
  });

  it("retryPendingMail junta los dos conteos", async () => {
    mocks.db = fakeDb();
    await expect(retryPendingMail()).resolves.toEqual({ announcements: 0, transactional: 0 });
  });
});

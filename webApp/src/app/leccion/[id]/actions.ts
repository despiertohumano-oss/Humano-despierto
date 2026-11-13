"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureCertificate } from "@/lib/server/certificates";
import { closingHref } from "@/lib/player/navigation";
import { notifyCourseCompleted } from "@/lib/server/mail/notify";
import { mailAfterResponse } from "@/lib/server/mail/after-mail";
import { revalidatePath } from "next/cache";
import { answerSchema, idSchema, moderationSchema, questionSchema } from "@/lib/lesson-qa/validation";
import type { QaActionState } from "@/lib/lesson-qa/action-state";
// La escritura vive en un .mjs para que la suite de la base la ejecute tal cual (T-030).
import {
  destacar,
  marcarResuelta,
  moderar,
  preguntar,
  quitarVoto,
  responder,
  traducirErrorQa,
  votar,
} from "@/lib/lesson-qa/write.mjs";
import { log } from "@/lib/server/log";
import { withRateLimit } from "@/lib/server/rate-limit";
import { limitedState } from "@/lib/rate-limit/core";
import { actionError } from "@/lib/server/action-error";
import { checkNoteBody, playerFail, playerLimited, PLAYER_ERRORS, type PlayerResult } from "@/lib/player/action-result";

/**
 * Destino del cierre de la última lección. Se resuelve al terminar el video y no al renderizar:
 * el certificado recién existe cuando el flush del último tramo cruzó el 90 %. Idempotente y
 * sin efectos nuevos (el que lo emite es `ensureCertificate`, ya verificado server-side).
 */
export async function resolveClosingHref(courseId: string): Promise<string> {
  try {
    return closingHref(await ensureCertificate(courseId));
  } catch (err) {
    log.error("player_certificate_unresolved", { err });
    return closingHref(null);
  }
}

export interface ProgressState {
  secondsWatched: number;
  completed: boolean;
  completedAt: string | null;
}

export type ProgressResult = PlayerResult<ProgressState>;

const PROGRESS_FAILED = "No se pudo guardar tu avance.";
const NOTE_SAVE_FAILED = "No se pudo guardar la nota.";
const NOTE_EDIT_FAILED = "No se pudo editar la nota.";
const NOTE_DELETE_FAILED = "No se pudo borrar la nota.";

function progressOk(row: { seconds_watched: number; completed: boolean; completed_at: string | null }): ProgressResult {
  return { ok: true, secondsWatched: row.seconds_watched, completed: row.completed, completedAt: row.completed_at };
}

/**
 * Mail 2/4 (T-020): dispara solo la primera vez que ESTE alumno completa ESTE curso. Se
 * chequea si ya existía certificado ANTES de pedirlo — `ensureCertificate` es idempotente
 * (T-018: devuelve el código exista o no la fila), así que sin este chequeo previo se mandaría
 * el mail en cada guardado de progreso posterior de cualquier lección ya completa del curso.
 * Nunca puede tirar: cualquier falla queda en el log, el progreso ya se guardó arriba.
 */
async function maybeNotifyCourseCompleted(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("certificates")
      .select("code")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    // Ya había certificado, o no se pudo confirmar que NO lo había — en ambos casos no se
    // reintenta el mail: mejor un falso negativo ocasional que mandarlo de más.
    if (existingError || existing) return;

    const code = await ensureCertificate(courseId);
    if (!code) return; // esta lección lo completó todo salvo que a ensureCertificate,
    // que vuelve a verificar server-side (ADR-007), le falte alguna otra lección publicada.

    const { data: course } = await supabase
      .from("courses")
      .select("title, slug")
      .eq("id", courseId)
      .maybeSingle();

    // Certificado y datos en el request (rápidos, y el chequeo previo es el que deduplica); sólo el
    // envío sale después de responder (G-02): la alumna no espera al SMTP para ver el cierre.
    mailAfterResponse("mail_course_completed_failed", () =>
      notifyCourseCompleted({
        userId,
        courseTitle: course?.title ?? "tu curso",
        courseSlug: course?.slug ?? null,
        certificateCode: code,
      }),
    );
  } catch (err) {
    log.error("mail_course_completed_failed", { err });
  }
}

/**
 * Persiste `seconds_watched` (T-006 c.5). El throttle de 5 s del cliente no es un control; el
 * tope lo pone `withRateLimit` (T-050, 30/min). `completed`/`completed_at` NO se mandan: son
 * columnas derivadas (ADR-007) que calcula un trigger contra `lessons.duration_seconds`; lo que
 * se devuelve acá es lo que el guard efectivamente calculó, no lo que se pidió.
 *
 * UPDATE primero, INSERT si no había fila — nunca `upsert()`: el grant de UPDATE de
 * `lesson_progress` (0003_privileges.sql) sólo cubre `seconds_watched`/`last_seen_at`, y el
 * `ON CONFLICT DO UPDATE` que genera un upsert de PostgREST intenta tocar TODAS las columnas
 * del payload (incluidas `user_id`/`course_id`/`lesson_id`), lo que exigiría UPDATE sobre
 * columnas que el cliente no tiene — 42501 aunque el valor no cambie.
 */
export const saveLessonProgress = withRateLimit(
  "saveLessonProgress",
  async function saveLessonProgress(lessonId: string, secondsWatched: number): Promise<ProgressResult> {
    if (!Number.isFinite(secondsWatched) || secondsWatched < 0) {
      return playerFail(PLAYER_ERRORS.invalidProgress);
    }
    const seconds = Math.floor(secondsWatched);
    const nowIso = new Date().toISOString();

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return playerFail(PLAYER_ERRORS.noSession);

      const { data: updated, error: updateError } = await supabase
        .from("lesson_progress")
        .update({ seconds_watched: seconds, last_seen_at: nowIso })
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .select("seconds_watched, completed, completed_at, course_id")
        .maybeSingle();

      if (updateError) return playerFail(actionError(updateError, PROGRESS_FAILED));
      if (updated) {
        if (updated.completed) await maybeNotifyCourseCompleted(user.id, updated.course_id);
        return progressOk(updated);
      }

      // No había fila: primera escritura de progreso de este usuario en esta lección.
      // course_id lo resuelve el servidor (no se confía en lo que mande el cliente): sólo las
      // columnas leíbles por el grant de 0003_privileges.sql.
      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (lessonError) return playerFail(actionError(lessonError, PROGRESS_FAILED));
      if (!lesson) return playerFail(PLAYER_ERRORS.lessonNotFound);

      const { data: inserted, error: insertError } = await supabase
        .from("lesson_progress")
        .insert({
          user_id: user.id,
          course_id: lesson.course_id,
          lesson_id: lessonId,
          seconds_watched: seconds,
          last_seen_at: nowIso,
        })
        .select("seconds_watched, completed, completed_at")
        .single();

      if (insertError) {
        // Carrera real: dos pestañas escribiendo el progreso inicial a la vez. La segunda pierde
        // el INSERT (23505, unique lesson_progress_user_lesson_key) y cae a UPDATE.
        if (insertError.code !== "23505") return playerFail(actionError(insertError, PROGRESS_FAILED));
        const { data: retried, error: retryError } = await supabase
          .from("lesson_progress")
          .update({ seconds_watched: seconds, last_seen_at: nowIso })
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
          .select("seconds_watched, completed, completed_at")
          .single();
        if (retryError) return playerFail(actionError(retryError, PROGRESS_FAILED));
        if (retried.completed) await maybeNotifyCourseCompleted(user.id, lesson.course_id);
        return progressOk(retried);
      }

      if (inserted.completed) await maybeNotifyCourseCompleted(user.id, lesson.course_id);
      return progressOk(inserted);
    } catch (err) {
      return playerFail(actionError(err, PROGRESS_FAILED));
    }
  },
  playerLimited,
);

export interface NoteResult {
  id: string;
  atSeconds: number;
  body: string;
  createdAt: string;
}

export type NoteActionResult = PlayerResult<{ note: NoteResult }>;
export type NoteDeleteResult = PlayerResult<object>;

interface NoteRow {
  id: string;
  at_seconds: number;
  body: string;
  created_at: string;
}

function noteOk(row: NoteRow): NoteActionResult {
  return { ok: true, note: { id: row.id, atSeconds: row.at_seconds, body: row.body, createdAt: row.created_at } };
}

/** Nota propia (T-006 c.7): RLS la ata a `user_id = auth.uid()` en lectura y escritura. */
export const saveLessonNote = withRateLimit(
  "saveLessonNote",
  async function saveLessonNote(lessonId: string, atSeconds: number, body: string): Promise<NoteActionResult> {
    const checked = checkNoteBody(body);
    if (!checked.ok) return checked;
    if (!Number.isFinite(atSeconds) || atSeconds < 0) return playerFail(PLAYER_ERRORS.invalidTime);

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return playerFail(PLAYER_ERRORS.noSession);

      const { data: lesson, error: lessonError } = await supabase
        .from("lessons")
        .select("course_id")
        .eq("id", lessonId)
        .maybeSingle();
      if (lessonError) return playerFail(actionError(lessonError, NOTE_SAVE_FAILED));
      if (!lesson) return playerFail(PLAYER_ERRORS.lessonNotFound);

      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: user.id,
          course_id: lesson.course_id,
          lesson_id: lessonId,
          at_seconds: Math.floor(atSeconds),
          body: checked.body,
        })
        .select("id, at_seconds, body, created_at")
        .single();
      if (error) return playerFail(actionError(error, NOTE_SAVE_FAILED));
      return noteOk(data);
    } catch (err) {
      return playerFail(actionError(err, NOTE_SAVE_FAILED));
    }
  },
  playerLimited,
);

// La RLS (`user_id = auth.uid()`) es el control; el `.eq("user_id")` es defensa en profundidad.
// Una nota ajena no da 403: PostgREST filtra en silencio y devuelve 0 filas, por eso 0 filas es error.

/** Edita el texto de una nota propia. `at_seconds` no está en el payload: se conserva. */
export const updateLessonNote = withRateLimit(
  "updateLessonNote",
  async function updateLessonNote(noteId: string, body: string): Promise<NoteActionResult> {
    const checked = checkNoteBody(body);
    if (!checked.ok) return checked;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return playerFail(PLAYER_ERRORS.noSession);

      const { data, error } = await supabase
        .from("lesson_notes")
        .update({ body: checked.body })
        .eq("id", noteId)
        .eq("user_id", user.id)
        .select("id, at_seconds, body, created_at");
      if (error) return playerFail(actionError(error, NOTE_EDIT_FAILED));
      const row = data?.[0];
      if (!row) return playerFail(PLAYER_ERRORS.noteNotFound);
      return noteOk(row);
    } catch (err) {
      return playerFail(actionError(err, NOTE_EDIT_FAILED));
    }
  },
  playerLimited,
);

export const deleteLessonNote = withRateLimit(
  "deleteLessonNote",
  async function deleteLessonNote(noteId: string): Promise<NoteDeleteResult> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return playerFail(PLAYER_ERRORS.noSession);

      const { data, error } = await supabase
        .from("lesson_notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id)
        .select("id");
      if (error) return playerFail(actionError(error, NOTE_DELETE_FAILED));
      if (!data?.length) return playerFail(PLAYER_ERRORS.noteNotFound);
      return { ok: true };
    } catch (err) {
      return playerFail(actionError(err, NOTE_DELETE_FAILED));
    }
  },
  playerLimited,
);

// ---------------------------------------------------------------------------------- T-030 · Q&A
// Finos a propósito (patrón de circulo/actions.ts): validan forma, escriben con el cliente de
// sesión y traducen el SQLSTATE. Quién puede qué lo deciden RLS y los guards de la migración.

const GENERIC_QA_ERROR = "No se pudo completar. Probá de nuevo.";

function qaFail(error: string): QaActionState {
  return { error, success: null };
}

async function qaSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, uid: data.user?.id ?? null };
}

function ids(...values: unknown[]): boolean {
  return values.every((v) => idSchema.safeParse(v).success);
}

function done(lessonId: string, success: string): QaActionState {
  revalidatePath(`/leccion/${lessonId}`);
  return { error: null, success };
}

function translated(error: { code?: string | null; message: string }, duplicado: string): QaActionState {
  log.error("qa_write_rejected", { pg_code: error.code, message: error.message });
  return qaFail(traducirErrorQa(error, { duplicado, fallback: GENERIC_QA_ERROR }));
}

export const askQuestion = withRateLimit(
  "askQuestion",
  async function askQuestion(lessonId: string, _prev: QaActionState, formData: FormData): Promise<QaActionState> {
    if (!ids(lessonId)) return qaFail("La lección no es válida.");
    const parsed = questionSchema.safeParse({
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Revisá la pregunta.");

    const { supabase, uid } = await qaSession();
    if (!uid) return qaFail("Necesitás iniciar sesión.");
    const { error } = await preguntar(supabase, { lessonId, authorId: uid, ...parsed.data });
    if (error) return translated(error, "Esa pregunta ya existe.");
    return done(lessonId, "Pregunta publicada.");
  },
  limitedState,
);

export const answerQuestion = withRateLimit(
  "answerQuestion",
  async function answerQuestion(
    lessonId: string,
    questionId: string,
    _prev: QaActionState,
    formData: FormData,
  ): Promise<QaActionState> {
    if (!ids(lessonId, questionId)) return qaFail("La pregunta no es válida.");
    const parsed = answerSchema.safeParse({ body: String(formData.get("body") ?? "") });
    if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Revisá la respuesta.");

    const { supabase, uid } = await qaSession();
    if (!uid) return qaFail("Necesitás iniciar sesión.");
    const { error } = await responder(supabase, { questionId, authorId: uid, body: parsed.data.body });
    if (error) return translated(error, "Esa respuesta ya existe.");
    return done(lessonId, "Respuesta publicada.");
  },
  limitedState,
);

export const voteQuestion = withRateLimit(
  "voteQuestion",
  async function voteQuestion(lessonId: string, questionId: string, vote: boolean): Promise<QaActionState> {
    if (!ids(lessonId, questionId) || typeof vote !== "boolean") return qaFail("La pregunta no es válida.");
    const { supabase, uid } = await qaSession();
    if (!uid) return qaFail("Necesitás iniciar sesión.");
    const { error } = vote
      ? await votar(supabase, { questionId, userId: uid })
      : await quitarVoto(supabase, { questionId, userId: uid });
    if (error) return translated(error, "Ya votaste esta pregunta.");
    return done(lessonId, vote ? "Voto sumado." : "Voto quitado.");
  },
  limitedState,
);

export const resolveQuestion = withRateLimit(
  "resolveQuestion",
  async function resolveQuestion(lessonId: string, questionId: string, resolved: boolean): Promise<QaActionState> {
    if (!ids(lessonId, questionId) || typeof resolved !== "boolean") return qaFail("La pregunta no es válida.");
    const { supabase, uid } = await qaSession();
    if (!uid) return qaFail("Necesitás iniciar sesión.");
    const { error } = await marcarResuelta(supabase, { questionId, resolved });
    if (error) return translated(error, GENERIC_QA_ERROR);
    return done(lessonId, resolved ? "Marcada como resuelta." : "Pregunta reabierta.");
  },
  limitedState,
);

export const featureAnswer = withRateLimit(
  "featureAnswer",
  async function featureAnswer(lessonId: string, answerId: string, featured: boolean): Promise<QaActionState> {
    if (!ids(lessonId, answerId) || typeof featured !== "boolean") return qaFail("La respuesta no es válida.");
    const { supabase, uid } = await qaSession();
    if (!uid) return qaFail("Necesitás iniciar sesión.");
    const { error } = await destacar(supabase, { answerId, featured });
    if (error) return translated(error, "Esta pregunta ya tiene una respuesta destacada. Quitala primero.");
    return done(lessonId, featured ? "Respuesta destacada." : "Destacado quitado.");
  },
  limitedState,
);

async function moderate(
  tabla: "lesson_questions" | "lesson_answers",
  lessonId: string,
  id: string,
  formData: FormData,
): Promise<QaActionState> {
  if (!ids(lessonId, id)) return qaFail("El mensaje no es válido.");
  const parsed = moderationSchema.safeParse({ reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) return qaFail(parsed.error.issues[0]?.message ?? "Borrar exige un motivo.");

  const { supabase, uid } = await qaSession();
  if (!uid) return qaFail("Necesitás iniciar sesión.");
  const { error } = await moderar(supabase, { tabla, id, moderatorId: uid, reason: parsed.data.reason });
  if (error) return translated(error, GENERIC_QA_ERROR);
  return done(lessonId, "Mensaje borrado.");
}

export const moderateQuestion = withRateLimit(
  "moderateQuestion",
  async function moderateQuestion(
    lessonId: string,
    questionId: string,
    _prev: QaActionState,
    formData: FormData,
  ): Promise<QaActionState> {
    return moderate("lesson_questions", lessonId, questionId, formData);
  },
  limitedState,
);

export const moderateAnswer = withRateLimit(
  "moderateAnswer",
  async function moderateAnswer(
    lessonId: string,
    answerId: string,
    _prev: QaActionState,
    formData: FormData,
  ): Promise<QaActionState> {
    return moderate("lesson_answers", lessonId, answerId, formData);
  },
  limitedState,
);

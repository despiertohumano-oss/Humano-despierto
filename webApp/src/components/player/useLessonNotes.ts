"use client";

import { useState } from "react";
import { deleteLessonNote, saveLessonNote, updateLessonNote } from "@/app/leccion/[id]/actions";
import type { PlayerNote } from "@/lib/server/lesson-player";

const byTime = (a: PlayerNote, b: PlayerNote) => a.atSeconds - b.atSeconds;

/** Lo que devuelve una acción del player (G-04): el error ya viene en castellano. */
type OpResult = { ok: true } | { ok: false; error: string };

export interface LessonNotes {
  notes: PlayerNote[];
  busy: boolean;
  /** `scope` es "add" o el id de la nota: así cada campo muestra sólo SU error. */
  error: { scope: string; message: string } | null;
  add: (atSeconds: number, body: string) => Promise<boolean>;
  edit: (id: string, body: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

/** Estado y llamadas de las notas de una lección; cada operación devuelve si salió bien. */
export function useLessonNotes(lessonId: string, initial: PlayerNote[]): LessonNotes {
  const [notes, setNotes] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LessonNotes["error"]>(null);

  async function run(scope: string, fallback: string, op: () => Promise<OpResult>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await op();
      if (!result.ok) setError({ scope, message: result.error });
      return result.ok;
    } catch {
      // Sólo llega acá un corte de red o del servidor: su mensaje no está escrito para la alumna.
      setError({ scope, message: fallback });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    notes,
    busy,
    error,
    add: (atSeconds, body) =>
      run("add", "No se pudo guardar la nota.", async () => {
        const result = await saveLessonNote(lessonId, atSeconds, body);
        if (result.ok) setNotes((prev) => [...prev, result.note].sort(byTime));
        return result;
      }),
    edit: (id, body) =>
      run(id, "No se pudo editar la nota.", async () => {
        const result = await updateLessonNote(id, body);
        if (result.ok) setNotes((prev) => prev.map((n) => (n.id === id ? result.note : n)).sort(byTime));
        return result;
      }),
    remove: (id) =>
      run(id, "No se pudo borrar la nota.", async () => {
        const result = await deleteLessonNote(id);
        if (result.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
        return result;
      }),
  };
}

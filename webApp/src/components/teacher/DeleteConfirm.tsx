"use client";

import TypeToConfirmZone from "@/components/panel/TypeToConfirmZone";
import Button from "@/components/atoms/Button";
import { studentLossText } from "@/lib/teacher/student-impact";

interface Props {
  scope: "module" | "lesson";
  /** Título exacto del módulo o la lección: es lo que hay que escribir para confirmar. */
  title: string;
  /** Lo propio del contenido que se va (lecciones, capítulos, recursos). */
  detail: string;
  /** Calculado por el servidor (`getStudentProgressCounts`); `null` si no se pudo contar. */
  studentsWithProgress: number | null;
  action: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
  hidden: Record<string, string>;
  onCancel: () => void;
}

/**
 * G-01 (T-098): borrar un módulo o una lección arrastra por cascada el avance, las notas y las
 * preguntas de las alumnas. Se confirma escribiendo el título (`TypeToConfirmZone`, como el curso
 * y el post), con el conteo de alumnas afectadas a la vista.
 */
export function DeleteConfirmZone({ scope, title, detail, studentsWithProgress, action, isPending, error, hidden, onCancel }: Props) {
  const what = scope === "module" ? "módulo" : "lección";
  return (
    <div className="space-y-3">
      <TypeToConfirmZone
        heading={scope === "module" ? `Borrar el módulo «${title}»` : `Borrar la lección «${title}»`}
        confirmText={title}
        action={action}
        isPending={isPending}
        error={error}
        hidden={hidden}
        submitLabel={`Borrar ${what}`}
        pendingLabel="Borrando…"
      >
        <p className="text-base text-suave">{detail}</p>
        <p className="text-base font-semibold text-bosque">{studentLossText(studentsWithProgress, scope)}</p>
      </TypeToConfirmZone>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
        Cancelar
      </Button>
    </div>
  );
}

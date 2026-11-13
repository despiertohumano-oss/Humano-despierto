"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { askQuestion } from "@/app/leccion/[id]/actions";
import { QA_ACTION_INITIAL_STATE } from "@/lib/lesson-qa/action-state";
import Button from "@/components/atoms/Button";
import FormField from "@/components/molecules/FormField";
import FormStatus from "@/components/molecules/FormStatus";
import { cn } from "@/lib/utils/cn";

/** S-06 (T-096): en una vista previa el Q&A no es de la cohorte, lo lee cualquier sesión (0031). */
export const PREVIEW_QA_NOTICE = "Esta pregunta la puede leer cualquier persona registrada.";

export default function QuestionComposer({ lessonId, isPreview = false }: { lessonId: string; isPreview?: boolean }) {
  const action = useMemo(() => askQuestion.bind(null, lessonId), [lessonId]);
  const [state, formAction, pending] = useActionState(action, QA_ACTION_INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mb-5 space-y-4 rounded-md bg-fondo p-4">
      <FormField id={`qa-titulo-${lessonId}`} label="Título de la pregunta">
        {(c) => <input {...c} name="title" required minLength={3} maxLength={200} placeholder="¿Qué te quedó dando vueltas?" className={cn(c.className, "text-sm")} />}
      </FormField>
      <FormField id={`qa-cuerpo-${lessonId}`} label="Tu pregunta">
        {(c) => <textarea {...c} name="body" required maxLength={4000} rows={3} placeholder="Contá en qué minuto y qué no cerró." className={cn(c.className, "resize-y text-sm")} />}
      </FormField>
      {isPreview && <p className="text-sm text-suave">{PREVIEW_QA_NOTICE}</p>}
      {/* El error de la action no dice de qué campo es: va como estado del formulario. */}
      <FormStatus state={{ error: state.error, success: null }} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Preguntar"}
        </Button>
      </div>
    </form>
  );
}

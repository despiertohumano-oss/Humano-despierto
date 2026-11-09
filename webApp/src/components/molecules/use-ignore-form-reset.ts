"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Un form con `action` se resetea al terminar la action; React Aria responde volviendo el campo a
 *  su valor inicial y avisando por `onChange`. Un campo controlado (su valor vive en el estado del
 *  form) no debe enterarse: este hook marca el reset y el `onChange` de ese instante se descarta.
 *  El listener va en captura para correr antes que el de React Aria. */
export function useIgnoreFormReset(ref: RefObject<HTMLElement | null>, active: boolean) {
  const resetting = useRef(false);
  useEffect(() => {
    const form = active ? ref.current?.closest("form") : null;
    if (!form) return;
    const onReset = () => {
      resetting.current = true;
      queueMicrotask(() => (resetting.current = false));
    };
    form.addEventListener("reset", onReset, true);
    return () => form.removeEventListener("reset", onReset, true);
  }, [ref, active]);
  return resetting;
}

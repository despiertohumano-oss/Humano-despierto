import "server-only";
import { escapeHtml, renderEmailHtml, renderEmailText } from "@/lib/server/mail/layout";

export interface ErrorAlertProps {
  source: "server" | "client";
  path: string;
  message: string;
  panelUrl: string;
}

const ORIGEN = { server: "el servidor", client: "el navegador de una persona" } as const;

/** Aviso al admin de un error nuevo (0078). El mensaje ya viene redactado (sin mails ni tokens). */
export function renderErrorAlertMail(props: ErrorAlertProps) {
  const subject = `Error en el sitio: ${props.path}`;
  const heading = "Algo falló en el sitio";
  const intro = `Hubo un error en ${ORIGEN[props.source]}, en la página ${props.path}.`;
  const after = "Si se repite, no te volvemos a avisar por 24 horas: las repeticiones se cuentan en el panel.";

  const html = renderEmailHtml({
    preheader: `Error en ${props.path}`,
    eyebrow: "Aviso de error",
    heading,
    bodyHtml: `
    <p style="margin:0 0 14px;">${escapeHtml(intro)}</p>
    <p style="margin:0 0 14px; font-family:monospace; white-space:pre-wrap;">${escapeHtml(props.message)}</p>
    <p style="margin:0;">${escapeHtml(after)}</p>`,
    cta: { label: "Ver errores", url: props.panelUrl },
  });

  const text = renderEmailText({
    eyebrow: "Aviso de error",
    heading,
    bodyLines: [intro, "", props.message, "", after],
    cta: { label: "Ver errores", url: props.panelUrl },
  });

  return { subject, html, text };
}

import Icon from "@/components/atoms/Icon";
import { modalityItems, type CourseModality } from "@/lib/catalog/modality";

/** B2 · Qué incluye el curso según su docente. El certificado solo se nombra si el curso lo emite. */
export default function ModalityBlock({ modality }: { modality: CourseModality }) {
  const items = modalityItems(modality);
  if (items.length === 0 && !modality.accessTerms && !modality.issuesCertificate) return null;
  return (
    <section aria-labelledby="modalidad-titulo" className="mt-5 border-t border-linea pt-5">
      <h3 id="modalidad-titulo" className="text-base font-semibold text-bosque">
        Modalidad
      </h3>
      {items.length > 0 && (
        <ul className="mt-3 grid gap-2 text-[15px] leading-snug">
          {items.map((text) => (
            <li key={text} className="grid grid-cols-[22px_1fr] gap-2.5">
              <Icon name="check" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
              {text}
            </li>
          ))}
        </ul>
      )}
      {modality.accessTerms && (
        <p className="mt-3 text-sm leading-normal text-suave [overflow-wrap:anywhere]">{modality.accessTerms}</p>
      )}
      {modality.issuesCertificate && (
        <p className="mt-3 grid grid-cols-[22px_1fr] gap-2.5 text-[15px]">
          <Icon name="award" className="mt-0.5 h-[18px] w-[18px] text-musgo" />
          Incluye certificado de finalización verificable
        </p>
      )}
    </section>
  );
}

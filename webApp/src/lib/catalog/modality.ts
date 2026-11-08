import { formatTotalDuration } from "@/lib/utils/format";

// B2 · Modalidad informativa del curso (migración 0074). `live` no agenda nada (ADR-004).
export interface CourseModality {
  recorded: boolean;
  pdf: boolean;
  downloads: boolean;
  live: boolean;
  accessTerms: string | null;
  issuesCertificate: boolean;
}

export interface ModalityRow {
  includes_recorded?: boolean;
  includes_pdf?: boolean;
  includes_downloads?: boolean;
  includes_live?: boolean;
  access_terms?: string | null;
  issues_certificate?: boolean;
}

export const MODALITY_COLUMNS =
  "includes_recorded, includes_pdf, includes_downloads, includes_live, access_terms, issues_certificate";

export const MODALITY_FIELDS = [
  { name: "includesRecorded", key: "recorded", label: "Clases grabadas" },
  { name: "includesPdf", key: "pdf", label: "Material en PDF" },
  { name: "includesDownloads", key: "downloads", label: "Recursos descargables" },
  { name: "includesLive", key: "live", label: "Encuentros en vivo" },
] as const;

// Los defaults son los de la base: una fila leída sin estas columnas no inventa nada distinto.
export function toModality(row: ModalityRow): CourseModality {
  return {
    recorded: row.includes_recorded ?? true,
    pdf: row.includes_pdf ?? false,
    downloads: row.includes_downloads ?? false,
    live: row.includes_live ?? false,
    accessTerms: row.access_terms ?? null,
    issuesCertificate: row.issues_certificate ?? true,
  };
}

export function modalityItems(m: CourseModality): string[] {
  return MODALITY_FIELDS.filter((f) => m[f.key]).map((f) => f.label);
}

export function modalitySummary(m: CourseModality, totalDurationSeconds: number): string {
  const duration = totalDurationSeconds > 0 ? formatTotalDuration(totalDurationSeconds) : null;
  return [...modalityItems(m), ...(duration ? [duration] : [])].join(" · ");
}

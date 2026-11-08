import { cn } from "@/lib/utils/cn";

/** Pastilla de filtro (catálogo y Diario): un solo lugar para su estado activo. */
export function filterChipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-10 items-center gap-2 rounded-pill border-[1.5px] px-4 py-2 text-sm font-medium transition-colors",
    active ? "border-bosque bg-bosque text-white" : "border-salvia bg-papel text-bosque hover:border-bosque",
  );
}

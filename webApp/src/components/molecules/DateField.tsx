"use client";

import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarMonthPicker,
  CalendarYearPicker,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  I18nProvider,
  Label,
  Popover,
} from "react-aria-components";
import { useRef } from "react";
import Icon from "@/components/atoms/Icon";
import { FieldError } from "@/components/molecules/FormField";
import { useIgnoreFormReset } from "@/components/molecules/use-ignore-form-reset";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/ui/date-value";
import { cn } from "@/lib/utils/cn";

/** Fechas y horas se escriben siempre en castellano rioplatense: DD/MM/AAAA y 24 h, sin importar
 *  el idioma del sistema (los selectores nativos mostraban mm/dd/yyyy o AM/PM). */
export const FIELD_LOCALE = "es-AR";

export const LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-tinta";

/** El grupo copia `fieldClass`: mismo alto, borde y radio que un input del sitio. */
export function groupClass(invalid: boolean, disabled = false) {
  return cn(
    "flex min-h-12 w-full items-center rounded-md border bg-papel pl-4 text-base text-tinta transition-colors",
    "focus-within:border-miel-800 focus-within:ring-2 focus-within:ring-miel-800/30",
    invalid ? "border-error" : "border-suave",
    disabled && "cursor-not-allowed bg-fondo",
  );
}

export const SEGMENT_CLASS = cn(
  "rounded-sm px-0.5 tabular-nums caret-transparent outline-none",
  "data-[placeholder]:text-suave data-[type=literal]:px-0 data-[type=literal]:text-suave",
  "data-[focused]:bg-miel-100 data-[focused]:text-bosque",
  "data-[disabled]:text-suave",
);

const NAV_BUTTON = cn(
  "inline-flex h-10 w-10 flex-none items-center justify-center rounded-md text-bosque transition-colors",
  "hover:bg-salvia-100 data-[focus-visible]:outline-2 data-[focus-visible]:outline-miel-800 data-[disabled]:cursor-not-allowed data-[disabled]:text-suave",
);

const PICKER_SELECT = "min-h-10 rounded-md border border-linea bg-papel px-2 text-sm font-semibold text-bosque";

interface Props {
  id: string;
  label: string;
  /** Ayuda permanente bajo el campo; desaparece si hay error. */
  hint?: string;
  error?: string | null;
  /** Nombre del campo oculto que viaja con el form (AAAA-MM-DD). */
  name?: string;
  /** Controlado: fecha ISO o "" / null. */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (iso: string) => void;
  /** Límites ISO, inclusive. */
  min?: string;
  max?: string;
  /** Mes en que abre el calendario si no hay fecha (ISO). */
  openAt?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function DateField({ id, label, hint, error, name, value, defaultValue, onChange, min, max, openAt, required, disabled, className }: Props) {
  const minValue = isoToCalendarDate(min) ?? undefined;
  const maxValue = isoToCalendarDate(max) ?? undefined;
  const years = minValue && maxValue ? maxValue.year - minValue.year + 1 : 120;
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const controlled = value !== undefined;
  const ref = useRef<HTMLDivElement>(null);
  const resetting = useIgnoreFormReset(ref, controlled);

  return (
    <I18nProvider locale={FIELD_LOCALE}>
      <DatePicker
        ref={ref}
        id={id}
        name={name}
        className={cn("group/date", className)}
        {...(controlled ? { value: isoToCalendarDate(value) } : { defaultValue: isoToCalendarDate(defaultValue) })}
        onChange={(d) => !resetting.current && onChange?.(calendarDateToIso(d))}
        minValue={minValue}
        maxValue={maxValue}
        placeholderValue={isoToCalendarDate(openAt) ?? undefined}
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        shouldForceLeadingZeros
      >
        <Label className={LABEL_CLASS}>{label}</Label>
        <Group className={groupClass(Boolean(error), disabled)}>
          <DateInput className="flex flex-1 items-center py-3">
            {(segment) => <DateSegment segment={segment} className={SEGMENT_CLASS} />}
          </DateInput>
          <Button aria-label="Abrir el calendario" className={cn(NAV_BUTTON, "mr-1 h-11 w-11")}>
            <Icon name="calendar" className="h-5 w-5" />
          </Button>
        </Group>
        {error ? (
          <FieldError id={errorId} error={error} />
        ) : (
          hint && <p id={hintId} className="mt-1.5 text-sm text-suave">{hint}</p>
        )}
        <Popover
          placement="bottom start"
          offset={8}
          className="rounded-lg border border-linea bg-papel p-4 shadow-lift outline-none"
        >
          <Dialog aria-label={label} className="outline-none">
            <Calendar className="w-[19rem] max-w-[calc(100vw-3rem)]">
              <header className="mb-3 flex items-center gap-1">
                <Button slot="previous" aria-label="Mes anterior" className={NAV_BUTTON}>
                  <Icon name="chevron-left" />
                </Button>
                <div className="flex flex-1 justify-center gap-2">
                  <CalendarMonthPicker format="long">
                    {(p) => (
                      <select aria-label={p["aria-label"]} value={String(p.value)} onChange={(e) => p.onChange(Number(e.target.value))} className={PICKER_SELECT}>
                        {p.items.map((it) => <option key={it.id} value={it.id}>{it.formatted}</option>)}
                      </select>
                    )}
                  </CalendarMonthPicker>
                  <CalendarYearPicker visibleYears={years}>
                    {(p) => (
                      <select aria-label={p["aria-label"]} value={String(p.value)} onChange={(e) => p.onChange(Number(e.target.value))} className={PICKER_SELECT}>
                        {p.items.map((it) => <option key={it.id} value={it.id}>{it.formatted}</option>)}
                      </select>
                    )}
                  </CalendarYearPicker>
                </div>
                <Button slot="next" aria-label="Mes siguiente" className={NAV_BUTTON}>
                  <Icon name="chevron-right" />
                </Button>
              </header>
              <CalendarGrid weekdayStyle="short" className="w-full border-collapse">
                <CalendarGridHeader>
                  {(day) => <CalendarHeaderCell className="pb-2 text-xs font-semibold uppercase text-suave">{day}</CalendarHeaderCell>}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className={cn(
                        "m-0.5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-sm text-tinta outline-none transition-colors",
                        "hover:bg-salvia-100",
                        "data-[today]:font-bold data-[today]:text-miel-800 data-[today]:ring-1 data-[today]:ring-inset data-[today]:ring-miel-800",
                        "data-[selected]:bg-miel data-[selected]:font-bold data-[selected]:text-bosque data-[selected]:ring-0",
                        "data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-1 data-[focus-visible]:outline-miel-800",
                        "data-[outside-month]:invisible",
                        "data-[disabled]:cursor-not-allowed data-[disabled]:text-suave data-[disabled]:line-through data-[disabled]:hover:bg-transparent",
                      )}
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </DatePicker>
    </I18nProvider>
  );
}

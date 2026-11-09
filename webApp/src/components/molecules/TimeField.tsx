"use client";

import { DateInput, DateSegment, I18nProvider, Label, TimeField as AriaTimeField } from "react-aria-components";
import { useRef } from "react";
import Icon from "@/components/atoms/Icon";
import { FIELD_LOCALE, LABEL_CLASS, SEGMENT_CLASS, groupClass } from "@/components/molecules/DateField";
import { FieldError } from "@/components/molecules/FormField";
import { useIgnoreFormReset } from "@/components/molecules/use-ignore-form-reset";
import { hhmmToTime, timeToHhmm } from "@/lib/ui/date-value";
import { cn } from "@/lib/utils/cn";

interface Props {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  /** Controlado: "HH:MM" (24 h) o "". */
  value?: string | null;
  onChange?: (hhmm: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Sin `name`: el valor de React Aria viaja como HH:MM:SS; el form que lo usa manda su propio HH:MM.
export default function TimeField({ id, label, hint, error, value, onChange, required, disabled, className }: Props) {
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const ref = useRef<HTMLDivElement>(null);
  const resetting = useIgnoreFormReset(ref, value !== undefined);
  return (
    <I18nProvider locale={FIELD_LOCALE}>
      <AriaTimeField
        ref={ref}
        id={id}
        className={className}
        value={value === undefined ? undefined : hhmmToTime(value)}
        onChange={(t) => !resetting.current && onChange?.(timeToHhmm(t))}
        hourCycle={24}
        shouldForceLeadingZeros
        isRequired={required}
        isDisabled={disabled}
        isInvalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
      >
        <Label className={LABEL_CLASS}>{label}</Label>
        <div className={groupClass(Boolean(error), disabled)}>
          <DateInput className="flex flex-1 items-center py-3">
            {(segment) => <DateSegment segment={segment} className={SEGMENT_CLASS} />}
          </DateInput>
          <span className={cn("mr-1 inline-flex h-11 w-11 items-center justify-center", disabled ? "text-suave" : "text-bosque")}>
            <Icon name="clock" className="h-5 w-5" />
          </span>
        </div>
        {error ? <FieldError id={errorId} error={error} /> : hint && <p id={hintId} className="mt-1.5 text-sm text-suave">{hint}</p>}
      </AriaTimeField>
    </I18nProvider>
  );
}

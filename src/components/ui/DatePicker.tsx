"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "./Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import { cn } from "@/lib/utils";

/**
 * Drop-in replacement for `<input type="date">`.  Accepts/emits ISO yyyy-mm-dd
 * strings so existing handlers keep working without coercion.
 */
export interface DatePickerProps {
  value: string | null | undefined;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Match Select trigger sizing. Defaults to "md". */
  size?: "sm" | "md";
  /** Optional bounds — disables days outside the range. */
  fromDate?: string;
  toDate?: string;
}

function isoToDate(iso: string | null | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = isoToDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  size = "md",
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = isoToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center justify-between gap-2 w-full rounded-[6px] border border-rule bg-bg-card text-ink",
            "transition-colors duration-100 hover:border-ink-4",
            "focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-ink-4",
            size === "sm" ? "h-8 px-2.5 text-[12px]" : "h-10 px-3 text-[13px]",
            className
          )}
        >
          <span className="truncate">{value ? formatDisplay(value) : placeholder}</span>
          <CalendarDays className="h-3.5 w-3.5 opacity-60 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(dateToIso(d));
              setOpen(false);
            }
          }}
          startMonth={fromDate ? isoToDate(fromDate) : undefined}
          endMonth={toDate ? isoToDate(toDate) : undefined}
          disabled={
            fromDate || toDate
              ? (d) => {
                  const dm = d.getTime();
                  if (fromDate && dm < (isoToDate(fromDate)?.getTime() ?? 0)) return true;
                  if (toDate && dm > (isoToDate(toDate)?.getTime() ?? Infinity)) return true;
                  return false;
                }
              : undefined
          }
        />
      </PopoverContent>
    </Popover>
  );
}

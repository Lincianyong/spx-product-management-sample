"use client";

import { ALL_PROGRAMS, type Program } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Six-chip toggle row for the Program multi-select.
 *
 * Lives on Epic + Ticket create forms (and editing surfaces later). One
 * chip per Program enum value; click toggles inclusion in the array.
 * Six is small enough that a popover with checkboxes would be more
 * affordance than this is - chips are the right size.
 */
export function ProgramPicker({
  value,
  onChange,
  label = "Programs",
  hint = "Tag with one or more programs · click to toggle",
}: {
  value: Program[];
  onChange: (next: Program[]) => void;
  label?: string;
  hint?: string;
}) {
  const toggle = (p: Program) => {
    if (value.includes(p)) onChange(value.filter((x) => x !== p));
    else onChange([...value, p]);
  };
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {ALL_PROGRAMS.map((p) => {
          const active = value.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={cn(
                "px-2.5 h-7 text-[11px] font-mono uppercase tracking-[0.06em] rounded-[4px] border transition-colors duration-100",
                active
                  ? "bg-accent text-bg-card border-accent"
                  : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              )}
            >
              {p}
            </button>
          );
        })}
      </div>
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </label>
  );
}

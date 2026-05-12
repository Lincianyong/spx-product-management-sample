"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shadcn-style calendar built on react-day-picker v10.  Classes are mapped
 * to SPX DS tokens so light + Newsprint Dark inherit cleanly.
 */
export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center h-7",
        caption_label: "font-mono text-[12px] uppercase tracking-[0.14em] text-ink",
        nav: "flex items-center justify-between absolute inset-x-0 top-0",
        button_previous: cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-[6px] border border-rule bg-bg-card",
          "text-ink-3 hover:text-ink hover:border-ink-4 transition-colors duration-100",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        ),
        button_next: cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-[6px] border border-rule bg-bg-card",
          "text-ink-3 hover:text-ink hover:border-ink-4 transition-colors duration-100",
          "disabled:opacity-30 disabled:cursor-not-allowed"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 text-center",
        week: "flex w-full mt-1.5",
        day: "h-8 w-8 p-0 text-center text-[13px] relative",
        day_button: cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-[6px]",
          "text-ink-2 hover:bg-rule-soft hover:text-ink transition-colors duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        ),
        today: "[&_button]:bg-accent-soft [&_button]:text-accent [&_button]:font-medium",
        selected: "[&_button]:bg-accent [&_button]:text-bg-card [&_button]:hover:bg-accent [&_button]:hover:text-bg-card",
        outside: "text-ink-4 opacity-50",
        disabled: "text-ink-4 opacity-30 cursor-not-allowed",
        range_start: "[&_button]:bg-accent [&_button]:text-bg-card [&_button]:rounded-l-[6px] [&_button]:rounded-r-none",
        range_end: "[&_button]:bg-accent [&_button]:text-bg-card [&_button]:rounded-r-[6px] [&_button]:rounded-l-none",
        range_middle: "[&_button]:bg-accent-soft [&_button]:text-ink [&_button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          ),
      }}
      {...props}
    />
  );
}

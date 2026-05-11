"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  confidence?: number;
  reasoning?: string;
  onAccept?: () => void;
  className?: string;
}

export function AiTag({ label, confidence, reasoning, onAccept, className }: Props) {
  const [open, setOpen] = useState(false);

  // Confidence threshold — below 60% we say nothing
  if (confidence != null && confidence < 0.6) return null;

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={onAccept}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 h-6 rounded-[12px] border font-mono",
          "text-[10px] tracking-[0.06em] uppercase",
          "bg-ai-soft text-ai border-ai-soft",
          "hover:bg-ai hover:text-bg-card transition-colors duration-100"
        )}
      >
        <span className="font-sans">✦</span>
        <span>{label}</span>
        {confidence != null && (
          <span className="opacity-70">{Math.round(confidence * 100)}%</span>
        )}
      </button>
      {open && reasoning && (
        <div
          role="tooltip"
          className="absolute z-50 left-0 top-full mt-2 w-80 p-3 rounded-[8px] bg-ink text-bg shadow-lg text-[12px] leading-relaxed font-body"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ai-soft mb-1.5">
            ✦ Reasoning
          </div>
          <div>{reasoning}</div>
        </div>
      )}
    </span>
  );
}

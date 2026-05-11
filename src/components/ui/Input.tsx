"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
    return (
      <label htmlFor={inputId} className="flex flex-col gap-1.5">
        {label && (
          <span className="text-[12px] font-mono uppercase tracking-[0.06em] text-ink-3">
            {label}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 px-3 rounded-[6px] border bg-bg-card text-ink",
            "placeholder:text-ink-4 transition-colors duration-100",
            error ? "border-danger" : "border-rule hover:border-ink-4",
            className
          )}
          {...rest}
        />
        {(hint || error) && (
          <span className={cn("text-[12px]", error ? "text-danger" : "text-ink-3")}>
            {error || hint}
          </span>
        )}
      </label>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
    return (
      <label htmlFor={inputId} className="flex flex-col gap-1.5">
        {label && (
          <span className="text-[12px] font-mono uppercase tracking-[0.06em] text-ink-3">
            {label}
          </span>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-[96px] px-3 py-2 rounded-[6px] border bg-bg-card text-ink",
            "placeholder:text-ink-4 transition-colors duration-100",
            error ? "border-danger" : "border-rule hover:border-ink-4",
            className
          )}
          {...rest}
        />
        {(hint || error) && (
          <span className={cn("text-[12px]", error ? "text-danger" : "text-ink-3")}>
            {error || hint}
          </span>
        )}
      </label>
    );
  }
);
Textarea.displayName = "Textarea";

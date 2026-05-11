"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantCls: Record<Variant, string> = {
  primary:
    "bg-accent text-bg-card hover:bg-accent-deep border border-accent transition-colors duration-100",
  secondary:
    "bg-bg-elevated text-ink hover:bg-rule-soft border border-rule transition-colors duration-100",
  ghost:
    "bg-transparent text-ink-2 hover:bg-rule-soft border border-transparent transition-colors duration-100",
  danger:
    "bg-danger text-bg-card hover:opacity-90 border border-danger transition-colors duration-100",
};

const sizeCls: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px] rounded-sm",
  md: "px-4 py-2 text-[14px] rounded-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "secondary", size = "md", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantCls[variant],
        sizeCls[size],
        className
      )}
      {...rest}
    />
  )
);
Button.displayName = "Button";

"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Theme-aware checkbox built on Radix.  Replaces the native
 * `<input type="checkbox" className="accent-accent">` we used to scatter
 * around - that pattern can't restyle its check-mark in dark mode and
 * the box never lines up with the rest of the SPX DS form controls.
 *
 * - Light mode: white box, neutral-200 rule, brand-orange when checked.
 * - Dark mode: warm card surface, brown rule, orange-when-checked
 *   inherits via --accent so Newsprint Dark stays coherent.
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-[4px] border border-rule bg-bg-card",
      "transition-colors duration-100",
      "hover:border-ink-4",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card",
      "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-bg-card",
      "data-[state=indeterminate]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:text-bg-card",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      {props.checked === "indeterminate" ? (
        <Minus className="h-3 w-3" strokeWidth={3} />
      ) : (
        <Check className="h-3 w-3" strokeWidth={3} />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

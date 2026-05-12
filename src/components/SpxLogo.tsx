import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  /** showExpress is kept for API compatibility; the official PNG is the
   *  full SPX EXPRESS wordmark, so the prop has no rendering effect. */
  showExpress?: boolean;
  className?: string;
}

/**
 * Official SPX Express wordmark from the SPX Design System.
 * Source: github.com/Lincianyong/spx-ds/assets/spx-express-logo.png
 *
 * Per the DS brand spec (foundations/00-brand.md):
 * - Use on white, neutral-50, neutral-1000, or brand-50 surfaces only
 * - Maintain clear-space equal to the X height
 * - Never below 24px tall (legibility breaks)
 * - Sizes: 24 (favicon) / 40 (topbar) / 64 (login) / 96 (hero)
 */
export function SpxLogo({ size = "sm", className }: Props) {
  // Native PNG aspect: 512 × 205 ≈ 2.498 : 1
  const dims =
    size === "sm" ? { h: 28, w: 70 } :   // ~topbar (40px is canonical; sidebar is tighter)
    size === "md" ? { h: 48, w: 120 } :  // login surface
    { h: 72, w: 180 };                    // hero

  return (
    <Image
      src="/spx-express-logo.png"
      alt="SPX Express"
      width={dims.w}
      height={dims.h}
      priority
      className={cn("h-auto w-auto select-none", className)}
      style={{ height: dims.h }}
    />
  );
}

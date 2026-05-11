import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  showExpress?: boolean;
  className?: string;
}

/**
 * Inline SVG approximation of the SPX Express mark.
 * Renders "SPX" in heavy oblique sans + signature speed-lines under
 * the letters. Optional EXPRESS tagline.
 *
 * To replace with the exact source SVG, copy the original paths into
 * the <g fill="#EE4D2D"> below in place of the <text> and slash rects.
 */
export function SpxLogo({ size = "sm", showExpress = false, className }: Props) {
  const sizeCls = {
    sm: "h-7",
    md: "h-12",
    lg: "h-[72px]",
  }[size];

  return (
    <svg
      role="img"
      aria-label="SPX Express"
      viewBox="0 0 220 90"
      className={cn(sizeCls, "w-auto", className)}
    >
      <g fill="#EE4D2D">
        {/* Italic SPX wordmark */}
        <g transform="skewX(-12)">
          <text
            x="34" y="58"
            fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="64"
            letterSpacing="-2"
          >
            SPX
          </text>
        </g>

        {/* Extended X-stroke — the diagonal slash that gives the mark its character */}
        <path d="M 158 18 L 200 18 L 178 78 L 136 78 Z" opacity="0" />
        <polygon points="170,20 178,20 152,82 144,82" />

        {showExpress && (
          <text
            x="148" y="83"
            fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="13"
            letterSpacing="3"
          >
            EXPRESS
          </text>
        )}

        {/* Four speed lines beneath the letters */}
        <g transform="skewX(-30)">
          <rect x="14" y="78" width="10" height="5" />
          <rect x="30" y="78" width="22" height="5" />
          <rect x="58" y="78" width="44" height="5" />
          <rect x="108" y="78" width="12" height="5" />
        </g>
      </g>
    </svg>
  );
}

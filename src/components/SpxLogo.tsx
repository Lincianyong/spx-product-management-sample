import { cn } from "@/lib/utils";

interface Props {
  size?: "sm" | "md" | "lg";
  showExpress?: boolean;
  className?: string;
}

/**
 * Inline SVG of the SPX Express mark.
 * `sm` ~ 28px tall (sidebar / topbar)
 * `md` ~ 48px tall (login hero, modals)
 * `lg` ~ 72px tall (splash / empty states)
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
      viewBox="0 0 200 80"
      className={cn(sizeCls, "w-auto", className)}
    >
      <g fill="#EE4D2D">
        <text
          x="100" y="56"
          fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="64"
          letterSpacing="-2"
          textAnchor="middle"
        >
          SPX
        </text>
        {showExpress && (
          <text
            x="138" y="74"
            fontFamily="'Arial Black', 'Helvetica Neue', Helvetica, Arial, sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="13"
            letterSpacing="3"
            textAnchor="middle"
          >
            EXPRESS
          </text>
        )}
        <g transform="skewX(-30) translate(20 0)">
          <rect x="20" y="68" width="10" height="5" />
          <rect x="36" y="68" width="20" height="5" />
          <rect x="62" y="68" width="38" height="5" />
          <rect x="106" y="68" width="12" height="5" />
        </g>
      </g>
    </svg>
  );
}

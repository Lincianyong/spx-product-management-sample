import { cn } from "@/lib/utils";
import type { Priority, Health, TicketType, Role } from "@/lib/types";
import { healthLabel } from "@/lib/utils";

interface PillProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "accent" | "warn" | "danger" | "info" | "ok" | "ai" | "neutral";
  dot?: boolean;
}

const variantCls = {
  default: "bg-bg-elevated text-ink-3 border-rule",
  accent: "bg-accent-soft text-accent border-accent-soft",
  warn: "bg-warn-soft text-warn border-warn-soft",
  danger: "bg-danger-soft text-danger border-danger-soft",
  info: "bg-info-soft text-info border-info-soft",
  ok: "bg-ok-soft text-ok border-ok-soft",
  ai: "bg-ai-soft text-ai border-ai-soft",
  neutral: "bg-neutral-soft text-ink-3 border-neutral-soft",
};

export function Pill({ children, className, variant = "default", dot }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 h-6 rounded-[12px] border font-mono uppercase",
        "text-[10px] tracking-[0.06em]",
        variantCls[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "ok" && "bg-ok",
            variant === "warn" && "bg-warn",
            variant === "danger" && "bg-danger",
            variant === "info" && "bg-info",
            variant === "accent" && "bg-accent",
            variant === "ai" && "bg-ai",
            (variant === "default" || variant === "neutral") && "bg-ink-3"
          )}
        />
      )}
      {children}
    </span>
  );
}

export function PriorityPill({ p }: { p: Priority }) {
  const v = p === "P0" ? "danger" : p === "P1" ? "warn" : "neutral";
  return <Pill variant={v}>{p}</Pill>;
}

export function HealthPill({ h, reason }: { h: Health; reason?: string }) {
  const v = h === "on_track" ? "ok" : h === "at_risk" ? "warn" : h === "blocked" ? "danger" : "neutral";
  return (
    <span title={reason} className="inline-flex">
      <Pill variant={v} dot>
        {healthLabel[h]}
      </Pill>
    </span>
  );
}

export function TypePill({ t }: { t: TicketType }) {
  const v = t === "engineering" ? "info" : t === "bug" ? "danger" : "neutral";
  const label = t === "engineering" ? "Eng" : t === "bug" ? "Bug" : "Tech";
  return <Pill variant={v}>{label}</Pill>;
}

export function RolePill({ role }: { role: Role }) {
  const v =
    role === "pm"
      ? "accent"
      : role === "em"
      ? "info"
      : role === "engineer" || role === "designer"
      ? "neutral"
      : role === "leadership"
      ? "warn"
      : role === "guest"
      ? "ai"
      : "default";
  return <Pill variant={v}>{role.toUpperCase()}</Pill>;
}

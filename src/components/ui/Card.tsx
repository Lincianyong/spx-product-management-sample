import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  accent?: "accent" | "warn" | "danger" | "info" | "ai" | "ok" | "neutral";
}

const accentBorder = {
  accent: "border-l-accent",
  warn: "border-l-warn",
  danger: "border-l-danger",
  info: "border-l-info",
  ai: "border-l-ai",
  ok: "border-l-ok",
  neutral: "border-l-rule",
};

export function Card({ children, className, accent }: Props) {
  return (
    <div
      className={cn(
        "bg-bg-card border border-rule rounded-[8px] shadow-sm",
        accent && `border-l-4 ${accentBorder[accent]}`,
        className
      )}
    >
      {children}
    </div>
  );
}

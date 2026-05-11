import { cn, avatarBg } from "@/lib/utils";
import type { User } from "@/lib/types";

interface Props {
  user?: Pick<User, "initials" | "colorKey" | "displayName"> | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const sizeCls = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-9 h-9 text-[13px]",
  lg: "w-14 h-14 text-[18px]",
};

export function Avatar({ user, size = "sm", className, title }: Props) {
  if (!user)
    return (
      <span
        title={title}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-rule text-ink-4 font-medium",
          sizeCls[size],
          className
        )}
      >
        ?
      </span>
    );
  return (
    <span
      title={title ?? user.displayName}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium font-body",
        avatarBg[user.colorKey],
        sizeCls[size],
        className
      )}
    >
      {user.initials}
    </span>
  );
}

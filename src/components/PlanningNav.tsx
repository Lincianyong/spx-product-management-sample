"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STAGES = [
  { href: "/planning/picklist", label: "Picklist", stage: "4a", role: "PM alone · ~30 min Mon" },
  { href: "/planning/estimation", label: "Estimation", stage: "4b", role: "Engineers + EM · ~45 min Tue" },
  { href: "/planning/joint", label: "Joint Planning", stage: "4c", role: "Whole team · ~30 min Tue" },
];

export function PlanningNav() {
  const pathname = usePathname();
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-1 inline-flex items-center gap-1 mb-6">
      {STAGES.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              "px-3 py-2 rounded-[6px] transition-colors duration-100",
              active ? "bg-accent text-bg-card" : "text-ink-2 hover:bg-rule-soft"
            )}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.06em] opacity-70">Stage {s.stage}</div>
            <div className="text-[13px] font-medium">{s.label}</div>
          </Link>
        );
      })}
      <span className="text-[12px] text-ink-3 ml-3 mr-3 font-mono">·</span>
      <span className="text-[12px] text-ink-3 mr-3">{STAGES.find((s) => s.href === pathname)?.role}</span>
    </div>
  );
}

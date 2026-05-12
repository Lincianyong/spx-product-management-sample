"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/guideline",     label: "Overview",       hint: "User flow & capabilities" },
  { href: "/guideline-pm",  label: "For PM",         hint: "Planning · Portfolio · Retro" },
  { href: "/guideline-eng", label: "For Engineer",   hint: "Estimation · Sprint · Status" },
];

/**
 * GuidelineTabs — sub-nav rendered by the shared (guideline) layout.
 * Three pages live under the same surface: an Overview page, a PM
 * deep-dive, and an Engineer deep-dive. Tab matching is exact on the
 * pathname; no nested routes hang off these.
 */
export function GuidelineTabs() {
  const pathname = usePathname();
  return (
    <nav className="bg-bg-card border border-rule rounded-[8px] p-1 mb-6 flex items-center gap-1">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex-1 px-3 py-2 rounded-[6px] transition-colors duration-100",
              active
                ? "bg-accent-soft"
                : "hover:bg-rule-soft"
            )}
          >
            <div className={cn(
              "text-[13px]",
              active ? "text-ink font-medium" : "text-ink-2"
            )}>
              {t.label}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-0.5">
              {t.hint}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

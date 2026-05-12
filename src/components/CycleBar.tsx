"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { calendarFor, cycleStageNow, type CycleStage } from "@/lib/cycle";
import { cn } from "@/lib/utils";

/**
 * CycleBar — persistent header rendered by the (cycle) route group
 * (the /planning module). Three planning milestones laid out as
 * connected dots, each click-navigable. Mirrors the PlanningCalendarMini
 * scrubber on /me so the visual idiom is shared across the app.
 *
 * - Past dot → green (cycle stage already passed by wall clock)
 * - Current dot → accent-ringed (clock is sitting in this stage)
 * - Future dot → muted
 *
 * Sprint Board and Sprint Close live as their own sidebar entries and
 * intentionally do not appear here — this bar is the planning scrubber,
 * not a full lifecycle map.
 */

type StageKey = "picklist" | "estimation" | "joint";

interface StageDef {
  key: StageKey;
  label: string;
  href: string;
  matchPath: string;
  clockStages: CycleStage[];
}

const STAGES: StageDef[] = [
  { key: "picklist",   label: "Picklist",   href: "/planning/picklist",   matchPath: "/planning/picklist",   clockStages: ["picklist"] },
  { key: "estimation", label: "Estimation", href: "/planning/estimation", matchPath: "/planning/estimation", clockStages: ["estimation"] },
  { key: "joint",      label: "Joint",      href: "/planning/joint",      matchPath: "/planning/joint",      clockStages: ["joint"] },
];

export function CycleBar() {
  const pathname = usePathname();
  const sprints = useAppStore((s) => s.sprints);

  const planningSprint = sprints.find((s) => s.state === "planning");
  const activeSprint = sprints.find((s) => s.state === "active");
  const anchor = planningSprint ?? activeSprint;
  if (!anchor) return null;

  const cal = calendarFor(anchor);
  const now = new Date();
  const clock = cycleStageNow(cal, now);
  const activeIdx = STAGES.findIndex((s) => s.clockStages.includes(clock));

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-6 flex items-center gap-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">
        Cycle for {anchor.key} · Now {weekday(now)} {time(now)}
      </div>
      <div className="flex items-center gap-2 flex-1">
        {STAGES.map((s, i) => {
          const isPast = activeIdx >= 0 && i < activeIdx;
          const isNow = i === activeIdx;
          const isCurrentRoute = pathname.startsWith(s.matchPath);
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <Link
                href={s.href}
                className="flex flex-col items-center min-w-0 group"
                title={s.label}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-150",
                    isNow
                      ? "bg-accent ring-4 ring-accent-soft"
                      : isPast
                      ? "bg-ok"
                      : "bg-rule group-hover:bg-ink-3"
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] mt-1 text-center transition-colors duration-100",
                    isCurrentRoute
                      ? "text-ink font-medium"
                      : isNow
                      ? "text-ink"
                      : "text-ink-3 group-hover:text-ink-2"
                  )}
                >
                  {s.label}
                </span>
              </Link>
              {i < STAGES.length - 1 && (
                <span
                  className={cn(
                    "flex-1 h-px",
                    isPast ? "bg-ok" : "bg-rule"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function time(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function weekday(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

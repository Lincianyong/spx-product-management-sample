"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { calendarFor, cycleStageNow, type CycleStage } from "@/lib/cycle";
import { cn } from "@/lib/utils";

/**
 * CycleBar — the persistent navigation chrome across the sprint cycle.
 *
 * Five stages laid out left-to-right: Picklist → Estimation → Joint →
 * Sprint → Close. Each cell shows its time bound, a label, and a live
 * count of pending work. The cell matching the current URL is highlighted;
 * a separate "Now" badge marks the cell that the wall clock is sitting in
 * (often the same, but they diverge when a user is peeking ahead/back).
 *
 * Rendered by the (cycle) route-group layout so it follows the user
 * across /planning/{picklist,estimation,joint}, /sprint, /sprint-close.
 */

type StageKey = "picklist" | "estimation" | "joint" | "sprint" | "close";

interface StageDef {
  key: StageKey;
  label: string;
  href: string;
  /** Maps `pathname.startsWith(matchPath)` to "this cell is active". */
  matchPath: string;
  /** Which CycleStage(s) (clock-derived) align with this UI cell. */
  clockStages: CycleStage[];
}

const STAGES: StageDef[] = [
  { key: "picklist",   label: "Picklist",   href: "/planning/picklist",   matchPath: "/planning/picklist",   clockStages: ["picklist"] },
  { key: "estimation", label: "Estimation", href: "/planning/estimation", matchPath: "/planning/estimation", clockStages: ["estimation"] },
  { key: "joint",      label: "Joint",      href: "/planning/joint",      matchPath: "/planning/joint",      clockStages: ["joint"] },
  { key: "sprint",     label: "Sprint",     href: "/sprint",              matchPath: "/sprint",              clockStages: ["active"] },
  { key: "close",      label: "Close",      href: "/sprint-close",        matchPath: "/sprint-close",        clockStages: ["post_active"] },
];

export function CycleBar() {
  const pathname = usePathname();
  const sprints = useAppStore((s) => s.sprints);
  const tickets = useAppStore((s) => s.tickets);

  // Anchor cycle to the planning sprint when one exists, otherwise to the
  // active sprint (we're past commit, the calendar drawn is for the
  // running sprint's planning week).
  const planningSprint = sprints.find((s) => s.state === "planning");
  const activeSprint = sprints.find((s) => s.state === "active");
  const anchor = planningSprint ?? activeSprint;
  const cycleSprintKey = anchor?.key ?? "—";

  if (!anchor) return null;

  const cal = calendarFor(anchor);
  const now = new Date();
  const clock = cycleStageNow(cal, now);

  // Counts that materialise inside each cell. These are the same
  // numbers the dedicated pages compute; centralising them here gives
  // the bar its operational read.
  const picklistPending = tickets.filter((t) => t.pickedForSprint && t.storyPoints == null).length;
  const estimationPending = tickets.filter((t) => t.pickedForSprint && t.storyPoints != null && t.assigneeId == null).length;
  const jointPending = tickets.filter(
    (t) =>
      t.pickedForSprint &&
      t.storyPoints != null &&
      t.assigneeId != null &&
      t.status === "backlog"
  ).length;
  const sprintInFlight = activeSprint
    ? tickets.filter((t) => t.sprintId === activeSprint.id && t.status !== "done" && t.status !== "verified" && t.status !== "cancelled").length
    : 0;
  const closeReady = activeSprint
    ? tickets.filter((t) => t.sprintId === activeSprint.id && (t.status === "done" || t.status === "verified")).length
    : 0;

  const COUNTS: Record<StageKey, { value: number; label: string }> = {
    picklist:   { value: picklistPending,   label: picklistPending === 1 ? "needs hand-off" : "need hand-off" },
    estimation: { value: estimationPending, label: estimationPending === 1 ? "needs estimate" : "need estimates" },
    joint:      { value: jointPending,      label: jointPending === 1 ? "to commit" : "to commit" },
    sprint:     { value: sprintInFlight,    label: "in flight" },
    close:      { value: closeReady,        label: "shipped" },
  };

  const TIMES: Record<StageKey, string> = {
    picklist:   `${weekday(cal.picklistStart)} ${time(cal.picklistStart)}`,
    estimation: `${weekday(cal.picklistDue)} ${time(cal.picklistDue)}`,
    joint:      `${weekday(cal.estimationDue)} ${time(cal.estimationDue)}`,
    sprint:     `${weekday(cal.sprintStart)} ${time(cal.sprintStart)}`,
    close:      "Sun 18:00",
  };

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          Cycle for {cycleSprintKey} · Now {weekday(now)} {time(now)}
        </div>
        <Link
          href="/planning"
          className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          Cycle overview →
        </Link>
      </div>
      <div className="flex items-stretch gap-2">
        {STAGES.map((s, i) => {
          const isActiveRoute = pathname.startsWith(s.matchPath);
          const isNowClock = s.clockStages.includes(clock);
          const isPast = STAGES.findIndex((x) => x.clockStages.includes(clock)) > i;
          const count = COUNTS[s.key];
          return (
            <Link
              key={s.key}
              href={s.href}
              className={cn(
                "flex-1 min-w-0 rounded-[6px] border px-3 py-2 transition-colors duration-100",
                isActiveRoute
                  ? "border-accent bg-accent-soft text-ink"
                  : isPast
                  ? "border-rule-soft bg-bg-elevated/40 text-ink-3 hover:text-ink hover:border-rule"
                  : "border-rule bg-bg-card text-ink-2 hover:border-ink-4"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                  {TIMES[s.key]}
                </span>
                {isNowClock && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-1 rounded-sm bg-accent text-bg-card">
                    Now
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("text-[13px] font-medium", isActiveRoute && "text-accent")}>
                  {s.label}
                </span>
                <span className="font-mono text-[11px] text-ink-3 tabular-nums">
                  {count.value}{" "}
                  <span className="text-ink-4">{count.label}</span>
                </span>
              </div>
            </Link>
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

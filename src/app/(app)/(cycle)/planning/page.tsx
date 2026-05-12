"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { calendarFor, cycleStageNow } from "@/lib/cycle";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

/**
 * /planning — between-cycles index.
 *
 * Most weekdays nobody is mid-ritual: the active sprint is just running.
 * This page is the calm summary surface for that gap. When a planning
 * window IS active, it routes the user toward the relevant stage in
 * one click (via the CycleBar that's always above this view).
 */
export default function PlanningIndexPage() {
  useDocumentTitle("Planning");

  const sprints = useAppStore((s) => s.sprints);
  const tickets = useAppStore((s) => s.tickets);

  const planning = sprints.find((s) => s.state === "planning");
  const active = sprints.find((s) => s.state === "active");
  const lastClosed = [...sprints].reverse().find((s) => s.state === "closed");

  const anchor = planning ?? active;
  if (!anchor) {
    return (
      <PageHeader
        eyebrow="Planning"
        title={
          <>
            No <em className="text-accent">sprint</em> in the pipe.
          </>
        }
        lede="Once a planning sprint is created, the cycle bar will guide you Picklist → Estimation → Joint → Sprint → Close."
      />
    );
  }

  const cal = calendarFor(anchor);
  const now = new Date();
  const clock = cycleStageNow(cal, now);
  const cycleActive = clock !== "pre_picklist" && clock !== "active" && clock !== "post_active";
  const nextPicklistMs = cal.picklistStart.getTime() - now.getTime();
  const nextPicklistDays = Math.max(0, Math.round(nextPicklistMs / (24 * 60 * 60 * 1000)));

  // Light operational counts for the "last cycle" + "this cycle so far" cards.
  const lastShipped = lastClosed?.shippedPoints ?? 0;
  const lastCommitted = lastClosed?.committedPoints ?? 0;
  const lastOnTime = lastCommitted > 0 ? Math.round((lastShipped / lastCommitted) * 100) : 0;

  const thisPicked = tickets.filter((t) => t.pickedForSprint).length;
  const thisEstimated = tickets.filter((t) => t.pickedForSprint && t.storyPoints != null).length;
  const thisAssigned = tickets.filter((t) => t.pickedForSprint && t.assigneeId != null).length;

  return (
    <div>
      <PageHeader
        eyebrow={`Planning · ${anchor.key}`}
        title={
          cycleActive ? (
            <>
              Cycle is <em className="text-accent">live</em>.
            </>
          ) : (
            <>
              Between <em className="text-accent">cycles</em>.
            </>
          )
        }
        lede={
          cycleActive
            ? "Use the bar above to jump to the stage that's yours. Counts on each cell update as work flows through."
            : `Next Picklist opens ${weekday(cal.picklistStart)} ${time(cal.picklistStart)} — ${nextPicklistDays === 0 ? "today" : nextPicklistDays === 1 ? "tomorrow" : `${nextPicklistDays} days from now`}.`
        }
      />

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card label="Last cycle" value={lastClosed?.key ?? "—"} sub={lastClosed ? `${lastShipped}/${lastCommitted} pts · ${lastOnTime}% on-time` : "no history"} />
        <Card
          label="This cycle so far"
          value={`${thisPicked} picks`}
          sub={`${thisEstimated} estimated · ${thisAssigned} assigned`}
        />
        <Card
          label="Next picklist"
          value={cycleActive ? "Now" : nextPicklistDays === 0 ? "Today" : nextPicklistDays === 1 ? "Tomorrow" : `${nextPicklistDays} days`}
          sub={`${weekday(cal.picklistStart)} ${time(cal.picklistStart)}`}
          accent={cycleActive ? "accent" : undefined}
        />
      </div>

      {/* Last cycle digest */}
      {lastClosed && (
        <section className="bg-bg-card border border-rule rounded-[8px] p-5 mb-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Closing read · {lastClosed.key}</div>
              <h3 className="display text-display-s text-ink mt-1">What the last cycle shipped</h3>
            </div>
            <Link
              href="/sprint-close"
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
            >
              Open Sprint Close →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 text-[13px]">
            <Stat label="Committed" value={`${lastCommitted} pts`} />
            <Stat label="Shipped" value={`${lastShipped} pts`} />
            <Stat label="Carry-over" value={`${Math.max(0, lastCommitted - lastShipped)} pts`} />
          </div>
        </section>
      )}

      {/* What's next in plain language */}
      <section className="bg-bg-card border border-rule rounded-[8px] p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">
          What happens next
        </div>
        <ol className="space-y-2 text-[13px] text-ink-2">
          <Step
            time={`${weekday(cal.picklistStart)} ${time(cal.picklistStart)}`}
            label="Picklist"
            body="PM, alone. ~30 min. Pick the tickets that matter, rank them, send the slice to Engineering."
            href="/planning/picklist"
          />
          <Step
            time={`${weekday(cal.picklistDue)} ${time(cal.picklistDue)}`}
            label="Estimation"
            body="Engineers + EM. ~45 min. Estimate story points. Flag concerns. Hand back."
            href="/planning/estimation"
          />
          <Step
            time={`${weekday(cal.estimationDue)} ${time(cal.estimationDue)}`}
            label="Joint Planning"
            body="Whole team. ~30 min. Assign tickets, watch capacity, commit the sprint."
            href="/planning/joint"
          />
          <Step
            time={`${weekday(cal.sprintStart)} ${time(cal.sprintStart)}`}
            label="Sprint runs"
            body="Engineers ship. PM watches the funnel. Bugs flow in, get triaged into the backlog."
            href="/sprint"
          />
          <Step
            time="Sun 18:00"
            label="Sprint Close"
            body="Retro. Carry-over. What we learned. Ready to do it again."
            href="/sprint-close"
          />
        </ol>
      </section>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "accent" }) {
  return (
    <div className={`bg-bg-card border ${accent ? "border-accent" : "border-rule"} rounded-[8px] p-4`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="display text-display-m text-ink mb-1">{value}</div>
      <div className="font-mono text-[11px] text-ink-3">{sub}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-elevated border border-rule rounded-[6px] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div className="font-mono text-[14px] text-ink mt-1">{value}</div>
    </div>
  );
}

function Step({ time, label, body, href }: { time: string; label: string; body: string; href: string }) {
  return (
    <li className="grid grid-cols-[120px_1fr_auto] gap-3 items-start py-2 border-b border-rule-soft last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 pt-0.5">{time}</span>
      <div>
        <div className="text-[13px] text-ink font-medium">{label}</div>
        <div className="text-[12px] text-ink-3 mt-0.5">{body}</div>
      </div>
      <Link
        href={href}
        className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep pt-0.5"
      >
        Open →
      </Link>
    </li>
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

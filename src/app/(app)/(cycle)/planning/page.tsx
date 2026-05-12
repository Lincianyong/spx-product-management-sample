"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { calendarFor, cycleStageNow } from "@/lib/cycle";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn, formatDate } from "@/lib/utils";

/**
 * /planning — index page above the cycle bar.
 *
 * Two cards stacked: a quick "what happens next" rolodex of the cycle's
 * five stages (each click-thru), and a history card listing the last
 * 10 closed sprints with their commit/ship/carry numbers.
 */
export default function PlanningIndexPage() {
  useDocumentTitle("Planning");

  const sprints = useAppStore((s) => s.sprints);

  const planning = sprints.find((s) => s.state === "planning");
  const active = sprints.find((s) => s.state === "active");
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

  // Most recent 10 closed sprints, newest first.
  const closed = [...sprints]
    .filter((s) => s.state === "closed")
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    .slice(0, 10);

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
            ? "Use the bar above to jump to the stage that's yours."
            : `Next Picklist opens ${weekday(cal.picklistStart)} ${time(cal.picklistStart)} — ${nextPicklistDays === 0 ? "today" : nextPicklistDays === 1 ? "tomorrow" : `${nextPicklistDays} days from now`}.`
        }
      />

      {/* What's next */}
      <section className="bg-bg-card border border-rule rounded-[8px] p-5 mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">
          What happens next
        </div>
        <ol className="space-y-2 text-[13px] text-ink-2">
          <Step time={`${weekday(cal.picklistStart)} ${time(cal.picklistStart)}`} label="Picklist" body="PM, alone. ~30 min. Pick the tickets that matter, rank them, send the slice to Engineering." href="/planning/picklist" />
          <Step time={`${weekday(cal.picklistDue)} ${time(cal.picklistDue)}`} label="Estimation" body="Engineers + EM. ~45 min. Estimate story points. Flag concerns. Hand back." href="/planning/estimation" />
          <Step time={`${weekday(cal.estimationDue)} ${time(cal.estimationDue)}`} label="Joint Planning" body="Whole team. ~30 min. Assign tickets, watch capacity, commit the sprint." href="/planning/joint" />
          <Step time={`${weekday(cal.sprintStart)} ${time(cal.sprintStart)}`} label="Sprint runs" body="Engineers ship. PM watches the funnel. Bugs flow in, get triaged into the backlog." href="/sprint" />
          <Step time="Sun 18:00" label="Sprint Close" body="Retro. Carry-over. What we learned. Ready to do it again." href="/sprint-close" />
        </ol>
      </section>

      {/* Sprint history — last 10 closed */}
      <section className="bg-bg-card border border-rule rounded-[8px] p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Sprint history</div>
            <h3 className="display text-display-s text-ink mt-1">Previous {closed.length} sprint{closed.length === 1 ? "" : "s"}</h3>
          </div>
          <Link
            href="/sprint-close"
            className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
          >
            Open Sprint Close →
          </Link>
        </div>
        {closed.length === 0 ? (
          <p className="italic text-[13px] text-ink-3 px-1 py-3">No closed sprints yet. The first one to wrap will appear here.</p>
        ) : (
          <div className="bg-bg-elevated border border-rule rounded-[6px] overflow-hidden">
            <div className="grid grid-cols-[100px_120px_100px_100px_100px_1fr] gap-3 px-4 py-2.5 bg-bg-elevated border-b border-rule font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <span>Sprint</span>
              <span>Ended</span>
              <span className="text-right">Committed</span>
              <span className="text-right">Shipped</span>
              <span className="text-right">On-time</span>
              <span>Burn</span>
            </div>
            {closed.map((s) => {
              const onTime = s.committedPoints > 0 ? Math.round((s.shippedPoints / s.committedPoints) * 100) : 0;
              const carry = Math.max(0, s.committedPoints - s.shippedPoints);
              const tint = onTime >= 95 ? "bg-ok" : onTime >= 75 ? "bg-warn" : "bg-danger";
              return (
                <div key={s.id} className="grid grid-cols-[100px_120px_100px_100px_100px_1fr] gap-3 px-4 py-2.5 border-b border-rule-soft last:border-b-0 items-center text-[13px] bg-bg-card">
                  <span className="font-mono text-ink">{s.key}</span>
                  <span className="font-mono text-[12px] text-ink-3">{formatDate(s.endDate)}</span>
                  <span className="font-mono text-ink-2 text-right tabular-nums">{s.committedPoints} pt</span>
                  <span className="font-mono text-ink-2 text-right tabular-nums">{s.shippedPoints} pt</span>
                  <span className={cn("font-mono text-right tabular-nums", onTime >= 95 ? "text-ok" : onTime >= 75 ? "text-warn" : "text-danger")}>{onTime}%</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-1.5 flex-1 bg-rule-soft rounded-full overflow-hidden">
                      <div className={cn("h-full", tint)} style={{ width: `${Math.min(onTime, 100)}%` }} />
                    </div>
                    {carry > 0 && (
                      <span className="font-mono text-[11px] text-ink-3 shrink-0">+{carry} carry</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
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

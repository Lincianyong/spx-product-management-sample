"use client";

import { cn } from "@/lib/utils";

/**
 * MockScreen — a styled "browser window" frame used by the guideline
 * pages to show a captioned, low-fidelity rendering of a real app
 * surface. We render mock UI inline (no real screenshots) so the
 * visuals stay in sync with the design tokens as they evolve.
 */
export function MockScreen({
  title,
  url,
  caption,
  children,
  className,
}: {
  title: string;
  url: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("not-prose", className)}>
      <div className="bg-bg-elevated border border-rule rounded-[10px] overflow-hidden shadow-md">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-3 h-9 border-b border-rule bg-bg-card">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-warn/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-ok/50" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="font-mono text-[11px] text-ink-3 bg-bg-elevated border border-rule-soft rounded-[5px] px-2.5 h-6 inline-flex items-center max-w-[420px] truncate">
              cadence.spx-express.com{url}
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 truncate max-w-[120px]">
            {title}
          </div>
        </div>
        {/* Body */}
        <div className="bg-bg p-4">
          {children}
        </div>
      </div>
      {caption && (
        <figcaption className="font-mono text-[11px] text-ink-3 mt-2 px-2 leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Tiny shared mock primitives ─────────────────────────────── */

export function MockSidebar({ activeIdx = 0 }: { activeIdx?: number }) {
  const groups: { title: string; items: string[] }[] = [
    { title: "Daily", items: ["My Work"] },
    { title: "Capture", items: ["Create", "My Tickets"] },
    { title: "Plan", items: ["Planning", "Sprint Board", "Sprint Close", "Backlog"] },
    { title: "Portfolio", items: ["Epic Board", "Timeline", "Portfolio Health"] },
  ];
  let i = 0;
  return (
    <aside className="w-40 shrink-0 bg-bg-elevated border-r border-rule p-2 space-y-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 px-1.5 mb-2">Cadence · PM</div>
      {groups.map((g) => (
        <div key={g.title}>
          <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-4 px-1.5 mb-1">{g.title}</div>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const isActive = i === activeIdx;
              i += 1;
              return (
                <li key={it} className={cn(
                  "px-1.5 h-5 rounded-[3px] text-[10px] flex items-center",
                  isActive ? "bg-accent-soft text-ink font-medium" : "text-ink-2"
                )}>
                  {it}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}

export function MockTopBar({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 h-7 border-b border-rule-soft bg-bg-card">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 flex-1 truncate">{label}</div>
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
    </div>
  );
}

export function MockCycleBar({ activeIdx = 1 }: { activeIdx?: number }) {
  const stages = ["Picklist", "Estimation", "Joint", "Sprint"];
  return (
    <div className="bg-bg-card border border-rule rounded-[6px] px-3 py-2 flex items-center gap-6">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3 shrink-0">Cycle for W21-2026</div>
      <div className="flex items-center gap-1.5 flex-1">
        {stages.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className="flex flex-col items-center min-w-0">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                i < activeIdx ? "bg-ok" : i === activeIdx ? "bg-accent ring-2 ring-accent-soft" : "bg-rule"
              )} />
              <span className="font-mono text-[8px] mt-0.5 text-ink-3">{s}</span>
            </div>
            {i < stages.length - 1 && (
              <span className={cn("flex-1 h-px", i < activeIdx ? "bg-ok" : "bg-rule")} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockChip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "ok" | "warn" | "danger" }) {
  return (
    <span className={cn(
      "font-mono text-[8px] uppercase tracking-[0.06em] px-1.5 h-4 inline-flex items-center rounded-[3px] border",
      tone === "accent" && "bg-accent-soft border-accent-soft text-accent-deep",
      tone === "ok" && "bg-ok/15 border-ok/40 text-ok",
      tone === "warn" && "bg-warn/15 border-warn/40 text-warn",
      tone === "danger" && "bg-danger/15 border-danger/40 text-danger",
      tone === "neutral" && "bg-bg-card border-rule text-ink-3",
    )}>
      {children}
    </span>
  );
}

export function MockTicketRow({
  k,
  title,
  pts,
  who,
  status = "neutral",
}: {
  k: string;
  title: string;
  pts: number;
  who: string;
  status?: "neutral" | "accent" | "ok" | "warn";
}) {
  return (
    <div className="bg-bg-card border border-rule-soft rounded-[5px] px-2 py-1.5 flex items-center gap-2">
      <span className="font-mono text-[9px] text-ink-3 w-14 shrink-0">{k}</span>
      <span className="text-[10px] text-ink truncate flex-1">{title}</span>
      <MockChip tone={status}>{status === "ok" ? "done" : status === "warn" ? "review" : status === "accent" ? "in-progress" : "scheduled"}</MockChip>
      <span className="font-mono text-[9px] text-ink-3 w-8 text-right shrink-0">{pts}pt</span>
      <span className="font-mono text-[9px] text-ink-3 w-10 text-right shrink-0">{who}</span>
    </div>
  );
}

/* ── Epic Board (kanban of epics) ────────────────────────────── */

const EPIC_BOARD_LANES: { lane: string; count: number; cards: [string, string, "ok" | "warn" | "danger" | "neutral", string][] }[] = [
  { lane: "Backlog",     count: 1, cards: [["OBS", "Eng observability baseline", "neutral", "not-started"]] },
  { lane: "In Progress", count: 4, cards: [
    ["CDN", "Forecasting retrain", "ok", "on-track"],
    ["RTE", "Ferry timetable", "warn", "at-risk"],
    ["MAD", "Madura ops dashboard", "ok", "on-track"],
    ["HUB", "Hub capacity signals", "ok", "on-track"],
  ] },
  { lane: "At Risk",     count: 1, cards: [["DRV", "Driver app reliability", "danger", "blocked"]] },
  { lane: "Shipped",     count: 0, cards: [] },
];

export function EpicBoardMock() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {EPIC_BOARD_LANES.map((lane) => (
        <div key={lane.lane} className="bg-bg rounded-[6px] border border-rule p-1.5 space-y-1 min-h-[120px]">
          <div className="px-1 mb-1 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{lane.lane}</span>
            <MockChip>{lane.count}</MockChip>
          </div>
          {lane.cards.map(([k, title, tone, healthLabel]) => (
            <div key={k} className="bg-bg-card border border-rule-soft rounded-[4px] p-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-mono text-[9px] text-ink-3">{k}</span>
                <MockChip tone={tone}>{healthLabel}</MockChip>
              </div>
              <div className="text-[10px] text-ink leading-tight">{title}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Timeline (epic gantt bars) ──────────────────────────────── */

const TIMELINE_EPICS: { key: string; title: string; start: number; end: number; tone: "ok" | "warn" | "danger" | "neutral" }[] = [
  // start/end are 0-based week indices over an 8-week window.
  { key: "CDN", title: "Forecasting retrain",      start: 0, end: 5, tone: "ok" },
  { key: "RTE", title: "Ferry timetable",          start: 1, end: 4, tone: "warn" },
  { key: "MAD", title: "Madura ops dashboard",     start: 2, end: 6, tone: "ok" },
  { key: "HUB", title: "Hub capacity signals",     start: 2, end: 7, tone: "ok" },
  { key: "DRV", title: "Driver app reliability",   start: 3, end: 8, tone: "danger" },
  { key: "OBS", title: "Eng observability baseline", start: 6, end: 8, tone: "neutral" },
];

export function TimelineMock({ todayWeek = 3 }: { todayWeek?: number }) {
  const weeks = 8;
  const pct = (n: number) => (n / weeks) * 100;
  return (
    <div className="bg-bg-card border border-rule rounded-[6px] p-2">
      {/* Week header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-32 shrink-0" />
        <div className="flex-1 flex">
          {Array.from({ length: weeks }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 text-center font-mono text-[9px] uppercase tracking-[0.14em]",
                i === todayWeek ? "text-accent" : "text-ink-3"
              )}
            >
              W{17 + i}
            </div>
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="space-y-1.5">
        {TIMELINE_EPICS.map((e) => (
          <div key={e.key} className="flex items-center gap-2">
            <div className="w-32 shrink-0 flex items-center gap-2">
              <span className="font-mono text-[9px] text-ink-3">{e.key}</span>
              <span className="text-[10px] text-ink truncate">{e.title}</span>
            </div>
            <div className="flex-1 relative h-4 bg-bg rounded-[3px]">
              {/* Today hairline lives inside the bar zone */}
              <div
                className="absolute top-0 bottom-0 w-px bg-accent z-10 pointer-events-none"
                style={{ left: `${pct(todayWeek + 0.5)}%` }}
                aria-hidden
              />
              <div
                className={cn(
                  "absolute top-0 bottom-0 rounded-[3px]",
                  e.tone === "ok" && "bg-ok/60",
                  e.tone === "warn" && "bg-warn/60",
                  e.tone === "danger" && "bg-danger/60",
                  e.tone === "neutral" && "bg-rule",
                )}
                style={{
                  left: `${pct(e.start)}%`,
                  width: `${pct(e.end - e.start)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[9px] text-ink-3 font-mono uppercase tracking-[0.14em]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-px bg-accent" /> today</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-ok/60 rounded-[2px]" /> on-track</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-warn/60 rounded-[2px]" /> at-risk</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-danger/60 rounded-[2px]" /> blocked</span>
      </div>
    </div>
  );
}

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

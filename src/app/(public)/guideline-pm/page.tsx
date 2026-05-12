"use client";

import Link from "next/link";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { MockScreen, MockChip, MockTicketRow, EpicBoardMock, TimelineMock } from "../MockScreen";

export default function GuidelinePmPage() {
  useDocumentTitle("Guideline · PM");

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">User guide · For PM</div>
        <h1 className="display text-display-l text-ink mb-3">
          The PM's <em className="text-accent">week</em>, in order.
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed max-w-2xl">
          What a Product Manager does on this surface, by surface. Each card below maps to a route in the app.
        </p>
      </header>

      <SurfaceCard
        eyebrow="Daily · /me"
        title="My Work — the dashboard for today."
        body="Mentions awaiting reply, status alerts (tickets stalled past their threshold), the live cycle scrubber for the planning sprint, and your assigned tickets. Open this first thing every morning."
        bullets={[
          "Cycle scrubber shows where the week is right now — Picklist, Estimation, Joint, or Sprint.",
          "Mentions card highlights @mentions you haven't replied to.",
          "Status alerts surface tickets stuck longer than the lane allows.",
        ]}
      />

      <SurfaceCard
        eyebrow="Capture · /create"
        title="Filing work."
        body="The Create page is the single funnel for new work. Pick a kind, fill the form, and the ticket lands in the right place."
        bullets={[
          "Bug: anyone files. Universal lane. Lands in Backlog.",
          "Epic: PM lane. Quarter altitude. Title + thesis + program(s).",
          "Engineering Ticket: PM lane. Acceptance criteria up front.",
          "Tech Task: PM or Eng. Carries blast radius + rollback fields.",
        ]}
      />

      <MockScreen
        title="Create · selector"
        url="/create"
        caption="Three creation lanes in one row — Bug · Epic · Engineering Ticket. Tech Task wraps to the next row."
        className="mb-8"
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Bug",                blurb: "Something broken. Repro / Expected / Actual.", lane: "Universal", prefix: "BUG-####" },
            { label: "Epic",               blurb: "Conviction-level bet. Quarter altitude.",       lane: "PM lane",   prefix: "EPC-####" },
            { label: "Engineering Ticket", blurb: "A unit of engineering work.",                   lane: "PM lane",   prefix: "CDN-####" },
          ].map((t) => (
            <div key={t.label} className="bg-bg-card border border-rule rounded-[6px] p-2.5 border-l-2 border-l-accent">
              <div className="flex items-center justify-between mb-1.5">
                <span className="w-3 h-3 rounded-full bg-accent-soft" />
                <MockChip>{t.lane}</MockChip>
              </div>
              <div className="text-[12px] text-ink font-medium mb-0.5">{t.label}</div>
              <div className="text-[10px] text-ink-3 leading-snug mb-2">{t.blurb}</div>
              <div className="font-mono text-[9px] text-ink-4">{t.prefix}</div>
            </div>
          ))}
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Plan · /planning/picklist"
        title="Picklist — Friday 09:00."
        body="Drag tickets into rank order. The slice you send is the slice engineers will estimate that afternoon."
        bullets={[
          "Drag the whole row (no grip-only handle).",
          "Rank 1 lands at the top of the sprint slice.",
          "Tickets without a parent epic are flagged before the slice is sent.",
        ]}
      />

      <MockScreen
        title="Picklist · drag to rank"
        url="/planning/picklist"
        caption="Drag any row by the row body itself. Numbers on the left are the picklist rank — top is highest priority."
        className="mb-8"
      >
        <div className="space-y-1">
          {[
            { rank: 1, k: "CDN-3504", title: "Drift detection on retrain pipeline", pts: 5 },
            { rank: 2, k: "CDN-3505", title: "Calibration layer after drift gate",   pts: 8 },
            { rank: 3, k: "BUG-4421", title: "Android 14 driver timestamps drift",   pts: 3 },
            { rank: 4, k: "RTE-891",  title: "Ferry timetable static loader",        pts: 5 },
            { rank: 5, k: "HUB-115",  title: "Hourly throughput rollups",            pts: 3 },
          ].map((t) => (
            <div key={t.k} className="bg-bg-card border border-rule-soft rounded-[5px] px-2 py-1.5 flex items-center gap-2 cursor-grab">
              <span className="font-mono text-[10px] text-ink-3 w-5 text-right shrink-0">{t.rank}</span>
              <span className="text-ink-4">⋮⋮</span>
              <span className="font-mono text-[10px] text-ink-3 w-16 shrink-0">{t.k}</span>
              <span className="text-[11px] text-ink truncate flex-1">{t.title}</span>
              <span className="font-mono text-[10px] text-ink-3 w-8 text-right shrink-0">{t.pts} pt</span>
            </div>
          ))}
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Plan · /planning/joint"
        title="Joint planning — Monday 10:00."
        body="The whole team. Assign tickets to engineers, watch capacity, commit the sprint. The sprint starts when you commit."
        bullets={[
          "Capacity bar per engineer turns red as you over-assign.",
          "Concern flags from estimation are shown inline.",
          "Commit button stays disabled until the slice fits.",
        ]}
      />

      <SurfaceCard
        eyebrow="Plan · /sprint"
        title="Sprint board — watch the funnel."
        body="During the sprint week the board is a kanban. You don't move cards (engineers do), but you watch for tickets stuck in Review, scope creep, and bugs entering during the week."
        bullets={[
          "Backlog · Scheduled · In Progress · Review · Done lanes.",
          "Drag is engineer-driven; PM is read-mostly here.",
          "Bugs filed mid-sprint show up in Backlog; you decide whether to pull them in.",
        ]}
      />

      <MockScreen
        title="Sprint board · kanban lanes"
        url="/sprint"
        caption="A typical mid-sprint snapshot. Most movement happens between In Progress and Review on Thursday/Friday."
        className="mb-8"
      >
        <div className="grid grid-cols-5 gap-2">
          {[
            { name: "Backlog",     tone: "neutral" as const, cards: [["BUG-4421", "Android timestamps", 3]] },
            { name: "Scheduled",   tone: "neutral" as const, cards: [["CDN-3505", "Calibration layer", 8]] },
            { name: "In Progress", tone: "accent" as const,  cards: [["CDN-3504", "Drift detection", 5], ["RTE-891", "Ferry loader", 5]] },
            { name: "Review",      tone: "warn" as const,    cards: [["HUB-104", "Throughput ingest", 5]] },
            { name: "Done",        tone: "ok" as const,      cards: [["DRV-200", "Reduce taps", 3]] },
          ].map((lane) => (
            <div key={lane.name} className="bg-bg rounded-[6px] border border-rule p-1.5 space-y-1">
              <div className="px-1 mb-1 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{lane.name}</span>
                <MockChip tone={lane.tone}>{lane.cards.length}</MockChip>
              </div>
              {lane.cards.map(([k, title, pts]) => (
                <div key={k as string} className="bg-bg-card border border-rule-soft rounded-[4px] p-1.5">
                  <div className="font-mono text-[9px] text-ink-3">{k as string}</div>
                  <div className="text-[10px] text-ink leading-tight mt-0.5">{title as string}</div>
                  <div className="font-mono text-[9px] text-ink-3 mt-1">{pts as number} pt</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Plan · /sprint-close"
        title="Retro — 15 minutes Monday morning."
        body="Sprint Close captures velocity automatically and shows what shipped vs what carried over. Pick a prior sprint with the dropdown to compare."
        bullets={[
          "Stats grid: Committed pts · Shipped pts · Completion % · Carry-over count.",
          "Shipped + Carry-over ticket columns make handoff explicit.",
          "Sprint selector switches between W19, W18, W17, and the in-flight sprint.",
        ]}
      />

      <MockScreen
        title="Sprint Close · velocity record"
        url="/sprint-close"
        caption="Stats roll up automatically from ticket status. The Velocity record card on the right is the canonical number written into the sprint history."
        className="mb-8"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Committed", v: "31 pts", tone: "accent" as const },
              { l: "Shipped",   v: "27 pts", tone: "ok" as const },
              { l: "Completion", v: "75%",   tone: "neutral" as const },
              { l: "Carry-over", v: "2 tickets", tone: "warn" as const },
            ].map((s) => (
              <div key={s.l} className="bg-bg-card border border-rule rounded-[5px] p-2 border-l-2 border-l-accent">
                <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">{s.l}</div>
                <div className="text-[14px] text-ink font-medium mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">Shipped · 6</div>
              <div className="space-y-1">
                <MockTicketRow k="RTE-852" title="Ferry timetable v1" pts={8} who="DA" status="ok" />
                <MockTicketRow k="MAD-310" title="Cutoff alert v1"    pts={5} who="SW" status="ok" />
                <MockTicketRow k="HUB-104" title="Throughput ingest"  pts={5} who="MR" status="ok" />
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-warn mb-1.5">Carry-over · 2</div>
              <div className="space-y-1">
                <MockTicketRow k="RTE-855" title="Reroute scoring"        pts={2} who="MR" status="warn" />
                <MockTicketRow k="BUG-4402" title="Stuck delivered state" pts={2} who="DA" status="warn" />
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">Velocity record</div>
              <div className="bg-bg-card border border-rule rounded-[5px] p-2 space-y-1.5">
                <Row label="Committed" value="31 pts" />
                <Row label="Shipped"   value="27 pts" />
                <Row label="Hit rate"  value="75%" />
              </div>
            </div>
          </div>
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Plan · /backlog"
        title="Backlog — the table of work waiting to be picked."
        body="A flat, searchable table of every Engineering ticket, Bug, and Tech Task that isn't yet in a sprint. This is where you groom: re-rank, change priority, retag programs, or kill stale items before Picklist on Friday."
        bullets={[
          "Use when: you want to see the full unscheduled queue across epics in one column.",
          "Reads at a glance: how deep the queue is, which programs are over-represented, what's been sitting longest.",
          "Filters: type · status · program multi-select · author. Search hits key, title, tags.",
        ]}
      />

      <MockScreen
        title="Backlog · groomable table"
        url="/backlog"
        caption="The PM's grooming surface. Rank, retag, or kill before Friday's Picklist so the slice you draft is already clean."
        className="mb-8"
      >
        <div className="space-y-1">
          <div className="grid grid-cols-[28px_70px_1fr_60px_80px_60px] gap-2 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 border-b border-rule">
            <span>#</span><span>Key</span><span>Title</span><span>Type</span><span>Priority</span><span>Age</span>
          </div>
          {[
            { n: 1, k: "CDN-3505", title: "Calibration layer after drift gate", type: "Eng",  pri: "P2", age: "8d", tone: "neutral" as const },
            { n: 2, k: "BUG-4421", title: "Android 14 driver timestamps drift", type: "Bug",  pri: "P0", age: "3d", tone: "danger" as const },
            { n: 3, k: "HUB-115",  title: "Hourly throughput rollups",          type: "Eng",  pri: "P1", age: "11d", tone: "warn" as const },
            { n: 4, k: "TCH-3920", title: "Upgrade router service to Go 1.23",  type: "Tech", pri: "P2", age: "5d", tone: "neutral" as const },
            { n: 5, k: "DRV-202",  title: "Offline-cache hit metrics",          type: "Eng",  pri: "P2", age: "14d", tone: "neutral" as const },
          ].map((r) => (
            <div key={r.k} className="grid grid-cols-[28px_70px_1fr_60px_80px_60px] gap-2 px-2 py-1.5 items-center bg-bg-card border border-rule-soft rounded-[4px]">
              <span className="font-mono text-[10px] text-ink-3">{r.n}</span>
              <span className="font-mono text-[10px] text-ink-3">{r.k}</span>
              <span className="text-[11px] text-ink truncate">{r.title}</span>
              <MockChip>{r.type}</MockChip>
              <MockChip tone={r.tone}>{r.pri}</MockChip>
              <span className="font-mono text-[10px] text-ink-3">{r.age}</span>
            </div>
          ))}
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Portfolio · /epics"
        title="Epic Board — the conviction kanban."
        body="A kanban of every epic in the workspace, lanes for each status. This is the room you walk into when leadership asks 'what's actually in flight?' — at the epic altitude, not the ticket altitude."
        bullets={[
          "Use when: you want one screen showing every bet currently funded.",
          "Reads at a glance: how many epics per lane, which are at-risk vs on-track (health pill on each card), which PMs own which.",
          "Drag is card-wide and supports row-wise reordering within a lane (priority within a status).",
          "Filter by quarter · program · pm-owner.",
        ]}
      />

      <MockScreen
        title="Epic Board · status lanes"
        url="/epics"
        caption="Each card is an Epic. Lane membership = status; health pill = on-track / at-risk / blocked."
        className="mb-8"
      >
        <EpicBoardMock />
      </MockScreen>

      <SurfaceCard
        eyebrow="Portfolio · /timeline"
        title="Timeline — when each epic actually lands."
        body="A horizontal Gantt-style view: epics on the Y axis, weeks on the X. Each bar runs from startDate to targetEndDate so you can see at a glance where work is bunched, which epics overlap, and where the quarter has slack."
        bullets={[
          "Use when: you want to forecast capacity by week — 'do we have anything shipping in W22?'",
          "Use when: scheduling a cross-team dependency — see if the upstream epic finishes before yours starts.",
          "Reads at a glance: quarter banding behind the bars, today's vertical hairline, hover-tooltip with health + PM.",
          "Clicking a bar opens the epic detail (/e/CDN).",
        ]}
      />

      <MockScreen
        title="Timeline · epics across the quarter"
        url="/timeline"
        caption="Hairline at 'today' helps spot epics that should already be in flight but haven't started, and epics that are running long."
        className="mb-8"
      >
        <TimelineMock />
      </MockScreen>

      <SurfaceCard
        eyebrow="Portfolio · /portfolio"
        title="Portfolio Health — the leadership read."
        body="One screen that answers 'how is the quarter going?'. Stat tiles at the top (in-flight epic count, at-risk count, programs covered) and the 'Allocation by program' bar chart for portfolio shape."
        bullets={[
          "Use when: prepping leadership review, weekly portfolio sync, or before a hiring/headcount conversation.",
          "Reads at a glance: program coverage (which programs are starved), at-risk concentration, health trend.",
        ]}
      />

      <div className="mt-6 flex items-center justify-between bg-bg-elevated border border-rule rounded-[8px] px-4 py-3">
        <span className="text-[13px] text-ink-3">Working alongside engineers?</span>
        <Link href="/guideline-eng" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
          Open the Engineer guide →
        </Link>
      </div>
    </div>
  );
}

function SurfaceCard({ eyebrow, title, body, bullets }: { eyebrow: string; title: string; body: string; bullets: string[] }) {
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5 mb-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">{eyebrow}</div>
      <h2 className="display text-display-s text-ink mb-2">{title}</h2>
      <p className="text-[13px] text-ink-2 leading-relaxed mb-3">{body}</p>
      <ul className="space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="text-[13px] text-ink-3 leading-relaxed pl-4 relative">
            <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-rule" />
            {b}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-ink-3">{label}</span>
      <span className="text-[11px] text-ink">{value}</span>
    </div>
  );
}

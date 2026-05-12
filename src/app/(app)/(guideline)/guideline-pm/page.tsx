"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function GuidelinePmPage() {
  useDocumentTitle("Guideline · PM");

  return (
    <div>
      <PageHeader
        eyebrow="Guideline · For PM"
        title={
          <>
            The PM's <em className="text-accent">week</em>, in order.
          </>
        }
        lede="What a Product Manager does on this surface, by surface. Each card below maps to a route in the sidebar."
      />

      <SurfaceCard
        eyebrow="Daily · /me"
        title="My Work — the dashboard for today."
        body="Mentions awaiting reply, status alerts (tickets stalled past their threshold), the live cycle scrubber for the planning sprint, and your assigned tickets. Open this first thing every morning."
        bullets={[
          "Cycle scrubber shows where the week is right now — Picklist, Estimation, Joint, or Sprint.",
          "Mentions card highlights @mentions you haven't replied to.",
          "Status alerts surface tickets stuck longer than the lane allows.",
        ]}
        href="/me"
      />

      <SurfaceCard
        eyebrow="Capture · /create · /my-tickets"
        title="Filing work."
        body="The Create page is the single funnel for new work. Pick a kind, fill the form, and the ticket lands in the right place. My Tickets is your authored history across all types — engineering, bugs, tech tasks — with search and program filter."
        bullets={[
          "Bug: anyone can file. Universal lane. Lands in Backlog.",
          "Epic: PM lane. Quarter altitude. Title + thesis + program(s).",
          "Engineering Ticket: PM lane. Acceptance criteria up front.",
          "Tech Task: PM or Eng lane. Carries blast radius + rollback fields.",
        ]}
        href="/create"
      />

      <SurfaceCard
        eyebrow="Plan · /planning"
        title="The three planning stages."
        body="Friday picklist, Friday estimation, Monday joint. The cycle bar at the top is your scrubber — each dot is a click."
        bullets={[
          "Picklist (Fri 09:00) — drag tickets into rank order. Send the slice to Engineering.",
          "Estimation (Fri 14:00) — engineers add story points; you watch for concern flags.",
          "Joint (Mon 10:00) — assign tickets to engineers, watch capacity, commit the sprint.",
        ]}
        href="/planning"
      />

      <SurfaceCard
        eyebrow="Plan · /sprint"
        title="Sprint board — watch the funnel."
        body="During the sprint week, the board is a five-lane kanban. You don't move cards (engineers do), but you watch for tickets stuck in Review, scope creep, and bugs entering during the week."
        bullets={[
          "Backlog · Scheduled · In Progress · Review · Done lanes.",
          "Drag is engineer-driven; PM is read-mostly on this surface.",
          "Bugs filed mid-sprint show up in Backlog; you decide whether to pull them in.",
        ]}
        href="/sprint"
      />

      <SurfaceCard
        eyebrow="Plan · /sprint-close"
        title="Retro — 15 minutes Monday morning."
        body="The Sprint Close page captures velocity automatically and shows what shipped vs what carried over. Pick a prior sprint with the dropdown to compare."
        bullets={[
          "Stats grid: Committed pts · Shipped pts · Completion % · Carry-over count.",
          "Shipped + Carry-over ticket columns make handoff explicit.",
          "Sprint selector switches between W19, W18, W17, and the in-flight sprint.",
        ]}
        href="/sprint-close"
      />

      <SurfaceCard
        eyebrow="Portfolio · /epics · /timeline · /portfolio"
        title="Epic Board · Timeline · Portfolio Health."
        body="The portfolio layer is where conviction-level work lives. Epic Board is a kanban of epics across status lanes. Timeline shows epic durations against the quarter. Portfolio Health rolls allocation up by program."
        bullets={[
          "Epic Board: card-wide drag, row-wise reordering supported.",
          "Timeline: bars for each epic; quarter banding behind.",
          "Portfolio Health: stat tiles + 'Allocation by program' bar chart.",
        ]}
        href="/portfolio"
      />

      <SurfaceCard
        eyebrow="AI assists you'll meet"
        title="Suggestions, with confidence."
        body="Cadence surfaces four kinds of AI hints. Every hint shows a confidence number and the reasoning; nothing is auto-applied."
        bullets={[
          "Parent suggestion — when filing a ticket, the most likely Epic is offered.",
          "Story-point suggestion — based on similar past tickets.",
          "Assignee fit — based on expertise tags + capacity.",
          "Duplicate detection — if your filing looks like an existing ticket.",
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

function SurfaceCard({ eyebrow, title, body, bullets, href }: { eyebrow: string; title: string; body: string; bullets: string[]; href?: string }) {
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5 mb-4">
      <div className="flex items-start justify-between mb-2 gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{eyebrow}</div>
        {href && (
          <Link href={href} className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep shrink-0">
            Open →
          </Link>
        )}
      </div>
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

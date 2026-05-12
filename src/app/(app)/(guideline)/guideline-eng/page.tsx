"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function GuidelineEngPage() {
  useDocumentTitle("Guideline · Engineer");

  return (
    <div>
      <PageHeader
        eyebrow="Guideline · For Engineer"
        title={
          <>
            What an <em className="text-accent">engineer</em> does on this surface.
          </>
        }
        lede="The day-to-day mechanics: estimation, sprint board lanes, status transitions, and the fields that matter on bugs and tech tasks."
      />

      <SurfaceCard
        eyebrow="Daily · /me"
        title="My Work — your queue, today."
        body="Tickets assigned to you, grouped by sprint state. The cycle scrubber at the top shows you when the next estimation or joint planning is."
        bullets={[
          "Active sprint tickets sorted by status (In Progress → Review → Scheduled).",
          "Mentions card surfaces @mentions where you're tagged.",
          "Personal rank lets you reorder your own queue without changing the sprint board.",
        ]}
        href="/me"
      />

      <SurfaceCard
        eyebrow="Plan · /planning/estimation"
        title="Estimation — story points on Friday."
        body="Engineers + EM. ~45 min. The picklist from earlier shows up here for sizing. Add story points, flag concerns, hand back."
        bullets={[
          "Add story points per ticket — the surface remembers AI-suggested values with confidence.",
          "Concern flags ('needs decomposition', 'unclear scope') are visible to the PM at Joint.",
          "Tickets you flag get pulled out of the sprint slice if they can't be resolved by Joint.",
        ]}
        href="/planning/estimation"
      />

      <SurfaceCard
        eyebrow="Plan · /sprint"
        title="Sprint board — your delivery surface."
        body="A five-lane kanban for the active sprint. You move cards as work progresses. Card-wide drag is supported (no grip-only handle)."
        bullets={[
          "Backlog → Scheduled → In Progress → Review → Done.",
          "Card-wide drag — grab anywhere on the card.",
          "Reorder within a lane to signal priority within your own queue.",
        ]}
        href="/sprint"
      />

      <SurfaceCard
        eyebrow="Status transitions"
        title="Which moves are legal."
        body="Cadence enforces a state machine on tickets so the board reflects reality. Some transitions require confirmation."
        bullets={[
          "scheduled → in_progress: start work; startedAt timestamp recorded.",
          "in_progress → review: ready for review; assignee can be re-routed.",
          "review → done/verified: PM or QA verifies; closedAt timestamp recorded.",
          "any → cancelled: requires a reason; surfaces in the retro carry-over.",
        ]}
      />

      <SurfaceCard
        eyebrow="Filing bugs"
        title="What a good bug carries."
        body="Bug is the universal lane — anyone files. The form enforces the fields that make reproduction fast."
        bullets={[
          "Repro steps — numbered, reproducible from a clean state.",
          "Expected vs Actual — two short paragraphs.",
          "Affected scope — which devices, regions, % of users.",
          "Severity (S1 · S2 · S3) — drives priority on the board.",
          "Sentry link if available — direct deep link to the trace.",
        ]}
        href="/create?type=bug"
      />

      <SurfaceCard
        eyebrow="Filing tech tasks"
        title="Tech debt with a reversal plan."
        body="Tech tasks are platform / infra / refactor work. They carry two extra fields the PM and EM read at Joint."
        bullets={[
          "Blast radius — what breaks if this goes sideways.",
          "Rollback plan — concrete steps to revert.",
          "Migration window — optional; for tasks needing a cutover.",
        ]}
        href="/create?type=tech-task"
      />

      <SurfaceCard
        eyebrow="Capture · /my-tickets"
        title="Your authored history."
        body="Every ticket you've authored — engineering, bug, tech task — in one searchable list."
        bullets={[
          "Search hits key, title, description, tags.",
          "Type and state filters are pinned to 180px each.",
          "Program multi-select on the second row filters by parent epic's programs.",
        ]}
        href="/my-tickets"
      />

      <SurfaceCard
        eyebrow="AI you'll see while filing"
        title="Suggestions, not decisions."
        body="When you file a ticket, four hints surface with a confidence number. You accept or override."
        bullets={[
          "Parent epic — the most likely Epic for this ticket.",
          "Story points — based on similar tickets you've shipped.",
          "Assignee — engineers whose expertise tags match.",
          "Duplicates — if a near-identical ticket already exists.",
        ]}
      />

      <div className="mt-6 flex items-center justify-between bg-bg-elevated border border-rule rounded-[8px] px-4 py-3">
        <span className="text-[13px] text-ink-3">Curious how PMs read the same surface?</span>
        <Link href="/guideline-pm" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
          Open the PM guide →
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

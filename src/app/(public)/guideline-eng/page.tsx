"use client";

import Link from "next/link";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { MockScreen, MockChip } from "../MockScreen";

export default function GuidelineEngPage() {
  useDocumentTitle("Guideline · Engineer");

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">User guide · For Engineer</div>
        <h1 className="display text-display-l text-ink mb-3">
          What an <em className="text-accent">engineer</em> does on this surface.
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed max-w-2xl">
          The day-to-day mechanics: estimation, sprint board lanes, status transitions, and the fields that matter on bugs and tech tasks.
        </p>
      </header>

      <SurfaceCard
        eyebrow="Daily · /me"
        title="My Work — your queue, today."
        body="Tickets assigned to you, grouped by sprint state. The cycle scrubber at the top shows you when the next estimation or joint planning is."
        bullets={[
          "Active sprint tickets sorted by status (In Progress → Review → Scheduled).",
          "Mentions card surfaces @mentions where you're tagged.",
          "Personal rank lets you reorder your own queue without changing the sprint board.",
        ]}
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
      />

      <MockScreen
        title="Estimation · sizing rows"
        url="/planning/estimation"
        caption="Each row is a ticket from the picklist. The AI hint sits next to your input — accept the suggested value or override."
        className="mb-8"
      >
        <div className="space-y-1.5">
          {[
            { k: "CDN-3504", title: "Drift detection on retrain pipeline", ai: 5, mine: 5, flag: null as string | null },
            { k: "CDN-3505", title: "Calibration layer after drift gate",   ai: 5, mine: 8, flag: "needs decomposition" },
            { k: "BUG-4421", title: "Android 14 driver timestamps drift",   ai: 3, mine: 3, flag: null },
            { k: "RTE-891",  title: "Ferry timetable static loader",        ai: 5, mine: 5, flag: null },
          ].map((row) => (
            <div key={row.k} className="bg-bg-card border border-rule rounded-[5px] p-2 flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-3 w-16 shrink-0">{row.k}</span>
              <span className="text-[11px] text-ink truncate flex-1">{row.title}</span>
              <MockChip tone="accent">AI · {row.ai}pt</MockChip>
              <div className="bg-bg-elevated border border-rule rounded-[4px] px-2 h-6 inline-flex items-center font-mono text-[10px] text-ink">
                {row.mine} pt
              </div>
              {row.flag && <MockChip tone="warn">{row.flag}</MockChip>}
            </div>
          ))}
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Plan · /sprint"
        title="Sprint board — your delivery surface."
        body="A five-lane kanban for the active sprint. You move cards as work progresses. Card-wide drag is supported (no grip-only handle)."
        bullets={[
          "Backlog → Scheduled → In Progress → Review → Done.",
          "Card-wide drag — grab anywhere on the card.",
          "Reorder within a lane to signal priority within your own queue.",
        ]}
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

      <MockScreen
        title="Status transitions"
        url="/sprint"
        caption="The legal moves between statuses. Cancelled is reachable from any state and prompts for a reason."
        className="mb-8"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {["scheduled", "in progress", "review", "done"].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="bg-bg-card border border-rule rounded-[5px] px-2.5 h-7 inline-flex items-center font-mono text-[10px] uppercase tracking-[0.06em] text-ink shrink-0">
                {s}
              </div>
              {i < arr.length - 1 && <span className="flex-1 h-px bg-rule" />}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-ink-3 flex items-center gap-2">
          <MockChip tone="danger">cancelled</MockChip>
          <span>reachable from any state · requires reason</span>
        </div>
      </MockScreen>

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
      />

      <MockScreen
        title="Bug form · key fields"
        url="/create?type=bug"
        caption="The repro + expected/actual + scope + severity quartet is what makes a bug actionable in under a minute."
        className="mb-8"
      >
        <div className="space-y-2">
          <FormRow label="Title" value="Android 14 driver timestamps drift by ~3 min" />
          <div className="grid grid-cols-2 gap-2">
            <FormRow label="Severity" value={<MockChip tone="danger">S1</MockChip>} />
            <FormRow label="Priority" value={<MockChip tone="warn">P0</MockChip>} />
          </div>
          <FormRow label="Repro steps" value="1. Install on Pixel 8 (A14)  2. Mark delivery complete  3. Compare clocks" />
          <FormRow label="Expected vs actual" value="Expected ±10s of server. Actual ~3 min ahead." />
          <FormRow label="Affected scope" value="All A14 devices, ~340 active drivers Jakarta region" />
          <FormRow label="Sentry" value={<span className="font-mono text-[10px] text-accent">sentry.io/issues/INST-12842</span>} />
        </div>
      </MockScreen>

      <SurfaceCard
        eyebrow="Filing tech tasks"
        title="Tech debt with a reversal plan."
        body="Tech tasks are platform / infra / refactor work. They carry two extra fields the PM and EM read at Joint."
        bullets={[
          "Blast radius — what breaks if this goes sideways.",
          "Rollback plan — concrete steps to revert.",
          "Migration window — optional; for tasks needing a cutover.",
        ]}
      />

      <SurfaceCard
        eyebrow="Capture · /my-tickets"
        title="Your authored history."
        body="Every ticket you've authored — engineering, bug, tech task — in one searchable list."
        bullets={[
          "Search hits key, title, description, tags.",
          "Type and state filters pinned to 180px each.",
          "Program multi-select on the second row filters by parent epic's programs.",
        ]}
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

function FormRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[5px] p-2">
      <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3 mb-1">{label}</div>
      <div className="text-[11px] text-ink leading-snug">{value}</div>
    </div>
  );
}

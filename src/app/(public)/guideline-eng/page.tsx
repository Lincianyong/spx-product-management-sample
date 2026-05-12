"use client";

import Link from "next/link";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { MockScreen, MockChip, EpicBoardMock, TimelineMock } from "../MockScreen";
import { GuidelineToc, type TocItem } from "../GuidelineToc";

const TOC: TocItem[] = [
  { id: "my-work",          label: "My Work",          group: "Daily" },
  { id: "estimation",       label: "Estimation",       group: "Plan" },
  { id: "estimation-mock",  label: "Estimation mock",  group: "Plan" },
  { id: "sprint-board",     label: "Sprint board",     group: "Plan" },
  { id: "transitions",      label: "Status transitions", group: "Plan" },
  { id: "transitions-mock", label: "Transitions mock", group: "Plan" },
  { id: "filing-bugs",      label: "Filing bugs",      group: "Capture" },
  { id: "bug-mock",         label: "Bug form mock",    group: "Capture" },
  { id: "filing-tech",      label: "Filing tech tasks", group: "Capture" },
  { id: "my-tickets",       label: "My Tickets",       group: "Capture" },
  { id: "backlog",          label: "Backlog",          group: "Plan" },
  { id: "epic-board",       label: "Epic Board",       group: "Portfolio" },
  { id: "epic-board-mock",  label: "Epic Board mock",  group: "Portfolio" },
  { id: "timeline",         label: "Timeline",         group: "Portfolio" },
  { id: "timeline-mock",    label: "Timeline mock",    group: "Portfolio" },
  { id: "uc-sprint-track",  label: "Sprint tracking",  group: "Use cases" },
  { id: "uc-project-track", label: "Project tracking", group: "Use cases" },
  { id: "uc-epic-context",  label: "Reading epic context", group: "Use cases" },
];

export default function GuidelineEngPage() {
  useDocumentTitle("Guideline · Engineer");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
      <GuidelineToc items={TOC} />
      <article className="min-w-0">
        <header className="mb-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">User guide · For Engineer</div>
          <h1 className="display text-display-l text-ink mb-3">
            What an <em className="text-accent">engineer</em> does on this surface.
          </h1>
          <p className="text-[15px] text-ink-2 leading-relaxed max-w-2xl">
            The day-to-day mechanics: estimation, sprint board lanes, status transitions, the fields that matter on bugs and tech tasks. Plus three use-case recipes for tracking your sprint, your project, and the parent epic that gives your work its &quot;why&quot;.
          </p>
        </header>

        <SurfaceCard
          id="my-work"
          eyebrow="Daily · /me"
          title="My Work - your queue, today."
          body="Tickets assigned to you, grouped by sprint state. The cycle scrubber at the top shows you when the next estimation or joint planning is."
          bullets={[
            "Active sprint tickets sorted by status (In Progress → Review → Scheduled).",
            "Mentions card surfaces @mentions where you're tagged.",
            "Personal rank lets you reorder your own queue without changing the sprint board.",
          ]}
        />

        <SurfaceCard
          id="estimation"
          eyebrow="Plan · /planning/estimation"
          title="Estimation - story points on Friday."
          body="Engineers + EM. ~45 min. The picklist from earlier shows up here for sizing. Add story points, flag concerns, hand back."
          bullets={[
            "Add story points per ticket - the input is yours, free-typed.",
            "Concern flags ('needs decomposition', 'unclear scope') are visible to the PM at Joint.",
            "Tickets you flag get pulled out of the sprint slice if they can't be resolved by Joint.",
          ]}
        />

        <MockScreen
          id="estimation-mock"
          title="Estimation · sizing rows"
          url="/planning/estimation"
          caption="Each row is a ticket from the picklist. Type a story-point value, flag concerns inline, hand back to the PM."
          className="mb-8 scroll-mt-20"
        >
          <div className="space-y-1.5">
            {[
              { k: "CDN-3504", title: "Drift detection on retrain pipeline", mine: 5, flag: null as string | null },
              { k: "CDN-3505", title: "Calibration layer after drift gate",   mine: 8, flag: "needs decomposition" },
              { k: "BUG-4421", title: "Android 14 driver timestamps drift",   mine: 3, flag: null },
              { k: "RTE-891",  title: "Ferry timetable static loader",        mine: 5, flag: null },
            ].map((row) => (
              <div key={row.k} className="bg-bg-card border border-rule rounded-[5px] p-2 flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-3 w-16 shrink-0">{row.k}</span>
                <span className="text-[11px] text-ink truncate flex-1">{row.title}</span>
                <div className="bg-bg-elevated border border-rule rounded-[4px] px-2 h-6 inline-flex items-center font-mono text-[10px] text-ink">
                  {row.mine} pt
                </div>
                {row.flag && <MockChip tone="warn">{row.flag}</MockChip>}
              </div>
            ))}
          </div>
        </MockScreen>

        <SurfaceCard
          id="sprint-board"
          eyebrow="Plan · /sprint"
          title="Sprint board - your delivery surface."
          body="A five-lane kanban for the active sprint. You move cards as work progresses. Card-wide drag is supported (no grip-only handle)."
          bullets={[
            "Backlog → Scheduled → In Progress → Review → Done.",
            "Card-wide drag - grab anywhere on the card.",
            "Reorder within a lane to signal priority within your own queue.",
          ]}
        />

        <SurfaceCard
          id="transitions"
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
          id="transitions-mock"
          title="Status transitions"
          url="/sprint"
          caption="The legal moves between statuses. Cancelled is reachable from any state and prompts for a reason."
          className="mb-8 scroll-mt-20"
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
          id="filing-bugs"
          eyebrow="Filing bugs"
          title="What a good bug carries."
          body="Bug is the universal lane - anyone files. The form enforces the fields that make reproduction fast."
          bullets={[
            "Repro steps - numbered, reproducible from a clean state.",
            "Expected vs Actual - two short paragraphs.",
            "Affected scope - which devices, regions, % of users.",
            "Severity (S1 · S2 · S3) - drives priority on the board.",
          ]}
        />

        <MockScreen
          id="bug-mock"
          title="Bug form · key fields"
          url="/create?type=bug"
          caption="The repro + expected/actual + scope + severity quartet is what makes a bug actionable in under a minute."
          className="mb-8 scroll-mt-20"
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
          </div>
        </MockScreen>

        <SurfaceCard
          id="filing-tech"
          eyebrow="Filing tech tasks"
          title="Tech debt with a reversal plan."
          body="Tech tasks are platform / infra / refactor work. They carry two extra fields the PM and EM read at Joint."
          bullets={[
            "Blast radius - what breaks if this goes sideways.",
            "Rollback plan - concrete steps to revert.",
            "Migration window - optional; for tasks needing a cutover.",
          ]}
        />

        <SurfaceCard
          id="my-tickets"
          eyebrow="Capture · /my-tickets"
          title="Your authored history."
          body="Every ticket you've authored - engineering, bug, tech task - in one searchable list."
          bullets={[
            "Search hits key, title, description, tags.",
            "Type and state filters pinned to 180px each.",
            "Program multi-select on the second row filters by parent epic's programs.",
          ]}
        />

        <SurfaceCard
          id="backlog"
          eyebrow="Plan · /backlog"
          title="Backlog - what's queued, next sprint and beyond."
          body="A flat table of every ticket that isn't yet in a sprint. As an engineer, this is your read-ahead - what's likely to land on your plate at the next Picklist, and which bugs are stacking up."
          bullets={[
            "Use when: you want a heads-up on what's getting picked Friday - read it earlier in the week so estimation isn't cold.",
            "Reads at a glance: which epics are queueing tickets, how many P0/P1 bugs are unscheduled, what's been sitting longest.",
            "Filters: type · status · program · author. Search hits key, title, tags.",
          ]}
        />

        <SurfaceCard
          id="epic-board"
          eyebrow="Portfolio · /epics"
          title="Epic Board - the parent context for your tickets."
          body="The kanban view of every Epic in the workspace. Engineers use it to find the parent of the ticket you're working on, read its thesis, and see sibling tickets under the same bet."
          bullets={[
            "Use when: you want a one-line answer to 'why are we doing this?' - open the Epic, read the thesis.",
            "Reads at a glance: which epics are at-risk or blocked (health pill) - useful if you're about to commit to a ticket under one.",
            "Click any card to drop into /e/CDN for thesis · linked tickets · timeline.",
          ]}
        />

        <MockScreen
          id="epic-board-mock"
          title="Epic Board · find the parent context"
          url="/epics"
          caption="Engineers usually open this from a ticket detail page via the parent epic chip - then read the thesis and the sibling tickets."
          className="mb-8 scroll-mt-20"
        >
          <EpicBoardMock />
        </MockScreen>

        <SurfaceCard
          id="timeline"
          eyebrow="Portfolio · /timeline"
          title="Timeline - when does this epic ship?"
          body="A horizontal Gantt of epics across the quarter. As an engineer, the timeline tells you whether your parent epic has slack or is already running long - and whether dependent epics will be ready when you need them."
          bullets={[
            "Use when: your ticket depends on another epic's output - read its bar to know if it'll land before your sprint slot.",
            "Use when: you want to argue for a tech task - show that the epic timeline has slack to absorb a refactor.",
            "Reads at a glance: 'today' tick, epic health colour on the bar (green / amber / red), overlap density per week.",
          ]}
        />

        <MockScreen
          id="timeline-mock"
          title="Timeline · the quarter at a glance"
          url="/timeline"
          caption="Bars run startDate → targetEndDate. The vertical accent line marks today; bars left of today should be in flight."
          className="mb-8 scroll-mt-20"
        >
          <TimelineMock />
        </MockScreen>

        <UseCase
          id="uc-sprint-track"
          eyebrow="Use case · Sprint tracking"
          title="Track your in-flight tickets through the week."
          steps={[
            { h: "Mon - read /me first", b: "Your queue groups by lane. Anything in 'Scheduled' is committed but not started; pull the top one into 'In Progress' as you begin." },
            { h: "Tue/Wed - move to Review", b: "When code is up for review, move the card to Review and tag the reviewer in a comment. The reviewer pings you back via @mention." },
            { h: "Thu - check status alerts", b: "On /me, the status alerts card highlights anything stuck in In Progress or Review past the lane threshold. Address before EOD Thursday." },
            { h: "Fri - close the loop", b: "Anything you can move to Done before close-of-business helps the team's hit rate. Anything you can't, drop a comment explaining why." },
            { h: "Mon next - retro", b: "Open /sprint-close, pick the sprint that just ended, and read the Carry-over column. If you carried something, expect to discuss it in the retro." },
          ]}
        />

        <UseCase
          id="uc-project-track"
          eyebrow="Use case · Project tracking"
          title="Stay oriented on the bet your tickets ladder up to."
          steps={[
            { h: "Open the ticket detail at /t/<KEY>", b: "The header carries the parent Epic chip - click it to land on /e/<KEY>." },
            { h: "On the Epic page", b: "Read the thesis. This is the conviction the project sits on; it's why your ticket exists." },
            { h: "Scan sibling tickets", b: "The Epic detail lists every linked ticket grouped by status. You can tell at a glance how much of the project is shipped, in-flight, or still in backlog." },
            { h: "Use /timeline to scope time", b: "Find the epic's bar on the timeline. If it ends in W22 and you're shipping in W21, you're inside the window. If it ends W19 and today is W21, the project is overrunning." },
            { h: "Use /backlog filtered by program", b: "Filter the backlog by the epic's program(s) to see what's queued under the same banner - including bugs that may be related." },
          ]}
        />

        <UseCase
          id="uc-epic-context"
          eyebrow="Use case · Reading epic context"
          title="Get to a thesis-level answer in under a minute."
          steps={[
            { h: "Open /epics", b: "All Epics in flight, lane by status, health pill on each. Find the one that owns your work." },
            { h: "Click the card", b: "Lands on /e/<KEY>. The thesis is the first thing you read - 2-4 sentences of conviction." },
            { h: "Read the activity feed", b: "Status notes from the PM (and EM) are timestamped. The most recent note is usually the freshest signal of where the bet stands." },
            { h: "Check the linked tickets", b: "Sorted by status. If the epic is healthy, the Done column should be longer than the In Progress column late in the quarter." },
            { h: "Watch the health pill change", b: "If an epic moves from on-track → at-risk while you have an in-flight ticket under it, your work just got more important. Mention it in standup." },
          ]}
        />

        <div className="mt-6 flex items-center justify-between bg-bg-elevated border border-rule rounded-[8px] px-4 py-3">
          <span className="text-[13px] text-ink-3">Curious how PMs read the same surface?</span>
          <Link href="/guideline-pm" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
            Open the PM guide →
          </Link>
        </div>
      </article>
    </div>
  );
}

function SurfaceCard({ id, eyebrow, title, body, bullets }: { id: string; eyebrow: string; title: string; body: string; bullets: string[] }) {
  return (
    <section id={id} className="bg-bg-card border border-rule rounded-[8px] p-5 mb-4 scroll-mt-20">
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

function UseCase({ id, eyebrow, title, steps }: { id: string; eyebrow: string; title: string; steps: { h: string; b: string }[] }) {
  return (
    <section id={id} className="bg-bg-card border border-rule rounded-[8px] p-5 mb-4 scroll-mt-20 border-l-4 border-l-accent">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent mb-2">{eyebrow}</div>
      <h2 className="display text-display-s text-ink mb-3">{title}</h2>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="grid grid-cols-[24px_1fr] gap-3 items-start">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-1">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div className="text-[13px] text-ink font-medium">{s.h}</div>
              <p className="text-[12px] text-ink-3 leading-relaxed mt-0.5">{s.b}</p>
            </div>
          </li>
        ))}
      </ol>
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

"use client";

import Link from "next/link";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import {
  MockScreen,
  MockSidebar,
  MockTopBar,
  MockCycleBar,
  MockTicketRow,
} from "../MockScreen";

export default function GuidelineOverviewPage() {
  useDocumentTitle("Guideline · Overview");

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">User guide · Overview</div>
        <h1 className="display text-display-l text-ink mb-3">
          How <em className="text-accent">Cadence</em> moves work.
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed max-w-2xl">
          Two roles, one weekly rhythm. A short read on what the surfaces do, the order they're used, and which guide to open next.
        </p>
      </header>

      <Section
        eyebrow="What it is"
        title="A weekly product cadence, not a tracker."
        body="Cadence is an editorial product-management surface for SPX Express AI Engineering. Work moves on a fixed weekly cycle — pick it Friday, estimate it Friday, commit it Monday, ship it Mon–Fri, retro Mon. The same data shows up where each role needs it; the rest stays out of the way."
      />

      <MockScreen
        title="Cadence · /me"
        url="/me"
        caption="The default landing surface for both roles. Sidebar on the left (collapsible to icons), the cycle scrubber at the top, and your queue below."
        className="mb-8"
      >
        <div className="flex bg-bg rounded-[6px] border border-rule overflow-hidden h-[260px]">
          <MockSidebar activeIdx={0} />
          <div className="flex-1 flex flex-col">
            <MockTopBar label="Search tickets, epics, actions… (⌘K)" />
            <div className="p-3 space-y-2.5 overflow-hidden">
              <MockCycleBar activeIdx={1} />
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-bg-card border border-rule rounded-[5px] p-2">
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">Today</div>
                  <div className="text-[12px] text-ink mt-0.5 font-medium">3 tickets in-progress</div>
                </div>
                <div className="bg-bg-card border border-rule rounded-[5px] p-2">
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">Mentions</div>
                  <div className="text-[12px] text-ink mt-0.5 font-medium">2 awaiting reply</div>
                </div>
                <div className="bg-bg-card border border-rule rounded-[5px] p-2">
                  <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-3">Carry-over</div>
                  <div className="text-[12px] text-ink mt-0.5 font-medium">2 tickets</div>
                </div>
              </div>
              <div className="space-y-1">
                <MockTicketRow k="CDN-3504" title="Drift detection on retrain pipeline" pts={5} who="AH" status="accent" />
                <MockTicketRow k="RTE-855"  title="Reroute scoring (pre-cutoff)"       pts={2} who="MR" status="warn" />
                <MockTicketRow k="HUB-104"  title="Hourly throughput ingest"            pts={5} who="MR" status="ok" />
              </div>
            </div>
          </div>
        </div>
      </MockScreen>

      <Section
        eyebrow="Roles"
        title="Two seats at the table."
      >
        <Cards>
          <Card title="Product Manager" body="Owns priority. Drafts the picklist, sets the bet, owns the retro. Reads the portfolio view to balance programs.">
            <Link href="/guideline-pm" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
              Read the PM guide →
            </Link>
          </Card>
          <Card title="Engineer" body="Owns delivery. Estimates story points, flags concerns, runs tickets through the sprint board, files bugs and tech tasks.">
            <Link href="/guideline-eng" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
              Read the Engineer guide →
            </Link>
          </Card>
        </Cards>
      </Section>

      <Section
        eyebrow="The cycle"
        title="Five touchpoints, fixed times."
        body="Each week walks the same path. The cycle bar on /planning shows you where you are right now."
      >
        <ol className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Step n={1} label="Picklist" when="Fri 09:00" who="PM" body="Rank the next slice. ~30 min." />
          <Step n={2} label="Estimation" when="Fri 14:00" who="Engineers + EM" body="Story-point the slice. ~45 min." />
          <Step n={3} label="Joint" when="Mon 10:00" who="Whole team" body="Assign, watch capacity, commit. ~30 min." />
          <Step n={4} label="Sprint" when="Mon → Fri" who="Engineers ship" body="PM watches the funnel, triages bugs." />
          <Step n={5} label="Close" when="Mon 18:00 (next)" who="Whole team" body="Retro · carry-over · velocity." />
        </ol>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-3">
          Note · times above are a tentative sample. The cadence is fixed (one cycle per week)
          but the exact day-of-week and time-of-day are flexible per team — set them at your
          first kickoff, not in code.
        </p>
      </Section>

      <MockScreen
        title="CycleBar · /planning"
        url="/planning"
        caption="The cycle scrubber. Past stages glow green, the current stage carries the accent ring, future stages stay muted."
        className="mb-8"
      >
        <div className="bg-bg-card border border-rule rounded-[6px] px-4 py-3 flex items-center gap-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">
            Cycle for W21-2026 · Now Tue 16:24
          </div>
          <div className="flex items-center gap-2 flex-1">
            {["Picklist", "Estimation", "Joint", "Sprint"].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center min-w-0">
                  <span className={
                    i < 2 ? "w-2 h-2 rounded-full bg-ok"
                    : i === 2 ? "w-2 h-2 rounded-full bg-accent ring-4 ring-accent-soft"
                    : "w-2 h-2 rounded-full bg-rule"
                  } />
                  <span className="font-mono text-[10px] mt-1 text-ink-3">{s}</span>
                </div>
                {i < 3 && (
                  <span className={i < 2 ? "flex-1 h-px bg-ok" : "flex-1 h-px bg-rule"} />
                )}
              </div>
            ))}
          </div>
        </div>
      </MockScreen>

      <Section
        eyebrow="Three altitudes"
        title="Epic · Project · Ticket."
      >
        <Cards>
          <Card title="Epic" body="Conviction-level bet. Quarter altitude. Title + thesis + PM owner. Lives on /epics and /timeline." />
          <Card title="Project" body="A unit of work under an epic — multiple tickets that share a single shippable outcome. Implicit; surfaces through linked tickets." />
          <Card title="Ticket" body="What actually gets done in a sprint. Engineering · Bug · Tech task. Lands in Backlog, gets picked, gets shipped." />
        </Cards>
      </Section>

      <Section
        eyebrow="Programs"
        title="Configurable axes the portfolio rolls up."
        body="Every Epic (and optionally each Ticket) is tagged with one or more programs. The Portfolio view bucket-sums epics by program so leadership can see allocation at a glance. The set below is the current sample configuration — programs are workspace-level and can be added, renamed, or retired without code changes."
      >
        <div className="flex flex-wrap gap-2 mb-1">
          {["LM", "FM", "Expansion", "BPOM", "CCTV", "FINOPS"].map((p) => (
            <span key={p} className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2 px-2.5 h-7 inline-flex items-center rounded-[4px] border border-rule bg-bg-card">
              {p}
            </span>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">Sample set · not a fixed enum</p>

        <MockScreen
          title="Portfolio · Allocation by program"
          url="/portfolio"
          caption="Each bar is the count of epics tagged with that program. An epic can sit in more than one program."
        >
          <div className="bg-bg-card border border-rule rounded-[6px] p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Allocation by program</div>
              <div className="font-mono text-[10px] text-ink-3">6 Epics</div>
            </div>
            <div className="space-y-1.5">
              {[
                ["LM", 4],
                ["FM", 2],
                ["Expansion", 2],
                ["BPOM", 2],
                ["CCTV", 2],
                ["FINOPS", 2],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-ink-3 w-16 shrink-0">{label}</span>
                  <div className="flex-1 h-4 bg-bg rounded-[3px] overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${((value as number) / 4) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-ink-2 w-5 text-right shrink-0">{value as number}</span>
                </div>
              ))}
            </div>
          </div>
        </MockScreen>
      </Section>

      <Section
        eyebrow="Where to read next"
        title="Pick the guide that matches your seat."
      >
        <Cards>
          <Card title="PM guide" body="Picklist mechanics, joint planning, portfolio reading, sprint close, capacity-aware commits.">
            <Link href="/guideline-pm" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
              Open /guideline-pm →
            </Link>
          </Card>
          <Card title="Engineer guide" body="Sprint board lanes, estimation behavior, bug fields, tech-task fields, status transitions.">
            <Link href="/guideline-eng" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
              Open /guideline-eng →
            </Link>
          </Card>
        </Cards>
      </Section>
    </div>
  );
}

function Section({ eyebrow, title, body, children }: { eyebrow: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5 mb-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{eyebrow}</div>
      <h2 className="display text-display-s text-ink mb-2">{title}</h2>
      {body && <p className="text-[13px] text-ink-2 leading-relaxed">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Cards({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Card({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="bg-bg-elevated border border-rule rounded-[6px] p-4 flex flex-col gap-2">
      <div className="text-[14px] text-ink font-medium">{title}</div>
      <p className="text-[13px] text-ink-3 leading-relaxed">{body}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

function Step({ n, label, when, who, body }: { n: number; label: string; when: string; who: string; body: string }) {
  return (
    <div className="bg-bg-elevated border border-rule rounded-[6px] p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{`Step ${n}`}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent">{when}</span>
      </div>
      <div className="text-[13px] text-ink font-medium mb-1">{label}</div>
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 mb-1.5">{who}</div>
      <p className="text-[12px] text-ink-3 leading-relaxed">{body}</p>
    </div>
  );
}

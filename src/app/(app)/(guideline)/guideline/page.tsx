"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function GuidelineOverviewPage() {
  useDocumentTitle("Guideline · Overview");

  return (
    <div>
      <PageHeader
        eyebrow="Guideline · Overview"
        title={
          <>
            How <em className="text-accent">Cadence</em> moves work.
          </>
        }
        lede="Two roles, one weekly rhythm. A short read on what the surfaces do, the order they're used, and which guide to open next."
      />

      <Section
        eyebrow="What it is"
        title="A weekly product cadence, not a tracker."
        body="Cadence is an editorial product-management surface for SPX Express AI Engineering. Work moves on a fixed weekly cycle — pick it Friday, estimate it Friday, commit it Monday, ship it Mon–Fri, retro Mon. The same data shows up where each role needs it; the rest stays out of the way."
      />

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
      </Section>

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
        title="Six axes the portfolio rolls up."
        body="Every Epic (and optionally each Ticket) is tagged with one or more programs. The Portfolio view bucket-sums epics by program so leadership can see allocation at a glance."
      >
        <div className="flex flex-wrap gap-2">
          {["LM", "FM", "Expansion", "BPOM", "CCTV", "FINOPS"].map((p) => (
            <span key={p} className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-2 px-2.5 h-7 inline-flex items-center rounded-[4px] border border-rule bg-bg-card">
              {p}
            </span>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="AI, as evidence"
        title="Never the author."
        body="Cadence shows AI hints — parent-epic suggestion, story-point suggestion, duplicate detection, assignee fit — with a confidence number and the reasoning. Humans accept or override; nothing is auto-applied."
      />

      <Section
        eyebrow="Where to read next"
        title="Pick the guide that matches your seat."
      >
        <Cards>
          <Card title="PM guide" body="Picklist mechanics, joint planning, portfolio reading, sprint close, AI assists you'll meet most often.">
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

"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill, HealthPill, Button, toast } from "@/components/ui";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { Markdown } from "@/components/Markdown";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import { computeProjectHealth } from "@/lib/health";

export default function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const projects = useAppStore((s) => s.projects);
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const [tab, setTab] = useState<"overview" | "tickets" | "backlog" | "timeline" | "activity">("overview");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const project = projects.find((p) => p.key === key);
  if (!project) {
    return (
      <div className="py-20 text-center">
        <h2 className="display text-display-s text-ink">Project not found.</h2>
        <Link href="/epics" className="text-accent hover:underline mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const epic = epics.find((e) => e.id === project.epicId);
  const pm = users.find((u) => u.id === project.pmPicId);
  const em = users.find((u) => u.id === project.emPicId);
  const projTickets = tickets.filter((t) => t.projectId === project.id);
  const signal = computeProjectHealth(project, tickets);
  const backlog = projTickets.filter((t) => t.status === "backlog");
  const inFlight = projTickets.filter((t) => t.status !== "backlog" && t.status !== "done" && t.status !== "verified" && t.status !== "triage");
  const done = projTickets.filter((t) => t.status === "done" || t.status === "verified");

  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 flex items-center gap-3 mb-3">
        <span className="block w-8 h-px bg-rule" />
        {epic && (
          <>
            <Link href={`/e/${epic.key}`} className="hover:text-ink">{epic.key}</Link>
            <span>›</span>
          </>
        )}
        <span className="text-ink">{project.key}</span>
      </div>

      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <HealthPill h={signal.health} reason={signal.reason} />
            <Pill variant="default">{statusLabel[(project.status as unknown as "in_progress" | "backlog") === "in_progress" ? "in_progress" : "backlog"]}</Pill>
            <Pill variant="neutral">{project.pod}</Pill>
          </div>
          <h1 className="display text-display-l text-ink leading-[1.05]">{project.title}</h1>
          <div className="font-body text-body-l text-ink-2 mt-4">
            <Markdown source={project.description} />
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast(`Link copied — ${project.key}`); }}>
          Copy link
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="PM" value={<span className="flex items-center gap-2"><Avatar user={pm} size="xs" /><span>{pm?.displayName}</span></span>} />
        <Stat label="EM" value={<span className="flex items-center gap-2"><Avatar user={em} size="xs" /><span>{em?.displayName}</span></span>} />
        <Stat label="Done" value={`${done.length} / ${projTickets.length}`} />
        <Stat label="Target end" value={formatDate(project.targetEndDate)} />
      </div>

      <div className="flex border-b border-rule mb-6">
        {(["overview", "tickets", "backlog", "timeline", "activity"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 h-10 text-[13px] font-mono uppercase tracking-[0.06em] transition-colors duration-100 border-b-2 -mb-px",
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <Block title="In flight" count={inFlight.length}>
            <div className="grid grid-cols-3 gap-3">
              {inFlight.map((t) => <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />)}
              {inFlight.length === 0 && <p className="text-[13px] italic text-ink-3 col-span-3">Nothing in motion.</p>}
            </div>
          </Block>
          <Block title="Recently done" count={done.length}>
            <div className="grid grid-cols-3 gap-3">
              {done.slice(0, 6).map((t) => <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />)}
            </div>
          </Block>
        </div>
      )}

      {tab === "tickets" && (
        <div className="grid grid-cols-3 gap-3">
          {projTickets.map((t) => <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />)}
        </div>
      )}

      {tab === "backlog" && (
        <div className="grid grid-cols-3 gap-3">
          {backlog.map((t) => <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />)}
          {backlog.length === 0 && <p className="text-[13px] italic text-ink-3 col-span-3">Backlog is dry. Add work to keep the engine fed.</p>}
        </div>
      )}

      {tab === "timeline" && (
        <p className="text-[13px] text-ink-3 italic">Per-ticket Gantt for this Project. Roadmap-grade view, V2.</p>
      )}

      {tab === "activity" && (
        <p className="text-[13px] text-ink-3 italic">Per-Project audit history — V2.</p>
      )}

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="text-[14px] text-ink">{value}</div>
    </div>
  );
}

function Block({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="display text-display-s text-ink">{title}</h3>
        <span className="font-mono text-[11px] text-ink-3">{count}</span>
      </div>
      {children}
    </section>
  );
}

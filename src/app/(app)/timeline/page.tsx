"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import {
  Avatar,
  Pill,
  PriorityPill,
  TypePill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Sprint, Ticket, TicketStatus } from "@/lib/types";

const DAY_MS = 86400000;
const HOUR_PX = 6; // ~144 px per day - sprint-week is ~1000 px wide
const LABEL_W = 320;
const ROW_H = 32;

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-3">Loading…</div>}>
      <TimelineInner />
    </Suspense>
  );
}

function TimelineInner() {
  useDocumentTitle("Sprint Timeline");
  const sprints = useAppStore((s) => s.sprints);
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);

  const activeSprint = sprints.find((s) => s.state === "active");
  const planningSprint = sprints.find((s) => s.state === "planning");
  const defaultId = activeSprint?.id ?? planningSprint?.id ?? sprints[0]?.id ?? "";
  const [sprintId, setSprintId] = useState<string>(defaultId);
  const sprint = sprints.find((s) => s.id === sprintId);

  const [filter, setFilter] = useState<"all" | "pod" | "me">("all");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sprintTickets = useMemo(() => {
    if (!sprint) return [] as Ticket[];
    const list = tickets.filter((t) => t.sprintId === sprint.id);
    // Sort by group (project) then by start.
    return [...list].sort((a, b) => {
      const pa = a.epicId ?? "~ad-hoc";
      const pb = b.epicId ?? "~ad-hoc";
      if (pa !== pb) return pa.localeCompare(pb);
      const aStart = new Date(a.startedAt ?? a.createdAt).getTime();
      const bStart = new Date(b.startedAt ?? b.createdAt).getTime();
      return aStart - bStart;
    });
  }, [tickets, sprint]);

  if (!sprint) {
    return (
      <EmptyState
        title="No sprint to time-line."
        body="Pick a committed sprint to see its tickets laid out day-by-day."
      />
    );
  }

  const groupedByProject = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const t of sprintTickets) {
      const k = t.epicId ?? "__adhoc__";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()];
  }, [sprintTickets]);

  return (
    <div>
      <PageHeader
        eyebrow={`S-15 · Sprint Timeline · ${sprint.key}`}
        title={
          <>
            How the <em className="text-accent">sprint</em> spends its days.
          </>
        }
        lede={`${sprintTickets.length} tickets in ${sprint.key} · grouped by project · bars are started → closed (or scheduled window for not-yet-in-flight tickets).`}
        actions={
          <div className="flex items-center gap-2">
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger size="sm" className="w-48 font-mono uppercase tracking-[0.06em]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.key} · {s.state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
            <FilterChip active={filter === "me"} onClick={() => setFilter("me")}>Me</FilterChip>
          </div>
        }
      />

      <SprintTicketGantt
        sprint={sprint}
        groups={groupedByProject}
        onOpen={setOpenKey}
      />

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 h-8 rounded-[6px] text-[12px] font-mono uppercase tracking-[0.06em] border transition-colors duration-100",
        active ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
      )}
    >
      {children}
    </button>
  );
}

function SprintTicketGantt({
  sprint,
  groups,
  onOpen,
}: {
  sprint: Sprint;
  groups: [string, Ticket[]][];
  onOpen: (k: string) => void;
}) {
  const projects = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);

  const sprintStart = new Date(sprint.startDate + "T00:00:00").getTime();
  const sprintEnd = new Date(sprint.endDate + "T23:59:59").getTime();
  const days = Math.max(1, Math.round((sprintEnd - sprintStart) / DAY_MS) + 1);
  const dayPx = 24 * HOUR_PX;
  const laneWidth = days * dayPx;
  const dateToPx = (ms: number) => {
    const clamped = Math.max(sprintStart, Math.min(sprintEnd, ms));
    return Math.round(((clamped - sprintStart) / DAY_MS) * dayPx);
  };

  const today = Date.now();
  const todayInRange = today >= sprintStart && today <= sprintEnd;
  const todayPx = dateToPx(today);

  // Day ticks
  const dayTicks: { date: Date; label: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(sprintStart + i * DAY_MS);
    dayTicks.push({ date: d, label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }) });
  }

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ width: LABEL_W + laneWidth }} className="relative">
          {/* Header */}
          <div className="flex border-b border-rule bg-bg-elevated">
            <div
              style={{ width: LABEL_W }}
              className="shrink-0 sticky left-0 z-20 bg-bg-elevated h-10 border-r border-rule flex items-end px-4 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
            >
              Ticket
            </div>
            <div style={{ width: laneWidth }} className="relative h-10">
              {dayTicks.map((tk, i) => {
                const px = dateToPx(tk.date.getTime());
                const isWeekend = tk.date.getDay() === 0 || tk.date.getDay() === 6;
                return (
                  <div
                    key={i}
                    style={{ left: px, width: dayPx }}
                    className={cn(
                      "absolute top-0 bottom-0 border-l border-rule-soft px-1.5 pt-2",
                      isWeekend && "bg-bg-elevated/50"
                    )}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {tk.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {todayInRange && (
              <div
                className="absolute top-0 bottom-0 border-l-2 border-warn pointer-events-none z-10"
                style={{ left: LABEL_W + todayPx }}
              >
                <span className="absolute -top-0.5 left-1 font-mono text-[9px] uppercase tracking-[0.14em] text-warn bg-bg-card px-1 rounded-sm">
                  Today
                </span>
              </div>
            )}
            {groups.length === 0 && (
              <p className="px-6 py-12 text-center italic text-[13px] text-ink-3">
                No tickets committed to this sprint yet.
              </p>
            )}
            {groups.map(([projectId, ts]) => {
              const project = projects.find((p) => p.id === projectId);
              return (
                <div key={projectId}>
                  <div className="flex items-center bg-bg-elevated/40 border-b border-rule-soft" style={{ height: 28 }}>
                    <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-10 bg-bg-elevated/80 border-r border-rule h-full px-4 flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        {project ? project.key : "Ad-hoc"}
                      </span>
                      <span className="text-[12px] text-ink-2 truncate">{project?.title ?? "no parent"}</span>
                      <span className="font-mono text-[10px] text-ink-4 ml-auto">{ts.length}</span>
                    </div>
                    <div className="flex-1" />
                  </div>
                  {ts.map((t) => (
                    <SprintTicketRow
                      key={t.id}
                      ticket={t}
                      sprintStart={sprintStart}
                      sprintEnd={sprintEnd}
                      laneWidth={laneWidth}
                      dateToPx={dateToPx}
                      users={users}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex border-t border-rule-soft bg-bg-elevated/40">
            <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-10 bg-bg-elevated h-7 border-r border-rule" />
            <div
              className="flex justify-between items-center px-3 h-7 font-mono text-[11px] text-ink-3"
              style={{ width: laneWidth }}
            >
              <span>{formatDate(sprint.startDate)}</span>
              <span>{formatDate(sprint.endDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SprintTicketRow({
  ticket,
  sprintStart,
  sprintEnd,
  laneWidth,
  dateToPx,
  users,
  onOpen,
}: {
  ticket: Ticket;
  sprintStart: number;
  sprintEnd: number;
  laneWidth: number;
  dateToPx: (ms: number) => number;
  users: import("@/lib/types").User[];
  onOpen: (k: string) => void;
}) {
  const startedMs = ticket.startedAt ? new Date(ticket.startedAt).getTime() : sprintStart;
  const closedMs = ticket.closedAt ? new Date(ticket.closedAt).getTime() : (ticket.status === "scheduled" ? sprintStart + DAY_MS : Date.now());
  const left = dateToPx(Math.max(sprintStart, startedMs));
  const width = Math.max(20, dateToPx(Math.min(sprintEnd, closedMs)) - dateToPx(Math.max(sprintStart, startedMs)));
  const assignee = users.find((u) => u.id === ticket.assigneeId);
  return (
    <div className="flex items-center border-b border-rule-soft" style={{ height: ROW_H }}>
      <button
        type="button"
        onClick={() => onOpen(ticket.key)}
        style={{ width: LABEL_W }}
        className="shrink-0 sticky left-0 z-10 bg-bg-card border-r border-rule h-full px-4 text-left flex items-center gap-2"
      >
        <TypePill t={ticket.type} />
        <PriorityPill p={ticket.priority} />
        <span className="font-mono text-[11px] text-ink-3 shrink-0">{ticket.key}</span>
        <span className="text-[13px] text-ink truncate flex-1 hover:text-accent">{ticket.title}</span>
        <Avatar user={assignee} size="xs" />
      </button>
      <div className="relative h-full" style={{ width: laneWidth }}>
        <button
          type="button"
          onClick={() => onOpen(ticket.key)}
          className={cn(
            "absolute top-1.5 bottom-1.5 rounded-[4px] flex items-center px-2 transition-shadow duration-100 hover:brightness-110",
            statusBg(ticket.status),
            ticket.status === "scheduled" && "opacity-50"
          )}
          style={{ left, width }}
          title={`${ticket.key} · ${statusLabel[ticket.status]} · ${formatDate(ticket.startedAt ?? ticket.createdAt)} → ${ticket.closedAt ? formatDate(ticket.closedAt) : "ongoing"}`}
        >
          <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em] truncate">
            {statusLabel[ticket.status]}{ticket.storyPoints ? ` · ${ticket.storyPoints}pt` : ""}
          </span>
        </button>
      </div>
    </div>
  );
}

function statusBg(s: TicketStatus): string {
  if (s === "done" || s === "verified") return "bg-ok";
  if (s === "in_progress") return "bg-accent";
  if (s === "review" || s === "verifying") return "bg-info";
  if (s === "cancelled" || s === "cannot_reproduce") return "bg-danger";
  return "bg-neutral";
}

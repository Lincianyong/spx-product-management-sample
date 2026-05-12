"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { HealthPill, PriorityPill, TypePill } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Epic, Ticket, TicketStatus } from "@/lib/types";

const DAY_MS = 86400000;
const LABEL_W = 280;
const ROW_H = 32;
const TICKET_ROW_H = 24;
const PX_PER_DAY = 6; // month-density default

function isoToMs(iso: string): number { return new Date(iso).getTime(); }

/**
 * Epic-Level Timeline — Epic Board's "timeline" view.
 *
 * One row per Epic with its quarter-spanning bar. A chevron expands the
 * row to show the child projects + their tickets as nested mini-bars so
 * the user can drill from "the whole portfolio at one altitude" down to
 * "which tickets are inside this epic" without leaving the board.
 */
export function EpicLevelTimeline({
  epics,
  onOpenEpic,
}: {
  epics: Epic[];
  onOpenEpic: (k: string) => void;
}) {
  const projects = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { start, end } = useMemo(() => {
    if (epics.length === 0) {
      const today = Date.now();
      return { start: today, end: today + 90 * DAY_MS };
    }
    const allDates = epics.flatMap((e) => [isoToMs(e.startDate), isoToMs(e.targetEndDate)]);
    return { start: Math.min(...allDates), end: Math.max(...allDates) };
  }, [epics]);

  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const laneWidth = Math.max(640, totalDays * PX_PER_DAY);
  const dateToPx = (ms: number) => Math.round(((ms - start) / DAY_MS) * PX_PER_DAY);
  const today = Date.now();
  const todayPx = dateToPx(today);
  const todayInRange = today >= start && today <= end;

  const ticks = useMemo(() => {
    const arr: { date: Date; label: string }[] = [];
    const d = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
    while (d.getTime() <= end) {
      arr.push({ date: new Date(d), label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) });
      d.setMonth(d.getMonth() + 1);
    }
    return arr;
  }, [start, end]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (expanded.size === epics.length) setExpanded(new Set());
    else setExpanded(new Set(epics.map((e) => e.id)));
  };

  if (epics.length === 0) {
    return (
      <div className="bg-bg-card border border-rule rounded-[8px] py-16 text-center text-[13px] italic text-ink-3">
        No epics in scope.
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ width: LABEL_W + laneWidth }} className="relative">
          {/* Header */}
          <div className="flex border-b border-rule bg-bg-elevated">
            <div
              style={{ width: LABEL_W }}
              className="shrink-0 sticky left-0 z-20 bg-bg-elevated h-9 border-r border-rule flex items-center px-4 gap-2"
            >
              <button
                onClick={toggleAll}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink"
                title={expanded.size === epics.length ? "Collapse all" : "Expand all"}
              >
                Epic
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-4 ml-auto">
                {expanded.size}/{epics.length} open
              </span>
            </div>
            <div style={{ width: laneWidth }} className="relative h-9">
              {ticks.map((tk, i) => {
                const px = dateToPx(tk.date.getTime());
                return (
                  <span
                    key={i}
                    style={{ left: px }}
                    className="absolute top-0 bottom-0 border-l border-rule-soft pl-1 pt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3"
                  >
                    {tk.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Rows */}
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
            {epics.map((e) => (
              <EpicRow
                key={e.id}
                epic={e}
                expanded={expanded.has(e.id)}
                onToggle={() => toggle(e.id)}
                onOpenEpic={onOpenEpic}
                tickets={tickets.filter((t) => t.epicId === e.id)}
                start={start}
                laneWidth={laneWidth}
                dateToPx={dateToPx}
              />
            ))}
          </div>

          {/* Footer dates */}
          <div className="flex border-t border-rule-soft bg-bg-elevated/40">
            <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-10 bg-bg-elevated h-7 border-r border-rule" />
            <div
              className="flex justify-between items-center px-3 h-7 font-mono text-[11px] text-ink-3"
              style={{ width: laneWidth }}
            >
              <span>{formatDate(new Date(start).toISOString())}</span>
              <span>{formatDate(new Date(end).toISOString())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpicRow({
  epic,
  expanded,
  onToggle,
  onOpenEpic,
  tickets,
  laneWidth,
  dateToPx,
}: {
  epic: Epic;
  expanded: boolean;
  onToggle: () => void;
  onOpenEpic: (k: string) => void;
  tickets: Ticket[];
  start: number;
  laneWidth: number;
  dateToPx: (ms: number) => number;
}) {
  const epicStartPx = dateToPx(isoToMs(epic.startDate));
  const epicEndPx = dateToPx(isoToMs(epic.targetEndDate));
  const left = Math.max(0, epicStartPx);
  const width = Math.max(20, epicEndPx - epicStartPx);
  const ticketsInEpic = tickets;

  return (
    <>
      <div className="flex items-center border-b border-rule-soft" style={{ height: ROW_H }}>
        <div
          style={{ width: LABEL_W }}
          className="shrink-0 sticky left-0 z-10 bg-bg-card border-r border-rule h-full flex items-center gap-2 px-3"
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="inline-flex items-center justify-center w-5 h-5 rounded-[4px] text-ink-3 hover:text-ink hover:bg-rule-soft shrink-0"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <HealthPill h={epic.health} />
          <button
            type="button"
            onClick={() => onOpenEpic(epic.key)}
            className="text-left flex-1 min-w-0 flex items-center gap-1.5"
          >
            <span className="font-mono text-[11px] text-ink-3 shrink-0">{epic.key}</span>
            <span className="text-[13px] text-ink truncate hover:text-accent">{epic.title}</span>
          </button>
        </div>
        <div className="relative h-full" style={{ width: laneWidth }}>
          <button
            type="button"
            onClick={() => onOpenEpic(epic.key)}
            className={cn(
              "absolute top-1.5 bottom-1.5 rounded-[4px] flex items-center px-2 cursor-pointer transition-shadow duration-100 hover:brightness-110",
              healthBg(epic.health)
            )}
            style={{ left, width }}
            title={`${epic.key} · ${formatDate(epic.startDate)} → ${formatDate(epic.targetEndDate)}`}
          >
            <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em] truncate">
              {epic.quarter} · {ticketsInEpic.length} tickets
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {ticketsInEpic.length === 0 ? (
            <div className="flex items-center border-b border-rule-soft bg-bg-elevated/30" style={{ height: TICKET_ROW_H }}>
              <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 bg-bg-elevated/30 border-r border-rule pl-10 pr-3 italic text-[12px] text-ink-4">
                No tickets yet.
              </div>
              <div className="flex-1" style={{ width: laneWidth }} />
            </div>
          ) : (
            ticketsInEpic.map((t) => (
              <TicketRow key={t.id} ticket={t} laneWidth={laneWidth} dateToPx={dateToPx} />
            ))
          )}
        </>
      )}
    </>
  );
}

function TicketRow({
  ticket,
  laneWidth,
  dateToPx,
}: {
  ticket: Ticket;
  laneWidth: number;
  dateToPx: (ms: number) => number;
}) {
  // Best-effort window for a ticket: started/closed if known, otherwise
  // created → today (in-flight) or created → closed.
  const startedMs = ticket.startedAt ? isoToMs(ticket.startedAt) : isoToMs(ticket.createdAt);
  const endedMs = ticket.closedAt ? isoToMs(ticket.closedAt) : Date.now();
  const left = Math.max(0, dateToPx(startedMs));
  const width = Math.max(12, dateToPx(endedMs) - dateToPx(startedMs));

  return (
    <div className="flex items-center border-b border-rule-soft" style={{ height: TICKET_ROW_H }}>
      <div
        style={{ width: LABEL_W }}
        className="shrink-0 sticky left-0 bg-bg-card border-r border-rule pl-16 pr-3 flex items-center gap-1.5 min-w-0"
      >
        <TypePill t={ticket.type} />
        <PriorityPill p={ticket.priority} />
        <Link href={`/t/${ticket.key}`} className="font-mono text-[10px] text-ink-3 hover:text-accent shrink-0">
          {ticket.key}
        </Link>
        <span className="text-[12px] text-ink-2 truncate">{ticket.title}</span>
      </div>
      <div className="relative h-full" style={{ width: laneWidth }}>
        <div
          className={cn(
            "absolute top-1.5 bottom-1.5 rounded-[2px] opacity-80",
            ticketStatusBg(ticket.status)
          )}
          style={{ left, width }}
          title={`${ticket.key} · ${ticket.status}`}
        />
      </div>
    </div>
  );
}

function healthBg(h: Epic["health"]) {
  return h === "on_track"
    ? "bg-ok"
    : h === "at_risk"
    ? "bg-warn"
    : h === "blocked"
    ? "bg-danger"
    : "bg-neutral";
}

function ticketStatusBg(s: TicketStatus): string {
  if (s === "done" || s === "verified") return "bg-ok";
  if (s === "in_progress") return "bg-accent";
  if (s === "review" || s === "verifying") return "bg-info";
  if (s === "cancelled" || s === "cannot_reproduce") return "bg-danger";
  return "bg-neutral";
}

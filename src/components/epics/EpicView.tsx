"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import {
  Avatar,
  Pill,
  PriorityPill,
  TypePill,
  HealthPill,
  Button,
  toast,
} from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { computeEpicHealth } from "@/lib/health";
import { Tombstone } from "@/components/Tombstone";
import { cn, formatDate, statusLabel } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

interface Props {
  epicKey: string;
  variant?: "page" | "slide-over";
  onClose?: () => void;
}

type TicketFilter = "all" | "in_flight" | "done" | "blocked";

export function EpicView({ epicKey, variant = "slide-over", onClose }: Props) {
  const epics = useAppStore((s) => s.epics);
  const milestones = useAppStore((s) => s.milestones);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);

  const epic = epics.find((e) => e.key === epicKey);
  if (!epic) {
    return (
      <div className={variant === "slide-over" ? "p-6" : ""}>
        <Tombstone kind="epic" keyOrHandle={epicKey} />
      </div>
    );
  }

  const pm = users.find((u) => u.id === epic.pmPicId);
  const epicTickets = useMemo(
    () => tickets.filter((t) => t.epicId === epic.id),
    [tickets, epic.id]
  );
  const signal = computeEpicHealth(epic, milestones, tickets);

  const [filter, setFilter] = useState<TicketFilter>("all");

  const filtered = useMemo(() => {
    return epicTickets.filter((t) => {
      if (filter === "all") return true;
      if (filter === "in_flight")
        return ["scheduled", "in_progress", "review", "verifying"].includes(t.status);
      if (filter === "done") return t.status === "done" || t.status === "verified";
      if (filter === "blocked") return t.blocked != null;
      return true;
    });
  }, [epicTickets, filter]);

  const counts = {
    all: epicTickets.length,
    in_flight: epicTickets.filter((t) => ["scheduled", "in_progress", "review", "verifying"].includes(t.status)).length,
    done: epicTickets.filter((t) => t.status === "done" || t.status === "verified").length,
    blocked: epicTickets.filter((t) => t.blocked != null).length,
  };

  const doneCount = epicTickets.filter((t) => t.status === "done" || t.status === "verified").length;
  const progressPct = epicTickets.length === 0 ? 0 : Math.round((doneCount / epicTickets.length) * 100);

  const copyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(`${window.location.origin}/e/${epic.key}`);
    toast(`Link copied - ${epic.key}`);
  };

  const TICKET_LIMIT = 12;
  const overflow = filtered.length - TICKET_LIMIT;

  return (
    <article className={cn(variant === "slide-over" ? "p-6 space-y-5" : "space-y-6")}>
      {/* Header */}
      <header>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-[12px] font-mono text-ink-3">
            <Link href="/epics" className="hover:text-ink underline-offset-2 hover:underline">
              Epic Board
            </Link>
            <span>›</span>
            <span className="text-ink">{epic.key}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={copyLink}>Copy link</Button>
            {variant === "slide-over" && (
              <>
                <Link
                  href={`/e/${epic.key}`}
                  className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
                >
                  Full page →
                </Link>
                {onClose && (
                  <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink text-[18px]">
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <HealthPill h={signal.health} reason={signal.reason} />
          <Pill variant="default">{epic.quarter}</Pill>
          {epic.tags.map((t) => <Pill key={t} variant="neutral">{t}</Pill>)}
        </div>
        <h1 className={cn(variant === "slide-over" ? "display text-display-m" : "display text-display-l", "text-ink leading-tight")}>
          {epic.title}
        </h1>
      </header>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="PM" value={
          <span className="flex items-center gap-1.5">
            {pm && <Avatar user={pm} size="xs" />}
            <span className="truncate">{pm?.displayName ?? "-"}</span>
          </span>
        } />
        <Stat label="Programs" value={(epic.programs ?? []).length > 0 ? (epic.programs ?? []).join(" · ") : "-"} />
        <Stat label="Target" value={formatDate(epic.targetEndDate)} />
      </div>

      {/* Thesis */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">Thesis</div>
        <Markdown source={epic.thesis} />
      </section>

      {/* Progress */}
      <section>
        <div className="flex items-center justify-between text-[12px] mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Progress</span>
          <span className="font-mono text-ink-3">{doneCount} of {epicTickets.length} tickets · {progressPct}%</span>
        </div>
        <div className="h-2 bg-rule-soft rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              signal.health === "on_track" ? "bg-ok" :
              signal.health === "at_risk" ? "bg-warn" :
              signal.health === "blocked" ? "bg-danger" : "bg-neutral"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Tickets */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">
          Tickets · {filtered.length} of {epicTickets.length}
        </div>

        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {([
            { v: "all" as const, label: `All ${counts.all}` },
            { v: "in_flight" as const, label: `In flight ${counts.in_flight}` },
            { v: "done" as const, label: `Done ${counts.done}` },
            { v: "blocked" as const, label: `Blocked ${counts.blocked}` },
          ]).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFilter(f.v)}
              className={cn(
                "px-2 h-6 text-[10px] font-mono uppercase rounded-[4px] border transition-colors duration-100",
                filter === f.v ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="italic text-[12px] text-ink-3 px-2 py-2">No tickets match this filter.</p>
        ) : (
          <div>
            <ul className="bg-bg-card border border-rule rounded-[6px] divide-y divide-rule-soft">
              {filtered.slice(0, TICKET_LIMIT).map((t) => {
                const assignee = users.find((u) => u.id === t.assigneeId);
                return (
                  <li key={t.id}>
                    <Link
                      href={`/t/${t.key}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-bg-elevated"
                    >
                      <TypePill t={t.type} />
                      <span className="font-mono text-[10px] text-ink-3 w-16">{t.key}</span>
                      <span className="text-[12px] text-ink truncate flex-1">{t.title}</span>
                      <PriorityPill p={t.priority} />
                      <Pill
                        variant={
                          t.status === "done" || t.status === "verified"
                            ? "ok"
                            : t.blocked
                            ? "danger"
                            : "default"
                        }
                      >
                        {statusLabel[t.status]}
                      </Pill>
                      <Avatar user={assignee} size="xs" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {overflow > 0 && (
              <Link
                href={`/e/${epic.key}`}
                className="block text-center font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep py-2"
              >
                + {overflow} more · open full Epic detail →
              </Link>
            )}
          </div>
        )}
      </section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-elevated border border-rule rounded-[6px] p-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1">{label}</div>
      <div className="text-[13px] text-ink">{value}</div>
    </div>
  );
}

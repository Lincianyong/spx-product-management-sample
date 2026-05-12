"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import {
  Pill,
  PriorityPill,
  TypePill,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { SortableList, DragHandle } from "@/components/SortableList";
import { cn, daysBetween, formatDate } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function BacklogPage() {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.epics);
  const setBacklogRanks = useAppStore((s) => s.setBacklogRanks);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  useDocumentTitle("Backlog");

  const backlog = useMemo(() => {
    const base = tickets.filter((t) => t.status === "backlog");
    const filtered = projectFilter === "all"
      ? base
      : base.filter((t) => projects.find((p) => p.id === t.epicId)?.key === projectFilter);
    // sort by backlogRank if set, then priority
    return [...filtered].sort((a, b) => {
      if (a.backlogRank != null && b.backlogRank != null) return a.backlogRank - b.backlogRank;
      if (a.backlogRank != null) return -1;
      if (b.backlogRank != null) return 1;
      const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
      return order[a.priority] - order[b.priority];
    });
  }, [tickets, projectFilter, projects]);

  const today = new Date().toISOString();

  const onReorder = (next: typeof backlog) => {
    const ranks = next.map((t, idx) => ({ ticketId: t.id, rank: idx + 1 }));
    setBacklogRanks(ranks);
    toast("Backlog re-ranked", { kind: "info" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="S-03 · Backlog"
        title={
          <>
            <em className="text-accent">DoR-ready</em>, waiting to be picked.
          </>
        }
        lede="Drag the handle (⠿) to re-prioritize. Picklist (Stage 4a) pulls from the top."
        actions={
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger size="sm" className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.key}>
                  {p.key} · {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {backlog.length === 0 ? (
        <EmptyState title="Backlog is dry." body="Add work to keep the engine fed. New tickets land here directly." />
      ) : (
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[40px_40px_100px_1fr_80px_80px_120px_100px_60px] gap-3 px-4 py-3 bg-bg-elevated border-b border-rule font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <span></span>
            <span>Rank</span>
            <span>Key</span>
            <span>Title</span>
            <span>Type</span>
            <span>Priority</span>
            <span>Project</span>
            <span>Created</span>
            <span>Age</span>
          </div>
          <SortableList
            items={backlog}
            onReorder={onReorder}
            renderItem={(t, handle) => {
              const age = daysBetween(t.createdAt, today);
              const stale = age >= 28;
              const project = projects.find((p) => p.id === t.epicId);
              const rank = backlog.findIndex((x) => x.id === t.id) + 1;
              return (
                <div
                  className={cn(
                    "grid grid-cols-[40px_40px_100px_1fr_80px_80px_120px_100px_60px] gap-3 px-4 py-3 items-center border-b border-rule-soft bg-bg-card",
                    stale && "bg-warn-soft/30"
                  )}
                >
                  <DragHandle handleProps={handle} className="text-[16px]" />
                  <span className="font-mono text-[12px] text-ink-3">#{rank}</span>
                  <Link href={`/t/${t.key}`} className="font-mono text-[12px] text-ink hover:text-accent underline-offset-2 hover:underline">
                    {t.key}
                  </Link>
                  <div className="text-[14px] text-ink truncate flex items-center gap-2">
                    {stale && <Pill variant="warn">stale</Pill>}
                    <span className="truncate">{t.title}</span>
                  </div>
                  <TypePill t={t.type} />
                  <PriorityPill p={t.priority} />
                  <span className="font-mono text-[12px] text-ink-3">{project?.key ?? "-"}</span>
                  <span className="font-mono text-[12px] text-ink-3">{formatDate(t.createdAt)}</span>
                  <span className="font-mono text-[12px] text-ink-3">{age}d</span>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

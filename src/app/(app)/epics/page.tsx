"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, HealthPill, Pill } from "@/components/ui";
import { cn, healthLabel, formatDate } from "@/lib/utils";
import type { Epic, Health } from "@/lib/types";

const VIEWS = ["kanban", "list", "table", "timeline", "backlog"] as const;
type View = (typeof VIEWS)[number];

export default function EpicBoardPage() {
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const [view, setView] = useState<View>("kanban");
  const [groupBy, setGroupBy] = useState<"health" | "quarter" | "pic">("health");

  return (
    <div>
      <PageHeader
        eyebrow="S-11 · Epic Board"
        title={
          <>
            The whole <em className="text-accent">portfolio</em>, at one altitude.
          </>
        }
        lede="Epics are conviction-level bets. Each rolls up health from its child Projects."
        actions={
          <div className="flex items-center gap-2">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 h-8 text-[12px] font-mono uppercase tracking-[0.06em] rounded-[6px] border transition-colors duration-100",
                  view === v ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      {view === "kanban" && <KanbanView epics={epics} groupBy={groupBy} setGroupBy={setGroupBy} />}
      {view === "list" && <ListView epics={epics} />}
      {view === "table" && <TableView epics={epics} />}
      {view === "timeline" && <TimelineView epics={epics} />}
      {view === "backlog" && <BacklogView epics={epics} />}
    </div>
  );
}

function GroupByPicker({ value, onChange }: { value: string; onChange: (v: "health" | "quarter" | "pic") => void }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Group by</span>
      {(["health", "quarter", "pic"] as const).map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={cn(
            "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border transition-colors duration-100",
            value === g ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
          )}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

function EpicCard({ epic }: { epic: Epic }) {
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const pm = users.find((u) => u.id === epic.pmPicId);
  const childProjects = projects.filter((p) => p.epicId === epic.id);
  const accent = epic.health === "on_track" ? "ok" : epic.health === "at_risk" ? "warn" : epic.health === "blocked" ? "danger" : "neutral";
  return (
    <Link
      href={`/e/${epic.key}`}
      className="block bg-bg-card border border-rule rounded-[8px] shadow-sm hover:border-accent hover:-translate-y-px transition-all duration-150 border-l-4 border-l-accent"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] text-ink-3">{epic.key}</span>
          <HealthPill h={epic.health} />
        </div>
        <h3 className="display text-display-s text-ink leading-tight mb-2">{epic.title}</h3>
        <p className="text-[13px] text-ink-2 line-clamp-3 mb-3">{epic.thesis}</p>
        <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
          <span>{childProjects.length} project{childProjects.length === 1 ? "" : "s"} · {epic.quarter}</span>
          <Avatar user={pm} size="xs" />
        </div>
      </div>
    </Link>
  );
}

function KanbanView({ epics, groupBy, setGroupBy }: { epics: Epic[]; groupBy: "health" | "quarter" | "pic"; setGroupBy: (v: "health" | "quarter" | "pic") => void }) {
  const users = useAppStore((s) => s.users);
  let groups: { key: string; label: string; items: Epic[] }[] = [];

  if (groupBy === "health") {
    const order: Health[] = ["on_track", "at_risk", "blocked", "not_started"];
    groups = order.map((h) => ({ key: h, label: healthLabel[h], items: epics.filter((e) => e.health === h) }));
  } else if (groupBy === "quarter") {
    const quarters = Array.from(new Set(epics.map((e) => e.quarter)));
    groups = quarters.map((q) => ({ key: q, label: q, items: epics.filter((e) => e.quarter === q) }));
  } else {
    const pmIds = Array.from(new Set(epics.map((e) => e.pmPicId)));
    groups = pmIds.map((id) => {
      const u = users.find((x) => x.id === id);
      return { key: id, label: u?.displayName ?? "Unknown", items: epics.filter((e) => e.pmPicId === id) };
    });
  }

  return (
    <>
      <GroupByPicker value={groupBy} onChange={setGroupBy} />
      <div className="grid grid-cols-4 gap-4">
        {groups.map((g) => (
          <div key={g.key} className="bg-bg-elevated rounded-[8px] p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{g.label}</span>
              <span className="font-mono text-[11px] text-ink-3">{g.items.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {g.items.length === 0 && (
                <div className="text-[12px] text-ink-4 italic px-1 py-2">Nothing here.</div>
              )}
              {g.items.map((e) => (
                <EpicCard key={e.id} epic={e} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ListView({ epics }: { epics: Epic[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {epics.map((e) => (
        <EpicCard key={e.id} epic={e} />
      ))}
    </div>
  );
}

function TableView({ epics }: { epics: Epic[] }) {
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
      <table className="w-full">
        <thead className="bg-bg-elevated">
          <tr className="border-b border-rule">
            {["Key", "Title", "Quarter", "Health", "PM", "Projects", "Target"].map((h) => (
              <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {epics.map((e) => {
            const pm = users.find((u) => u.id === e.pmPicId);
            const projCount = projects.filter((p) => p.epicId === e.id).length;
            return (
              <tr key={e.id} className="border-b border-rule-soft hover:bg-bg-elevated">
                <td className="px-4 py-3 font-mono text-[12px]">
                  <Link href={`/e/${e.key}`} className="text-ink hover:text-accent underline-offset-2 hover:underline">
                    {e.key}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[14px] text-ink">{e.title}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{e.quarter}</td>
                <td className="px-4 py-3"><HealthPill h={e.health} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar user={pm} size="xs" />
                    <span className="text-[13px] text-ink-2">{pm?.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{projCount}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{formatDate(e.targetEndDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TimelineView({ epics }: { epics: Epic[] }) {
  // Simple horizontal lane viz
  const start = new Date(Math.min(...epics.map((e) => new Date(e.startDate).getTime()))).getTime();
  const end = new Date(Math.max(...epics.map((e) => new Date(e.targetEndDate).getTime()))).getTime();
  const range = end - start;
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-5">
      <div className="space-y-3">
        {epics.map((e) => {
          const left = ((new Date(e.startDate).getTime() - start) / range) * 100;
          const width = ((new Date(e.targetEndDate).getTime() - new Date(e.startDate).getTime()) / range) * 100;
          const accent = e.health === "on_track" ? "bg-ok" : e.health === "at_risk" ? "bg-warn" : e.health === "blocked" ? "bg-danger" : "bg-neutral";
          return (
            <div key={e.id} className="grid grid-cols-[240px_1fr] gap-4 items-center">
              <Link href={`/e/${e.key}`} className="text-[13px] text-ink hover:text-accent underline-offset-2 hover:underline truncate">
                <span className="font-mono text-[11px] text-ink-3 mr-2">{e.key}</span>
                {e.title}
              </Link>
              <div className="relative h-6 bg-rule-soft rounded-[4px]">
                <div
                  className={cn("absolute top-0 bottom-0 rounded-[4px] opacity-80", accent)}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 font-mono text-[11px] text-ink-3 flex justify-between">
        <span>{formatDate(new Date(start).toISOString())}</span>
        <span>{formatDate(new Date(end).toISOString())}</span>
      </div>
    </div>
  );
}

function BacklogView({ epics }: { epics: Epic[] }) {
  const backlog = epics.filter((e) => e.status === "backlog");
  if (backlog.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-rule rounded-[8px] bg-bg-elevated">
        <h3 className="display text-display-s text-ink">No Epics in the backlog.</h3>
        <p className="text-[14px] text-ink-3 mt-2">All Epics are either In Progress or Done.</p>
      </div>
    );
  }
  return <div className="grid grid-cols-2 gap-4">{backlog.map((e) => <EpicCard key={e.id} epic={e} />)}</div>;
}

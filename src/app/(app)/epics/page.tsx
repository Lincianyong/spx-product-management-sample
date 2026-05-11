"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, HealthPill, Pill, Button, Modal, Input, toast } from "@/components/ui";
import { cn, healthLabel, formatDate } from "@/lib/utils";
import type { Epic, Health } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const VIEWS = ["kanban", "list", "table", "timeline", "backlog"] as const;
type View = (typeof VIEWS)[number];
type GroupBy = "health" | "quarter" | "pic";

export default function EpicBoardPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-3">Loading…</div>}>
      <EpicBoardInner />
    </Suspense>
  );
}

function EpicBoardInner() {
  useDocumentTitle("Epic Board");
  const router = useRouter();
  const params = useSearchParams();
  const epics = useAppStore((s) => s.epics);
  const savedViews = useAppStore((s) => s.savedViews);
  const saveView = useAppStore((s) => s.saveView);
  const deleteView = useAppStore((s) => s.deleteView);
  const user = useCurrentUser();

  const initialView = (params.get("view") as View) ?? "kanban";
  const initialGroup = (params.get("groupBy") as GroupBy) ?? "health";
  const [view, setView] = useState<View>(initialView);
  const [groupBy, setGroupBy] = useState<GroupBy>(initialGroup);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Reflect state to URL for shareable links
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("view", view);
    q.set("groupBy", groupBy);
    router.replace(`/epics?${q.toString()}`, { scroll: false });
  }, [view, groupBy, router]);

  const mine = user ? savedViews.filter((v) => v.ownerId === user.id && v.surface === "epics") : [];

  const applyView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (!v) return;
    setView(v.viewMode);
    setGroupBy(v.groupBy);
  };

  const save = () => {
    if (!user || !saveName.trim()) return;
    saveView({ name: saveName.trim(), surface: "epics", viewMode: view, groupBy, ownerId: user.id });
    setSaveOpen(false);
    setSaveName("");
    toast(`View "${saveName.trim()}" saved`);
  };

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
            {mine.length > 0 && (
              <select
                onChange={(e) => e.target.value && applyView(e.target.value)}
                defaultValue=""
                className="h-8 px-2 text-[12px] font-mono uppercase tracking-[0.06em] rounded-[6px] border border-rule bg-bg-card text-ink-2"
                aria-label="Saved views"
              >
                <option value="">Saved views…</option>
                {mine.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSaveOpen(true)}>Save view</Button>
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

      <GroupByPicker value={groupBy} onChange={setGroupBy} />

      {/* Saved views chips */}
      {mine.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Your views</span>
          {mine.map((v) => (
            <button
              key={v.id}
              onClick={() => applyView(v.id)}
              className="group inline-flex items-center gap-2 pl-2 pr-1 h-7 rounded-[6px] border border-rule bg-bg-card text-[12px] hover:border-accent"
            >
              <span className="text-ink-2">{v.name}</span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); deleteView(v.id); toast("View deleted", { kind: "info" }); }}
                className="px-1 text-ink-4 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}

      {view === "kanban" && <KanbanView epics={epics} groupBy={groupBy} />}
      {view === "list" && <ListView epics={epics} groupBy={groupBy} />}
      {view === "table" && <TableView epics={epics} groupBy={groupBy} />}
      {view === "timeline" && <TimelineView epics={epics} groupBy={groupBy} />}
      {view === "backlog" && <BacklogView epics={epics} />}

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save this view" size="sm">
        <Input
          label="Name"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="e.g., Q2 at-risk by quarter"
          autoFocus
        />
        <div className="mt-3 font-mono text-[11px] text-ink-3">
          {view} · grouped by {groupBy}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={!saveName.trim()}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}

function GroupByPicker({ value, onChange }: { value: string; onChange: (v: GroupBy) => void }) {
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

function useGroups(epics: Epic[], groupBy: GroupBy) {
  const users = useAppStore((s) => s.users);
  if (groupBy === "health") {
    const order: Health[] = ["on_track", "at_risk", "blocked", "not_started"];
    return order.map((h) => ({ key: h, label: healthLabel[h], items: epics.filter((e) => e.health === h) }));
  }
  if (groupBy === "quarter") {
    const quarters = Array.from(new Set(epics.map((e) => e.quarter)));
    return quarters.map((q) => ({ key: q, label: q, items: epics.filter((e) => e.quarter === q) }));
  }
  const pmIds = Array.from(new Set(epics.map((e) => e.pmPicId)));
  return pmIds.map((id) => {
    const u = users.find((x) => x.id === id);
    return { key: id, label: u?.displayName ?? "Unknown", items: epics.filter((e) => e.pmPicId === id) };
  });
}

function EpicCard({ epic }: { epic: Epic }) {
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const pm = users.find((u) => u.id === epic.pmPicId);
  const childProjects = projects.filter((p) => p.epicId === epic.id);
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

function KanbanView({ epics, groupBy }: { epics: Epic[]; groupBy: GroupBy }) {
  const groups = useGroups(epics, groupBy);
  return (
    <div className={cn("grid gap-4", groups.length <= 4 ? "grid-cols-4" : "grid-cols-4")}>
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
  );
}

function ListView({ epics, groupBy }: { epics: Epic[]; groupBy: GroupBy }) {
  const groups = useGroups(epics, groupBy);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3 flex items-center gap-2">
            {g.label} <span className="text-ink-4">·</span> <span className="text-ink-4">{g.items.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {g.items.map((e) => <EpicCard key={e.id} epic={e} />)}
            {g.items.length === 0 && <p className="text-[12px] text-ink-4 italic">Nothing here.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ epics, groupBy }: { epics: Epic[]; groupBy: GroupBy }) {
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const groups = useGroups(epics, groupBy);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center gap-2">
            {g.label} <span className="text-ink-4">· {g.items.length}</span>
          </div>
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
                {g.items.map((e) => {
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
                {g.items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-3 text-[12px] italic text-ink-4">Nothing here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineView({ epics, groupBy }: { epics: Epic[]; groupBy: GroupBy }) {
  const start = new Date(Math.min(...epics.map((e) => new Date(e.startDate).getTime()))).getTime();
  const end = new Date(Math.max(...epics.map((e) => new Date(e.targetEndDate).getTime()))).getTime();
  const range = end - start;
  const groups = useGroups(epics, groupBy);
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-5 space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">
            {g.label} <span className="text-ink-4">· {g.items.length}</span>
          </div>
          <div className="space-y-2">
            {g.items.map((e) => {
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
        </div>
      ))}
      <div className="mt-2 font-mono text-[11px] text-ink-3 flex justify-between">
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

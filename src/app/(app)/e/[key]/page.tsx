"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, HealthPill, toast } from "@/components/ui";
import { cn, formatDate, healthLabel, relativeTime } from "@/lib/utils";

export default function EpicDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const comments = useAppStore((s) => s.comments);
  const addComment = useAppStore((s) => s.addComment);
  const user = useCurrentUser();

  const [tab, setTab] = useState<"overview" | "projects" | "timeline" | "activity" | "comments">("overview");
  const [draft, setDraft] = useState("");

  const epic = epics.find((e) => e.key === key);
  if (!epic) {
    return (
      <div className="py-20 text-center">
        <h2 className="display text-display-s text-ink">Epic not found.</h2>
        <Link href="/epics" className="text-accent hover:underline mt-2 inline-block">← Back to Epic Board</Link>
      </div>
    );
  }

  const pm = users.find((u) => u.id === epic.pmPicId);
  const childProjects = projects.filter((p) => p.epicId === epic.id);
  const allTickets = tickets.filter((t) => childProjects.some((p) => p.id === t.projectId));
  const doneTickets = allTickets.filter((t) => t.status === "done" || t.status === "verified").length;
  const progressPct = allTickets.length === 0 ? 0 : Math.round((doneTickets / allTickets.length) * 100);

  const epicComments = comments.filter((c) => c.entityType === "epic" && c.entityId === epic.id);

  const submit = () => {
    if (!draft.trim() || !user) return;
    addComment({
      entityType: "epic",
      entityId: epic.id,
      parentCommentId: null,
      authorId: user.id,
      body: draft.trim(),
      mentions: [],
    });
    setDraft("");
    toast("Comment posted to Epic thread");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 flex items-center gap-3 mb-3">
          <span className="block w-8 h-px bg-rule" />
          <Link href="/epics" className="hover:text-ink">Epic Board</Link>
          <span>›</span>
          <span className="text-ink">{epic.key}</span>
        </div>
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <HealthPill h={epic.health} />
              <Pill variant="default">{epic.quarter}</Pill>
              {epic.tags.map((t) => <Pill key={t} variant="neutral">{t}</Pill>)}
            </div>
            <h1 className="display text-display-l text-ink leading-[1.05]">{epic.title}</h1>
            <p className="font-body text-body-l text-ink-2 mt-4 max-w-2xl">{epic.thesis}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast(`Link copied — ${epic.key}`); }}>
              Copy link
            </Button>
          </div>
        </div>
      </div>

      {/* Health rollup */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Stat label="PM" value={<span className="flex items-center gap-2"><Avatar user={pm} size="xs" /><span>{pm?.displayName}</span></span>} />
        <Stat label="Projects" value={`${childProjects.length}`} />
        <Stat label="Tickets" value={`${doneTickets} / ${allTickets.length} done`} />
        <Stat label="Target end" value={formatDate(epic.targetEndDate)} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule mb-6">
        {(["overview", "projects", "timeline", "activity", "comments"] as const).map((t) => (
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
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-bg-card border border-rule rounded-[8px] p-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Thesis</div>
              <p className="text-[15px] text-ink-2 leading-relaxed whitespace-pre-wrap">{epic.thesis}</p>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Progress</div>
              <div className="bg-bg-card border border-rule rounded-[8px] p-5">
                <div className="flex items-center justify-between text-[13px] text-ink-3 mb-2">
                  <span>{doneTickets} of {allTickets.length} tickets complete</span>
                  <span className="font-mono">{progressPct}%</span>
                </div>
                <div className="h-2 bg-rule-soft rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-300", epic.health === "on_track" ? "bg-ok" : epic.health === "at_risk" ? "bg-warn" : "bg-danger")}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <Side title="Health" value={<HealthPill h={epic.health} />} />
            <Side title="Quarter" value={epic.quarter} />
            <Side title="Start" value={formatDate(epic.startDate)} />
            <Side title="Target end" value={formatDate(epic.targetEndDate)} />
            <Side title="Tags" value={<div className="flex flex-wrap gap-1.5">{epic.tags.map((t) => <Pill key={t} variant="neutral">{t}</Pill>)}</div>} />
          </aside>
        </div>
      )}

      {tab === "projects" && (
        <div className="grid grid-cols-2 gap-4">
          {childProjects.map((p) => (
            <Link key={p.id} href={`/p/${p.key}`} className="block bg-bg-card border border-rule rounded-[8px] p-4 hover:border-accent transition-colors duration-150 border-l-4 border-l-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] text-ink-3">{p.key}</span>
                <HealthPill h={p.health} />
              </div>
              <h3 className="display text-display-s text-ink mb-2">{p.title}</h3>
              <p className="text-[13px] text-ink-2 line-clamp-2">{p.description}</p>
            </Link>
          ))}
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-bg-card border border-rule rounded-[8px] p-5">
          <p className="text-[13px] text-ink-3 italic">Project timeline view — shows child Project bars across the Epic's date range.</p>
          {childProjects.map((p) => (
            <div key={p.id} className="grid grid-cols-[200px_1fr] gap-4 items-center py-3 border-b border-rule-soft">
              <Link href={`/p/${p.key}`} className="text-[13px] text-ink hover:text-accent">{p.title}</Link>
              <div className="relative h-5 bg-rule-soft rounded-[4px]">
                <div className={cn("absolute top-0 bottom-0 rounded-[4px]", p.health === "on_track" ? "bg-ok" : p.health === "at_risk" ? "bg-warn" : "bg-danger")} style={{ left: "5%", width: "70%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "activity" && (
        <p className="text-[13px] text-ink-3 italic">Activity timeline rolls up status changes, health flips, and Project additions to this Epic.</p>
      )}

      {tab === "comments" && (
        <div className="max-w-3xl space-y-4">
          {epicComments.length === 0 && (
            <p className="text-[13px] text-ink-3 italic">No leadership comments yet. Use this thread for context that should outlive the Project layer.</p>
          )}
          {epicComments.map((c) => {
            const author = users.find((u) => u.id === c.authorId);
            return (
              <div key={c.id} className="bg-bg-card border border-rule rounded-[8px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar user={author} size="xs" />
                  <span className="text-[13px] text-ink font-medium">{author?.displayName}</span>
                  <span className="text-[11px] text-ink-3 font-mono">{relativeTime(c.createdAt)}</span>
                </div>
                <div className="text-[14px] text-ink-2 whitespace-pre-wrap">{c.body}</div>
              </div>
            );
          })}
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Comment at the Epic level — leadership and PMs see this."
              className="w-full min-h-[80px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] placeholder:text-ink-4"
            />
            <div className="flex justify-end mt-2">
              <Button variant="primary" size="sm" onClick={submit} disabled={!draft.trim()}>Post</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="text-[15px] text-ink">{value}</div>
    </div>
  );
}

function Side({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{title}</div>
      <div className="text-[14px] text-ink">{value}</div>
    </div>
  );
}

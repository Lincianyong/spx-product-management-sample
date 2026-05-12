"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, HealthPill, toast } from "@/components/ui";
import { cn, formatDate, healthLabel, relativeTime } from "@/lib/utils";
import { CommentThread } from "@/components/comments/CommentThread";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { Markdown } from "@/components/Markdown";
import { computeEpicHealth } from "@/lib/health";
import { Tombstone } from "@/components/Tombstone";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function EpicDetailPage({ params }: { params: { key: string } }) {
  const { key } = params;
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const comments = useAppStore((s) => s.comments);
  const addComment = useAppStore((s) => s.addComment);
  const user = useCurrentUser();

  const [tab, setTab] = useState<"overview" | "tickets" | "timeline" | "activity" | "comments">("overview");

  const epic = epics.find((e) => e.key === key);
  useDocumentTitle(epic ? `${epic.key} · ${epic.title}` : `${key} · Epic not found`);
  if (!epic) {
    return <Tombstone kind="epic" keyOrHandle={key} />;
  }

  const pm = users.find((u) => u.id === epic.pmPicId);
  const allTickets = tickets.filter((t) => t.epicId === epic.id);
  const signal = computeEpicHealth(epic, tickets);
  const doneTickets = allTickets.filter((t) => t.status === "done" || t.status === "verified").length;
  const progressPct = allTickets.length === 0 ? 0 : Math.round((doneTickets / allTickets.length) * 100);

  const epicComments = comments.filter((c) => c.entityType === "epic" && c.entityId === epic.id);

  const submit = (body: string, mentions: string[], attachments: import("@/lib/types").Attachment[]) => {
    if (!user) return;
    addComment({
      entityType: "epic",
      entityId: epic.id,
      parentCommentId: null,
      authorId: user.id,
      body,
      mentions,
      attachments,
    });
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
              <HealthPill h={signal.health} reason={signal.reason} />
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
        <Stat label="Programs" value={(epic.programs ?? []).length > 0 ? (epic.programs ?? []).join(" · ") : "Ungrouped"} />
        <Stat label="Tickets" value={`${doneTickets} / ${allTickets.length} done`} />
        <Stat label="Target end" value={formatDate(epic.targetEndDate)} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-rule mb-6">
        {(["overview", "tickets", "timeline", "activity", "comments"] as const).map((t) => (
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
              <Markdown source={epic.thesis} />
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
            <Side title="Health" value={<HealthPill h={signal.health} reason={signal.reason} />} />
            <Side title="Quarter" value={epic.quarter} />
            <Side title="Start" value={formatDate(epic.startDate)} />
            <Side title="Target end" value={formatDate(epic.targetEndDate)} />
            <Side title="Tags" value={<div className="flex flex-wrap gap-1.5">{epic.tags.map((t) => <Pill key={t} variant="neutral">{t}</Pill>)}</div>} />
          </aside>
        </div>
      )}

      {tab === "tickets" && (
        <div className="grid grid-cols-2 gap-3">
          {allTickets.map((t) => (
            <Link key={t.id} href={`/t/${t.key}`} className="block bg-bg-card border border-rule rounded-[8px] p-3 hover:border-accent transition-colors duration-150">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] text-ink-3">{t.key}</span>
                <Pill variant={t.status === "done" || t.status === "verified" ? "ok" : "default"}>{t.status.replace("_", " ")}</Pill>
              </div>
              <div className="text-[13px] text-ink truncate">{t.title}</div>
            </Link>
          ))}
          {allTickets.length === 0 && (
            <p className="text-[13px] italic text-ink-3 col-span-2">No tickets under this epic yet.</p>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-bg-card border border-rule rounded-[8px] p-5">
          <p className="text-[13px] text-ink-3 italic">Timeline view of this epic's tickets — see the standalone /timeline page for the sprint-level Gantt.</p>
        </div>
      )}

      {tab === "activity" && (
        <p className="text-[13px] text-ink-3 italic">Activity timeline rolls up status changes, health flips, and Project additions to this Epic.</p>
      )}

      {tab === "comments" && (
        <div className="max-w-3xl space-y-4">
          {epicComments.filter((c) => !c.parentCommentId).length === 0 && (
            <p className="text-[13px] text-ink-3 italic">No leadership comments yet. Use this thread for context that should outlive the Project layer.</p>
          )}
          {epicComments
            .filter((c) => !c.parentCommentId)
            .map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                replies={epicComments.filter((x) => x.parentCommentId === c.id)}
              />
            ))}
          <CommentComposer placeholder="Comment at the Epic level — leadership and PMs see this." onSubmit={submit} submitLabel="Post" />
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

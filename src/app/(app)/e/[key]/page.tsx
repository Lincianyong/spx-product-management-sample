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
  const milestones = useAppStore((s) => s.milestones);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const comments = useAppStore((s) => s.comments);
  const addComment = useAppStore((s) => s.addComment);
  const user = useCurrentUser();

  const [tab, setTab] = useState<"overview" | "milestones" | "tickets" | "activity" | "comments">("overview");

  const epic = epics.find((e) => e.key === key);
  useDocumentTitle(epic ? `${epic.key} · ${epic.title}` : `${key} · Epic not found`);
  if (!epic) {
    return <Tombstone kind="epic" keyOrHandle={key} />;
  }

  const pm = users.find((u) => u.id === epic.pmPicId);
  const allTickets = tickets.filter((t) => t.epicId === epic.id);
  const signal = computeEpicHealth(epic, milestones, tickets);
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
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast(`Link copied - ${epic.key}`); }}>
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
        {(["overview", "milestones", "tickets", "activity", "comments"] as const).map((t) => (
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

      {tab === "milestones" && (
        <MilestonesTab epicId={epic.id} startDate={epic.startDate} targetEndDate={epic.targetEndDate} canEdit={user?.role === "pm"} />
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
          <CommentComposer placeholder="Comment at the Epic level - leadership and PMs see this." onSubmit={submit} submitLabel="Post" />
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

// ── Milestones tab (PRD § 9.3, § 10.5, § 13.2) ─────────────────────────
function MilestonesTab({ epicId, startDate, targetEndDate, canEdit }: {
  epicId: string;
  startDate: string;
  targetEndDate: string;
  canEdit: boolean;
}) {
  const all = useAppStore((s) => s.milestones);
  const completeMilestone = useAppStore((s) => s.completeMilestone);
  const addMilestone = useAppStore((s) => s.addMilestone);
  const deleteMilestone = useAppStore((s) => s.deleteMilestone);
  const user = useCurrentUser();

  const ms = all
    .filter((m) => m.epicId === epicId)
    .slice()
    .sort((a, b) => a.order - b.order);

  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [entryCriteria, setEntryCriteria] = useState("");
  const [exitCriteria, setExitCriteria] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !targetDate || !user) return;
    addMilestone(epicId, {
      name: name.trim(),
      targetDate,
      entryCriteria: entryCriteria.trim() || "—",
      exitCriteria: exitCriteria.trim() || "—",
    }, user.id);
    setName(""); setTargetDate(""); setEntryCriteria(""); setExitCriteria("");
    setOpenAdd(false);
    toast(`Phase '${name}' added`);
  };

  const handleComplete = (m: typeof ms[number]) => {
    if (!user) return;
    const earlier = ms.filter((x) => x.order < m.order && x.status !== "complete");
    if (earlier.length > 0) {
      // PRD § 12: Out-of-sequence guard - require explicit confirm.
      const proceed = window.confirm(
        `Milestone '${earlier[0].name}' is still pending. Complete it first or confirm skip.`
      );
      if (!proceed) return;
    }
    completeMilestone(m.id, user.id);
    toast(`Milestone '${m.name}' complete`, { kind: "success" });
  };

  const handleDelete = (m: typeof ms[number]) => {
    if (!user) return;
    if (!window.confirm(`Remove milestone '${m.name}'?`)) return;
    deleteMilestone(m.id, user.id);
    toast(`Milestone '${m.name}' removed`);
  };

  if (ms.length === 0) {
    return (
      <div className="bg-bg-card border border-rule rounded-[8px] p-8 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Milestones</div>
        <p className="text-[14px] text-ink-2 max-w-md mx-auto mb-4">
          No phases defined for this Epic yet. Add sequential waterfall phases — typically Requirements → Design → Build → Test → Deploy.
        </p>
        {canEdit && (
          <Button variant="primary" onClick={() => setOpenAdd(true)}>Add your first phase →</Button>
        )}
        {openAdd && <AddPhaseModal {...{name,setName,targetDate,setTargetDate,entryCriteria,setEntryCriteria,exitCriteria,setExitCriteria,onAdd: handleAdd,onClose: () => setOpenAdd(false)}} />}
      </div>
    );
  }

  // Gantt layout: each milestone is a phase between previous targetDate (or epic start) and its own targetDate.
  const epicStart = new Date(startDate).getTime();
  const epicEnd = new Date(targetEndDate).getTime();
  const span = Math.max(1, epicEnd - epicStart);
  const now = Date.now();
  const todayPct = Math.max(0, Math.min(100, ((now - epicStart) / span) * 100));

  return (
    <div className="space-y-6">
      {/* Phase list */}
      <div className="bg-bg-card border border-rule rounded-[8px]">
        {ms.map((m, i) => {
          const isLocked = i > 0 && ms[i - 1].status !== "complete" && m.status === "pending";
          const slipDays = m.actualDate
            ? Math.max(0, Math.round((new Date(m.actualDate).getTime() - new Date(m.targetDate).getTime()) / 86_400_000))
            : 0;
          const overdue = m.status !== "complete" && now > new Date(m.targetDate).getTime();
          const statusPill =
            m.status === "complete" ? <Pill variant="ok">complete</Pill>
            : m.status === "in_progress" ? <Pill variant="default">in progress</Pill>
            : overdue ? <Pill variant="danger">slipped</Pill>
            : <Pill variant="neutral">pending</Pill>;
          return (
            <div id={`milestone-${m.id}`} key={m.id} className="grid grid-cols-[40px_1fr_180px_120px_auto] gap-4 items-start p-4 border-b border-rule-soft last:border-b-0">
              <span className="font-mono text-[12px] text-ink-3 pt-1">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="text-[14px] text-ink font-medium">{m.name}</div>
                <div className="text-[12px] text-ink-3 mt-1">
                  <strong className="text-ink-2">Entry:</strong> {m.entryCriteria}
                </div>
                <div className="text-[12px] text-ink-3 mt-0.5">
                  <strong className="text-ink-2">Exit:</strong> {m.exitCriteria}
                </div>
              </div>
              <div>
                <div className="font-mono text-[11px] text-ink-3">Target {formatDate(m.targetDate)}</div>
                {m.actualDate && (
                  <div className={cn("font-mono text-[11px]", slipDays > 0 ? "text-danger" : "text-ok")}>
                    Actual {formatDate(m.actualDate)}{slipDays > 0 ? ` · +${slipDays}d` : ""}
                  </div>
                )}
              </div>
              <div>{statusPill}</div>
              <div className="flex items-center gap-1.5 justify-end">
                {canEdit && m.status === "in_progress" && (
                  <Button variant="primary" size="sm" onClick={() => handleComplete(m)}>Mark complete →</Button>
                )}
                {canEdit && m.status === "pending" && !isLocked && (
                  <Button variant="secondary" size="sm" onClick={() => handleComplete(m)}>Start →</Button>
                )}
                {canEdit && isLocked && (
                  <Button variant="ghost" size="sm" disabled title="Previous milestone still pending">Locked</Button>
                )}
                {canEdit && m.status !== "complete" && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(m)} aria-label="Remove">✕</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div>
          <Button variant="secondary" onClick={() => setOpenAdd(true)}>+ Add phase</Button>
        </div>
      )}

      {/* Phase Gantt */}
      <div className="bg-bg-card border border-rule rounded-[8px] p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Phase Gantt · planned vs actual</div>
        <div className="grid grid-cols-[140px_1fr] gap-3 items-center mb-2">
          <div />
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <span>{formatDate(startDate)}</span>
            <span>today</span>
            <span>{formatDate(targetEndDate)}</span>
          </div>
        </div>
        {ms.map((m, i) => {
          const prevTarget = i === 0 ? epicStart : new Date(ms[i - 1].targetDate).getTime();
          const target = new Date(m.targetDate).getTime();
          const plannedLeft = Math.max(0, ((prevTarget - epicStart) / span) * 100);
          const plannedWidth = Math.max(1, ((target - prevTarget) / span) * 100);
          let actualBar: React.ReactNode = null;
          if (m.actualDate) {
            const aEnd = new Date(m.actualDate).getTime();
            const aw = Math.max(1, ((aEnd - prevTarget) / span) * 100);
            const slipped = aEnd > target;
            actualBar = (
              <div
                className={cn("absolute bottom-1 h-1.5 rounded-full", slipped ? "bg-danger" : "bg-ok")}
                style={{ left: `${plannedLeft}%`, width: `${aw}%` }}
              />
            );
          } else if (m.status === "in_progress") {
            const aw = Math.max(1, ((now - prevTarget) / span) * 100);
            actualBar = (
              <div
                className="absolute bottom-1 h-1.5 rounded-full border border-dashed border-accent bg-accent-soft"
                style={{ left: `${plannedLeft}%`, width: `${aw}%` }}
              />
            );
          }
          return (
            <div key={m.id} className="grid grid-cols-[140px_1fr] gap-3 items-center py-2 border-t border-rule-soft">
              <span className="text-[12px] text-ink truncate">{m.name}</span>
              <div className="relative h-5 bg-bg-elevated rounded">
                <div
                  className="absolute top-0 bottom-0 w-px bg-accent"
                  style={{ left: `${todayPct}%` }}
                />
                <div
                  className="absolute top-1 h-1.5 rounded-full bg-rule"
                  style={{ left: `${plannedLeft}%`, width: `${plannedWidth}%` }}
                />
                {actualBar}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-rule" /> planned</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-ok" /> on-time</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-danger" /> slipped</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-1 rounded-full bg-accent-soft border border-dashed border-accent" /> in progress</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-px h-3 bg-accent" /> today</span>
        </div>
      </div>

      {openAdd && (
        <AddPhaseModal {...{name,setName,targetDate,setTargetDate,entryCriteria,setEntryCriteria,exitCriteria,setExitCriteria,onAdd: handleAdd,onClose: () => setOpenAdd(false)}} />
      )}
    </div>
  );
}

function AddPhaseModal(props: {
  name: string; setName: (v: string) => void;
  targetDate: string; setTargetDate: (v: string) => void;
  entryCriteria: string; setEntryCriteria: (v: string) => void;
  exitCriteria: string; setExitCriteria: (v: string) => void;
  onAdd: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center pt-[10vh]" onClick={props.onClose}>
      <div className="bg-bg-card rounded-[8px] shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-rule">
          <h2 className="display text-display-s text-ink">Add phase</h2>
        </div>
        <div className="p-5 space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Phase name</span>
            <input className="w-full h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]" value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="e.g. Requirements" autoFocus />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Target date</span>
            <input type="date" className="w-full h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]" value={props.targetDate} onChange={(e) => props.setTargetDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Entry criteria</span>
            <textarea className="w-full min-h-[64px] p-3 rounded-[6px] border border-rule bg-bg-card text-[13px]" value={props.entryCriteria} onChange={(e) => props.setEntryCriteria(e.target.value)} placeholder="What needs to be true to start this phase?" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 block mb-1.5">Exit criteria</span>
            <textarea className="w-full min-h-[64px] p-3 rounded-[6px] border border-rule bg-bg-card text-[13px]" value={props.exitCriteria} onChange={(e) => props.setExitCriteria(e.target.value)} placeholder="What needs to be true to mark this complete?" />
          </label>
        </div>
        <div className="p-4 border-t border-rule flex justify-end gap-2 bg-bg-elevated">
          <Button variant="secondary" size="sm" onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={props.onAdd} disabled={!props.name.trim() || !props.targetDate}>Add phase</Button>
        </div>
      </div>
    </div>
  );
}

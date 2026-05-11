"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, PriorityPill, TypePill, AiTag, toast } from "@/components/ui";
import { cn, statusLabel, relativeTime, formatDate } from "@/lib/utils";
import type { TicketStatus } from "@/lib/types";

interface Props {
  ticketKey: string;
  variant?: "page" | "slide-over";
  onClose?: () => void;
}

const STATUS_FLOW: Record<string, TicketStatus[]> = {
  engineering: ["scheduled", "in_progress", "review", "done"],
  tech_task: ["scheduled", "in_progress", "review", "done"],
  bug: ["scheduled", "in_progress", "review", "verifying", "verified"],
};

const REACTIONS = ["👍", "✅", "❤️", "🎉", "👀", "🤔", "❌", "🚀"];

export function TicketView({ ticketKey, variant = "page", onClose }: Props) {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const comments = useAppStore((s) => s.comments);
  const activity = useAppStore((s) => s.activity);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const toggleAC = useAppStore((s) => s.toggleAcceptanceCriterion);
  const addComment = useAppStore((s) => s.addComment);
  const reactToComment = useAppStore((s) => s.reactToComment);
  const user = useCurrentUser();

  const [tab, setTab] = useState<"activity" | "comments" | "links">("comments");
  const [commentDraft, setCommentDraft] = useState("");

  const ticket = tickets.find((t) => t.key === ticketKey);
  if (!ticket) {
    return (
      <div className="p-12 text-center">
        <div className="display text-display-s text-ink">Not found.</div>
        <p className="text-ink-3 mt-2">No ticket exists with key {ticketKey}.</p>
      </div>
    );
  }

  const project = projects.find((p) => p.id === ticket.projectId);
  const epic = project ? epics.find((e) => e.id === project.epicId) : undefined;
  const assignee = users.find((u) => u.id === ticket.assigneeId);
  const author = users.find((u) => u.id === ticket.authorId);
  const sprint = sprints.find((s) => s.id === ticket.sprintId);
  const flow = STATUS_FLOW[ticket.type] ?? STATUS_FLOW.engineering;
  const currentIdx = flow.indexOf(ticket.status);
  const ticketComments = comments.filter((c) => c.entityType === "ticket" && c.entityId === ticket.id);
  const ticketActivity = activity.filter((a) => a.entityType === "ticket" && a.entityId === ticket.id);

  const acAllDone = ticket.acceptanceCriteria.every((ac) => ac.done);
  const canAdvanceToDone =
    ticket.acceptanceCriteria.length === 0 || acAllDone;

  const next = currentIdx >= 0 && currentIdx < flow.length - 1 ? flow[currentIdx + 1] : null;

  const advance = () => {
    if (!user || !next) return;
    if (next === "done" && !canAdvanceToDone) {
      toast("Can't mark Done — some acceptance criteria are unchecked.", { kind: "error" });
      return;
    }
    const prev = ticket.status;
    setTicketStatus(ticket.id, next, user.id);
    toast(`${ticket.key} → ${statusLabel[next]}`, {
      undo: () => setTicketStatus(ticket.id, prev, user.id),
    });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/t/${ticket.key}`;
    navigator.clipboard?.writeText(url);
    toast(`Link copied — ${ticket.key}`, { kind: "success" });
  };

  const submitComment = () => {
    if (!commentDraft.trim() || !user) return;
    addComment({
      entityType: "ticket",
      entityId: ticket.id,
      parentCommentId: null,
      authorId: user.id,
      body: commentDraft.trim(),
      mentions: [],
    });
    setCommentDraft("");
    toast("Comment added", { kind: "success" });
  };

  return (
    <article className={cn(variant === "slide-over" ? "p-6" : "")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] font-mono text-ink-3 mb-3">
            {epic && (
              <>
                <Link href={`/e/${epic.key}`} className="hover:text-ink underline-offset-2 hover:underline">
                  {epic.key} · {epic.title}
                </Link>
                <span>›</span>
              </>
            )}
            {project && (
              <>
                <Link href={`/p/${project.key}`} className="hover:text-ink underline-offset-2 hover:underline">
                  {project.key}
                </Link>
                <span>›</span>
              </>
            )}
            <span className="text-ink">{ticket.key}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <TypePill t={ticket.type} />
            <PriorityPill p={ticket.priority} />
            <Pill variant={ticket.status === "done" || ticket.status === "verified" ? "ok" : "default"}>
              {statusLabel[ticket.status]}
            </Pill>
            {ticket.blocked && <Pill variant="danger">⏸ Blocked</Pill>}
          </div>
          <h1 className="display text-display-m text-ink leading-tight">{ticket.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={copyLink}>
            Copy link
          </Button>
          {next && (
            <Button variant="primary" size="sm" onClick={advance}>
              Move to {statusLabel[next]} →
            </Button>
          )}
          {variant === "slide-over" && (
            <Link href={`/t/${ticket.key}`} className="text-[12px] text-ink-3 hover:text-ink underline">
              Full page →
            </Link>
          )}
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="text-ink-3 hover:text-ink text-[18px]">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Body */}
        <div className="col-span-2 space-y-6">
          <section>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Description</div>
            <div className="prose prose-sm max-w-none text-ink-2 whitespace-pre-wrap text-[14px] leading-relaxed">
              {ticket.description}
            </div>
          </section>

          {ticket.type === "bug" && (
            <section className="bg-bg-elevated border border-rule rounded-[8px] p-4 space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Bug context</div>
              {ticket.severity && (
                <Row label="Severity" value={ticket.severity} />
              )}
              {ticket.reproSteps && (
                <Row label="Repro steps" value={<pre className="whitespace-pre-wrap text-[13px]">{ticket.reproSteps}</pre>} />
              )}
              {ticket.expectedVsActual && (
                <Row label="Expected vs Actual" value={<pre className="whitespace-pre-wrap text-[13px]">{ticket.expectedVsActual}</pre>} />
              )}
              {ticket.affectedScope && <Row label="Affected" value={ticket.affectedScope} />}
              {ticket.sentryLink && (
                <Row label="Sentry" value={<a href={ticket.sentryLink} className="text-accent underline">{ticket.sentryLink}</a>} />
              )}
            </section>
          )}

          {ticket.type === "tech_task" && (
            <section className="bg-bg-elevated border border-rule rounded-[8px] p-4 space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Tech task context</div>
              {ticket.blastRadius && <Row label="Blast radius" value={ticket.blastRadius} />}
              {ticket.rollbackPlan && <Row label="Rollback plan" value={ticket.rollbackPlan} />}
              {ticket.migrationWindow && <Row label="Migration window" value={ticket.migrationWindow} />}
            </section>
          )}

          {ticket.acceptanceCriteria.length > 0 && (
            <section>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">
                Acceptance criteria · {ticket.acceptanceCriteria.filter((a) => a.done).length} of {ticket.acceptanceCriteria.length}
              </div>
              <ul className="space-y-2">
                {ticket.acceptanceCriteria.map((ac) => (
                  <li key={ac.id}>
                    <label className="flex items-start gap-3 px-3 py-2 rounded-[6px] hover:bg-rule-soft cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ac.done}
                        onChange={() => user && toggleAC(ticket.id, ac.id, user.id)}
                        className="mt-1 w-4 h-4 accent-accent"
                      />
                      <span className={cn("text-[14px]", ac.done && "line-through text-ink-4")}>{ac.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tabs */}
          <section>
            <div className="flex border-b border-rule mb-4">
              {(["comments", "activity", "links"] as const).map((t) => (
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

            {tab === "comments" && (
              <div className="space-y-4">
                {ticketComments
                  .filter((c) => !c.parentCommentId)
                  .map((c) => (
                    <CommentThread
                      key={c.id}
                      comment={c}
                      replies={ticketComments.filter((x) => x.parentCommentId === c.id)}
                      onReact={(emoji) => user && reactToComment(c.id, emoji, user.id)}
                    />
                  ))}
                <div className="mt-4">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Write a comment… use @ to mention, type CDN-#### to reference"
                    className="w-full min-h-[80px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] placeholder:text-ink-4"
                  />
                  <div className="flex justify-end mt-2">
                    <Button variant="primary" size="sm" onClick={submitComment} disabled={!commentDraft.trim()}>
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {tab === "activity" && (
              <ol className="space-y-2">
                {ticketActivity.length === 0 && (
                  <li className="text-[13px] text-ink-3 italic">No activity yet.</li>
                )}
                {ticketActivity.map((a) => {
                  const actor = users.find((u) => u.id === a.actorId);
                  return (
                    <li key={a.id} className={cn("flex items-start gap-3 py-2 border-b border-rule-soft", a.aiInfluenced && "bg-ai-soft/40 rounded-[6px] px-2")}>
                      <Avatar user={actor} size="xs" />
                      <div className="flex-1 text-[13px]">
                        <span className="text-ink">{actor?.displayName}</span>{" "}
                        <span className="text-ink-3">
                          {a.action.replace("_", " ")}
                          {a.field ? ` ${a.field}` : ""}
                          {a.beforeValue && a.afterValue ? `: ${a.beforeValue} → ${a.afterValue}` : ""}
                        </span>
                        {a.aiInfluenced && (
                          <span className="ml-2 font-mono text-[10px] text-ai uppercase tracking-[0.06em]">✦ AI-influenced</span>
                        )}
                      </div>
                      <span className="text-[12px] text-ink-4 font-mono">{relativeTime(a.timestamp)}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {tab === "links" && (
              <div className="space-y-3">
                {ticket.linkedWork.length === 0 && (
                  <p className="text-[13px] text-ink-3 italic">Nothing linked yet.</p>
                )}
                {ticket.linkedWork.map((edge, i) => (
                  <Link
                    key={i}
                    href={`/t/${edge.ticketKey}`}
                    className="flex items-center gap-3 p-3 rounded-[6px] border border-rule hover:border-accent transition-colors duration-150"
                  >
                    <Pill variant="default">{edge.type.replace("_", " ")}</Pill>
                    <span className="font-mono text-[12px] text-ink-3">{edge.ticketKey}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <SidePanel title="Status">{statusLabel[ticket.status]}</SidePanel>
          <SidePanel title="Assignee">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar user={assignee} size="sm" />
                <span className="text-[13px] text-ink">{assignee.displayName}</span>
              </div>
            ) : (
              <span className="text-ink-3 italic text-[13px]">Unassigned</span>
            )}
          </SidePanel>
          <SidePanel title="Reporter">
            {author && (
              <div className="flex items-center gap-2">
                <Avatar user={author} size="sm" />
                <span className="text-[13px] text-ink">{author.displayName}</span>
              </div>
            )}
          </SidePanel>
          <SidePanel title="Sprint">{sprint?.key ?? "—"}</SidePanel>
          <SidePanel title="Story points">
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-ink">{ticket.storyPoints ?? "—"}</span>
              {ticket.aiSuggestedPoints && ticket.storyPoints == null && (
                <AiTag
                  label={String(ticket.aiSuggestedPoints.value)}
                  confidence={ticket.aiSuggestedPoints.confidence}
                  reasoning={ticket.aiSuggestedPoints.reasoning}
                />
              )}
            </div>
          </SidePanel>
          <SidePanel title="Priority">
            <PriorityPill p={ticket.priority} />
          </SidePanel>
          <SidePanel title="Created">{formatDate(ticket.createdAt)}</SidePanel>
          {ticket.tags.length > 0 && (
            <SidePanel title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {ticket.tags.map((t) => (
                  <Pill key={t} variant="neutral">{t}</Pill>
                ))}
              </div>
            </SidePanel>
          )}
        </aside>
      </div>
    </article>
  );
}

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{title}</div>
      <div className="text-[14px] text-ink">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
      <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 pt-0.5">{label}</div>
      <div className="text-[13px] text-ink-2">{value}</div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  onReact,
}: {
  comment: import("@/lib/types").Comment;
  replies: import("@/lib/types").Comment[];
  onReact: (emoji: string) => void;
}) {
  const users = useAppStore((s) => s.users);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const author = users.find((u) => u.id === comment.authorId);
  return (
    <div className="border border-rule rounded-[8px] p-3 bg-bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Avatar user={author} size="xs" />
        <span className="text-[13px] text-ink font-medium">{author?.displayName}</span>
        <span className="text-[11px] text-ink-3 font-mono">{relativeTime(comment.createdAt)}</span>
      </div>
      <div className="text-[14px] text-ink-2 whitespace-pre-wrap">{comment.body}</div>
      <div className="flex items-center gap-2 mt-2">
        {Object.entries(comment.reactions).map(([emoji, users]) => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="inline-flex items-center gap-1 px-2 h-6 rounded-[12px] bg-bg-elevated border border-rule hover:border-accent text-[12px]"
          >
            <span>{emoji}</span>
            <span className="font-mono text-[10px] text-ink-3">{users.length}</span>
          </button>
        ))}
        <button
          onClick={() => setShowReactionPicker((s) => !s)}
          className="inline-flex items-center px-2 h-6 rounded-[12px] border border-rule text-ink-3 hover:border-accent text-[12px]"
        >
          +
        </button>
        {showReactionPicker && (
          <div className="flex items-center gap-1 bg-bg-card border border-rule rounded-[8px] p-1 shadow-sm">
            {REACTIONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  onReact(r);
                  setShowReactionPicker(false);
                }}
                className="w-7 h-7 hover:bg-rule-soft rounded-[4px]"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
      {replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-rule-soft space-y-2">
          {replies.map((r) => {
            const ra = users.find((u) => u.id === r.authorId);
            return (
              <div key={r.id} className="py-1">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar user={ra} size="xs" />
                  <span className="text-[13px] text-ink font-medium">{ra?.displayName}</span>
                  <span className="text-[11px] text-ink-3 font-mono">{relativeTime(r.createdAt)}</span>
                </div>
                <div className="text-[13px] text-ink-2 whitespace-pre-wrap">{r.body}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

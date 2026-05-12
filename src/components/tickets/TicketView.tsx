"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Checkbox, Input, Modal, Pill, PriorityPill, TypePill, AiTag, Textarea, toast } from "@/components/ui";
import { cn, statusLabel, relativeTime, formatDate } from "@/lib/utils";
import { Ban, Lightbulb } from "lucide-react";
import type { TicketStatus, Comment } from "@/lib/types";
import { CommentThread } from "@/components/comments/CommentThread";
import { CommentComposer, UnsavedPill } from "@/components/comments/CommentComposer";
import { Markdown } from "@/components/Markdown";
import { LinkedWorkGraph } from "@/components/tickets/LinkedWorkGraph";
import { CopyLinkButton } from "@/components/CopyLinkMenu";
import { ContextMenu, useContextMenu } from "@/components/ui";
import { Tombstone } from "@/components/Tombstone";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

interface Props {
  ticketKey: string;
  variant?: "page" | "slide-over";
  onClose?: () => void;
}

const STATUS_FLOW: Record<string, TicketStatus[]> = {
  engineering: ["scheduled", "in_progress", "review", "done"],
  tech_task: ["scheduled", "in_progress", "review", "done"],
  bug: ["reproduced", "scheduled", "in_progress", "review", "verifying", "verified"],
};

export function TicketView({ ticketKey, variant = "page", onClose }: Props) {
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const comments = useAppStore((s) => s.comments);
  const activity = useAppStore((s) => s.activity);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const setTicketBlocked = useAppStore((s) => s.setTicketBlocked);
  const addStatusNote = useAppStore((s) => s.addStatusNote);
  const toggleAC = useAppStore((s) => s.toggleAcceptanceCriterion);
  const addComment = useAppStore((s) => s.addComment);
  const reactToComment = useAppStore((s) => s.reactToComment);
  const user = useCurrentUser();

  const [tab, setTab] = useState<"activity" | "comments" | "links">("comments");
  const [acCommentFor, setAcCommentFor] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockerKey, setBlockerKey] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const ticket = tickets.find((t) => t.key === ticketKey);

  useDocumentTitle(
    variant === "page"
      ? ticket
        ? `${ticket.key} · ${ticket.title}`
        : `${ticketKey} · Not found`
      : null
  );

  if (!ticket) {
    return <Tombstone kind="ticket" keyOrHandle={ticketKey} reason="not_found" />;
  }
  if (ticket.status === "cancelled" || ticket.status === "cannot_reproduce") {
    return (
      <div>
        <Tombstone kind="ticket" keyOrHandle={ticket.key} reason="archived" />
        <div className="max-w-3xl mx-auto opacity-50 pointer-events-none mt-8">
          <p className="text-center text-[12px] font-mono text-ink-3 mb-2">↓ Archived history below</p>
          <hr className="border-rule-soft" />
        </div>
      </div>
    );
  }

  const epic = epics.find((e) => e.id === ticket.epicId);
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

  const submitComment = (body: string, mentions: string[], attachments: import("@/lib/types").Attachment[]) => {
    if (!user) return;
    addComment({
      entityType: "ticket",
      entityId: ticket.id,
      parentCommentId: null,
      authorId: user.id,
      body,
      mentions,
      attachments,
    });
    toast("Comment added", { kind: "success" });
  };

  const submitAcComment = (acId: string, body: string, mentions: string[], attachments: import("@/lib/types").Attachment[]) => {
    if (!user) return;
    addComment({
      entityType: "ac_item",
      entityId: acId,
      parentCommentId: null,
      authorId: user.id,
      body,
      mentions,
      attachments,
    });
    setAcCommentFor(null);
    toast("Comment added to acceptance criterion");
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
            <span className="text-ink">{ticket.key}</span>
          </div>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <TypePill t={ticket.type} />
            <PriorityPill p={ticket.priority} />
            <Pill variant={ticket.status === "done" || ticket.status === "verified" ? "ok" : "default"}>
              {statusLabel[ticket.status]}
            </Pill>
            {ticket.blocked ? (
              <span className="inline-flex items-center gap-1.5">
                <Pill variant="danger">⏸ Blocked · {ticket.blocked.reason}</Pill>
                {ticket.blocked.blockerKey && (
                  <Link
                    href={`/t/${ticket.blocked.blockerKey}`}
                    className="font-mono text-[11px] text-ink-3 hover:text-accent underline-offset-2 hover:underline"
                  >
                    by {ticket.blocked.blockerKey}
                  </Link>
                )}
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setTicketBlocked(ticket.id, null, user.id);
                      toast(`${ticket.key} unblocked`, { kind: "success" });
                    }}
                    className="font-mono text-[10px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep ml-0.5"
                  >
                    Unblock
                  </button>
                )}
              </span>
            ) : user ? (
              <button
                type="button"
                onClick={() => {
                  setBlockReason("");
                  setBlockerKey("");
                  setBlockOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 h-6 rounded-[4px] border border-rule text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-danger hover:border-danger transition-colors duration-100"
                title="Mark this ticket as blocked"
              >
                <Ban className="h-3 w-3" />
                Mark blocked
              </button>
            ) : null}
          </div>
          <h1 className="display text-display-m text-ink leading-tight">{ticket.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyLinkButton ticketKey={ticket.key} ticketTitle={ticket.title} />
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
            {ticket.description ? (
              <Markdown source={ticket.description} />
            ) : (
              <p className="text-[13px] italic text-ink-3">No description yet.</p>
            )}
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
                {ticket.acceptanceCriteria.map((ac) => {
                  const acComments = comments.filter((c) => c.entityType === "ac_item" && c.entityId === ac.id && !c.parentCommentId);
                  return (
                    <AcItem
                      key={ac.id}
                      ac={ac}
                      ticketId={ticket.id}
                      ticketKey={ticket.key}
                      acCommentForId={acCommentFor}
                      setAcCommentFor={setAcCommentFor}
                      onToggle={() => user && toggleAC(ticket.id, ac.id, user.id)}
                      acCommentsCount={acComments.length}
                    >
                      {(acComments.length > 0 || acCommentFor === ac.id) && (
                        <div className="ml-7 mt-2 mb-3 space-y-2">
                          {acComments.map((c) => (
                            <CommentThread
                              key={c.id}
                              comment={c}
                              replies={comments.filter((x) => x.parentCommentId === c.id)}
                            />
                          ))}
                          {acCommentFor === ac.id && (
                            <CommentComposer
                              placeholder={`Comment on this acceptance criterion…`}
                              autoFocus
                              onSubmit={(body, mentions, atts) => submitAcComment(ac.id, body, mentions, atts)}
                              onCancel={() => setAcCommentFor(null)}
                              submitLabel="Comment"
                            />
                          )}
                        </div>
                      )}
                    </AcItem>
                  );
                })}
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
                    />
                  ))}
                {ticketComments.filter((c) => !c.parentCommentId).length === 0 && (
                  <p className="text-[13px] italic text-ink-3">No comments yet. Start the thread.</p>
                )}
                <div className="mt-4">
                  <CommentComposer onSubmit={submitComment} />
                </div>
              </div>
            )}

            {tab === "activity" && (
              <div>
                {user && (
                  <div className="bg-bg-elevated border border-rule rounded-[8px] p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-3.5 w-3.5 text-accent" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                        Post status update
                      </span>
                    </div>
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="What changed? e.g., Pairing with @kev tomorrow on the migration window."
                      className="min-h-[64px] text-[13px]"
                    />
                    <div className="flex items-center justify-between mt-2 gap-3">
                      <p className="text-[11px] text-ink-3 font-mono">
                        Visible to everyone watching this ticket. Logged with your name + timestamp.
                      </p>
                      <div className="flex items-center gap-2">
                        {noteDraft.trim() && <UnsavedPill />}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            if (!noteDraft.trim() || !user) return;
                            addStatusNote(ticket.id, noteDraft, user.id);
                            setNoteDraft("");
                            toast("Status update posted");
                          }}
                          disabled={!noteDraft.trim()}
                        >
                          Post update
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <ol className="space-y-2">
                  {ticketActivity.length === 0 && (
                    <li className="text-[13px] text-ink-3 italic">No activity yet.</li>
                  )}
                  {ticketActivity.map((a) => {
                    const actor = users.find((u) => u.id === a.actorId);
                    const isNote = a.action === "status_note";
                    const isBlock = a.action === "blocked" || a.action === "unblocked";
                    return (
                      <li
                        key={a.id}
                        className={cn(
                          "flex items-start gap-3 py-2 border-b border-rule-soft",
                          a.aiInfluenced && "bg-ai-soft/40 rounded-[6px] px-2",
                          isNote && "bg-accent-soft/30 rounded-[6px] px-2",
                          isBlock && "bg-danger-soft/30 rounded-[6px] px-2"
                        )}
                      >
                        <Avatar user={actor} size="xs" />
                        <div className="flex-1 text-[13px]">
                          {isNote ? (
                            <>
                              <span className="text-ink font-medium">{actor?.displayName}</span>{" "}
                              <span className="text-ink-3">posted a status update:</span>
                              <p className="text-ink-2 mt-1 whitespace-pre-wrap">{a.afterValue}</p>
                            </>
                          ) : isBlock ? (
                            <>
                              <span className="text-ink font-medium">{actor?.displayName}</span>{" "}
                              <span className="text-danger">
                                {a.action === "blocked" ? "marked blocked" : "removed the block"}
                              </span>
                              {a.afterValue && (
                                <span className="text-ink-2">: {a.afterValue}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-ink">{actor?.displayName}</span>{" "}
                              <span className="text-ink-3">
                                {a.action.replace("_", " ")}
                                {a.field ? ` ${a.field}` : ""}
                                {a.beforeValue && a.afterValue ? `: ${a.beforeValue} → ${a.afterValue}` : ""}
                              </span>
                            </>
                          )}
                          {a.aiInfluenced && (
                            <span className="ml-2 font-mono text-[10px] text-ai uppercase tracking-[0.06em]">
                              ✦ AI-influenced
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-ink-4 font-mono">{relativeTime(a.timestamp)}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {tab === "links" && <LinkedWorkGraph ticketKey={ticket.key} />}
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

      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Mark this ticket blocked" size="sm">
        <div className="space-y-3">
          <Textarea
            label="Reason"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="What's stopping it? (e.g., waiting on infra approval, upstream API not ready)"
            autoFocus
            className="min-h-[80px]"
          />
          <Input
            label="Blocker ticket (optional)"
            value={blockerKey}
            onChange={(e) => setBlockerKey(e.target.value)}
            placeholder="e.g., CDN-3504"
            hint="If another ticket is the blocker, naming it adds a ‘blocked_by’ link so the dependency surfaces in /me."
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setBlockOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (!user || !blockReason.trim()) return;
              setTicketBlocked(
                ticket.id,
                { reason: blockReason.trim(), blockerKey: blockerKey.trim() || undefined },
                user.id
              );
              setBlockOpen(false);
              toast(`${ticket.key} marked blocked`, { kind: "info" });
            }}
            disabled={!blockReason.trim()}
          >
            Mark blocked
          </Button>
        </div>
      </Modal>
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

function AcItem({
  ac,
  ticketId,
  ticketKey,
  acCommentForId,
  setAcCommentFor,
  onToggle,
  acCommentsCount,
  children,
}: {
  ac: import("@/lib/types").AcceptanceCriterion;
  ticketId: string;
  ticketKey: string;
  acCommentForId: string | null;
  setAcCommentFor: (id: string | null) => void;
  onToggle: () => void;
  acCommentsCount: number;
  children: React.ReactNode;
}) {
  const menu = useContextMenu();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const tickets = useAppStore((s) => s.tickets);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const currentUser = useCurrentUser();
  const linked = ac.linkedTicketKeys ?? [];

  const copyAcLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(`${window.location.origin}/t/${ticketKey}#ac-${ac.id}`);
    toast(`Link copied — ${ticketKey} · AC`);
  };

  const addLink = () => {
    const key = linkInput.trim().toUpperCase();
    if (!key.match(/^[A-Z]{2,4}-\d+$/) || !currentUser) return;
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    const newAcs = t.acceptanceCriteria.map((a) =>
      a.id === ac.id ? { ...a, linkedTicketKeys: Array.from(new Set([...(a.linkedTicketKeys ?? []), key])) } : a
    );
    setTicketField(ticketId, { acceptanceCriteria: newAcs }, currentUser.id);
    setLinkInput("");
    setLinkOpen(false);
    toast(`Linked ${key} to AC`);
  };

  const removeLink = (key: string) => {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t || !currentUser) return;
    const newAcs = t.acceptanceCriteria.map((a) =>
      a.id === ac.id ? { ...a, linkedTicketKeys: (a.linkedTicketKeys ?? []).filter((k) => k !== key) } : a
    );
    setTicketField(ticketId, { acceptanceCriteria: newAcs }, currentUser.id);
  };

  return (
    <li className="group" {...menu.bind}>
      <div className="flex items-start gap-3 px-3 py-2 rounded-[6px] hover:bg-rule-soft">
        <Checkbox
          checked={ac.done}
          onCheckedChange={() => onToggle()}
          className="mt-1"
        />
        <span className={cn("flex-1 text-[14px]", ac.done && "line-through text-ink-4")}>{ac.text}</span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <button
            onClick={() => setLinkOpen((s) => !s)}
            className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
          >
            Link
          </button>
          <button
            onClick={() => setAcCommentFor(acCommentForId === ac.id ? null : ac.id)}
            className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
          >
            {acCommentsCount > 0 ? `${acCommentsCount} comment${acCommentsCount === 1 ? "" : "s"}` : "Comment"}
          </button>
        </div>
      </div>
      {linked.length > 0 && (
        <div className="ml-7 flex flex-wrap gap-1.5 mt-1 mb-1">
          {linked.map((k) => {
            const t = tickets.find((x) => x.key === k);
            return (
              <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-rule bg-bg-elevated text-[12px]">
                <Link href={`/t/${k}`} className="font-mono text-ink-2 hover:text-accent">{k}</Link>
                {t && <span className="text-ink-4 truncate max-w-[200px]">· {t.title}</span>}
                <button onClick={() => removeLink(k)} className="ml-1 text-ink-4 hover:text-danger">×</button>
              </span>
            );
          })}
        </div>
      )}
      {linkOpen && (
        <div className="ml-7 mt-1 mb-2 flex items-center gap-2">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
            placeholder="CDN-3504"
            className="h-8 px-2 rounded-[4px] border border-rule bg-bg-card font-mono text-[12px] w-32"
            autoFocus
          />
          <Button variant="primary" size="sm" onClick={addLink} disabled={!linkInput.match(/^[A-Z]{2,4}-\d+$/)}>
            Link
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>Cancel</Button>
        </div>
      )}
      {children}
      <ContextMenu
        open={menu.open}
        position={menu.position}
        onClose={menu.close}
        items={[
          { label: ac.done ? "Mark not done" : "Mark done", onSelect: onToggle },
          { label: "Link to a ticket…", onSelect: () => setLinkOpen(true) },
          { label: "Comment on this AC", onSelect: () => setAcCommentFor(ac.id) },
          { label: "Copy link to AC", onSelect: copyAcLink, shortcut: "⌘⇧," },
        ]}
      />
    </li>
  );
}


"use client";

import { useState } from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Pill, toast, ContextMenu, useContextMenu } from "@/components/ui";
import { CommentBody } from "./CommentBody";
import { CommentComposer } from "./CommentComposer";
import { cn, relativeTime } from "@/lib/utils";
import type { Comment } from "@/lib/types";

const REACTIONS = ["👍", "✅", "❤️", "🎉", "👀", "🤔", "❌", "🚀"];

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const DELETE_WINDOW_MS = 60 * 60 * 1000; // 1h

interface ThreadProps {
  comment: Comment;
  replies: Comment[];
}

export function CommentThread({ comment, replies }: ThreadProps) {
  const user = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const addComment = useAppStore((s) => s.addComment);
  const editComment = useAppStore((s) => s.editComment);
  const deleteComment = useAppStore((s) => s.deleteComment);
  const resolveComment = useAppStore((s) => s.resolveComment);
  const unresolveComment = useAppStore((s) => s.unresolveComment);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const resolver = users.find((u) => u.id === comment.resolvedById);

  const submitReply = (body: string, mentions: string[], attachments: import("@/lib/types").Attachment[]) => {
    if (!user) return;
    addComment({
      entityType: comment.entityType,
      entityId: comment.entityId,
      parentCommentId: comment.id,
      authorId: user.id,
      body,
      mentions,
      attachments,
    });
    setReplying(false);
    toast("Reply posted");
  };

  if (comment.resolvedById && !showReplies) {
    return (
      <div className="border border-rule-soft rounded-[8px] p-3 bg-bg-elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            <span>✓ Resolved by {resolver?.displayName ?? "—"}</span>
          </div>
          <button onClick={() => setShowReplies(true)} className="text-[12px] text-accent hover:underline">
            Show thread
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-[8px] p-3", comment.resolvedById ? "border-rule-soft bg-bg-elevated" : "border-rule bg-bg-card")}>
      {comment.resolvedById && (
        <div className="flex items-center justify-between mb-2 -mt-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ok flex items-center gap-1">
            ✓ Resolved by {resolver?.displayName}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => unresolveComment(comment.id)} className="text-[11px] text-ink-3 hover:text-ink">Reopen</button>
            <button onClick={() => setShowReplies(false)} className="text-[11px] text-ink-3 hover:text-ink">Collapse</button>
          </div>
        </div>
      )}

      <CommentItem
        comment={comment}
        editing={editing}
        onEditStart={() => setEditing(true)}
        onEditCancel={() => setEditing(false)}
        onEditSave={(body) => {
          if (!user) return;
          editComment(comment.id, body, user.id);
          setEditing(false);
          toast("Comment edited");
        }}
        onDelete={() => {
          if (!user) return;
          deleteComment(comment.id, user.id);
          toast("Comment deleted", { kind: "info" });
        }}
      />

      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => setReplying((s) => !s)} className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink">
          Reply
        </button>
        {user && !comment.resolvedById && (
          <button
            onClick={() => {
              resolveComment(comment.id, user.id);
              toast("Thread resolved");
            }}
            className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ok"
          >
            Resolve
          </button>
        )}
        {replies.length > 0 && (
          <button onClick={() => setShowReplies((s) => !s)} className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink">
            {showReplies ? "Hide" : `Show ${replies.length}`} {replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {showReplies && replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-rule-soft space-y-3">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              editing={false}
              onEditStart={() => {}}
              onEditCancel={() => {}}
              onEditSave={() => {}}
              onDelete={() => user && deleteComment(r.id, user.id)}
            />
          ))}
        </div>
      )}

      {replying && (
        <div className="mt-3">
          <CommentComposer
            placeholder={`Reply to ${users.find((u) => u.id === comment.authorId)?.displayName ?? "thread"}…`}
            onSubmit={submitReply}
            onCancel={() => setReplying(false)}
            autoFocus
            submitLabel="Reply"
          />
        </div>
      )}
    </div>
  );
}

interface ItemProps {
  comment: Comment;
  editing: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: (body: string) => void;
  onDelete: () => void;
}

function CommentItem({ comment, editing, onEditStart, onEditCancel, onEditSave, onDelete }: ItemProps) {
  const user = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const reactToComment = useAppStore((s) => s.reactToComment);
  const author = users.find((u) => u.id === comment.authorId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menu = useContextMenu();

  const age = Date.now() - new Date(comment.createdAt).getTime();
  const canEdit = !comment.deletedAt && !comment.resolvedById && user?.id === comment.authorId && age < EDIT_WINDOW_MS;
  const canDelete = !comment.deletedAt && user?.id === comment.authorId && age < DELETE_WINDOW_MS;
  const isDeleted = comment.deletedAt != null || comment.body === "[deleted]";

  const copyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(`${window.location.href.split("#")[0]}#c-${comment.id}`);
    toast("Comment link copied");
  };
  const quote = () => {
    const text = `> ${comment.body.split("\n").join("\n> ")}\n\n`;
    navigator.clipboard?.writeText(text);
    toast("Quote copied — paste in reply");
  };

  return (
    <div {...menu.bind}><ContextMenu
        open={menu.open}
        position={menu.position}
        onClose={menu.close}
        items={[
          { label: "Copy link to comment", onSelect: copyLink, shortcut: "⌘⇧," },
          { label: "Quote in reply", onSelect: quote },
          ...(canEdit ? [{ label: "Edit", onSelect: onEditStart }] : []),
          ...(canDelete ? [{ label: "Delete", onSelect: onDelete, danger: true }] : []),
        ]}
      />
      <div className="flex items-center gap-2 mb-1">
        <Avatar user={author} size="xs" />
        <span className="text-[13px] text-ink font-medium">{author?.displayName}</span>
        <span className="text-[11px] text-ink-3 font-mono">{relativeTime(comment.createdAt)}</span>
        {comment.editedAt && <span className="text-[11px] text-ink-3 font-mono italic" title={`Edited ${new Date(comment.editedAt).toLocaleString()}`}>· edited</span>}
      </div>

      {editing ? (
        <CommentComposer
          initial={comment.body}
          autoFocus
          onSubmit={(body) => onEditSave(body)}
          onCancel={onEditCancel}
          submitLabel="Save"
        />
      ) : isDeleted ? (
        <div className="text-[13px] italic text-ink-4">[deleted]</div>
      ) : (
        <>
          <CommentBody body={comment.body} />
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {comment.attachments.map((a) => (
                a.type === "image" ? (
                  <a key={a.id} href={a.dataUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <img src={a.dataUrl} alt={a.name} className="max-h-48 rounded-[6px] border border-rule" />
                  </a>
                ) : a.type === "video" ? (
                  <video key={a.id} src={a.dataUrl} controls className="max-h-48 rounded-[6px] border border-rule" />
                ) : (
                  <a key={a.id} href={a.dataUrl} download={a.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-rule bg-bg-elevated hover:border-accent text-[12px]">
                    📎 {a.name} <span className="font-mono text-[10px] text-ink-4">{Math.round(a.size / 1024)}KB</span>
                  </a>
                )
              ))}
            </div>
          )}
        </>
      )}

      {!isDeleted && !editing && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {Object.entries(comment.reactions).map(([emoji, ids]) => (
            <button
              key={emoji}
              onClick={() => user && reactToComment(comment.id, emoji, user.id)}
              className={cn(
                "inline-flex items-center gap-1 px-2 h-6 rounded-[12px] border text-[12px]",
                ids.includes(user?.id ?? "")
                  ? "bg-accent-soft border-accent text-accent"
                  : "bg-bg-elevated border-rule hover:border-accent"
              )}
            >
              <span>{emoji}</span>
              <span className="font-mono text-[10px]">{ids.length}</span>
            </button>
          ))}
          <button
            onClick={() => setPickerOpen((s) => !s)}
            className="inline-flex items-center px-2 h-6 rounded-[12px] border border-rule text-ink-3 hover:border-accent text-[12px]"
          >
            +
          </button>
          {pickerOpen && (
            <div className="flex items-center gap-1 bg-bg-card border border-rule rounded-[8px] p-1 shadow-sm">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    user && reactToComment(comment.id, r, user.id);
                    setPickerOpen(false);
                  }}
                  className="w-7 h-7 hover:bg-rule-soft rounded-[4px]"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {canEdit && (
            <button onClick={onEditStart} className="ml-2 text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink">
              Edit
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-danger">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

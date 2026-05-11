"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Avatar, Button, toast } from "@/components/ui";
import type { Attachment } from "@/lib/types";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

interface Props {
  placeholder?: string;
  initial?: string;
  onSubmit: (body: string, mentions: string[], attachments: Attachment[]) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  submitLabel?: string;
}

export function CommentComposer({ placeholder = "Write a comment…", initial = "", onSubmit, onCancel, autoFocus, submitLabel = "Comment" }: Props) {
  const users = useAppStore((s) => s.users);
  const ref = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [caret, setCaret] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setBody(next);
    const pos = e.target.selectionStart ?? next.length;
    setCaret(pos);
    const slice = next.slice(0, pos);
    const m = slice.match(/(^|\s)@([a-zA-Z0-9._-]*)$/);
    if (m) {
      setPickerOpen(true);
      setPickerQuery(m[2].toLowerCase());
    } else {
      setPickerOpen(false);
      setPickerQuery("");
    }
  };

  const insertMention = (handle: string) => {
    const before = body.slice(0, caret);
    const after = body.slice(caret);
    const replaced = before.replace(/@[a-zA-Z0-9._-]*$/, `@${handle} `);
    const nextBody = replaced + after;
    setBody(nextBody);
    setPickerOpen(false);
    setPickerQuery("");
    requestAnimationFrame(() => {
      ref.current?.focus();
      const pos = replaced.length;
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const matches = users
    .filter((u) => u.handle.toLowerCase().startsWith(pickerQuery) || u.displayName.toLowerCase().includes(pickerQuery))
    .slice(0, 6);

  const fileToAttachment = (file: File): Promise<Attachment | null> =>
    new Promise((resolve) => {
      if (file.size > MAX_SIZE) {
        toast(`${file.name} is too large (25MB max)`, { kind: "error" });
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const type: Attachment["type"] = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
        resolve({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type,
          mime: file.type,
          size: file.size,
          dataUrl,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const out: Attachment[] = [];
    for (const f of list) {
      const a = await fileToAttachment(f);
      if (a) out.push(a);
    }
    if (out.length) {
      setAttachments((prev) => [...prev, ...out]);
      toast(`${out.length} attachment${out.length === 1 ? "" : "s"} added`);
    }
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!e.clipboardData?.files?.length) return;
    e.preventDefault();
    await handleFiles(e.clipboardData.files);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const submit = () => {
    const text = body.trim();
    if (!text && attachments.length === 0) return;
    const mentionRegex = /@([a-z][a-z0-9._-]+)/g;
    const mentions = Array.from(text.matchAll(mentionRegex)).map((m) => {
      const u = users.find((x) => x.handle === m[1]);
      return u?.id;
    }).filter(Boolean) as string[];
    onSubmit(text, mentions, attachments);
    setBody("");
    setAttachments([]);
  };

  return (
    <div className="relative">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={dragOver ? "rounded-[6px] ring-2 ring-accent" : ""}
      >
        <textarea
          ref={ref}
          value={body}
          onChange={onChange}
          onPaste={onPaste}
          placeholder={placeholder}
          className="w-full min-h-[80px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] placeholder:text-ink-4"
        />
      </div>
      {pickerOpen && matches.length > 0 && (
        <div className="absolute z-30 left-0 top-full mt-1 w-72 bg-bg-card border border-rule rounded-[8px] shadow-lg p-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-3 py-1.5">Mention</div>
          {matches.map((u) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(u.handle)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-left hover:bg-rule-soft"
            >
              <Avatar user={u} size="xs" />
              <div className="min-w-0">
                <div className="text-[13px] text-ink truncate">{u.displayName}</div>
                <div className="font-mono text-[11px] text-ink-3">@{u.handle}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} a={a} onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-ink-3">@ mention · CDN-#### link · paste or drop files (25MB max)</span>
          <label className="text-[11px] font-mono text-accent hover:underline cursor-pointer">
            + File
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </label>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          )}
          <Button variant="primary" size="sm" onClick={submit} disabled={!body.trim() && attachments.length === 0}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ a, onRemove }: { a: Attachment; onRemove: () => void }) {
  if (a.type === "image") {
    return (
      <div className="relative inline-block group">
        <img src={a.dataUrl} alt={a.name} className="h-16 rounded-[4px] border border-rule" />
        <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-bg-card border border-rule rounded-full text-[11px] hover:border-danger hover:text-danger">×</button>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-[4px] border border-rule bg-bg-elevated">
      <span className="font-mono text-[11px] text-ink-3">{a.type === "video" ? "🎬" : "📎"}</span>
      <span className="text-[12px] text-ink truncate max-w-[180px]">{a.name}</span>
      <button onClick={onRemove} className="text-ink-4 hover:text-danger text-[12px]">×</button>
    </div>
  );
}

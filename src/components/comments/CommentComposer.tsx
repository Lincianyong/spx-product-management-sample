"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Avatar, Button } from "@/components/ui";

interface Props {
  placeholder?: string;
  initial?: string;
  onSubmit: (body: string, mentions: string[]) => void;
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

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setBody(next);
    const pos = e.target.selectionStart ?? next.length;
    setCaret(pos);

    // detect "@..." up to current caret
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
    // restore focus
    requestAnimationFrame(() => {
      ref.current?.focus();
      const pos = replaced.length;
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const matches = users
    .filter((u) => u.handle.toLowerCase().startsWith(pickerQuery) || u.displayName.toLowerCase().includes(pickerQuery))
    .slice(0, 6);

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    const mentionRegex = /@([a-z][a-z0-9._-]+)/g;
    const mentions = Array.from(text.matchAll(mentionRegex)).map((m) => {
      const u = users.find((x) => x.handle === m[1]);
      return u?.id;
    }).filter(Boolean) as string[];
    onSubmit(text, mentions);
    setBody("");
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={body}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full min-h-[80px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] placeholder:text-ink-4"
      />
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
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] font-mono text-ink-3">Use @ for mentions, CDN-#### to link</span>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          )}
          <Button variant="primary" size="sm" onClick={submit} disabled={!body.trim()}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

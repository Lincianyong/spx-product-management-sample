"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui";

interface Props {
  ticketKey: string;
  ticketTitle: string;
  origin?: string;
}

type Format = "canonical" | "short" | "markdown" | "lark";

const LABELS: Record<Format, string> = {
  canonical: "Canonical URL",
  short: "Short link",
  markdown: "Markdown link",
  lark: "Lark mention",
};

const STORAGE_KEY = "cadence:copy-link-format";

export function CopyLinkButton({ ticketKey, ticketTitle, origin }: Props) {
  const [open, setOpen] = useState(false);
  const [pressTimer, setPressTimer] = useState<number | null>(null);
  const [lastFormat, setLastFormat] = useState<Format>("canonical");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setLastFormat(saved as Format);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const baseOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  const format = (f: Format): string => {
    const url = `${baseOrigin}/t/${ticketKey}`;
    switch (f) {
      case "canonical":
        return url;
      case "short":
        return `/${ticketKey}`;
      case "markdown":
        return `[${ticketKey}](${url}) - ${ticketTitle}`;
      case "lark":
        return `<a href="${url}">${ticketKey}</a> ${ticketTitle}`;
    }
  };

  const copy = (f: Format) => {
    const text = format(f);
    if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(text);
    }
    setLastFormat(f);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, f);
    toast(`Link copied - ${ticketKey} · ${LABELS[f]}`);
    setOpen(false);
  };

  const onMouseDown = () => {
    const t = window.setTimeout(() => setOpen(true), 400);
    setPressTimer(t);
  };
  const onMouseUp = () => {
    if (pressTimer) window.clearTimeout(pressTimer);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onClick={(e) => {
          if (!open) {
            // Quick click → use last format
            e.preventDefault();
            copy(lastFormat);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-sm bg-bg-elevated border border-rule text-ink hover:bg-rule-soft"
      >
        ⎘ Copy link
        <span className="font-mono text-[10px] text-ink-4">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-bg-card border border-rule rounded-[8px] shadow-lg p-1">
          {(["canonical", "short", "markdown", "lark"] as Format[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => copy(f)}
              className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-[6px] text-ink-2 hover:bg-rule-soft hover:text-ink"
            >
              <span>{LABELS[f]}</span>
              {lastFormat === f && <span className="font-mono text-[10px] text-accent">last used</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

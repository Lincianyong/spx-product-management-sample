"use client";

import Link from "next/link";
import { Button, Pill } from "@/components/ui";

interface Props {
  kind: "ticket" | "epic" | "project" | "user";
  keyOrHandle: string;
  reason?: "not_found" | "archived" | "deleted";
}

const LABEL: Record<Props["kind"], string> = {
  ticket: "ticket",
  epic: "Epic",
  project: "Project",
  user: "user",
};

const REASON_COPY: Record<NonNullable<Props["reason"]>, string> = {
  not_found: "doesn't exist or never did.",
  archived: "was archived. Its history is preserved but it's no longer in active circulation.",
  deleted: "was deleted by an admin.",
};

export function Tombstone({ kind, keyOrHandle, reason = "not_found" }: Props) {
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3 flex items-center justify-center gap-3">
        <span className="block w-8 h-px bg-rule" />
        <span>Tombstone</span>
      </div>
      <h1 className="display text-display-l text-ink mb-4">
        Nothing <em className="text-accent">to see</em> here.
      </h1>
      <p className="text-[15px] text-ink-2">
        The {LABEL[kind]} <span className="font-mono text-ink">{keyOrHandle}</span> {REASON_COPY[reason]}
      </p>
      <div className="flex items-center justify-center gap-2 my-6">
        <Pill variant="neutral">{reason}</Pill>
      </div>
      <Link href="/">
        <Button variant="primary" size="sm">Go to your home →</Button>
      </Link>
    </div>
  );
}

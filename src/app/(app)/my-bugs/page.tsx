"use client";

import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Pill, PriorityPill, TypePill, Button } from "@/components/ui";
import { cn, statusLabel, relativeTime } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "default" | "ok" | "warn" | "danger" | "ai"> = {
  triage: "warn",
  reproduced: "ai",
  backlog: "default",
  scheduled: "default",
  in_progress: "default",
  review: "default",
  verifying: "ai",
  verified: "ok",
  done: "ok",
  cancelled: "danger",
  cannot_reproduce: "danger",
};

export default function MyBugsPage() {
  const tickets = useAppStore((s) => s.tickets);
  const user = useCurrentUser();

  if (!user) return null;

  // Bugs I filed
  const mine = tickets.filter((t) => t.type === "bug" && t.authorId === user.id);

  const grouped = {
    open: mine.filter((t) => !["done", "verified", "cancelled", "cannot_reproduce"].includes(t.status)),
    closed: mine.filter((t) => ["done", "verified", "cancelled", "cannot_reproduce"].includes(t.status)),
  };

  return (
    <div>
      <PageHeader
        eyebrow="Guest · my bug reports"
        title={
          <>
            What <em className="text-accent">you've filed</em>.
          </>
        }
        lede="Every bug you've reported, with status. PM triage usually lands within 4h (P0), 24h (P1), or 1 week (P2)."
        actions={
          <Link href="/report-bug">
            <Button variant="primary" size="sm">File another bug →</Button>
          </Link>
        }
      />

      {mine.length === 0 ? (
        <EmptyState
          title="Nothing filed yet."
          body="When you report a bug from this account, it'll appear here with status."
          action={
            <Link href="/report-bug">
              <Button variant="primary" size="sm">File a bug</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <Section title={`Open · ${grouped.open.length}`} tickets={grouped.open} />
          {grouped.closed.length > 0 && <Section title={`Closed · ${grouped.closed.length}`} tickets={grouped.closed} closed />}
        </div>
      )}
    </div>
  );
}

function Section({ title, tickets, closed }: { title: string; tickets: import("@/lib/types").Ticket[]; closed?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">{title}</div>
      {tickets.length === 0 ? (
        <p className="italic text-[13px] text-ink-3">Nothing here.</p>
      ) : (
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/t/${t.key}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-b border-rule-soft last:border-b-0 hover:bg-bg-elevated",
                closed && "opacity-70"
              )}
            >
              <span className="font-mono text-[12px] text-ink-3 w-20">{t.key}</span>
              <TypePill t={t.type} />
              <PriorityPill p={t.priority} />
              <span className="flex-1 text-[14px] text-ink truncate">{t.title}</span>
              <Pill variant={STATUS_VARIANT[t.status] ?? "default"} dot>{statusLabel[t.status]}</Pill>
              <span className="font-mono text-[11px] text-ink-3 w-20 text-right">{relativeTime(t.createdAt)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

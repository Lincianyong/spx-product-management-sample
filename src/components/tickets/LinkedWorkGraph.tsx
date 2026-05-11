"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill, PriorityPill, TypePill } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

const EDGE_VARIANT = {
  blocks: { label: "blocks ↓", color: "danger" as const, direction: "out" },
  blocked_by: { label: "blocked by ↑", color: "warn" as const, direction: "in" },
  relates_to: { label: "relates to ↔", color: "neutral" as const, direction: "out" },
  duplicates: { label: "duplicates", color: "info" as const, direction: "out" },
};

export function LinkedWorkGraph({ ticketKey }: { ticketKey: string }) {
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);

  const ticket = tickets.find((t) => t.key === ticketKey);
  if (!ticket) return null;

  // Outbound edges from this ticket
  const outbound = ticket.linkedWork;

  // Inbound edges — other tickets that link TO this one
  const inbound: { type: string; from: string }[] = [];
  for (const other of tickets) {
    for (const edge of other.linkedWork) {
      if (edge.ticketKey === ticket.key) {
        // Flip the edge type for the inbound perspective
        const flipped =
          edge.type === "blocks" ? "blocked_by" :
          edge.type === "blocked_by" ? "blocks" :
          edge.type;
        inbound.push({ type: flipped, from: other.key });
      }
    }
  }

  const total = outbound.length + inbound.length;
  if (total === 0) {
    return (
      <p className="text-[13px] text-ink-3 italic">
        Nothing linked yet. Use the linked-work field in the sidebar to add relationships.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inbound (these depend on / block this) */}
      {inbound.length > 0 && (
        <Section title="Inbound" subtitle="Tickets that depend on this work">
          <div className="grid grid-cols-1 gap-2">
            {inbound.map((edge, i) => (
              <EdgeRow key={`in_${i}`} edgeType={edge.type} targetKey={edge.from} direction="from" />
            ))}
          </div>
        </Section>
      )}

      {/* Center: this ticket */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 border-t border-rule-soft" aria-hidden />
        <div className="relative flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-accent text-bg-card border border-accent-deep shadow-sm">
            <span className="font-mono text-[11px] tracking-[0.06em]">{ticket.key}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">this ticket</span>
          </div>
        </div>
      </div>

      {/* Outbound */}
      {outbound.length > 0 && (
        <Section title="Outbound" subtitle="What this ticket depends on or relates to">
          <div className="grid grid-cols-1 gap-2">
            {outbound.map((edge, i) => (
              <EdgeRow key={`out_${i}`} edgeType={edge.type} targetKey={edge.ticketKey} direction="to" />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{title}</span>
        <span className="text-[12px] text-ink-3">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function EdgeRow({ edgeType, targetKey, direction }: { edgeType: string; targetKey: string; direction: "from" | "to" }) {
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const t = tickets.find((x) => x.key === targetKey);
  const v = EDGE_VARIANT[edgeType as keyof typeof EDGE_VARIANT] ?? { label: edgeType, color: "neutral" as const };

  if (!t) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-[8px] border border-rule bg-bg-card">
        <Pill variant={v.color}>{v.label}</Pill>
        <span className="font-mono text-[12px] text-ink-4">{targetKey} · not found</span>
      </div>
    );
  }

  const assignee = users.find((u) => u.id === t.assigneeId);

  return (
    <Link href={`/t/${t.key}`} className="flex items-center gap-3 p-3 rounded-[8px] border border-rule bg-bg-card hover:border-accent hover:-translate-y-px transition-all duration-150">
      <Pill variant={v.color}>{v.label}</Pill>
      <span className="font-mono text-[12px] text-ink-3">{t.key}</span>
      <TypePill t={t.type} />
      <PriorityPill p={t.priority} />
      <span className="flex-1 text-[14px] text-ink truncate">{t.title}</span>
      <Pill variant={t.status === "done" || t.status === "verified" ? "ok" : "default"}>{statusLabel[t.status]}</Pill>
      <Avatar user={assignee} size="xs" />
    </Link>
  );
}

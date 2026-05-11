"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { useAppStore, useCurrentUser } from "@/lib/store";
import type { Ticket } from "@/lib/types";

export default function MyWorkPage() {
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const user = useCurrentUser();
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!user) return null;

  const activeSprint = sprints.find((s) => s.state === "active");

  const thisSprint = tickets.filter(
    (t) => t.assigneeId === user.id && t.sprintId === activeSprint?.id && t.status !== "done" && t.status !== "verified"
  );

  const upNext = tickets.filter(
    (t) => t.assigneeId === user.id && t.status === "backlog"
  );

  const blockingThem = tickets.filter((t) => {
    // tickets I'm assigned to that block other in-progress work
    return t.assigneeId === user.id && tickets.some((other) => other.linkedWork.some((edge) => edge.type === "blocked_by" && edge.ticketKey === t.key) && other.status !== "done");
  });

  const blockingMe = tickets.filter((t) => {
    return t.assigneeId === user.id && t.linkedWork.some((edge) => edge.type === "blocked_by");
  });

  return (
    <div>
      <PageHeader
        eyebrow={`S-08 · My Work · ${user.displayName}`}
        title={
          <>
            What's <em className="text-accent">on your plate</em>.
          </>
        }
        lede={`${activeSprint?.key ?? "No active sprint"} · ${thisSprint.length} tickets in flight, ${upNext.length} waiting in your queue.`}
      />

      <div className="grid grid-cols-2 gap-6">
        <Panel title="This sprint" count={thisSprint.length} eyebrow="On now">
          {thisSprint.length === 0 ? (
            <EmptyEcho text="Nothing on your plate this sprint. Pick up an ad-hoc, or grab from the queue below." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {thisSprint.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Up next" count={upNext.length} eyebrow="In queue">
          {upNext.length === 0 ? (
            <EmptyEcho text="Nothing queued for you. Backlog is the next stop." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {upNext.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="You're blocking" count={blockingThem.length} eyebrow="Downstream waits" accent="warn">
          {blockingThem.length === 0 ? (
            <EmptyEcho text="No one is waiting on you. Quiet morning." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {blockingThem.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Blocking you" count={blockingMe.length} eyebrow="Upstream stuck" accent="danger">
          {blockingMe.length === 0 ? (
            <EmptyEcho text="Nothing right now. You're free to move." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {blockingMe.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function Panel({ title, eyebrow, count, accent, children }: { title: string; eyebrow: string; count: number; accent?: "warn" | "danger"; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{eyebrow}</div>
          <h3 className="display text-display-s text-ink mt-1">{title}</h3>
        </div>
        <span className="font-mono text-[12px] text-ink-3">{count} {count === 1 ? "ticket" : "tickets"}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyEcho({ text }: { text: string }) {
  return <p className="text-[13px] italic text-ink-3 py-4">{text}</p>;
}

"use client";

import Link from "next/link";
import { Avatar, PriorityPill, TypePill, Pill } from "@/components/ui";
import type { Ticket } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  ticket: Ticket;
  onOpen?: (key: string) => void;
  compact?: boolean;
  dragHandleProps?: Record<string, unknown>;
  className?: string;
}

export function TicketCard({ ticket, onOpen, compact, dragHandleProps, className }: Props) {
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.projects);
  const assignee = users.find((u) => u.id === ticket.assigneeId) ?? null;
  const project = projects.find((p) => p.id === ticket.projectId);

  const cardClasses = cn(
    "block text-left bg-bg-card border border-rule rounded-[8px] p-3.5 w-full",
    "hover:border-accent hover:-translate-y-px transition-all duration-150 shadow-sm",
    ticket.status === "done" && "opacity-70",
    className
  );

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypePill t={ticket.type} />
          <span className="font-mono text-[11px] text-ink-3">{ticket.key}</span>
        </div>
        <PriorityPill p={ticket.priority} />
      </div>
      <div className="text-[14px] text-ink leading-snug line-clamp-2">{ticket.title}</div>
      {!compact && project && (
        <div className="text-[11px] font-mono text-ink-3 mt-2 truncate">{project.title}</div>
      )}
      {ticket.blocked && (
        <div className="mt-2 px-2 py-1 rounded-[4px] bg-danger-soft text-danger text-[11px]">
          ⏸ Blocked · {ticket.blocked.reason}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1.5">
          {ticket.storyPoints != null && (
            <span className="font-mono text-[11px] text-ink-3 px-1.5 py-0.5 rounded-[4px] bg-bg-elevated">
              {ticket.storyPoints} pt
            </span>
          )}
          {ticket.carryOver && <Pill variant="warn">Carry-over</Pill>}
        </div>
        <Avatar user={assignee} size="xs" />
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={() => onOpen(ticket.key)} {...dragHandleProps} className={cardClasses}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={`/t/${ticket.key}`} {...dragHandleProps} className={cardClasses}>
      {inner}
    </Link>
  );
}

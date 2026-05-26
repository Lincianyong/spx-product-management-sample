"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, PriorityPill, TypePill, Pill, ContextMenu, useContextMenu, toast } from "@/components/ui";
import type { Ticket, TicketStatus } from "@/lib/types";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn, statusLabel } from "@/lib/utils";

interface Props {
  ticket: Ticket;
  onOpen?: (key: string) => void;
  compact?: boolean;
  dragHandleProps?: Record<string, unknown>;
  className?: string;
  showQuickActions?: boolean;
}

const NEXT_STATUS_FOR_TYPE: Record<string, TicketStatus[]> = {
  engineering: ["scheduled", "in_progress", "review", "done"],
  tech_task: ["scheduled", "in_progress", "review", "done"],
  bug: ["scheduled", "in_progress", "review", "verifying", "verified"],
};

export function TicketCard({ ticket, onOpen, compact, dragHandleProps, className, showQuickActions = true }: Props) {
  const router = useRouter();
  const users = useAppStore((s) => s.users);
  const projects = useAppStore((s) => s.epics);
  const recentlyMoved = useAppStore((s) => s.recentlyMovedTicketId);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const flashTicket = useAppStore((s) => s.flashTicket);
  const user = useCurrentUser();
  const [hovered, setHovered] = useState(false);
  const menu = useContextMenu();

  const assignee = users.find((u) => u.id === ticket.assigneeId) ?? null;
  const project = projects.find((p) => p.id === ticket.epicId);

  const flow = NEXT_STATUS_FOR_TYPE[ticket.type] ?? NEXT_STATUS_FOR_TYPE.engineering;
  const idx = flow.indexOf(ticket.status);
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;

  const cardClasses = cn(
    "relative block text-left bg-bg-card border border-rule rounded-[8px] p-3.5 w-full",
    "hover:border-accent hover:-translate-y-px transition-all duration-150 shadow-sm",
    ticket.status === "done" && "opacity-70",
    recentlyMoved === ticket.id && "animate-accent-flash",
    className
  );

  const copyLink = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(`${window.location.origin}/t/${ticket.key}`);
      toast(`Link copied - ${ticket.key}`);
    }
  };

  const advance = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!next || !user) return;
    const prev = ticket.status;
    setTicketStatus(ticket.id, next, user.id);
    flashTicket(ticket.id);
    toast(`${ticket.key} → ${statusLabel[next]}`, {
      undo: () => setTicketStatus(ticket.id, prev, user.id),
    });
  };

  const menuItems = [
    next
      ? { label: `Move to ${statusLabel[next]}`, onSelect: () => advance(), shortcut: "↵" }
      : { label: "Done · no further state", onSelect: () => {}, danger: false },
    { label: "Copy link", onSelect: () => copyLink(), shortcut: "⌘⇧," },
    { label: "Open in new tab", onSelect: () => window.open(`/t/${ticket.key}`, "_blank") },
    { divider: true, label: "", onSelect: () => {} },
    { label: "Open full page →", onSelect: () => router.push(`/t/${ticket.key}`) },
  ];

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
      <div className="flex items-center justify-end gap-2 mt-3">
        <Avatar user={assignee} size="xs" />
      </div>

      {/* Hover quick-action strip */}
      {showQuickActions && hovered && (
        <div
          className="absolute left-2 right-2 bottom-2 flex items-center justify-between gap-1 px-1 py-1 bg-bg-card/95 backdrop-blur-sm border-t border-rule-soft rounded-b-[8px] opacity-0 animate-[fadeIn_120ms_ease-out_forwards]"
          style={{ animation: "fadeIn 120ms ease-out forwards" }}
        >
          {next && (
            <button
              onClick={advance}
              className="text-[11px] font-mono uppercase tracking-[0.06em] text-accent hover:text-accent-deep px-1.5 py-0.5 rounded-[4px] hover:bg-accent-soft"
              title={`Move to ${statusLabel[next]}`}
            >
              → {statusLabel[next]}
            </button>
          )}
          <button
            onClick={copyLink}
            className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink px-1.5 py-0.5 rounded-[4px] hover:bg-rule-soft"
            title="Copy link"
          >
            ⎘ Link
          </button>
        </div>
      )}
    </>
  );

  const commonHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    ...menu.bind,
  };

  return (
    <>
      {onOpen ? (
        <button type="button" onClick={() => onOpen(ticket.key)} {...dragHandleProps} className={cardClasses} {...commonHandlers}>
          {inner}
        </button>
      ) : (
        <Link href={`/t/${ticket.key}`} {...dragHandleProps} className={cardClasses} {...commonHandlers}>
          {inner}
        </Link>
      )}
      <ContextMenu open={menu.open} position={menu.position} items={menuItems} onClose={menu.close} />
    </>
  );
}

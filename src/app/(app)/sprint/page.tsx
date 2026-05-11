"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { TicketCard } from "@/components/tickets/TicketCard";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button, Pill } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui";
import type { TicketStatus, Ticket } from "@/lib/types";
import { STATUS_TRANSITIONS, TRANSITIONS_REQUIRING_CONFIRM } from "@/lib/types";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

interface Column {
  status: TicketStatus;
  label: string;
}

export default function SprintBoardPage() {
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const flashTicket = useAppStore((s) => s.flashTicket);
  const selectedSprintId = useAppStore((s) => s.selectedSprintId);
  const selectSprint = useAppStore((s) => s.selectSprint);
  const user = useCurrentUser();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<"me" | "pod" | "all">(
    user?.role === "engineer" || user?.role === "designer" ? "me" : user?.role === "em" ? "pod" : "all"
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeSprint = sprints.find((s) => s.state === "active");
  const viewingSprint = selectedSprintId
    ? sprints.find((s) => s.id === selectedSprintId) ?? activeSprint
    : activeSprint;

  useDocumentTitle(viewingSprint ? `Sprint Board · ${viewingSprint.key}` : "Sprint Board");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(() => {
    if (!viewingSprint) return [];
    const inSprint = tickets.filter((t) => t.sprintId === viewingSprint.id);
    if (filter === "me") return inSprint.filter((t) => t.assigneeId === user?.id);
    if (filter === "pod" && user?.pod) {
      // pod filter via project pod
      return inSprint.filter((t) => {
        const proj = useAppStore.getState().projects.find((p) => p.id === t.projectId);
        return proj?.pod === user.pod;
      });
    }
    return inSprint;
  }, [tickets, viewingSprint, filter, user]);

  const scheduled = filtered.filter((t) => t.status === "scheduled");
  const inProgress = filtered.filter((t) => t.status === "in_progress");
  const review = filtered.filter((t) => t.status === "review");
  const verifying = filtered.filter((t) => t.status === "verifying");
  const done = filtered.filter((t) => t.status === "done" || t.status === "verified");

  const columns: { status: TicketStatus; label: string; tickets: Ticket[] }[] = [
    { status: "scheduled", label: "Scheduled", tickets: scheduled },
    { status: "in_progress", label: "In Progress", tickets: inProgress },
    { status: "review", label: "Review", tickets: review },
    { status: "verifying", label: "Verifying · Bug", tickets: verifying },
    { status: "done", label: "Done", tickets: done },
  ];

  const adHoc = filtered.filter((t) => t.projectId === null);

  const committedPoints = viewingSprint?.committedPoints ?? 0;
  const shippedPoints = done.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const progressPct = committedPoints > 0 ? Math.round((shippedPoints / committedPoints) * 100) : 0;
  const daysRemaining = viewingSprint
    ? Math.max(0, Math.ceil((new Date(viewingSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || !user) return;
    const ticketId = active.id as string;
    const newStatus = over.id as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Validate the transition
    const allowed = STATUS_TRANSITIONS[ticket.type]?.[ticket.status] ?? [];
    if (!allowed.includes(newStatus)) {
      toast(`${ticket.key} · ${ticket.status} → ${newStatus} isn't allowed for ${ticket.type}`, { kind: "error" });
      return;
    }
    // Done-gate AC: if moving to done, all AC must be checked
    if (newStatus === "done" && ticket.acceptanceCriteria.length > 0 && !ticket.acceptanceCriteria.every((ac) => ac.done)) {
      toast(`Can't move ${ticket.key} to Done — acceptance criteria are unchecked.`, { kind: "error" });
      return;
    }

    const isRegression = TRANSITIONS_REQUIRING_CONFIRM.some((t) => t.from === ticket.status && t.to === newStatus);
    const prev = ticket.status;
    setTicketStatus(ticketId, newStatus, user.id);
    flashTicket(ticketId);
    toast(
      isRegression
        ? `↩ ${ticket.key} regressed → ${labelFor(newStatus)} (audit logged)`
        : `${ticket.key} → ${labelFor(newStatus)}`,
      { undo: () => setTicketStatus(ticketId, prev, user.id, { force: true }), kind: isRegression ? "info" : "success" }
    );
  };

  if (!viewingSprint) {
    return (
      <EmptyState
        title="No sprint to show."
        body="Once a sprint is committed (Stage 4c), it lands here. Until then, /planning is where the action is."
      />
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`S-07 · Sprint Board · ${viewingSprint.key}`}
        title={
          <>
            <em className="text-accent">Sprint</em>, in motion.
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={viewingSprint.id}
              onChange={(e) => selectSprint(e.target.value === activeSprint?.id ? null : e.target.value)}
              className="h-8 px-2 text-[12px] font-mono uppercase tracking-[0.06em] rounded-[6px] border border-rule bg-bg-card text-ink-2"
              aria-label="Sprint switcher"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.key} · {s.state}
                </option>
              ))}
            </select>
            <FilterChip active={filter === "me"} onClick={() => setFilter("me")}>
              Me
            </FilterChip>
            <FilterChip active={filter === "pod"} onClick={() => setFilter("pod")}>
              Pod
            </FilterChip>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
          </div>
        }
      />

      {/* Sprint progress mini-bar */}
      <div className="bg-bg-card border border-rule rounded-[8px] px-5 py-4 mb-6 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Sprint</span>
          <span className="display text-[18px] text-ink">{viewingSprint.key}</span>
          {viewingSprint.state !== "active" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 px-2 py-0.5 rounded-[12px] border border-rule">
              {viewingSprint.state}
            </span>
          )}
        </div>
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-[12px] text-ink-3 mb-1.5">
            <span>{shippedPoints} of {committedPoints} pts shipped</span>
            <span className="font-mono">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-rule-soft rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="font-mono text-[12px] text-ink-3">
          {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setDraggingId(e.active.id as string)} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {columns.map((col) => (
            <BoardColumn key={col.status} status={col.status} label={col.label} tickets={col.tickets} onOpen={setOpenKey} />
          ))}
        </div>

        {adHoc.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warn">Ad-hoc lane</span>
              <Pill variant="warn">{adHoc.length} unplanned in sprint</Pill>
              <span className="text-[12px] text-ink-3">Counts against capacity. Visible by design.</span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {adHoc.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} className="ring-1 ring-warn-soft" />
              ))}
            </div>
          </div>
        )}

        <DragOverlay>
          {draggingId && (
            <div className="opacity-90 rotate-[-2deg]">
              <TicketCard ticket={tickets.find((t) => t.id === draggingId)!} compact />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 h-8 rounded-[6px] text-[12px] font-mono uppercase tracking-[0.06em] border transition-colors duration-100",
        active ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
      )}
    >
      {children}
    </button>
  );
}

function BoardColumn({ status, label, tickets, onOpen }: { status: TicketStatus; label: string; tickets: Ticket[]; onOpen: (k: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-[8px] p-3 min-h-[200px] transition-colors duration-150",
        isOver ? "bg-accent-soft" : "bg-bg-elevated"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
        <span className="font-mono text-[11px] text-ink-3">{tickets.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tickets.map((t) => (
          <DraggableTicket key={t.id} ticket={t} onOpen={onOpen} />
        ))}
        {tickets.length === 0 && (
          <div className="text-[12px] text-ink-4 italic px-1 py-2">Nothing here yet.</div>
        )}
      </div>
    </div>
  );
}

function DraggableTicket({ ticket, onOpen }: { ticket: Ticket; onOpen: (k: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: ticket.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Spread listeners on a card-level wrapper so drag works, click still opens via onOpen */}
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <TicketCard ticket={ticket} onOpen={onOpen} compact />
      </div>
    </div>
  );
}

function labelFor(s: TicketStatus): string {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

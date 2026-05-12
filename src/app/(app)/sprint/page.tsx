"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { TicketCard } from "@/components/tickets/TicketCard";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  Button,
  Input,
  Modal,
  Pill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TicketStatus, Ticket } from "@/lib/types";
import { STATUS_TRANSITIONS, TRANSITIONS_REQUIRING_CONFIRM } from "@/lib/types";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { DRAG_SOURCE_OPACITY, DRAG_OVERLAY_CLASS } from "@/lib/drag-styles";
import { UnsavedPill } from "@/components/comments/CommentComposer";

type SprintFilter = "me" | "all";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "scheduled", label: "Scheduled" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "verifying", label: "Verifying · Bug" },
  { status: "done", label: "Done" },
];

// "done" column also surfaces "verified" tickets — both terminal states.
function ticketColumnKey(s: TicketStatus): TicketStatus | null {
  if (s === "verified") return "done";
  if (COLUMNS.find((c) => c.status === s)) return s;
  return null;
}

export default function SprintBoardPage() {
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const setPersonalRanks = useAppStore((s) => s.setPersonalRanks);
  const flashTicket = useAppStore((s) => s.flashTicket);
  const selectedSprintId = useAppStore((s) => s.selectedSprintId);
  const selectSprint = useAppStore((s) => s.selectSprint);
  const savedViews = useAppStore((s) => s.savedViews);
  const saveView = useAppStore((s) => s.saveView);
  const deleteView = useAppStore((s) => s.deleteView);
  const user = useCurrentUser();

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<SprintFilter>(
    user?.role === "engineer" ? "me" : "all"
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  // Modal state for dragging an ad-hoc ticket onto a workflow column: we
  // need an Epic to attach the ticket to (force-add into the sprint).
  const [adhocAssign, setAdhocAssign] = useState<{ ticketId: string; destCol: TicketStatus; epicId: string } | null>(null);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const epics = useAppStore((s) => s.epics);

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
    return inSprint;
  }, [tickets, viewingSprint, filter, user]);

  // Columns show only tickets that have a parent Epic. Ad-hoc tickets live
  // exclusively in the ad-hoc lane below, so each ticket renders once and
  // dnd-kit isn't asked to track two sortable ids for the same row.
  const byColumn = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {} as Record<TicketStatus, Ticket[]>;
    for (const col of COLUMNS) map[col.status] = [];
    for (const t of filtered) {
      if (t.epicId === null) continue;
      const k = ticketColumnKey(t.status);
      if (!k) continue;
      map[k].push(t);
    }
    for (const col of COLUMNS) {
      map[col.status].sort((a, b) => (a.personalRank ?? 99) - (b.personalRank ?? 99));
    }
    return map;
  }, [filtered]);

  const adHoc = useMemo(
    () =>
      filtered
        .filter((t) => t.epicId === null)
        .sort((a, b) => (a.personalRank ?? 99) - (b.personalRank ?? 99)),
    [filtered]
  );
  const doneList = byColumn.done;
  const committedPoints = viewingSprint?.committedPoints ?? 0;
  const shippedPoints = doneList.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const progressPct = committedPoints > 0 ? Math.round((shippedPoints / committedPoints) * 100) : 0;
  const daysRemaining = viewingSprint
    ? Math.max(0, Math.ceil((new Date(viewingSprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // ─── Drag handling: combined status-change + intra-column reorder ──
  // The board acts as a multi-container sortable. The dragged ticket's
  // source column is derived from its current status; the destination
  // column is derived from `over` — either a column header (drop on
  // empty area) or another ticket (drop next to a sibling).
  const onDragStart = (e: DragStartEvent) => setDraggingId(e.active.id as string);

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || !user) return;
    const ticketId = active.id as string;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const wasAdhoc = ticket.epicId === null;
    const sourceCol: TicketStatus | "adhoc" = wasAdhoc ? "adhoc" : (ticketColumnKey(ticket.status) ?? "scheduled");
    // `over.id` is either a column-status string ("scheduled" | … | "adhoc")
    // or another ticket id (sibling sortable item).
    const overId = over.id as string;
    let destCol: TicketStatus | "adhoc" | null = null;
    let destIndex: number | null = null;

    if (overId === "adhoc") {
      destCol = "adhoc";
      destIndex = adHoc.length;
    } else {
      const colHit = COLUMNS.find((c) => c.status === overId);
      if (colHit) {
        destCol = colHit.status;
        destIndex = byColumn[destCol].length;
      } else {
        const overTicket = tickets.find((t) => t.id === overId);
        if (overTicket) {
          if (overTicket.epicId === null) {
            destCol = "adhoc";
            destIndex = adHoc.findIndex((t) => t.id === overId);
          } else {
            destCol = ticketColumnKey(overTicket.status);
            if (destCol) destIndex = byColumn[destCol].findIndex((t) => t.id === overId);
          }
        }
      }
    }
    if (!destCol) return;

    // ───────────── Ad-hoc lane drops ─────────────
    // Drop INTO ad-hoc lane: strip the parent Epic (ticket becomes ad-hoc).
    if (destCol === "adhoc") {
      if (sourceCol === "adhoc") {
        const oldIndex = adHoc.findIndex((t) => t.id === ticketId);
        if (oldIndex === -1 || destIndex === null || oldIndex === destIndex) return;
        const next = arrayMove(adHoc, oldIndex, destIndex);
        setPersonalRanks(next.map((t, i) => ({ ticketId: t.id, rank: i + 1 })));
        return;
      }
      setTicketField(ticketId, { epicId: null }, user.id);
      flashTicket(ticketId);
      toast(`${ticket.key} marked ad-hoc · counts against sprint capacity as spillover`, { kind: "info" });
      return;
    }

    // Drop FROM ad-hoc lane onto a workflow column: needs an Epic, so we
    // prompt the user instead of auto-guessing one.
    if (sourceCol === "adhoc") {
      const firstEpic = epics[0];
      if (!firstEpic) {
        toast("No Epics exist to attach this ticket to.", { kind: "error" });
        return;
      }
      setAdhocAssign({ ticketId, destCol, epicId: firstEpic.id });
      return;
    }

    // Same-column reorder → persist personalRank
    if (sourceCol === destCol) {
      const colList = byColumn[destCol];
      const oldIndex = colList.findIndex((t) => t.id === ticketId);
      if (oldIndex === -1 || destIndex === null || oldIndex === destIndex) return;
      const next = arrayMove(colList, oldIndex, destIndex);
      setPersonalRanks(next.map((t, i) => ({ ticketId: t.id, rank: i + 1 })));
      return;
    }

    // Cross-column → status change (with all the safety checks)
    const allowed = STATUS_TRANSITIONS[ticket.type]?.[ticket.status] ?? [];
    if (!allowed.includes(destCol)) {
      toast(`${ticket.key} · ${ticket.status} → ${destCol} isn't allowed for ${ticket.type}`, { kind: "error" });
      return;
    }
    if (
      destCol === "done" &&
      ticket.acceptanceCriteria.length > 0 &&
      !ticket.acceptanceCriteria.every((ac) => ac.done)
    ) {
      toast(`Can't move ${ticket.key} to Done — acceptance criteria are unchecked.`, { kind: "error" });
      return;
    }
    const isRegression = TRANSITIONS_REQUIRING_CONFIRM.some(
      (tr) => tr.from === ticket.status && tr.to === destCol
    );
    const prev = ticket.status;
    setTicketStatus(ticketId, destCol, user.id);
    flashTicket(ticketId);
    // Insert into target column at destIndex, push others down.
    if (destIndex !== null) {
      const next = [...byColumn[destCol].filter((t) => t.id !== ticketId)];
      next.splice(destIndex, 0, ticket);
      setPersonalRanks(next.map((t, i) => ({ ticketId: t.id, rank: i + 1 })));
    }
    toast(
      isRegression
        ? `↩ ${ticket.key} regressed → ${labelFor(destCol)} (audit logged)`
        : `${ticket.key} → ${labelFor(destCol)}`,
      {
        undo: () => setTicketStatus(ticketId, prev, user.id, { force: true }),
        kind: isRegression ? "info" : "success",
      }
    );
  };

  // ─── Saved views ──────────────────────────────────────────────────
  const mine = user ? savedViews.filter((v) => v.ownerId === user.id && v.surface === "sprint") : [];
  // Baseline = the filter snapshot the current view is anchored to. Set on
  // mount (or when a saved view is applied). When `filter` diverges from
  // baseline, the board is "edited / unsaved".
  const [baselineFilter, setBaselineFilter] = useState<SprintFilter>(filter);
  const viewDirty = filter !== baselineFilter;
  const applyView = (id: string) => {
    const v = savedViews.find((x) => x.id === id);
    if (!v || v.surface !== "sprint" || !v.sprintFilter) return;
    setFilter(v.sprintFilter);
    setBaselineFilter(v.sprintFilter);
  };
  const submitSaveView = () => {
    if (!user || !saveName.trim()) return;
    saveView({
      name: saveName.trim(),
      surface: "sprint",
      ownerId: user.id,
      sprintFilter: filter,
    });
    setBaselineFilter(filter);
    setSaveOpen(false);
    setSaveName("");
    toast(`View "${saveName.trim()}" saved`);
  };

  // Sync filter from a query param when arriving via a saved-view link.
  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get("view");
    if (v) applyView(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <Select
              value={viewingSprint.id}
              onValueChange={(v) => selectSprint(v === activeSprint?.id ? null : v)}
            >
              <SelectTrigger size="sm" className="w-44 font-mono uppercase tracking-[0.06em]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.key} · {s.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FilterChip active={filter === "me"} onClick={() => setFilter("me")}>Me</FilterChip>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
          </div>
        }
      />

      {/* Toolbar: saved views (left) · Save view + New ticket (right) */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {mine.length > 0 && (
          <select
            onChange={(e) => e.target.value && applyView(e.target.value)}
            defaultValue=""
            className="h-8 px-2 text-[12px] font-mono uppercase tracking-[0.06em] rounded-[6px] border border-rule bg-bg-card text-ink-2"
            aria-label="Saved views"
          >
            <option value="">Saved views…</option>
            {mine.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
        {mine.length > 0 &&
          mine.map((v) => (
            <button
              key={v.id}
              onClick={() => applyView(v.id)}
              className="group inline-flex items-center gap-2 pl-2 pr-1 h-7 rounded-[6px] border border-rule bg-bg-card text-[12px] hover:border-accent"
            >
              <span className="text-ink-2">{v.name}</span>
              <span className="font-mono text-[10px] text-ink-4 uppercase">{v.sprintFilter}</span>
              <span
                role="button"
                onClick={(ev) => { ev.stopPropagation(); deleteView(v.id); toast("View deleted", { kind: "info" }); }}
                className="px-1 text-ink-4 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </span>
            </button>
          ))}
        <div className="ml-auto flex items-center gap-2">
          {viewDirty && <UnsavedPill label="Edited" />}
          <Button variant="secondary" size="sm" onClick={() => setSaveOpen(true)}>Save view</Button>
          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-1.5 font-medium px-3 py-1.5 text-[13px] rounded-sm bg-accent text-bg-card hover:bg-accent-deep border border-accent transition-colors duration-100"
          >
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Link>
        </div>
      </div>

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-5 gap-4 items-start">
          {COLUMNS.map((col) => (
            <BoardColumn
              key={col.status}
              status={col.status}
              label={col.label}
              tickets={byColumn[col.status]}
              onOpen={setOpenKey}
            />
          ))}
        </div>

        <AdhocLane tickets={adHoc} onOpen={setOpenKey} />

        <DragOverlay>
          {draggingId && (
            <div className={DRAG_OVERLAY_CLASS}>
              <TicketCard ticket={tickets.find((t) => t.id === draggingId)!} compact />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save this view" size="sm">
        <Input
          label="Name"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="e.g., Me only · current sprint"
          autoFocus
        />
        <div className="mt-3 font-mono text-[11px] text-ink-3">
          Sprint board · filter = {filter}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={submitSaveView} disabled={!saveName.trim()}>Save</Button>
        </div>
      </Modal>

      <Modal
        open={adhocAssign !== null}
        onClose={() => setAdhocAssign(null)}
        title="Force-add to an Epic"
        size="sm"
      >
        {adhocAssign && (
          <>
            <p className="text-[13px] text-ink-2 mb-3">
              Pick an Epic for this ticket. It moves out of the ad-hoc lane and into <span className="font-mono">{labelFor(adhocAssign.destCol)}</span>.
            </p>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Epic</span>
              <Select
                value={adhocAssign.epicId}
                onValueChange={(v) => setAdhocAssign({ ...adhocAssign, epicId: v })}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {epics.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>{ep.key} · {ep.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <p className="font-mono text-[11px] text-warn mt-3">
              ⚠ This counts against committed scope. Sprint capacity may go over plan.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setAdhocAssign(null)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!user || !adhocAssign) return;
                  const t = tickets.find((x) => x.id === adhocAssign.ticketId);
                  if (!t) { setAdhocAssign(null); return; }
                  setTicketField(
                    adhocAssign.ticketId,
                    { epicId: adhocAssign.epicId },
                    user.id
                  );
                  // Apply the status transition if it's allowed; otherwise just attach
                  // the Epic and let the user advance status separately.
                  const allowed = STATUS_TRANSITIONS[t.type]?.[t.status] ?? [];
                  if (allowed.includes(adhocAssign.destCol) || t.status === adhocAssign.destCol) {
                    setTicketStatus(adhocAssign.ticketId, adhocAssign.destCol, user.id);
                  }
                  flashTicket(adhocAssign.ticketId);
                  const ep = epics.find((e) => e.id === adhocAssign.epicId);
                  toast(`${t.key} force-added to ${ep?.key ?? "epic"} · ${labelFor(adhocAssign.destCol)}`, { kind: "info" });
                  setAdhocAssign(null);
                }}
              >
                Attach + force-add →
              </Button>
            </div>
          </>
        )}
      </Modal>
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

function BoardColumn({
  status,
  label,
  tickets,
  onOpen,
}: {
  status: TicketStatus;
  label: string;
  tickets: Ticket[];
  onOpen: (k: string) => void;
}) {
  return (
    <SortableContext id={status} items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <BoardColumnInner status={status} label={label} tickets={tickets} onOpen={onOpen} />
    </SortableContext>
  );
}

// Inner component so we can wire useDroppable for empty columns too.
function BoardColumnInner({
  status,
  label,
  tickets,
  onOpen,
}: {
  status: TicketStatus;
  label: string;
  tickets: Ticket[];
  onOpen: (k: string) => void;
}) {
  const { setNodeRef, isOver } = useColumnDroppable(status);
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
          <SortableTicket key={t.id} ticket={t} onOpen={onOpen} />
        ))}
        {tickets.length === 0 && (
          <div className="text-[12px] text-ink-4 italic px-1 py-2">Drop tickets here.</div>
        )}
      </div>
    </div>
  );
}

// Each column also needs to accept drops on its empty area; use the same id
// space so onDragEnd resolves to the column status when no ticket is under
// the pointer.
function useColumnDroppable(id: string) {
  return useDroppable({ id });
}

// Ad-hoc lane: tickets in this sprint with no parent Epic. Spans the full
// row, is its own SortableContext so cards drag inside it AND can be
// dragged out into a workflow column (which triggers the assign-epic
// modal in the parent).
function AdhocLane({ tickets, onOpen }: { tickets: Ticket[]; onOpen: (k: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "adhoc" });
  return (
    <SortableContext id="adhoc" items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          "mt-8 rounded-[8px] border border-dashed p-3 transition-colors duration-150",
          isOver ? "border-warn bg-warn-soft" : "border-warn/40 bg-warn-soft/30"
        )}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warn">Ad-hoc lane</span>
          <Pill variant="warn">{tickets.length} unplanned in sprint</Pill>
          <span className="text-[12px] text-ink-3">
            Drag in to mark a ticket ad-hoc · drag out to attach an Epic (force-add).
          </span>
        </div>
        {tickets.length === 0 ? (
          <div className="text-[12px] italic text-ink-3 px-1 py-3">
            Drop a ticket here to mark it ad-hoc.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {tickets.map((t) => (
              <SortableTicket key={t.id} ticket={t} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </SortableContext>
  );
}

function SortableTicket({ ticket, onOpen }: { ticket: Ticket; onOpen: (k: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? DRAG_SOURCE_OPACITY : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <TicketCard ticket={ticket} onOpen={onOpen} compact />
      </div>
    </div>
  );
}

function labelFor(s: TicketStatus): string {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

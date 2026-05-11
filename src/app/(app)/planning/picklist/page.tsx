"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, PriorityPill, TypePill, toast } from "@/components/ui";
import { SortableList, DragHandle } from "@/components/SortableList";
import { cn, formatDate } from "@/lib/utils";
import type { Ticket } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function PicklistPage() {
  useDocumentTitle("Picklist · Stage 4a");
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setPickedForSprint = useAppStore((s) => s.setPickedForSprint);
  const setPicklistRanks = useAppStore((s) => s.setPicklistRanks);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const user = useCurrentUser();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"priority" | "created" | "rank">("rank");

  const planningSprint = sprints.find((s) => s.state === "planning");
  const lastSprint = sprints.find((s) => s.state === "closed");

  const candidates = useMemo(() => {
    const carryOvers = tickets.filter((t) => t.carryOver && t.status !== "done" && t.status !== "verified");
    const backlog = tickets.filter((t) => t.status === "backlog");
    return [...carryOvers, ...backlog];
  }, [tickets]);

  const picked = candidates.filter((t) => t.pickedForSprint);
  const unpicked = candidates.filter((t) => !t.pickedForSprint);

  const sortedPicked = useMemo(() => {
    return [...picked].sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99));
  }, [picked]);

  const sortedUnpicked = useMemo(() => {
    const arr = [...unpicked];
    if (sortBy === "priority") {
      const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
      arr.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === "created") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "rank") {
      arr.sort((a, b) => (a.backlogRank ?? 99) - (b.backlogRank ?? 99));
    }
    return arr;
  }, [unpicked, sortBy]);

  const togglePicked = (ticketId: string, checked: boolean) => {
    setPickedForSprint([ticketId], checked);
    if (planningSprint) {
      setTicketField(ticketId, { sprintId: checked ? planningSprint.id : null }, user?.id ?? "");
    }
    if (checked) {
      // Append rank to end
      const nextRank = (sortedPicked.length || 0) + 1;
      setPicklistRanks([{ ticketId, rank: nextRank }]);
    }
  };

  const onReorderPicked = (next: Ticket[]) => {
    const ranks = next.map((t, idx) => ({ ticketId: t.id, rank: idx + 1 }));
    setPicklistRanks(ranks);
  };

  const send = () => {
    if (picked.length === 0) {
      toast("Pick at least one ticket first.", { kind: "error" });
      return;
    }
    toast(`Sent ${picked.length} tickets → Engineering Sprint Planning →`, { kind: "success" });
    router.push("/planning/estimation");
  };

  return (
    <div>
      <PageHeader
        eyebrow={`S-04 · Stage 4a · ${planningSprint?.key ?? "—"}`}
        title={
          <>
            <em className="text-accent">Pick</em> what matters.
          </>
        }
        lede="PM, alone. ~30 min. Click the checkbox to add to the sprint. Drag (⠿) to re-rank the picked list."
      />

      <PlanningNav />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Sort backlog by</span>
          {(["rank", "priority", "created"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border",
                sortBy === s ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={send}>
          Send {picked.length} to Engineering Sprint Planning →
        </Button>
      </div>

      {lastSprint && (
        <div className="bg-bg-elevated border border-rule rounded-[8px] px-4 py-2.5 mb-4 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Last sprint</span>
          <span className="text-[13px] text-ink-2">
            {lastSprint.key} shipped {lastSprint.shippedPoints} of {lastSprint.committedPoints} pts ·
            {" "}{candidates.filter((t) => t.carryOver).length} tickets carrying over
          </span>
        </div>
      )}

      {/* Picked list (sortable) */}
      <div className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Picked · drag (⠿) to re-rank</div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <PickRowHeader rank />
          {sortedPicked.length === 0 ? (
            <p className="px-4 py-6 text-[13px] italic text-ink-3">No picks yet. Check a ticket below to add it.</p>
          ) : (
            <SortableList
              items={sortedPicked}
              onReorder={onReorderPicked}
              renderItem={(t, handle) => (
                <PickRow
                  t={t}
                  rank={sortedPicked.findIndex((x) => x.id === t.id) + 1}
                  onToggle={() => togglePicked(t.id, false)}
                  handle={handle}
                  projects={projects}
                  users={users}
                  picked
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Unpicked candidates */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Available backlog</div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <PickRowHeader />
          {sortedUnpicked.length === 0 ? (
            <p className="px-4 py-6 text-[13px] italic text-ink-3">Nothing else available. You've picked everything ready.</p>
          ) : (
            sortedUnpicked.map((t) => (
              <PickRow
                key={t.id}
                t={t}
                rank={null}
                onToggle={() => togglePicked(t.id, true)}
                projects={projects}
                users={users}
                picked={false}
              />
            ))
          )}
        </div>
      </div>

      <div className="text-[12px] text-ink-3 font-mono mt-3">
        Picked: {picked.length} · Carry-over: {candidates.filter((t) => t.carryOver).length}
      </div>
    </div>
  );
}

function PickRowHeader({ rank }: { rank?: boolean } = {}) {
  return (
    <div className="grid grid-cols-[40px_40px_40px_100px_1fr_140px_140px_100px_80px] gap-3 px-4 py-3 bg-bg-elevated border-b border-rule font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
      <span></span>
      <span></span>
      <span>{rank ? "#" : ""}</span>
      <span>Key</span>
      <span>Title</span>
      <span>Parent</span>
      <span>Author</span>
      <span>Created</span>
      <span>Priority</span>
    </div>
  );
}

function PickRow({
  t,
  rank,
  onToggle,
  handle,
  projects,
  users,
  picked,
}: {
  t: Ticket;
  rank: number | null;
  onToggle: () => void;
  handle?: Record<string, unknown>;
  projects: import("@/lib/types").Project[];
  users: import("@/lib/types").User[];
  picked: boolean;
}) {
  const project = projects.find((p) => p.id === t.projectId);
  const author = users.find((u) => u.id === t.authorId);
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_40px_40px_100px_1fr_140px_140px_100px_80px] gap-3 px-4 py-3 items-center border-b border-rule-soft",
        picked ? "bg-accent-soft/40" : "bg-bg-card hover:bg-bg-elevated"
      )}
    >
      {handle ? <DragHandle handleProps={handle} className="text-[16px]" /> : <span />}
      <input type="checkbox" checked={picked} onChange={onToggle} className="w-4 h-4 accent-accent" />
      <span className="font-mono text-[12px] text-ink-3">{rank ?? "—"}</span>
      <span className="font-mono text-[12px] text-ink">{t.key}</span>
      <span className="text-[14px] text-ink truncate flex items-center gap-2">
        <TypePill t={t.type} />
        <span className="truncate">{t.title}</span>
        {t.carryOver && <Pill variant="warn">Carry-over</Pill>}
      </span>
      <span className="font-mono text-[12px] text-ink-3 truncate">{project?.key ?? "ad-hoc"}</span>
      <span className="flex items-center gap-1.5">
        <Avatar user={author} size="xs" />
        <span className="text-[12px] text-ink-3 truncate">{author?.displayName}</span>
      </span>
      <span className="font-mono text-[12px] text-ink-3">{formatDate(t.createdAt)}</span>
      <PriorityPill p={t.priority} />
    </div>
  );
}

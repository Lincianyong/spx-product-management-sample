"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, PriorityPill, TypePill, toast } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

export default function PicklistPage() {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setPickedForSprint = useAppStore((s) => s.setPickedForSprint);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const user = useCurrentUser();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"priority" | "created" | "rank">("priority");

  const planningSprint = sprints.find((s) => s.state === "planning");

  // Carry-overs from the last sprint (incomplete) + backlog candidates
  const candidates = useMemo(() => {
    const carryOvers = tickets.filter((t) => t.carryOver && t.status !== "done" && t.status !== "verified");
    const backlog = tickets.filter((t) => t.status === "backlog");
    return [...carryOvers, ...backlog];
  }, [tickets]);

  const sorted = useMemo(() => {
    const arr = [...candidates];
    if (sortBy === "priority") {
      const order = { P0: 0, P1: 1, P2: 2 } as const;
      arr.sort((a, b) => order[a.priority] - order[b.priority]);
    } else if (sortBy === "created") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return arr;
  }, [candidates, sortBy]);

  const lastSprint = sprints.find((s) => s.state === "closed");
  const pickedCount = candidates.filter((t) => t.pickedForSprint).length;

  const toggle = (ticketId: string, checked: boolean) => {
    setPickedForSprint([ticketId], checked);
    if (planningSprint) {
      // attach to planning sprint when picked
      setTicketField(ticketId, { sprintId: checked ? planningSprint.id : null }, user?.id ?? "");
    }
  };

  const send = () => {
    if (pickedCount === 0) {
      toast("Pick at least one ticket first.", { kind: "error" });
      return;
    }
    toast("Sent to Engineering Sprint Planning →", { kind: "success" });
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
        lede="PM, alone. Roughly 30 minutes. Sort, select ~10 tickets, rank. Carry-overs are already in."
      />

      <PlanningNav />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Sort by</span>
          {(["priority", "created", "rank"] as const).map((s) => (
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
          Send {pickedCount} to Engineering Sprint Planning →
        </Button>
      </div>

      {/* Last sprint context */}
      {lastSprint && (
        <div className="bg-bg-elevated border border-rule rounded-[8px] px-4 py-2.5 mb-4 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Last sprint</span>
          <span className="text-[13px] text-ink-2">
            {lastSprint.key} shipped {lastSprint.shippedPoints} of {lastSprint.committedPoints} pts ·
            {" "}{candidates.filter((t) => t.carryOver).length} tickets carrying over
          </span>
        </div>
      )}

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 w-12 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">#</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Key</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Type</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Title</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Author</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Created</th>
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Priority</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => {
              const project = projects.find((p) => p.id === t.projectId);
              const author = users.find((u) => u.id === t.authorId);
              return (
                <tr key={t.id} className={cn("border-b border-rule-soft hover:bg-bg-elevated", t.pickedForSprint && "bg-accent-soft/40")}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={t.pickedForSprint}
                      onChange={(e) => toggle(t.id, e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{t.pickedForSprint ? idx + 1 : "—"}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">{t.key}</td>
                  <td className="px-4 py-3"><TypePill t={t.type} /></td>
                  <td className="px-4 py-3 text-[14px] text-ink max-w-md truncate">
                    {t.title} {t.carryOver && <Pill variant="warn" className="ml-2">Carry-over</Pill>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{project?.key ?? "ad-hoc"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar user={author} size="xs" />
                      <span className="text-[12px] text-ink-3">{author?.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{formatDate(t.createdAt)}</td>
                  <td className="px-4 py-3"><PriorityPill p={t.priority} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[12px] text-ink-3 font-mono mt-3">
        Picked: {pickedCount} · Carry-over: {candidates.filter((t) => t.carryOver).length}
      </div>
    </div>
  );
}

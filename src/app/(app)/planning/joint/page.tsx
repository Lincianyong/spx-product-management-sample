"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { AiTag, Avatar, Button, Pill, PriorityPill, TypePill, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function JointPlanningPage() {
  useDocumentTitle("Joint Planning · Stage 4c");
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const commitSprint = useAppStore((s) => s.commitSprint);
  const user = useCurrentUser();
  const router = useRouter();
  const [commitOpen, setCommitOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const planningSprint = sprints.find((s) => s.state === "planning");
  const picked = useMemo(
    () => tickets.filter((t) => t.pickedForSprint).sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99)),
    [tickets]
  );

  const engineers = users.filter((u) => (u.role === "engineer" || u.role === "designer") && u.capacityPoints > 0);

  const loadByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of picked) {
      if (t.assigneeId && t.storyPoints) {
        map[t.assigneeId] = (map[t.assigneeId] ?? 0) + t.storyPoints;
      }
    }
    return map;
  }, [picked]);

  const totalPoints = picked.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const totalCapacity = engineers.reduce((acc, u) => acc + u.capacityPoints, 0);
  const ratio = totalCapacity > 0 ? totalPoints / totalCapacity : 0;

  // VR validations (G6 gate)
  const allHavePoints = picked.every((t) => t.storyPoints != null);
  const allHaveAssignee = picked.every((t) => t.assigneeId);
  const noInactive = !picked.some((t) => {
    const a = users.find((u) => u.id === t.assigneeId);
    return a?.status === "ooo";
  });
  const capacityOk = ratio <= 1.25;
  const hasOne = picked.length >= 1;

  const canCommit = allHavePoints && allHaveAssignee && noInactive && capacityOk && hasOne;
  const overCapacity = ratio > 1;

  const setAssignee = (ticketId: string, userId: string | null) => {
    setTicketField(ticketId, { assigneeId: userId }, user?.id ?? "");
  };

  const commit = () => {
    if (!planningSprint || !canCommit) return;
    if (confirmText.trim() !== planningSprint.key) {
      toast(`Type ${planningSprint.key} to confirm.`, { kind: "error" });
      return;
    }
    commitSprint(planningSprint.id);
    setCommitOpen(false);
    setConfirmText("");
    toast(`Sprint ${planningSprint.key} committed · ${totalPoints} pts across ${engineers.length} engineers`, { kind: "success" });
    router.push("/sprint");
  };

  return (
    <div>
      <PageHeader
        eyebrow={`S-06 · Stage 4c · ${planningSprint?.key ?? "—"}`}
        title={
          <>
            <em className="text-accent">Commit</em>, together.
          </>
        }
        lede="Whole team. Assign each ticket, watch capacity flex live, then commit. Over 100% is a trade-off conversation."
        actions={
          <Button variant="primary" onClick={() => setCommitOpen(true)} disabled={!canCommit}>
            Commit sprint →
          </Button>
        }
      />

      <PlanningNav />

      {/* Capacity overview */}
      <section className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Capacity overview</div>
        <div className="grid grid-cols-5 gap-3">
          {engineers.map((u) => {
            const load = loadByUser[u.id] ?? 0;
            const pct = u.capacityPoints > 0 ? load / u.capacityPoints : 0;
            const state = pct > 1 ? "over" : pct > 0.9 ? "at" : "under";
            return (
              <div
                key={u.id}
                className={cn(
                  "bg-bg-card border rounded-[8px] p-3",
                  state === "over" ? "border-danger border-2" : state === "at" ? "border-warn" : "border-rule"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar user={u} size="sm" />
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink truncate">{u.displayName}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">{u.role} · {u.pod ?? "—"}</div>
                  </div>
                </div>
                <div className="h-2 bg-rule-soft rounded-full overflow-hidden mb-1.5">
                  <div
                    className={cn("h-full transition-all duration-300", state === "over" ? "bg-danger" : state === "at" ? "bg-warn" : "bg-ok")}
                    style={{ width: `${Math.min(pct * 100, 130)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono text-[11px] text-ink-3">
                  <span>{load} / {u.capacityPoints} pts</span>
                  <span className={cn(state === "over" && "text-danger font-medium")}>{Math.round(pct * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3 text-[12px] font-mono text-ink-3">
          <span>Sprint total · {totalPoints} / {totalCapacity} pts · {Math.round(ratio * 100)}%</span>
          {overCapacity && !capacityOk && <Pill variant="danger">Over 125% — commit blocked</Pill>}
          {overCapacity && capacityOk && <Pill variant="warn">Over 100% — soft warn</Pill>}
        </div>
      </section>

      {/* Assignment table */}
      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              {["#", "Key", "Title", "Type", "Priority", "Pts", "Assignee"].map((h) => (
                <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {picked.map((t, idx) => {
              const a = users.find((u) => u.id === t.assigneeId);
              return (
                <tr key={t.id} className="border-b border-rule-soft hover:bg-bg-elevated">
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">{t.key}</td>
                  <td className="px-4 py-3 text-[14px] text-ink max-w-md truncate">{t.title}</td>
                  <td className="px-4 py-3"><TypePill t={t.type} /></td>
                  <td className="px-4 py-3"><PriorityPill p={t.priority} /></td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">{t.storyPoints ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={t.assigneeId ?? ""}
                        onChange={(e) => setAssignee(t.id, e.target.value || null)}
                        className="h-8 px-2 text-[13px] rounded-[6px] border border-rule bg-bg-card"
                      >
                        <option value="">Unassigned</option>
                        {engineers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName} · {loadByUser[u.id] ?? 0}/{u.capacityPoints}
                          </option>
                        ))}
                      </select>
                      {t.aiSuggestedAssignee && !t.assigneeId && (
                        <AiTag
                          label={users.find((u) => u.id === t.aiSuggestedAssignee!.userId)?.displayName ?? "?"}
                          confidence={t.aiSuggestedAssignee.confidence}
                          reasoning={t.aiSuggestedAssignee.reasoning}
                          onAccept={() => setAssignee(t.id, t.aiSuggestedAssignee!.userId)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Validation bar */}
      <div className="mt-4 grid grid-cols-5 gap-2 text-[11px] font-mono uppercase tracking-[0.06em]">
        <Check ok={allHavePoints} label="All sized" />
        <Check ok={allHaveAssignee} label="All assigned" />
        <Check ok={noInactive} label="No OOO" />
        <Check ok={capacityOk} label="Capacity ≤ 125%" />
        <Check ok={hasOne} label="≥ 1 ticket" />
      </div>

      <Modal open={commitOpen} onClose={() => setCommitOpen(false)} title="Commit this sprint?" size="sm">
        <p className="text-[14px] text-ink-2 mb-4">
          Once committed, story points lock, assignees lock, and {planningSprint?.key} becomes active. Type{" "}
          <span className="font-mono">{planningSprint?.key}</span> to confirm.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={planningSprint?.key}
          className="w-full h-10 px-3 rounded-[6px] border border-rule bg-bg-card font-mono"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setCommitOpen(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={commit}>Commit sprint</Button>
        </div>
      </Modal>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={cn(
        "px-3 py-2 rounded-[6px] border flex items-center gap-2",
        ok ? "bg-ok-soft text-ok border-ok-soft" : "bg-bg-card text-ink-4 border-rule"
      )}
    >
      <span>{ok ? "✓" : "○"}</span>
      <span>{label}</span>
    </div>
  );
}

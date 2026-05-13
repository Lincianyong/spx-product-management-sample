"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  AiTag,
  Avatar,
  Button,
  Input,
  Pill,
  PriorityPill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TypePill,
  toast,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { ALL_PROGRAMS, type Program, type Ticket, type TicketType } from "@/lib/types";

type TypeFilter = "all" | TicketType;
type AuthorFilter = "all" | string;
const CLOSED_STATUSES = new Set(["done", "verified", "cancelled", "cannot_reproduce"]);

export default function JointPlanningPage() {
  useDocumentTitle("Joint Planning · Stage 4c");
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const commitSprint = useAppStore((s) => s.commitSprint);
  const user = useCurrentUser();
  const router = useRouter();
  const [commitOpen, setCommitOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Emergency-add filter state
  const [emQuery, setEmQuery] = useState("");
  const [emTypeFilter, setEmTypeFilter] = useState<TypeFilter>("all");
  const [emProgramFilter, setEmProgramFilter] = useState<Program[]>([]);
  const [emAuthorFilter, setEmAuthorFilter] = useState<AuthorFilter>("all");

  const planningSprint = sprints.find((s) => s.state === "planning");
  const picked = useMemo(
    () => tickets.filter((t) => t.pickedForSprint).sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99)),
    [tickets]
  );

  const engineers = users.filter((u) => u.role === "engineer" && u.capacityPoints > 0);

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

  const setStoryPoints = (ticketId: string, pts: number | null) => {
    setTicketField(ticketId, { storyPoints: pts }, user?.id ?? "");
  };

  // Effective programs for a ticket = ticket.programs OR parent epic.programs
  const effectiveProgramsOf = (t: Ticket): Program[] => {
    if (t.programs && t.programs.length > 0) return t.programs;
    const epic = t.epicId ? epics.find((e) => e.id === t.epicId) : null;
    return epic?.programs ?? [];
  };

  // Emergency add candidates: tickets NOT picked for this sprint and
  // not already in another sprint, and still open. Filtered by the
  // emergency-add controls below the table.
  const emergencyCandidates = useMemo(() => {
    const base = tickets.filter(
      (t) => !t.pickedForSprint && t.sprintId == null && !CLOSED_STATUSES.has(t.status)
    );
    const q = emQuery.trim().toLowerCase();
    return base.filter((t) => {
      if (emTypeFilter !== "all" && t.type !== emTypeFilter) return false;
      if (emAuthorFilter !== "all" && t.authorId !== emAuthorFilter) return false;
      if (emProgramFilter.length > 0) {
        const eff = effectiveProgramsOf(t);
        if (!emProgramFilter.some((p) => eff.includes(p))) return false;
      }
      if (q) {
        const hay = [t.key, t.title, t.description, ...(t.tags ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, emQuery, emTypeFilter, emProgramFilter, emAuthorFilter]);

  const authorsInPool = useMemo(() => {
    const ids = new Set<string>();
    for (const t of tickets) {
      if (!t.pickedForSprint && t.sprintId == null && !CLOSED_STATUSES.has(t.status)) {
        ids.add(t.authorId);
      }
    }
    return users.filter((u) => ids.has(u.id));
  }, [tickets, users]);

  const addEmergencyToSprint = (t: Ticket) => {
    if (t.storyPoints == null || t.storyPoints <= 0) {
      toast("Fill in story points before adding.", { kind: "error" });
      return;
    }
    if (!t.assigneeId) {
      toast("Pick an assignee before adding.", { kind: "error" });
      return;
    }
    const nextRank = picked.length > 0
      ? Math.max(...picked.map((p) => p.picklistRank ?? 0)) + 1
      : 1;
    setTicketField(
      t.id,
      { pickedForSprint: true, picklistRank: nextRank },
      user?.id ?? ""
    );
    toast(`${t.key} added to ${planningSprint?.key ?? "sprint"}`, { kind: "success" });
  };

  const emFiltersActive =
    Boolean(emQuery.trim()) ||
    emTypeFilter !== "all" ||
    emAuthorFilter !== "all" ||
    emProgramFilter.length > 0;

  const clearEmFilters = () => {
    setEmQuery("");
    setEmTypeFilter("all");
    setEmAuthorFilter("all");
    setEmProgramFilter([]);
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
        eyebrow={`S-06 · Stage 4c · ${planningSprint?.key ?? "-"}`}
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
                    <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">{u.role}</div>
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
          {overCapacity && !capacityOk && <Pill variant="danger">Over 125% - commit blocked</Pill>}
          {overCapacity && capacityOk && <Pill variant="warn">Over 100% - soft warn</Pill>}
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
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">{t.storyPoints ?? "-"}</td>
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

      {/* Emergency add — bring an unestimated ticket into this sprint */}
      <section className="mt-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Emergency add</div>
            <h3 className="display text-display-s text-ink mt-1">Pull an un-estimated ticket into the sprint</h3>
            <p className="text-[13px] text-ink-3 mt-1 max-w-2xl">
              For tickets that didn&apos;t make Picklist or Estimation but need to land this week (incoming bugs, escalations, surprise dependencies). Fill in points + assignee, then click <span className="font-mono text-ink-2">Add</span> to fold it into the slice above.
            </p>
          </div>
        </div>

        {/* Filter strip - row 1: search + type + author; row 2: programs */}
        <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative basis-[60%] grow shrink min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4 pointer-events-none" />
              <input
                type="text"
                value={emQuery}
                onChange={(e) => setEmQuery(e.target.value)}
                placeholder="Search key, title, tags…"
                className="w-full h-8 pl-8 pr-8 text-[12px] rounded-[6px] border border-rule bg-bg-card text-ink placeholder:text-ink-4"
              />
              {emQuery && (
                <button
                  onClick={() => setEmQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={emTypeFilter} onValueChange={(v) => setEmTypeFilter(v as TypeFilter)}>
              <SelectTrigger size="sm" className="basis-[20%] grow shrink min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="tech_task">Tech task</SelectItem>
              </SelectContent>
            </Select>
            <Select value={emAuthorFilter} onValueChange={(v) => setEmAuthorFilter(v as AuthorFilter)}>
              <SelectTrigger size="sm" className="basis-[20%] grow shrink min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authors</SelectItem>
                {authorsInPool.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {emFiltersActive && (
              <button
                onClick={clearEmFilters}
                className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-rule-soft">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">Programs</span>
              {ALL_PROGRAMS.map((p) => {
                const active = emProgramFilter.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setEmProgramFilter(active ? emProgramFilter.filter((x) => x !== p) : [...emProgramFilter, p])
                    }
                    className={cn(
                      "px-2.5 h-7 text-[11px] font-mono uppercase tracking-[0.06em] rounded-[4px] border transition-colors duration-100",
                      active
                        ? "bg-accent text-bg-card border-accent"
                        : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {emergencyCandidates.length === 0 ? (
          <p className="italic text-[13px] text-ink-3 px-1 py-6 bg-bg-card border border-rule rounded-[8px] text-center">
            {emFiltersActive
              ? "No tickets match the current filters."
              : "No un-estimated open tickets sitting outside this sprint."}
          </p>
        ) : (
          <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-elevated">
                <tr className="border-b border-rule">
                  {["#", "Key", "Title", "Type", "Priority", "Pts", "Assignee", ""].map((h) => (
                    <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emergencyCandidates.map((t, idx) => (
                  <tr key={t.id} className="border-b border-rule-soft hover:bg-bg-elevated">
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink">{t.key}</td>
                    <td className="px-4 py-3 text-[14px] text-ink max-w-md truncate">{t.title}</td>
                    <td className="px-4 py-3"><TypePill t={t.type} /></td>
                    <td className="px-4 py-3"><PriorityPill p={t.priority} /></td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={t.storyPoints ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setStoryPoints(t.id, null);
                            return;
                          }
                          const n = Math.max(1, Math.min(99, Number(raw) || 0));
                          setStoryPoints(t.id, n);
                        }}
                        placeholder="—"
                        className="w-16 h-8 px-2 text-[13px] font-mono rounded-[6px] border border-rule bg-bg-card text-ink placeholder:text-ink-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => addEmergencyToSprint(t)}
                        disabled={t.storyPoints == null || t.storyPoints <= 0 || !t.assigneeId}
                      >
                        Add →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

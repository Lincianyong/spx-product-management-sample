"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  Avatar,
  Button,
  Pill,
  PriorityPill,
  TypePill,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { SortableList, DragHandle } from "@/components/SortableList";
import { cn, formatDate } from "@/lib/utils";
import type { Ticket, Priority, TicketType } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { can } from "@/lib/permissions";
import { LaneBanner } from "@/components/LaneBanner";

type SortKey = "rank" | "priority" | "created" | "title" | "type";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };
const TYPE_ORDER: Record<TicketType, number> = { bug: 0, engineering: 1, tech_task: 2 };

export default function PicklistPage() {
  useDocumentTitle("Picklist · Stage 4a");
  const tickets = useAppStore((s) => s.tickets);
  const currentUser = useCurrentUser();
  const canPick = can(currentUser?.role, "pick_for_sprint");
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setPickedForSprint = useAppStore((s) => s.setPickedForSprint);
  const setPicklistRanks = useAppStore((s) => s.setPicklistRanks);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const user = useCurrentUser();
  const router = useRouter();

  // ─── Search · Filter · Sort state ──────────────────────────────────
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TicketType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all"); // project id or "all" / "ad-hoc"
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [carryOnly, setCarryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const planningSprint = sprints.find((s) => s.state === "planning");
  const lastSprint = sprints.find((s) => s.state === "closed");

  const candidates = useMemo(() => {
    const carryOvers = tickets.filter((t) => t.carryOver && t.status !== "done" && t.status !== "verified");
    const backlog = tickets.filter((t) => t.status === "backlog");
    return [...carryOvers, ...backlog];
  }, [tickets]);

  const picked = candidates.filter((t) => t.pickedForSprint);
  const unpicked = candidates.filter((t) => !t.pickedForSprint);

  // Authors that appear in the candidate pool (so the dropdown is scoped)
  const candidateAuthors = useMemo(() => {
    const ids = Array.from(new Set(candidates.map((t) => t.authorId)));
    return ids
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is NonNullable<typeof u> => Boolean(u));
  }, [candidates, users]);

  // Filter predicate — applied to BOTH lists so search/filter scoping is consistent.
  const matches = (t: Ticket) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (projectFilter !== "all") {
      if (projectFilter === "ad-hoc" && t.projectId !== null) return false;
      if (projectFilter !== "ad-hoc" && t.projectId !== projectFilter) return false;
    }
    if (authorFilter !== "all" && t.authorId !== authorFilter) return false;
    if (carryOnly && !t.carryOver) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const author = users.find((u) => u.id === t.authorId);
      const proj = projects.find((p) => p.id === t.projectId);
      const hay = [t.key, t.title, t.description, ...(t.tags ?? []), author?.displayName ?? "", proj?.key ?? ""]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const compare = (a: Ticket, b: Ticket): number => {
    let v = 0;
    switch (sortBy) {
      case "rank":
        v = (a.backlogRank ?? 99) - (b.backlogRank ?? 99);
        break;
      case "priority":
        v = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      case "created":
        v = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "title":
        v = a.title.localeCompare(b.title);
        break;
      case "type":
        v = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
        break;
    }
    return sortDir === "asc" ? v : -v;
  };

  // Picked list — always rank-sorted (drag order is the source of truth),
  // but search/filter still scopes which items are shown.
  const sortedPicked = useMemo(() => {
    return [...picked]
      .filter(matches)
      .sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, query, typeFilter, priorityFilter, projectFilter, authorFilter, carryOnly]);

  const sortedUnpicked = useMemo(() => {
    return [...unpicked].filter(matches).sort(compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unpicked, query, typeFilter, priorityFilter, projectFilter, authorFilter, carryOnly, sortBy, sortDir]);

  const filtersActive =
    Boolean(query.trim()) ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    projectFilter !== "all" ||
    authorFilter !== "all" ||
    carryOnly;

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setPriorityFilter("all");
    setProjectFilter("all");
    setAuthorFilter("all");
    setCarryOnly(false);
  };

  const togglePicked = (ticketId: string, checked: boolean) => {
    if (!canPick) {
      toast("Only PM can modify the picklist.", { kind: "error" });
      return;
    }
    setPickedForSprint([ticketId], checked);
    if (planningSprint) {
      setTicketField(ticketId, { sprintId: checked ? planningSprint.id : null }, user?.id ?? "");
    }
    if (checked) {
      const nextRank = (sortedPicked.length || 0) + 1;
      setPicklistRanks([{ ticketId, rank: nextRank }]);
    }
  };

  const onReorderPicked = (next: Ticket[]) => {
    if (!canPick) return;
    const ranks = next.map((t, idx) => ({ ticketId: t.id, rank: idx + 1 }));
    setPicklistRanks(ranks);
  };

  const send = () => {
    if (!canPick) {
      toast("Only PM can hand off to Engineering.", { kind: "error" });
      return;
    }
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

      {!canPick && (
        <LaneBanner
          lane="PM"
          surface="Picklist"
          ownerCopy="Open Estimation (Stage 4b) to act in your lane."
        />
      )}

      {/* Search + filters + sort toolbar */}
      <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search key, title, tags, author…"
              className="w-full h-8 pl-8 pr-8 text-[12px] rounded-[6px] border border-rule bg-bg-card text-ink placeholder:text-ink-4"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TicketType | "all")}>
              <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="engineering">Ticket</SelectItem>
                <SelectItem value="tech_task">Tech task</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as Priority | "all")}>
              <SelectTrigger size="sm" className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="P0">P0</SelectItem>
                <SelectItem value="P1">P1</SelectItem>
                <SelectItem value="P2">P2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="ad-hoc">Ad-hoc (no parent)</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.key} · {p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authors</SelectItem>
                {candidateAuthors.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[6px] border border-rule bg-bg-card text-[12px] text-ink-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={carryOnly}
                onChange={(e) => setCarryOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-accent"
              />
              Carry-over only
            </label>

            {filtersActive && (
              <button
                onClick={clearFilters}
                className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-rule-soft">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Sort backlog by</span>
            {([
              { id: "rank", label: "Rank" },
              { id: "priority", label: "Priority" },
              { id: "created", label: "Created" },
              { id: "title", label: "Title" },
              { id: "type", label: "Type" },
            ] as { id: SortKey; label: string }[]).map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id)}
                className={cn(
                  "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border transition-colors duration-100",
                  sortBy === s.id ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
                )}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              title={sortDir === "asc" ? "Ascending — click to flip" : "Descending — click to flip"}
            >
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
          <Button variant="primary" onClick={send} disabled={!canPick} title={!canPick ? "Only PM can hand off" : undefined}>
            Send {picked.length} to Engineering Sprint Planning →
          </Button>
        </div>
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
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center gap-2">
          <span>Picked · drag (⠿) to re-rank</span>
          <span className="text-ink-4">·</span>
          <span className="text-ink-4">
            {sortedPicked.length} shown{filtersActive && picked.length !== sortedPicked.length ? ` of ${picked.length}` : ""}
          </span>
        </div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <PickRowHeader rank />
          {sortedPicked.length === 0 ? (
            <p className="px-4 py-6 text-[13px] italic text-ink-3">
              {picked.length === 0
                ? "No picks yet. Check a ticket below to add it."
                : "No picks match the current filters."}
            </p>
          ) : (
            <SortableList
              items={sortedPicked}
              onReorder={onReorderPicked}
              renderItem={(t, handle) => (
                <PickRow
                  t={t}
                  rank={sortedPicked.findIndex((x) => x.id === t.id) + 1}
                  onToggle={() => togglePicked(t.id, false)}
                  handle={canPick ? handle : undefined}
                  projects={projects}
                  users={users}
                  picked
                  disabled={!canPick}
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Unpicked candidates */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center gap-2">
          <span>Available backlog</span>
          <span className="text-ink-4">·</span>
          <span className="text-ink-4">
            {sortedUnpicked.length} shown{filtersActive && unpicked.length !== sortedUnpicked.length ? ` of ${unpicked.length}` : ""}
          </span>
        </div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <PickRowHeader />
          {sortedUnpicked.length === 0 ? (
            <p className="px-4 py-6 text-[13px] italic text-ink-3">
              {unpicked.length === 0
                ? "Nothing else available. You've picked everything ready."
                : "No backlog items match the current filters."}
            </p>
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
                disabled={!canPick}
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
  disabled,
}: {
  t: Ticket;
  rank: number | null;
  onToggle: () => void;
  handle?: Record<string, unknown>;
  projects: import("@/lib/types").Project[];
  users: import("@/lib/types").User[];
  picked: boolean;
  disabled?: boolean;
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
      <input
        type="checkbox"
        checked={picked}
        onChange={onToggle}
        disabled={disabled}
        title={disabled ? "Only PM can modify the picklist" : undefined}
        className="w-4 h-4 accent-accent disabled:opacity-40 disabled:cursor-not-allowed"
      />
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

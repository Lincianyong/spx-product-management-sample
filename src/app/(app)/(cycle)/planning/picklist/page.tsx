"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  Avatar,
  Button,
  Checkbox,
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

type SortKey = "key" | "title" | "parent" | "author" | "created" | "priority";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2 };

export default function PicklistPage() {
  useDocumentTitle("Picklist · Stage 4a");
  const tickets = useAppStore((s) => s.tickets);
  const currentUser = useCurrentUser();
  const canPick = can(currentUser?.role, "pick_for_sprint");
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const sprints = useAppStore((s) => s.sprints);
  const setPickedForSprint = useAppStore((s) => s.setPickedForSprint);
  const setPicklistRanks = useAppStore((s) => s.setPicklistRanks);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const user = useCurrentUser();
  const router = useRouter();

  // ─── Search · Filter · Sort state (scoped to Available backlog table) ─
  const [keyQuery, setKeyQuery] = useState("");
  const [titleQuery, setTitleQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TicketType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [carryOnly, setCarryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("priority");
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

  // Filter predicate — scoped to the Available backlog table.
  const matches = (t: Ticket) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (projectFilter !== "all") {
      if (projectFilter === "ad-hoc" && t.epicId !== null) return false;
      if (projectFilter !== "ad-hoc" && t.epicId !== projectFilter) return false;
    }
    if (authorFilter !== "all" && t.authorId !== authorFilter) return false;
    if (carryOnly && !t.carryOver) return false;
    if (keyQuery.trim() && !t.key.toLowerCase().includes(keyQuery.trim().toLowerCase())) return false;
    if (titleQuery.trim()) {
      const q = titleQuery.trim().toLowerCase();
      const hay = [t.title, t.description, ...(t.tags ?? [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const compare = (a: Ticket, b: Ticket): number => {
    let v = 0;
    switch (sortBy) {
      case "key":
        v = a.key.localeCompare(b.key, undefined, { numeric: true });
        break;
      case "title":
        v = a.title.localeCompare(b.title);
        break;
      case "parent": {
        const pa = epics.find((p) => p.id === a.epicId)?.key ?? "~ad-hoc";
        const pb = epics.find((p) => p.id === b.epicId)?.key ?? "~ad-hoc";
        v = pa.localeCompare(pb);
        break;
      }
      case "author": {
        const ua = users.find((u) => u.id === a.authorId)?.displayName ?? "";
        const ub = users.find((u) => u.id === b.authorId)?.displayName ?? "";
        v = ua.localeCompare(ub);
        break;
      }
      case "created":
        v = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "priority":
        v = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
    }
    return sortDir === "asc" ? v : -v;
  };

  // Picked list — always rank-sorted (drag order is the source of truth).
  // Filters are scoped to the Available backlog table only.
  const sortedPicked = useMemo(() => {
    return [...picked].sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99));
  }, [picked]);

  const sortedUnpicked = useMemo(() => {
    return [...unpicked].filter(matches).sort(compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unpicked, keyQuery, titleQuery, typeFilter, priorityFilter, projectFilter, authorFilter, carryOnly, sortBy, sortDir]);

  const filtersActive =
    Boolean(keyQuery.trim()) ||
    Boolean(titleQuery.trim()) ||
    typeFilter !== "all" ||
    priorityFilter !== "all" ||
    projectFilter !== "all" ||
    authorFilter !== "all" ||
    carryOnly;

  const clearFilters = () => {
    setKeyQuery("");
    setTitleQuery("");
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


      {!canPick && (
        <LaneBanner
          lane="PM"
          surface="Picklist"
          ownerCopy="Open Estimation (Stage 4b) to act in your lane."
        />
      )}

      {/* Slim top action strip — Last sprint context + Send CTA */}
      <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-2.5 mb-4 flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          Picked {picked.length} · Carry-over {candidates.filter((t) => t.carryOver).length}
        </span>
        {lastSprint && (
          <span className="text-[12px] text-ink-3">
            <span className="text-ink-4">·</span>{" "}
            Last: {lastSprint.key} shipped {lastSprint.shippedPoints}/{lastSprint.committedPoints} pts
          </span>
        )}
        <div className="ml-auto">
          <Button variant="primary" size="sm" onClick={send} disabled={!canPick} title={!canPick ? "Only PM can hand off" : undefined}>
            Send {picked.length} to Engineering Sprint Planning →
          </Button>
        </div>
      </div>

      {/* Picked list (drag-ranked, no inline filters — picks are the user's hand-curated set) */}
      <div className="mb-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center gap-2">
          <span>Picked · drag (⠿) to re-rank</span>
          <span className="text-ink-4">·</span>
          <span className="text-ink-4">{picked.length} {picked.length === 1 ? "ticket" : "tickets"}</span>
        </div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <PickRowHeader rank />
          {picked.length === 0 ? (
            <p className="px-4 py-6 text-[13px] italic text-ink-3">
              No picks yet. Check a ticket below to add it.
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
                  epics={epics}
                  users={users}
                  picked
                  disabled={!canPick}
                />
              )}
            />
          )}
        </div>
      </div>

      {/* Available backlog — search · filter · sort all live in the table header itself */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center gap-2">
          <span>Available backlog</span>
          <span className="text-ink-4">·</span>
          <span className="text-ink-4">
            {sortedUnpicked.length} shown{filtersActive && unpicked.length !== sortedUnpicked.length ? ` of ${unpicked.length}` : ""}
          </span>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep normal-case tracking-normal"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <BacklogQuickFilters
            typeFilter={typeFilter}
            onTypeFilter={setTypeFilter}
            carryOnly={carryOnly}
            onCarryOnly={setCarryOnly}
          />
          <BacklogSortHeader sortBy={sortBy} sortDir={sortDir} onSort={(k) => {
            if (sortBy === k) {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
              setSortBy(k);
              setSortDir("asc");
            }
          }} />
          <BacklogFilterRow
            keyQuery={keyQuery}
            onKeyQuery={setKeyQuery}
            titleQuery={titleQuery}
            onTitleQuery={setTitleQuery}
            projectFilter={projectFilter}
            onProjectFilter={setProjectFilter}
            authorFilter={authorFilter}
            onAuthorFilter={setAuthorFilter}
            priorityFilter={priorityFilter}
            onPriorityFilter={setPriorityFilter}
            epics={epics}
            authors={candidateAuthors}
          />
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
                epics={epics}
                users={users}
                picked={false}
                disabled={!canPick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Available backlog: sortable column headers ─────────────────────
function BacklogSortHeader({
  sortBy,
  sortDir,
  onSort,
}: {
  sortBy: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const arrow = (k: SortKey) =>
    sortBy === k ? (sortDir === "asc" ? "↑" : "↓") : "";

  const cell = (k: SortKey, label: string, align: "left" | "right" = "left") => (
    <button
      type="button"
      onClick={() => onSort(k)}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] hover:text-ink transition-colors duration-100",
        sortBy === k ? "text-ink" : "text-ink-3",
        align === "right" && "justify-end w-full"
      )}
      aria-sort={sortBy === k ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span>{label}</span>
      <span className="text-ink-4 w-2 text-[9px]">{arrow(k)}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-[40px_40px_40px_100px_minmax(0,1fr)_140px_140px_100px_80px] gap-3 px-4 py-3 bg-bg-elevated border-b border-rule items-center">
      <span />
      <span />
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">#</span>
      {cell("key", "Key")}
      {cell("title", "Title")}
      {cell("parent", "Parent")}
      {cell("author", "Author")}
      {cell("created", "Created")}
      {cell("priority", "Priority")}
    </div>
  );
}

// ─── Available backlog: quick filters strip (Type · Carry) ──────────
// These two filters aren't column-scoped and were squeezing the Title cell.
// Promoted to a slim strip just above the sortable header so the Title
// column can be a clean full-width search input again.
function BacklogQuickFilters({
  typeFilter,
  onTypeFilter,
  carryOnly,
  onCarryOnly,
}: {
  typeFilter: TicketType | "all";
  onTypeFilter: (v: TicketType | "all") => void;
  carryOnly: boolean;
  onCarryOnly: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-bg-elevated/30 border-b border-rule-soft">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Quick</span>
      <span className="font-mono text-[11px] text-ink-3">Type</span>
      <Select value={typeFilter} onValueChange={(v) => onTypeFilter(v as TicketType | "all")}>
        <SelectTrigger size="sm" className="h-7 px-2 w-[120px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="bug">Bug</SelectItem>
          <SelectItem value="engineering">Ticket</SelectItem>
          <SelectItem value="tech_task">Tech task</SelectItem>
        </SelectContent>
      </Select>
      <label
        title="Show carry-over tickets only"
        className={cn(
          "inline-flex items-center justify-center px-2.5 h-7 rounded-[4px] border text-[11px] font-mono uppercase tracking-[0.06em] cursor-pointer select-none",
          carryOnly ? "border-warn text-warn bg-warn-soft" : "border-rule text-ink-3 bg-bg-card hover:border-ink-4"
        )}
      >
        <input
          type="checkbox"
          checked={carryOnly}
          onChange={(e) => onCarryOnly(e.target.checked)}
          className="sr-only"
        />
        Carry-over only
      </label>
    </div>
  );
}

// ─── Available backlog: per-column filter row ───────────────────────
function BacklogFilterRow({
  keyQuery, onKeyQuery,
  titleQuery, onTitleQuery,
  projectFilter, onProjectFilter,
  authorFilter, onAuthorFilter,
  priorityFilter, onPriorityFilter,
  epics, authors,
}: {
  keyQuery: string;
  onKeyQuery: (v: string) => void;
  titleQuery: string;
  onTitleQuery: (v: string) => void;
  projectFilter: string;
  onProjectFilter: (v: string) => void;
  authorFilter: string;
  onAuthorFilter: (v: string) => void;
  priorityFilter: Priority | "all";
  onPriorityFilter: (v: Priority | "all") => void;
  epics: import("@/lib/types").Epic[];
  authors: import("@/lib/types").User[];
}) {
  return (
    <div className="grid grid-cols-[40px_40px_40px_100px_minmax(0,1fr)_140px_140px_100px_80px] gap-3 px-4 py-2 bg-bg-elevated/30 border-b border-rule items-center">
      <span className="col-span-3" />
      <input
        type="text"
        value={keyQuery}
        onChange={(e) => onKeyQuery(e.target.value)}
        placeholder="key…"
        aria-label="Filter by key"
        className="h-7 px-2 text-[12px] font-mono rounded-[4px] border border-rule bg-bg-card text-ink placeholder:text-ink-4 min-w-0 w-full"
      />
      <input
        type="text"
        value={titleQuery}
        onChange={(e) => onTitleQuery(e.target.value)}
        placeholder="search title, tags, description…"
        aria-label="Search title"
        className="h-7 px-2 text-[12px] rounded-[4px] border border-rule bg-bg-card text-ink placeholder:text-ink-4 min-w-0 w-full"
      />
      <Select value={projectFilter} onValueChange={onProjectFilter}>
        <SelectTrigger size="sm" className="h-7 px-2 min-w-0 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
          {epics.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.key}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={authorFilter} onValueChange={onAuthorFilter}>
        <SelectTrigger size="sm" className="h-7 px-2 min-w-0 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {authors.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span />
      <Select value={priorityFilter} onValueChange={(v) => onPriorityFilter(v as Priority | "all")}>
        <SelectTrigger size="sm" className="h-7 px-2 min-w-0 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="P0">P0</SelectItem>
          <SelectItem value="P1">P1</SelectItem>
          <SelectItem value="P2">P2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PickRowHeader({ rank }: { rank?: boolean } = {}) {
  return (
    <div className="grid grid-cols-[40px_40px_40px_100px_minmax(0,1fr)_140px_140px_100px_80px] gap-3 px-4 py-3 bg-bg-elevated border-b border-rule font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
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
  epics,
  users,
  picked,
  disabled,
}: {
  t: Ticket;
  rank: number | null;
  onToggle: () => void;
  handle?: Record<string, unknown>;
  epics: import("@/lib/types").Epic[];
  users: import("@/lib/types").User[];
  picked: boolean;
  disabled?: boolean;
}) {
  const project = epics.find((p) => p.id === t.epicId);
  const author = users.find((u) => u.id === t.authorId);
  return (
    <div
      className={cn(
        "grid grid-cols-[40px_40px_40px_100px_minmax(0,1fr)_140px_140px_100px_80px] gap-3 px-4 py-3 items-center border-b border-rule-soft",
        picked ? "bg-accent-soft/40" : "bg-bg-card hover:bg-bg-elevated"
      )}
    >
      {handle ? <DragHandle handleProps={handle} className="text-[16px]" /> : <span />}
      <Checkbox
        checked={picked}
        onCheckedChange={() => onToggle()}
        disabled={disabled}
        title={disabled ? "Only PM can modify the picklist" : undefined}
        aria-label={picked ? "Remove from picks" : "Add to picks"}
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

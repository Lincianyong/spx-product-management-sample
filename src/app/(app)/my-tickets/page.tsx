"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  Button,
  Pill,
  PriorityPill,
  TypePill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Search, X } from "lucide-react";
import { cn, statusLabel, relativeTime } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { ALL_PROGRAMS, type Program, type Ticket, type TicketType } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "ok" | "warn" | "danger" | "ai"> = {
  backlog: "default",
  scheduled: "default",
  in_progress: "default",
  review: "default",
  verifying: "ai",
  verified: "ok",
  done: "ok",
  cancelled: "danger",
  cannot_reproduce: "danger",
};

type TypeFilter = "all" | TicketType;
type StateFilter = "all" | "open" | "closed";

const CLOSED_STATUSES = new Set(["done", "verified", "cancelled", "cannot_reproduce"]);

/**
 * /my-tickets - every ticket the signed-in user authored, regardless of
 * type. Replaces the previous /my-bugs surface (which only showed bugs).
 * Filters cover type · open/closed · program. Search hits key + title + tags.
 */
export default function MyTicketsPage() {
  useDocumentTitle("My Tickets");
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const user = useCurrentUser();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [programFilter, setProgramFilter] = useState<Program[]>([]);

  const mine = useMemo(
    () => (user ? tickets.filter((t) => t.authorId === user.id) : []),
    [tickets, user]
  );

  // Effective programs = ticket.programs OR parent epic.programs
  const effectiveProgramsOf = (t: Ticket): Program[] => {
    if (t.programs && t.programs.length > 0) return t.programs;
    const epic = t.epicId ? epics.find((e) => e.id === t.epicId) : null;
    return epic?.programs ?? [];
  };

  const filtered = useMemo(() => {
    return mine.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      const isClosed = CLOSED_STATUSES.has(t.status);
      if (stateFilter === "open" && isClosed) return false;
      if (stateFilter === "closed" && !isClosed) return false;
      if (programFilter.length > 0) {
        const eff = effectiveProgramsOf(t);
        if (!programFilter.some((p) => eff.includes(p))) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = [t.key, t.title, t.description, ...(t.tags ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, typeFilter, stateFilter, programFilter, query]);

  if (!user) return null;

  const counts = {
    total: mine.length,
    eng: mine.filter((t) => t.type === "engineering").length,
    bug: mine.filter((t) => t.type === "bug").length,
    tech: mine.filter((t) => t.type === "tech_task").length,
  };

  const filtersActive =
    Boolean(query.trim()) ||
    typeFilter !== "all" ||
    stateFilter !== "all" ||
    programFilter.length > 0;

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setStateFilter("all");
    setProgramFilter([]);
  };

  return (
    <div>
      <PageHeader
        eyebrow={`My tickets · ${user.displayName.split(" ")[0]}`}
        title={
          <>
            Everything <em className="text-accent">you've filed</em>.
          </>
        }
        lede={`${counts.total} ticket${counts.total === 1 ? "" : "s"} authored · ${counts.eng} engineering · ${counts.bug} bugs · ${counts.tech} tech tasks.`}
        actions={
          <Link href="/create">
            <Button variant="primary" size="sm">+ New ticket</Button>
          </Link>
        }
      />

      {/* Filter strip */}
      <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative basis-[60%] grow shrink min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search key, title, tags…"
              className="w-full h-8 pl-8 pr-8 text-[12px] rounded-[6px] border border-rule bg-bg-card text-ink placeholder:text-ink-4"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger size="sm" className="basis-[20%] grow shrink min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="tech_task">Tech task</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as StateFilter)}>
            <SelectTrigger size="sm" className="basis-[20%] grow shrink min-w-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
            >
              Clear
            </button>
          )}
        </div>
        <div className="pt-2 border-t border-rule-soft">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">Programs</span>
            {ALL_PROGRAMS.map((p) => {
              const active = programFilter.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setProgramFilter(active ? programFilter.filter((x) => x !== p) : [...programFilter, p])
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

      {/* Results */}
      {filtered.length === 0 ? (
        mine.length === 0 ? (
          <EmptyState
            title="Nothing filed yet."
            body="Anything you create from this account lands here - engineering tickets, bugs, tech tasks."
            action={
              <Link href="/create">
                <Button variant="primary" size="sm">Create your first ticket</Button>
              </Link>
            }
          />
        ) : (
          <p className="italic text-[13px] text-ink-3 px-1 py-6">
            No tickets match the current filters.{" "}
            <button onClick={clearFilters} className="text-accent hover:underline">Clear</button>.
          </p>
        )
      ) : (
        <>
          <p className="font-mono text-[11px] text-ink-3 mb-2">
            {filtered.length} shown{filtersActive && filtered.length !== mine.length ? ` of ${mine.length}` : ""}
          </p>
          <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
            {filtered.map((t) => {
              const epic = t.epicId ? epics.find((e) => e.id === t.epicId) : null;
              const eff = effectiveProgramsOf(t);
              const closed = CLOSED_STATUSES.has(t.status);
              return (
                <Link
                  key={t.id}
                  href={`/t/${t.key}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-rule-soft last:border-b-0 hover:bg-bg-elevated",
                    closed && "opacity-70"
                  )}
                >
                  <span className="font-mono text-[12px] text-ink-3 w-20 shrink-0">{t.key}</span>
                  <TypePill t={t.type} />
                  <PriorityPill p={t.priority} />
                  <span className="flex-1 text-[14px] text-ink truncate">{t.title}</span>
                  <span className="font-mono text-[11px] text-ink-3 truncate w-20">
                    {epic ? epic.key : "ad-hoc"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 min-w-[100px] justify-end">
                    {eff.slice(0, 2).map((p) => (
                      <span key={p} className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 px-1.5 h-5 inline-flex items-center rounded-[4px] border border-rule">
                        {p}
                      </span>
                    ))}
                    {eff.length > 2 && (
                      <span className="font-mono text-[10px] text-ink-4">+{eff.length - 2}</span>
                    )}
                  </div>
                  <Pill variant={STATUS_VARIANT[t.status] ?? "default"}>{statusLabel[t.status]}</Pill>
                  <span className="font-mono text-[11px] text-ink-3 w-20 text-right shrink-0">{relativeTime(t.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

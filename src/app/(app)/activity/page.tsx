"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

export default function ActivityPage() {
  const activity = useAppStore((s) => s.activity);
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);

  const [entityFilter, setEntityFilter] = useState<"all" | "ticket" | "epic" | "project" | "sprint">("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [aiFilter, setAiFilter] = useState<"all" | "ai" | "human">("all");
  const [search, setSearch] = useState("");

  const actions = useMemo(() => Array.from(new Set(activity.map((a) => a.action))), [activity]);

  const filtered = useMemo(() => {
    return activity
      .filter((a) => entityFilter === "all" || a.entityType === entityFilter)
      .filter((a) => actorFilter === "all" || a.actorId === actorFilter)
      .filter((a) => actionFilter === "all" || a.action === actionFilter)
      .filter((a) => {
        if (aiFilter === "all") return true;
        if (aiFilter === "ai") return a.aiInfluenced;
        return !a.aiInfluenced;
      })
      .filter((a) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const t = tickets.find((x) => x.id === a.entityId);
        const actor = users.find((u) => u.id === a.actorId);
        return (
          a.action.toLowerCase().includes(q) ||
          (a.beforeValue ?? "").toLowerCase().includes(q) ||
          (a.afterValue ?? "").toLowerCase().includes(q) ||
          (t?.key.toLowerCase().includes(q) ?? false) ||
          (actor?.displayName.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activity, entityFilter, actorFilter, actionFilter, aiFilter, search, tickets, users]);

  return (
    <div>
      <PageHeader
        eyebrow="S-20 · Activity Log"
        title={
          <>
            The <em className="text-accent">trail</em>.
          </>
        }
        lede="Every state change with before/after. Filter by entity, actor, action, or whether AI nudged the change."
      />

      {/* Filters */}
      <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action, key, actor, value…"
          className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px] flex-1 min-w-[200px]"
        />
        <Select label="Entity" value={entityFilter} onChange={(v) => setEntityFilter(v as typeof entityFilter)} options={[
          { value: "all", label: "All entities" },
          { value: "ticket", label: "Tickets" },
          { value: "epic", label: "Epics" },
          { value: "project", label: "Projects" },
          { value: "sprint", label: "Sprints" },
        ]} />
        <Select label="Actor" value={actorFilter} onChange={setActorFilter} options={[
          { value: "all", label: "All actors" },
          ...users.map((u) => ({ value: u.id, label: u.displayName })),
        ]} />
        <Select label="Action" value={actionFilter} onChange={setActionFilter} options={[
          { value: "all", label: "All actions" },
          ...actions.map((a) => ({ value: a, label: a.replace("_", " ") })),
        ]} />
        <div className="flex items-center gap-1">
          {(["all", "human", "ai"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setAiFilter(v)}
              className={cn(
                "px-2.5 h-8 text-[11px] font-mono uppercase rounded-[6px] border",
                aiFilter === v ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule"
              )}
            >
              {v === "ai" ? "✦ AI" : v}
            </button>
          ))}
        </div>
        {(entityFilter !== "all" || actorFilter !== "all" || actionFilter !== "all" || aiFilter !== "all" || search) && (
          <button
            onClick={() => {
              setEntityFilter("all"); setActorFilter("all"); setActionFilter("all"); setAiFilter("all"); setSearch("");
            }}
            className="text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
          >
            Clear all
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches." body="Try a different filter combination." />
      ) : (
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-elevated">
              <tr className="border-b border-rule">
                {["When", "Who", "Entity", "Action", "Before", "After", "Source"].map((h) => (
                  <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const actor = users.find((u) => u.id === a.actorId);
                const ticket = tickets.find((t) => t.id === a.entityId);
                return (
                  <tr key={a.id} className={cn("border-b border-rule-soft", a.aiInfluenced && "bg-ai-soft/30")}>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{relativeTime(a.timestamp)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={actor} size="xs" />
                        <span className="text-[13px]">{actor?.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">
                      {ticket && <Link href={`/t/${ticket.key}`} className="text-ink hover:text-accent underline-offset-2 hover:underline">{ticket.key}</Link>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink">{a.action.replace("_", " ")}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{a.beforeValue ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink">{a.afterValue ?? "—"}</td>
                    <td className="px-4 py-3">
                      {a.aiInfluenced ? <Pill variant="ai">✦ AI</Pill> : <Pill variant="neutral">Human</Pill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] font-mono text-ink-3 mt-3">
        Showing {filtered.length} of {activity.length} events
      </p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 text-[12px] rounded-[6px] border border-rule bg-bg-card text-ink-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

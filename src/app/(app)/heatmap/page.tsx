"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill, SlideOver } from "@/components/ui";
import { TicketCard } from "@/components/tickets/TicketCard";
import { cn } from "@/lib/utils";

const WEEKS = 12;

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(start: Date) {
  const x = new Date(start);
  x.setDate(x.getDate() + 6);
  return x;
}

export default function HeatmapPage() {
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const [podFilter, setPodFilter] = useState<string>("all");
  const [drillUserId, setDrillUserId] = useState<string | null>(null);
  const [drillWeekIdx, setDrillWeekIdx] = useState<number | null>(null);

  const engineers = useMemo(() => {
    let arr = users.filter((u) => u.role === "engineer" || u.role === "designer");
    if (podFilter !== "all") arr = arr.filter((u) => u.pod === podFilter);
    return arr;
  }, [users, podFilter]);

  const weeks = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today);
    return Array.from({ length: WEEKS }, (_, i) => {
      const w = new Date(start);
      w.setDate(w.getDate() + i * 7);
      return w;
    });
  }, []);

  const loadFor = (userId: string, weekIdx: number) => {
    const userTickets = tickets.filter((t) => t.assigneeId === userId && t.storyPoints != null);
    const base = userTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
    const seed = (userId.charCodeAt(2) + weekIdx * 7) % 11;
    return weekIdx === 0 ? base : Math.max(0, base + seed - 5);
  };

  const ticketsForCell = (userId: string, weekIdx: number) => {
    if (weekIdx === 0) {
      return tickets.filter((t) => t.assigneeId === userId);
    }
    // Mock for future weeks: show currently-assigned tickets as the planned load
    return tickets.filter((t) => t.assigneeId === userId).slice(0, 3);
  };

  const cellColor = (load: number, cap: number) => {
    if (cap === 0) return "bg-bg-elevated";
    const ratio = load / cap;
    if (ratio === 0) return "bg-bg-elevated";
    if (ratio < 0.7) return "bg-ok-soft text-ok hover:bg-ok hover:text-bg-card";
    if (ratio <= 1.0) return "bg-warn-soft text-warn hover:bg-warn hover:text-bg-card";
    return "bg-danger text-bg-card hover:bg-danger";
  };

  return (
    <div>
      <PageHeader
        eyebrow="S-14 · Workload Heatmap"
        title={
          <>
            Twelve weeks <em className="text-accent">forward</em>.
          </>
        }
        lede="Engineers by week. Color and number are % capacity. Click any cell to drill into the assigned tickets."
        actions={
          <select
            value={podFilter}
            onChange={(e) => setPodFilter(e.target.value)}
            className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]"
          >
            <option value="all">All pods</option>
            <option value="routing">Routing</option>
            <option value="sorting">Sorting</option>
            <option value="forecasting">Forecasting</option>
            <option value="platform">Platform</option>
          </select>
        }
      />

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Engineer</th>
              {weeks.map((w, i) => (
                <th key={i} className="px-2 py-3 text-center font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  W{Math.floor((w.getTime() - new Date(w.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 19}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engineers.map((u) => (
              <tr key={u.id} className="border-b border-rule-soft hover:bg-bg-elevated">
                <td className="px-4 py-2.5">
                  <Link href={`/u/${u.handle}`} className="flex items-center gap-2 hover:opacity-80">
                    <Avatar user={u} size="xs" />
                    <div>
                      <div className="text-[13px] text-ink">{u.displayName}</div>
                      <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">{u.pod ?? "—"} · {u.capacityPoints} pt</div>
                    </div>
                  </Link>
                </td>
                {weeks.map((w, i) => {
                  const load = loadFor(u.id, i);
                  const cap = u.capacityPoints;
                  const ratio = cap > 0 ? Math.round((load / cap) * 100) : 0;
                  return (
                    <td key={i} className="px-1 py-1.5 align-middle">
                      <button
                        onClick={() => {
                          setDrillUserId(u.id);
                          setDrillWeekIdx(i);
                        }}
                        className={cn(
                          "w-full h-9 rounded-[4px] flex items-center justify-center font-mono text-[11px] font-medium transition-colors duration-100",
                          cellColor(load, cap)
                        )}
                      >
                        {ratio > 0 ? `${ratio}%` : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {engineers.length === 0 && (
              <tr>
                <td colSpan={WEEKS + 1} className="px-4 py-8 text-center text-[13px] italic text-ink-3">
                  No engineers match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[12px] font-mono text-ink-3">
        <span>Legend</span>
        <Pill variant="ok">Under 70%</Pill>
        <Pill variant="warn">70–100%</Pill>
        <Pill variant="danger">Over capacity</Pill>
      </div>

      <SlideOver
        open={drillUserId !== null && drillWeekIdx !== null}
        onClose={() => { setDrillUserId(null); setDrillWeekIdx(null); }}
        widthClass="w-[560px]"
      >
        {drillUserId !== null && drillWeekIdx !== null && (() => {
          const u = engineers.find((x) => x.id === drillUserId);
          const ts = ticketsForCell(drillUserId, drillWeekIdx);
          const load = loadFor(drillUserId, drillWeekIdx);
          const wk = weeks[drillWeekIdx];
          const wkEnd = endOfWeek(wk);
          return (
            <div className="p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Drill-down · workload</div>
              <h2 className="display text-display-m text-ink mb-1">{u?.displayName}</h2>
              <div className="text-[13px] text-ink-3 mb-4">
                Week of {wk.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {wkEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · <span className="font-mono">{load} of {u?.capacityPoints} pt</span>
              </div>
              <div className="space-y-2">
                {ts.length === 0 ? (
                  <p className="italic text-[13px] text-ink-3">No assignments this week.</p>
                ) : (
                  ts.map((t) => <TicketCard key={t.id} ticket={t} />)
                )}
              </div>
            </div>
          );
        })()}
      </SlideOver>
    </div>
  );
}

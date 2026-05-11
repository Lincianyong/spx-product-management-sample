"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill } from "@/components/ui";
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

export default function HeatmapPage() {
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);

  const engineers = users.filter((u) => u.role === "engineer" || u.role === "designer");

  const weeks = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today);
    return Array.from({ length: WEEKS }, (_, i) => {
      const w = new Date(start);
      w.setDate(w.getDate() + i * 7);
      return w;
    });
  }, []);

  // Synthesize load per engineer per week (mock - uses sprint tickets + a stable pseudo-noise)
  const loadFor = (userId: string, week: Date) => {
    const userTickets = tickets.filter((t) => t.assigneeId === userId && t.storyPoints != null);
    const base = userTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
    // Determinism by week index
    const idx = weeks.findIndex((w) => w.getTime() === week.getTime());
    const seed = (userId.charCodeAt(2) + idx * 7) % 11;
    const wk = idx === 0 ? base : Math.max(0, base + seed - 5);
    return wk;
  };

  const cellColor = (load: number, cap: number) => {
    if (cap === 0) return "bg-bg-elevated";
    const ratio = load / cap;
    if (ratio === 0) return "bg-bg-elevated";
    if (ratio < 0.7) return "bg-ok-soft text-ok";
    if (ratio <= 1.0) return "bg-warn-soft text-warn";
    return "bg-danger text-bg-card";
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
        lede="Engineers by week. Color and number are % capacity. Plan around the red, not into it."
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
                  <div className="flex items-center gap-2">
                    <Avatar user={u} size="xs" />
                    <div>
                      <div className="text-[13px] text-ink">{u.displayName}</div>
                      <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">{u.pod ?? "—"} · {u.capacityPoints} pt</div>
                    </div>
                  </div>
                </td>
                {weeks.map((w, i) => {
                  const load = loadFor(u.id, w);
                  const cap = u.capacityPoints;
                  const ratio = cap > 0 ? Math.round((load / cap) * 100) : 0;
                  return (
                    <td key={i} className="px-1 py-1.5 align-middle">
                      <div
                        className={cn(
                          "h-9 rounded-[4px] flex items-center justify-center font-mono text-[11px] font-medium",
                          cellColor(load, cap)
                        )}
                      >
                        {ratio > 0 ? `${ratio}%` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[12px] font-mono text-ink-3">
        <span>Legend</span>
        <Pill variant="ok">Under 70%</Pill>
        <Pill variant="warn">70–100%</Pill>
        <Pill variant="danger">Over capacity</Pill>
      </div>
    </div>
  );
}

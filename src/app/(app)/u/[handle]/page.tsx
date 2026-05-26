"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import {
  Avatar,
  HealthPill,
  Pill,
  RolePill,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui";
import { TicketCard } from "@/components/tickets/TicketCard";
import { cn, relativeTime, roleLabel } from "@/lib/utils";
import { Tombstone } from "@/components/Tombstone";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type VelocityRange = "6" | "12";

export default function ProfilePage({ params }: { params: { handle: string } }) {
  const { handle } = params;
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const sprints = useAppStore((s) => s.sprints);

  const user = users.find((u) => u.handle === handle);
  useDocumentTitle(user ? `${user.displayName} · @${user.handle}` : `@${handle} · Not found`);
  if (!user) {
    return <Tombstone kind="user" keyOrHandle={`@${handle}`} />;
  }

  const activeSprint = sprints.find((s) => s.state === "active");
  const inSprint = tickets.filter((t) => t.assigneeId === user.id && t.sprintId === activeSprint?.id);
  const myEpics = epics.filter((e) => e.pmPicId === user.id);
  const isPM = user.role === "pm";

  const prActivity = [
    { repo: "spx/forecasting", title: "CDN-3504 · Drift detection on retrain pipeline", state: "open", merged: false, at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { repo: "spx/forecasting", title: "CDN-3496 · Calibration channel hookup", state: "merged", merged: true, at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { repo: "spx/forecasting", title: "CDN-3489 · Retrain DAG retry policy", state: "merged", merged: true, at: new Date(Date.now() - 9 * 86400000).toISOString() },
    { repo: "spx/router", title: "RTE-880 · Madura cutoff scoring", state: "closed", merged: false, at: new Date(Date.now() - 12 * 86400000).toISOString() },
    { repo: "spx/forecasting", title: "CDN-3470 · Region-aware seasonality features (draft)", state: "open", merged: false, at: new Date(Date.now() - 14 * 86400000).toISOString() },
    { repo: "spx/forecasting", title: "CDN-3450 · Add P95 latency to dashboard", state: "merged", merged: true, at: new Date(Date.now() - 20 * 86400000).toISOString() },
  ];

  const blocking = tickets.filter((t) => t.assigneeId === user.id && tickets.some((o) => o.linkedWork.some((e) => e.type === "blocked_by" && e.ticketKey === t.key)));
  const blockedBy = tickets.filter((t) => t.assigneeId === user.id && t.linkedWork.some((e) => e.type === "blocked_by"));

  return (
    <div>
      <div className="flex items-start gap-6 mb-8">
        <Avatar user={user} size="lg" />
        <div className="flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">{roleLabel[user.role]}</div>
          <h1 className="display text-display-l text-ink leading-[1.05]">{user.displayName}</h1>
          <div className="flex items-center gap-2 mt-3">
            <RolePill role={user.role} />
            {user.status === "ooo" && <Pill variant="warn">OOO</Pill>}
            {user.status === "in_meeting" && <Pill variant="info">In meeting</Pill>}
            <span className="font-mono text-[12px] text-ink-3">@{user.handle}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {user.expertiseTags.map((t) => <Pill key={t} variant="neutral">{t}</Pill>)}
          </div>
        </div>
      </div>

      {isPM ? (
        <div className="grid grid-cols-3 gap-6">
          <section className="col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Owned Epics</div>
            <div className="space-y-2">
              {myEpics.map((e) => (
                <Link key={e.id} href={`/e/${e.key}`} className="flex items-center gap-4 p-3 rounded-[8px] bg-bg-card border border-rule hover:border-accent">
                  <span className="font-mono text-[11px] text-ink-3 w-16">{e.key}</span>
                  <span className="flex-1 text-[14px] text-ink truncate">{e.title}</span>
                  <HealthPill h={e.health} />
                </Link>
              ))}
              {myEpics.length === 0 && <p className="italic text-[13px] text-ink-3">Not the PIC on any Epic yet.</p>}
            </div>
          </section>
          <aside className="space-y-3">
            <Stat label="Active Epics" value={myEpics.length} />
          </aside>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <section className="col-span-2 space-y-6">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">This sprint</div>
              <div className="grid grid-cols-2 gap-3">
                {inSprint.map((t) => <TicketCard key={t.id} ticket={t} />)}
                {inSprint.length === 0 && <p className="italic text-[13px] text-ink-3 col-span-2">No active tickets this sprint.</p>}
              </div>
            </div>


            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Recent PR activity</div>
              <div className="bg-bg-card border border-rule rounded-[8px] divide-y divide-rule-soft">
                {prActivity.map((pr, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Pill variant={pr.merged ? "ok" : pr.state === "open" ? "info" : "neutral"}>
                      {pr.merged ? "merged" : pr.state}
                    </Pill>
                    <span className="font-mono text-[11px] text-ink-3">{pr.repo}</span>
                    <span className="flex-1 text-[13px] text-ink truncate">{pr.title}</span>
                    <span className="font-mono text-[11px] text-ink-3">{relativeTime(pr.at)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Blocking relationships</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-card border border-rule rounded-[8px] p-4">
                  <div className="text-[13px] text-ink-3 mb-2">You're blocking</div>
                  {blocking.length === 0 ? <p className="italic text-[13px] text-ink-4">Nothing.</p> : (
                    <ul className="space-y-1">
                      {blocking.map((t) => <li key={t.id} className="text-[13px]"><Link href={`/t/${t.key}`} className="text-accent hover:underline">{t.key}</Link> · {t.title}</li>)}
                    </ul>
                  )}
                </div>
                <div className="bg-bg-card border border-rule rounded-[8px] p-4">
                  <div className="text-[13px] text-ink-3 mb-2">Blocking you</div>
                  {blockedBy.length === 0 ? <p className="italic text-[13px] text-ink-4">Nothing.</p> : (
                    <ul className="space-y-1">
                      {blockedBy.map((t) => <li key={t.id} className="text-[13px]"><Link href={`/t/${t.key}`} className="text-accent hover:underline">{t.key}</Link> · {t.title}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            <Stat label="Status" value={user.status === "ooo" ? "Out of office" : user.status === "in_meeting" ? "In a meeting" : "Available"} />
          </aside>
        </div>
      )}
    </div>
  );
}

function VelocityChart({ userId }: { userId: string }) {
  const [range, setRange] = useState<VelocityRange>("6");
  // Deterministic mock based on user id
  const base = userId.charCodeAt(2) % 12;
  const all = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const v = Math.max(10, 24 + Math.round(Math.sin(i + base) * 6 + Math.cos(i * 0.7) * 4));
        return { sprint: `W${i + 8}`, points: v };
      }),
    [base]
  );
  const data = all.slice(all.length - Number(range));
  const avg = Math.round(data.reduce((a, b) => a + b.points, 0) / data.length);

  const config: ChartConfig = {
    points: { label: "Points shipped", color: "var(--accent)" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          Velocity · {range} sprints
        </div>
        <div className="flex items-center gap-1">
          {(["6", "12"] as VelocityRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-2 h-6 text-[10px] font-mono uppercase rounded-[4px] border",
                range === r ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-bg-card border border-rule rounded-[8px] p-4">
        <div className="h-[140px]">
          <ChartContainer config={config}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval={0} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={28} />
              <ReferenceLine y={avg} stroke="var(--ink-4)" strokeDasharray="3 3" label={{ value: `avg ${avg}`, position: "insideTopRight", fontSize: 9, fill: "var(--ink-3)" }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} pt`} />} />
              <Bar dataKey="points" fill="var(--color-points)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-ink-3">
          <span>avg {avg} pt</span>
          <span>last {data[data.length - 1]?.points} pt</span>
        </div>
      </div>
    </div>
  );
}

function ForwardLoadChart({ userId, cap }: { userId: string; cap: number }) {
  const data = useMemo(() => {
    const seed = userId.charCodeAt(2);
    return Array.from({ length: 4 }, (_, i) => {
      const v = Math.max(0, cap + Math.round(Math.sin((i + seed) * 1.1) * 4) - 1);
      return { week: `W${20 + i}`, points: v };
    });
  }, [userId, cap]);

  const config: ChartConfig = {
    points: { label: "Forecast load", color: "var(--accent)" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Forward load · 4 weeks</div>
        <span className="font-mono text-[10px] text-ink-3">cap {cap} pt</span>
      </div>
      <div className="bg-bg-card border border-rule rounded-[8px] p-4">
        <div className="h-[140px]">
          <ChartContainer config={config}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval={0} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={28} />
              <ReferenceLine y={cap} stroke="var(--warn)" strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} pt`} />} />
              <Bar dataKey="points" radius={[3, 3, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.points > cap ? "var(--danger)" : "var(--accent)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-rule rounded-[8px] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="text-[14px] text-ink">{value}</div>
    </div>
  );
}

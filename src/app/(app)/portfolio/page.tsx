"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, HealthPill, Pill, ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type Range = "3m" | "6m" | "12m";
type HealthFilter = "all" | "on_track" | "at_risk" | "blocked" | "not_started";
type SortBy = "key" | "health" | "projects";
type Scope = "all" | "team" | "personal";

const RANGE_LENGTHS: Record<Range, number> = { "3m": 6, "6m": 12, "12m": 24 };

export default function PortfolioPage() {
  useDocumentTitle("Portfolio Health");
  const allEpics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const currentUser = useCurrentUser();

  const [scope, setScope] = useState<Scope>("all");
  const [range, setRange] = useState<Range>("6m");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("health");

  // Scope filter — applied first
  const epics = useMemo(() => {
    if (!currentUser || scope === "all") return allEpics;
    if (scope === "personal") return allEpics.filter((e) => e.pmPicId === currentUser.id);
    // team: epics whose child projects include the user's pod
    const userPod = currentUser.pod;
    if (!userPod) return allEpics; // PMs/leadership without pod see all in team mode
    const teamEpicIds = new Set(
      projects.filter((p) => p.pod === userPod).map((p) => p.epicId)
    );
    return allEpics.filter((e) => teamEpicIds.has(e.id));
  }, [allEpics, projects, scope, currentUser]);

  const total = epics.length;
  const byHealth = {
    on_track: epics.filter((e) => e.health === "on_track").length,
    at_risk: epics.filter((e) => e.health === "at_risk").length,
    blocked: epics.filter((e) => e.health === "blocked").length,
    not_started: epics.filter((e) => e.health === "not_started").length,
  };

  const filteredEpics = useMemo(() => {
    let arr = epics.slice();
    if (healthFilter !== "all") arr = arr.filter((e) => e.health === healthFilter);
    if (sortBy === "key") arr.sort((a, b) => a.key.localeCompare(b.key));
    if (sortBy === "health") {
      const order: Record<string, number> = { blocked: 0, at_risk: 1, on_track: 2, not_started: 3 };
      arr.sort((a, b) => order[a.health] - order[b.health]);
    }
    if (sortBy === "projects") {
      arr.sort(
        (a, b) =>
          projects.filter((p) => p.epicId === b.id).length -
          projects.filter((p) => p.epicId === a.id).length
      );
    }
    return arr;
  }, [epics, healthFilter, sortBy, projects]);

  const blockers = tickets
    .filter((t) => t.blocked || t.status === "scheduled")
    .filter((t) => t.priority === "P0" || t.priority === "P1")
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="S-16 · Portfolio Health"
        title={
          <>
            The <em className="text-accent">whole bet</em>, at a glance.
          </>
        }
        lede="Health rolls up Epic → Portfolio. Toggle scope to focus on your pod or just your owned Epics."
        actions={
          <FilterPills
            label="Scope"
            value={scope}
            onChange={(v) => setScope(v as Scope)}
            options={[
              { value: "all", label: "All" },
              { value: "team", label: currentUser?.pod ? `Team · ${currentUser.pod}` : "Team" },
              { value: "personal", label: "Personal" },
            ]}
          />
        }
      />

      {epics.length === 0 && (
        <div className="bg-warn-soft border border-warn rounded-[8px] px-4 py-3 mb-6 text-[13px] text-warn">
          No Epics match this scope. Try switching to <button onClick={() => setScope("all")} className="underline">All</button>.
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="Epics" value={total} />
        <Stat label="On Track" value={byHealth.on_track} accent="ok" />
        <Stat label="At Risk" value={byHealth.at_risk} accent="warn" />
        <Stat label="Blocked" value={byHealth.blocked} accent="danger" />
      </div>

      {/* Two-up: health donut + on-time trend */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <HealthDistribution byHealth={byHealth} total={total} />
        <OnTimeTrend range={range} setRange={setRange} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <AllocationByPod className="col-span-1" />

        {/* Top blockers card */}
        <section className="col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Top blockers</div>
            <span className="font-mono text-[11px] text-ink-3">P0 + P1 only</span>
          </div>
          <div className="bg-bg-card border border-rule rounded-[8px] divide-y divide-rule-soft">
            {blockers.length === 0 ? (
              <p className="px-4 py-6 italic text-[13px] text-ink-3">Nothing blocking right now.</p>
            ) : (
              blockers.map((t) => (
                <Link key={t.id} href={`/t/${t.key}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated">
                  <span className="font-mono text-[11px] text-ink-3 w-20">{t.key}</span>
                  <Pill variant={t.priority === "P0" ? "danger" : "warn"}>{t.priority}</Pill>
                  <span className="flex-1 text-[13px] text-ink truncate">{t.title}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Epics list with filters */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Epics</div>
          <div className="flex items-center gap-3">
            <FilterPills
              label="Health"
              value={healthFilter}
              onChange={(v) => setHealthFilter(v as HealthFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "on_track", label: "On Track" },
                { value: "at_risk", label: "At Risk" },
                { value: "blocked", label: "Blocked" },
                { value: "not_started", label: "Not started" },
              ]}
            />
            <FilterPills
              label="Sort"
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              options={[
                { value: "health", label: "Health" },
                { value: "key", label: "Key" },
                { value: "projects", label: "# Projects" },
              ]}
            />
          </div>
        </div>
        <div className="space-y-2">
          {filteredEpics.length === 0 ? (
            <p className="italic text-[13px] text-ink-3 py-4">No Epics match this filter.</p>
          ) : (
            filteredEpics.map((e) => {
              const pm = users.find((u) => u.id === e.pmPicId);
              const childProjects = projects.filter((p) => p.epicId === e.id).length;
              return (
                <Link
                  key={e.id}
                  href={`/e/${e.key}`}
                  className="flex items-center gap-4 p-4 rounded-[8px] border border-rule hover:border-accent bg-bg-card transition-colors duration-150"
                >
                  <span className="font-mono text-[11px] text-ink-3 w-16">{e.key}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] text-ink truncate">{e.title}</h3>
                    <p className="text-[12px] text-ink-3 line-clamp-1">{e.thesis}</p>
                  </div>
                  <HealthPill h={e.health} />
                  <Pill variant="neutral">{childProjects} proj</Pill>
                  <Avatar user={pm} size="xs" />
                </Link>
              );
            })
          )}
        </div>
        <div className="text-[11px] font-mono text-ink-3 mt-2">
          Showing {filteredEpics.length} of {epics.length} Epics
        </div>
      </section>
    </div>
  );
}

function FilterPills({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <div className="flex items-center gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border transition-colors duration-100",
              value === o.value ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HealthDistribution({ byHealth, total }: { byHealth: Record<string, number>; total: number }) {
  const data = useMemo(
    () =>
      [
        { key: "on_track", name: "On Track", value: byHealth.on_track, color: "var(--ok)" },
        { key: "at_risk", name: "At Risk", value: byHealth.at_risk, color: "var(--warn)" },
        { key: "blocked", name: "Blocked", value: byHealth.blocked, color: "var(--danger)" },
        { key: "not_started", name: "Not started", value: byHealth.not_started, color: "var(--neutral)" },
      ].filter((d) => d.value > 0),
    [byHealth]
  );

  const config: ChartConfig = {
    on_track: { label: "On Track", color: "var(--ok)" },
    at_risk: { label: "At Risk", color: "var(--warn)" },
    blocked: { label: "Blocked", color: "var(--danger)" },
    not_started: { label: "Not started", color: "var(--neutral)" },
  };

  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Health distribution</div>
        <span className="font-mono text-[11px] text-ink-3">{total} Epics</span>
      </div>
      <div className="h-[220px] flex items-center gap-4">
        <div className="flex-1 h-full">
          <ChartContainer config={config}>
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => `${v} ${Number(v) === 1 ? "Epic" : "Epics"} · ${Math.round((Number(v) / total) * 100)}%`}
                  />
                }
              />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2} stroke="var(--bg-card)">
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        <ul className="space-y-2 pr-2">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-2 text-[12px]">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: d.color }} />
              <span className="text-ink-2 w-24">{d.name}</span>
              <span className="font-mono text-ink tabular-nums">{d.value}</span>
              <span className="font-mono text-[10px] text-ink-3">({Math.round((d.value / total) * 100)}%)</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function OnTimeTrend({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
  const fullSeries = useMemo(() => {
    // 24 sprints back, mock noise around 82%
    return Array.from({ length: 24 }, (_, i) => {
      const seed = Math.sin(i * 0.7) * 6 + Math.cos(i * 1.3) * 4;
      const v = Math.max(60, Math.min(100, 80 + Math.round(seed)));
      return { sprint: `W${(i % 26) + 1}`, onTime: v };
    });
  }, []);

  const data = fullSeries.slice(fullSeries.length - RANGE_LENGTHS[range]);
  const avg = Math.round(data.reduce((a, b) => a + b.onTime, 0) / data.length);
  const last = data[data.length - 1]?.onTime ?? 0;

  const config: ChartConfig = {
    onTime: { label: "On-time %", color: "var(--accent)" },
  };

  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">On-time delivery trend</div>
          <div className="font-mono text-[12px] text-ink-3 mt-0.5">avg {avg}% · last {last}%</div>
        </div>
        <FilterPills
          label="Range"
          value={range}
          onChange={(v) => setRange(v as Range)}
          options={[
            { value: "3m", label: "3M" },
            { value: "6m", label: "6M" },
            { value: "12m", label: "12M" },
          ]}
        />
      </div>
      <div className="h-[220px]">
        <ChartContainer config={config}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis
              domain={[60, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <ReferenceLine y={80} stroke="var(--ok)" strokeDasharray="3 3" />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}%`} />} />
            <Line
              type="monotone"
              dataKey="onTime"
              stroke="var(--color-onTime)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-onTime)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </section>
  );
}

function AllocationByPod({ className }: { className?: string }) {
  const projects = useAppStore((s) => s.projects);
  const pods = ["routing", "sorting", "forecasting", "platform"] as const;
  const data = useMemo(
    () =>
      pods.map((pod) => ({
        pod: pod.charAt(0).toUpperCase() + pod.slice(1),
        projects: projects.filter((p) => p.pod === pod).length,
      })),
    [projects]
  );

  const config: ChartConfig = {
    projects: { label: "Projects", color: "var(--accent)" },
  };

  return (
    <section className={cn("bg-bg-card border border-rule rounded-[8px] p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Allocation by pod</div>
        <span className="font-mono text-[11px] text-ink-3">{projects.length} Projects</span>
      </div>
      <div className="h-[220px]">
        <ChartContainer config={config}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 4" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
            <YAxis type="category" dataKey="pod" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={80} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="projects" fill="var(--color-projects)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "ok" | "warn" | "danger" }) {
  return (
    <div className={cn("bg-bg-card border border-rule rounded-[8px] p-4 border-l-4", accent === "ok" && "border-l-ok", accent === "warn" && "border-l-warn", accent === "danger" && "border-l-danger", !accent && "border-l-accent")}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="display text-display-m text-ink">{value}</div>
    </div>
  );
}

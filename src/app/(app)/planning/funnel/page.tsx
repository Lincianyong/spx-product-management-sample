"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore } from "@/lib/store";
import {
  Avatar,
  Pill,
  PriorityPill,
  TypePill,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

type Stage = "backlog" | "picked" | "sized" | "assigned" | "committed";

interface StageDef {
  key: Stage;
  label: string;
  hint: string;
  owner: "PM" | "Eng" | "All" | "—";
  color: string;
  match: (t: Ticket) => boolean;
  href: string;
}

export default function FunnelPage() {
  useDocumentTitle("Sprint Funnel");
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const [selectedStage, setSelectedStage] = useState<Stage>("picked");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const planningSprint = sprints.find((s) => s.state === "planning");
  const activeSprint = sprints.find((s) => s.state === "active");

  const stages: StageDef[] = useMemo(
    () => [
      {
        key: "backlog",
        label: "In Backlog",
        hint: "DoR-ready, not yet picked",
        owner: "PM",
        color: "var(--neutral)",
        match: (t) => t.status === "backlog" && !t.pickedForSprint,
        href: "/backlog",
      },
      {
        key: "picked",
        label: "Picked · awaiting Eng handover",
        hint: "PM has picked, hasn't sent to Eng (no points yet)",
        owner: "PM",
        color: "var(--accent)",
        match: (t) => t.pickedForSprint && t.storyPoints == null,
        href: "/planning/picklist",
      },
      {
        key: "sized",
        label: "Sized · awaiting assignment",
        hint: "Eng has estimated, no assignee yet",
        owner: "Eng",
        color: "var(--info)",
        match: (t) => t.pickedForSprint && t.storyPoints != null && t.assigneeId == null,
        href: "/planning/estimation",
      },
      {
        key: "assigned",
        label: "Assigned · awaiting Joint commit",
        hint: "Sized + assigned, sprint not committed yet",
        owner: "All",
        color: "var(--warn)",
        match: (t) =>
          t.pickedForSprint &&
          t.storyPoints != null &&
          t.assigneeId != null &&
          (t.status === "backlog" || t.status === "triage"),
        href: "/planning/joint",
      },
      {
        key: "committed",
        label: "Committed · live in sprint",
        hint: "Sprint committed, status moved to Scheduled",
        owner: "—",
        color: "var(--ok)",
        match: (t) => t.status === "scheduled" || t.status === "in_progress" || t.status === "review" || t.status === "verifying",
        href: "/sprint",
      },
    ],
    []
  );

  const filteredTickets = useMemo(() => {
    if (projectFilter === "all") return tickets;
    return tickets.filter((t) => projects.find((p) => p.id === t.projectId)?.key === projectFilter);
  }, [tickets, projectFilter, projects]);

  const counts = useMemo(() => {
    const map: Record<Stage, Ticket[]> = {
      backlog: [], picked: [], sized: [], assigned: [], committed: [],
    };
    for (const stage of stages) {
      map[stage.key] = filteredTickets.filter(stage.match);
    }
    return map;
  }, [stages, filteredTickets]);

  const data = stages.map((s) => ({
    stage: s.label.split(" · ")[0],
    full: s.label,
    count: counts[s.key].length,
    color: s.color,
    key: s.key,
    owner: s.owner,
  }));

  // Detect stuck stages: tickets that have been "picked" or "sized" longer than 24h
  const stuckPicked = counts.picked.filter((t) => Date.now() - new Date(t.createdAt).getTime() > 24 * 3600 * 1000);
  const stuckSized = counts.sized.filter((t) => Date.now() - new Date(t.createdAt).getTime() > 48 * 3600 * 1000);

  const totalInFlight = data.reduce((acc, d) => acc + d.count, 0);

  const chartConfig: ChartConfig = {
    count: { label: "Tickets" },
  };

  const stage = stages.find((s) => s.key === selectedStage)!;
  const stageTickets = counts[selectedStage];

  return (
    <div>
      <PageHeader
        eyebrow={`Sprint Funnel · ${planningSprint?.key ?? activeSprint?.key ?? "—"}`}
        title={
          <>
            Where tickets <em className="text-accent">get stuck</em>.
          </>
        }
        lede="Tickets flow Backlog → PM Picked → Eng Sized → Joint Assigned → Committed. Watch for choke points."
        actions={
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger size="sm" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.key}>{p.key} · {p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <PlanningNav />

      {/* Funnel cards row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {stages.map((s, idx) => {
          const isSelected = selectedStage === s.key;
          const c = counts[s.key].length;
          return (
            <button
              key={s.key}
              onClick={() => setSelectedStage(s.key)}
              className={cn(
                "text-left bg-bg-card border rounded-[8px] p-4 transition-colors duration-150 relative overflow-hidden",
                isSelected ? "border-accent ring-2 ring-accent-soft" : "border-rule hover:border-ink-4"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Stage {idx + 1}</span>
                <Pill
                  variant={
                    s.owner === "PM" ? "accent" :
                    s.owner === "Eng" ? "info" :
                    s.owner === "All" ? "warn" : "neutral"
                  }
                >
                  {s.owner}
                </Pill>
              </div>
              <div className="display text-display-m text-ink mb-1">{c}</div>
              <div className="text-[12px] text-ink-2 leading-snug">{s.label.split(" · ")[0]}</div>
              {s.label.includes("·") && (
                <div className="text-[11px] text-ink-3 leading-snug mt-0.5">{s.label.split(" · ")[1]}</div>
              )}
              {/* progress dot connector */}
              {idx < stages.length - 1 && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-rule z-10"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Stuck alerts */}
      {(stuckPicked.length > 0 || stuckSized.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stuckPicked.length > 0 && (
            <div className="bg-warn-soft border border-warn rounded-[8px] p-3 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warn">⚠ PM choke</span>
              <span className="text-[13px] text-ink-2 flex-1">
                {stuckPicked.length} ticket{stuckPicked.length === 1 ? "" : "s"} picked more than 24h ago, not yet sent to Eng
              </span>
              <Link href="/planning/picklist" className="font-mono text-[11px] uppercase tracking-[0.06em] text-warn hover:opacity-80">
                Open Picklist →
              </Link>
            </div>
          )}
          {stuckSized.length > 0 && (
            <div className="bg-warn-soft border border-warn rounded-[8px] p-3 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-warn">⚠ Eng choke</span>
              <span className="text-[13px] text-ink-2 flex-1">
                {stuckSized.length} ticket{stuckSized.length === 1 ? "" : "s"} sized more than 48h ago, no assignee
              </span>
              <Link href="/planning/joint" className="font-mono text-[11px] uppercase tracking-[0.06em] text-warn hover:opacity-80">
                Open Joint →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Funnel chart */}
      <section className="bg-bg-card border border-rule rounded-[8px] p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Funnel volume</div>
          <span className="font-mono text-[11px] text-ink-3">{totalInFlight} tickets in flight</span>
        </div>
        <div className="h-[220px]">
          <ChartContainer config={chartConfig}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={130}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(v) => `${v} ${Number(v) === 1 ? "ticket" : "tickets"}`}
                    labelFormatter={(_label, payload: unknown[]) => {
                      const first = payload?.[0] as { payload?: { full?: string } } | undefined;
                      return first?.payload?.full ?? "";
                    }}
                  />
                }
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} onClick={(p) => setSelectedStage((p as { key: Stage }).key)}>
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      {/* Stage drill-down */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{stage.label}</div>
            <p className="text-[13px] text-ink-3 mt-0.5">{stage.hint}</p>
          </div>
          <Link href={stage.href} className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
            Open stage surface →
          </Link>
        </div>

        {stageTickets.length === 0 ? (
          <EmptyState title="Nothing stuck here." body="This stage is empty — flow is healthy." />
        ) : (
          <div className="bg-bg-card border border-rule rounded-[8px] divide-y divide-rule-soft">
            {stageTickets.map((t) => {
              const project = projects.find((p) => p.id === t.projectId);
              const author = users.find((u) => u.id === t.authorId);
              const assignee = users.find((u) => u.id === t.assigneeId);
              return (
                <Link key={t.id} href={`/t/${t.key}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-elevated">
                  <span className="font-mono text-[11px] text-ink-3 w-20">{t.key}</span>
                  <TypePill t={t.type} />
                  <PriorityPill p={t.priority} />
                  <span className="flex-1 text-[14px] text-ink truncate">{t.title}</span>
                  <span className="font-mono text-[11px] text-ink-3 truncate w-24">{project?.key ?? "ad-hoc"}</span>
                  <span className="font-mono text-[11px] text-ink-3 w-12 text-right">
                    {t.storyPoints != null ? `${t.storyPoints} pt` : "—"}
                  </span>
                  <div className="flex items-center gap-1.5 w-32 justify-end">
                    <Avatar user={assignee ?? author} size="xs" />
                    <span className="text-[12px] text-ink-3 truncate">
                      {assignee?.displayName ?? author?.displayName}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-4 w-20 text-right">{relativeTime(t.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-[11px] font-mono text-ink-3 mt-2">
          Showing {stageTickets.length} ticket{stageTickets.length === 1 ? "" : "s"} in this stage
        </p>
      </section>
    </div>
  );
}

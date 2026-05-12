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
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Users,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
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
  Button,
} from "@/components/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn, relativeTime } from "@/lib/utils";
import type { Ticket, Sprint, User, Role } from "@/lib/types";

// ─── Stage definitions ──────────────────────────────────────────────
type Stage = "backlog" | "picked" | "sized" | "assigned" | "committed";

interface StageDef {
  key: Stage;
  label: string;
  hint: string;
  owner: "PM" | "Eng" | "All" | "—";
  color: string;
  match: (t: Ticket, sprintId: string | null) => boolean;
  href: string;
}

const STAGES: StageDef[] = [
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
      t.status === "backlog",
    href: "/planning/joint",
  },
  {
    key: "committed",
    label: "Committed · live in sprint",
    hint: "Sprint committed, status moved to Scheduled+",
    owner: "—",
    color: "var(--ok)",
    match: (t, sprintId) =>
      t.sprintId === sprintId &&
      ["scheduled", "in_progress", "review", "verifying"].includes(t.status),
    href: "/sprint",
  },
];

// ─── Calendar-derived choke logic ───────────────────────────────────
// Sprint cycle (per docs):
//   Mon 09:00 — 4a Picklist (PM alone)        → PM should hand off by Mon 14:00
//   Mon 14:00 — 4b Estimation (Engineers)     → Eng should finish by Tue 10:00
//   Tue 10:00 — 4c Joint Planning             → Sprint commits by Tue 10:30
//   Tue 10:30 → Sun 18:00 — Sprint Active

interface CycleCalendar {
  picklistStart: Date;   // Mon 09:00
  picklistDue: Date;     // Mon 14:00 (PM choke after this)
  estimationDue: Date;   // Tue 10:00 (Eng choke after this)
  jointDue: Date;        // Tue 10:30 (Joint choke after this)
  sprintStart: Date;     // Tue 10:30
}

function calendarFor(sprint: Sprint): CycleCalendar {
  const sprintStart = new Date(sprint.startDate + "T10:30:00");
  // The Tuesday of the planning week is sprintStart's day; Monday is the day before.
  const tue = new Date(sprintStart);
  tue.setHours(10, 0, 0, 0);
  const mon = new Date(tue);
  mon.setDate(tue.getDate() - 1);

  const picklistStart = new Date(mon);
  picklistStart.setHours(9, 0, 0, 0);
  const picklistDue = new Date(mon);
  picklistDue.setHours(14, 0, 0, 0);
  const estimationDue = new Date(tue);
  estimationDue.setHours(10, 0, 0, 0);
  const jointDue = new Date(tue);
  jointDue.setHours(10, 30, 0, 0);
  return { picklistStart, picklistDue, estimationDue, jointDue, sprintStart };
}

type CycleStage = "pre_picklist" | "picklist" | "estimation" | "joint" | "active" | "post_active";

function cycleStageNow(cal: CycleCalendar, now: Date): CycleStage {
  if (now < cal.picklistStart) return "pre_picklist";
  if (now < cal.picklistDue) return "picklist";
  if (now < cal.estimationDue) return "estimation";
  if (now < cal.jointDue) return "joint";
  if (now < cal.sprintStart) return "joint";
  return "active";
}

function chokesFor(
  tickets: Ticket[],
  cal: CycleCalendar,
  now: Date
): { pmChoke: Ticket[]; engChoke: Ticket[]; jointChoke: Ticket[] } {
  const stage = cycleStageNow(cal, now);
  const pickedStage = STAGES.find((s) => s.key === "picked")!;
  const sizedStage = STAGES.find((s) => s.key === "sized")!;
  const assignedStage = STAGES.find((s) => s.key === "assigned")!;

  const pmChoke = stage === "estimation" || stage === "joint" || stage === "active"
    ? tickets.filter((t) => pickedStage.match(t, null))
    : [];
  const engChoke = stage === "joint" || stage === "active"
    ? tickets.filter((t) => sizedStage.match(t, null))
    : [];
  const jointChoke = stage === "active"
    ? tickets.filter((t) => assignedStage.match(t, null))
    : [];

  return { pmChoke, engChoke, jointChoke };
}

// ─── Page ────────────────────────────────────────────────────────────
export default function FunnelPage() {
  useDocumentTitle("Sprint Funnel");
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const projects = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const user = useCurrentUser();

  const planningSprint = sprints.find((s) => s.state === "planning");
  const activeSprint = sprints.find((s) => s.state === "active");
  const defaultSprintId = planningSprint?.id ?? activeSprint?.id ?? sprints[0]?.id ?? "";

  const [sprintId, setSprintId] = useState<string>(defaultSprintId);
  const sprint = sprints.find((s) => s.id === sprintId) ?? planningSprint ?? activeSprint;
  const [selectedStage, setSelectedStage] = useState<Stage>("picked");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const filteredTickets = useMemo(() => {
    if (projectFilter === "all") return tickets;
    return tickets.filter((t) => projects.find((p) => p.id === t.epicId)?.key === projectFilter);
  }, [tickets, projectFilter, projects]);

  const counts = useMemo(() => {
    const map: Record<Stage, Ticket[]> = {
      backlog: [], picked: [], sized: [], assigned: [], committed: [],
    };
    for (const stage of STAGES) {
      map[stage.key] = filteredTickets.filter((t) => stage.match(t, sprint?.id ?? null));
    }
    return map;
  }, [filteredTickets, sprint?.id]);

  const cal = sprint ? calendarFor(sprint) : null;
  const now = new Date();
  const cycleStage = cal ? cycleStageNow(cal, now) : "active";
  const { pmChoke, engChoke, jointChoke } = cal
    ? chokesFor(filteredTickets, cal, now)
    : { pmChoke: [], engChoke: [], jointChoke: [] };

  const totalInFlight = STAGES.filter((s) => s.key !== "backlog").reduce(
    (acc, s) => acc + counts[s.key].length,
    0
  );

  const chartData = STAGES.map((s) => ({
    stage: s.label.split(" · ")[0],
    full: s.label,
    count: counts[s.key].length,
    color: s.color,
    key: s.key,
    owner: s.owner,
  }));

  const chartConfig: ChartConfig = { count: { label: "Tickets" } };
  const stage = STAGES.find((s) => s.key === selectedStage)!;
  const stageTickets = counts[selectedStage];

  return (
    <div>
      <PageHeader
        eyebrow={`Sprint Funnel · ${sprint?.key ?? "—"}`}
        title={
          <>
            Where tickets <em className="text-accent">get stuck</em>.
          </>
        }
        lede="Tickets flow Backlog → PM Picked → Eng Sized → Joint Assigned → Committed. Watch for choke points."
        actions={
          <div className="flex items-center gap-2">
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger size="sm" className="w-56 font-mono uppercase tracking-[0.06em]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.key} · {s.state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
        }
      />

      <PlanningNav />

      {/* Calendar context strip */}
      {cal && (
        <CalendarStrip cal={cal} now={now} stage={cycleStage} sprintKey={sprint?.key ?? ""} />
      )}

      {/* Choke alerts */}
      {(pmChoke.length > 0 || engChoke.length > 0 || jointChoke.length > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {pmChoke.length > 0 && (
            <ChokeCard
              kind="pm"
              count={pmChoke.length}
              cal={cal!}
              copy="PM choke · picked but not sent to Eng past Mon 14:00"
              href="/planning/picklist"
              cta="Open Picklist →"
            />
          )}
          {engChoke.length > 0 && (
            <ChokeCard
              kind="eng"
              count={engChoke.length}
              cal={cal!}
              copy="Eng choke · sized but no assignee past Tue 10:00"
              href="/planning/estimation"
              cta="Open Estimation →"
            />
          )}
          {jointChoke.length > 0 && (
            <ChokeCard
              kind="joint"
              count={jointChoke.length}
              cal={cal!}
              copy="Joint choke · assigned but sprint not committed past Tue 10:30"
              href="/planning/joint"
              cta="Open Joint Planning →"
            />
          )}
        </div>
      )}

      {/* Two-column layout: main funnel + right rail */}
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        {/* Main */}
        <div className="space-y-6 min-w-0">
          {/* 5 stage cards */}
          <div className="grid grid-cols-5 gap-3">
            {STAGES.map((s, idx) => {
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
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      Stage {idx + 1}
                    </span>
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
                    <div className="text-[11px] text-ink-3 leading-snug mt-0.5">
                      {s.label.split(" · ")[1]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Funnel chart */}
          <section className="bg-bg-card border border-rule rounded-[8px] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                Funnel volume
              </div>
              <span className="font-mono text-[11px] text-ink-3">
                {totalInFlight} tickets in flight
              </span>
            </div>
            <div className="h-[220px]">
              <ChartContainer config={chartConfig}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
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
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    onClick={(p) => setSelectedStage((p as { key: Stage }).key)}
                  >
                    {chartData.map((d) => (
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
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                  {stage.label}
                </div>
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
                  const project = projects.find((p) => p.id === t.epicId);
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

        {/* Right rail — role-aware "Your lane" */}
        <RoleRail
          role={user?.role ?? "engineer"}
          user={user ?? null}
          counts={counts}
          chokes={{ pm: pmChoke.length, eng: engChoke.length, joint: jointChoke.length }}
          sprints={sprints}
        />
      </div>
    </div>
  );
}

// ─── Calendar strip ──────────────────────────────────────────────────
function CalendarStrip({
  cal,
  now,
  stage,
  sprintKey,
}: {
  cal: CycleCalendar;
  now: Date;
  stage: CycleStage;
  sprintKey: string;
}) {
  const milestones: { label: string; ts: Date; key: CycleStage }[] = [
    { label: "Mon 09:00 · Picklist starts",   ts: cal.picklistStart, key: "picklist" },
    { label: "Mon 14:00 · Estimation starts", ts: cal.picklistDue,   key: "estimation" },
    { label: "Tue 10:00 · Joint starts",      ts: cal.estimationDue, key: "joint" },
    { label: "Tue 10:30 · Sprint commits",    ts: cal.jointDue,      key: "active" },
  ];
  const reachedIdx = milestones.findIndex((m) => now < m.ts);
  const activeIdx = reachedIdx === -1 ? milestones.length - 1 : Math.max(0, reachedIdx - 1);

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-4 flex items-center gap-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">
        Now {now.toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="flex items-center gap-2 flex-1">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center min-w-0">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  i < activeIdx
                    ? "bg-ok"
                    : i === activeIdx
                    ? "bg-accent ring-4 ring-accent-soft"
                    : "bg-rule"
                )}
              />
              <span className={cn(
                "font-mono text-[10px] mt-1.5 text-center",
                i === activeIdx ? "text-ink" : "text-ink-3"
              )}>
                {m.label}
              </span>
            </div>
            {i < milestones.length - 1 && (
              <span className={cn("flex-1 h-px", i < activeIdx ? "bg-ok" : "bg-rule")} />
            )}
          </div>
        ))}
      </div>
      <Pill variant={stage === "active" ? "ok" : stage === "pre_picklist" ? "neutral" : "accent"}>
        {stageLabel(stage, sprintKey)}
      </Pill>
    </div>
  );
}

function stageLabel(stage: CycleStage, sprintKey: string): string {
  switch (stage) {
    case "pre_picklist": return `Pre-cycle for ${sprintKey}`;
    case "picklist":     return "4a · Picklist window";
    case "estimation":   return "4b · Estimation window";
    case "joint":        return "4c · Joint window";
    case "active":       return `${sprintKey} active`;
    case "post_active":  return `${sprintKey} closed`;
  }
}

// ─── Choke card ──────────────────────────────────────────────────────
function ChokeCard({
  kind,
  count,
  copy,
  href,
  cta,
}: {
  kind: "pm" | "eng" | "joint";
  count: number;
  cal: CycleCalendar;
  copy: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-warn-soft border border-warn rounded-[8px] p-3 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-warn shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn mb-1">
          {kind === "pm" ? "PM choke" : kind === "eng" ? "Eng choke" : "Joint choke"} · {count} ticket{count === 1 ? "" : "s"}
        </div>
        <div className="text-[12px] text-ink-2 leading-snug">{copy}</div>
        <Link href={href} className="font-mono text-[11px] uppercase tracking-[0.06em] text-warn hover:opacity-80 mt-1.5 inline-block">
          {cta}
        </Link>
      </div>
    </div>
  );
}

// ─── Role-specific right rail ───────────────────────────────────────
function RoleRail({
  role,
  user,
  counts,
  chokes,
  sprints,
}: {
  role: Role;
  user: User | null;
  counts: Record<Stage, Ticket[]>;
  chokes: { pm: number; eng: number; joint: number };
  sprints: Sprint[];
}) {
  if (role === "engineer") return <EngRail counts={counts} user={user} />;
  return <PmRail counts={counts} chokes={chokes} />;
}

function RailHeader({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="px-4 pt-4 pb-2 border-b border-rule-soft">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{children}</div>
      {sub && <div className="text-[12px] text-ink-3 mt-0.5">{sub}</div>}
    </div>
  );
}

function CTA({
  icon: Icon,
  href,
  label,
  meta,
  intent = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
  meta?: string;
  intent?: "default" | "warn" | "ok";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-2 px-3 py-2.5 rounded-[6px] hover:bg-rule-soft transition-colors duration-100",
        intent === "warn" && "bg-warn-soft hover:bg-warn-soft/80",
        intent === "ok" && "bg-ok-soft hover:bg-ok-soft/80"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 mt-0.5 shrink-0",
        intent === "warn" ? "text-warn" : intent === "ok" ? "text-ok" : "text-accent"
      )} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink leading-snug">{label}</div>
        {meta && <div className="font-mono text-[11px] text-ink-3 mt-0.5">{meta}</div>}
      </div>
      <span className="text-ink-4 text-[11px] mt-1">→</span>
    </Link>
  );
}

function PmRail({ counts, chokes }: { counts: Record<Stage, Ticket[]>; chokes: { pm: number; eng: number; joint: number } }) {
  return (
    <aside className="bg-bg-card border border-rule rounded-[8px] sticky top-16 self-start min-w-0 overflow-hidden">
      <RailHeader sub="What only you can unstick">PM lane</RailHeader>
      <div className="p-2 space-y-1">
        {counts.picked.length > 0 && (
          <CTA
            icon={Send}
            href="/planning/picklist"
            label="Send picks to Engineering"
            meta={`${counts.picked.length} picked, no estimate yet`}
            intent={chokes.pm > 0 ? "warn" : "default"}
          />
        )}
        {counts.assigned.length > 0 && (
          <CTA
            icon={CheckCircle2}
            href="/planning/joint"
            label="Commit the sprint"
            meta={`${counts.assigned.length} ready to commit`}
            intent={chokes.joint > 0 ? "warn" : "ok"}
          />
        )}
        {counts.picked.length === 0 && counts.assigned.length === 0 && (
          <p className="px-3 py-4 italic text-[13px] text-ink-3">Nothing for you to unstick. Quiet morning.</p>
        )}
      </div>
      <RailHeader>Top stuck — P0 / P1</RailHeader>
      <StuckList stage="all" counts={counts} priorities={["P0", "P1"]} />
    </aside>
  );
}

function EngRail({ counts, user }: { counts: Record<Stage, Ticket[]>; user: User | null }) {
  const tickets = useAppStore((s) => s.tickets);
  const myAssigned = user
    ? counts.assigned.filter((t) => t.assigneeId === user.id)
    : [];
  const myCommitted = user
    ? counts.committed.filter((t) => t.assigneeId === user.id)
    : [];
  const sizedNeedsHelp = counts.sized;
  return (
    <aside className="bg-bg-card border border-rule rounded-[8px] sticky top-16 self-start min-w-0 overflow-hidden">
      <RailHeader sub="Where you fit in the funnel">Eng lane</RailHeader>
      <div className="p-2 space-y-1">
        {sizedNeedsHelp.length > 0 && (
          <CTA
            icon={Clock}
            href="/planning/estimation"
            label="Estimate the queue"
            meta={`${sizedNeedsHelp.length} need an estimate`}
          />
        )}
        {myAssigned.length > 0 && (
          <CTA
            icon={Users}
            href="/planning/joint"
            label="You'll own these next sprint"
            meta={`${myAssigned.length} assigned to you`}
            intent="ok"
          />
        )}
        {myCommitted.length > 0 && (
          <CTA
            icon={CheckCircle2}
            href="/me"
            label="Already committed for you"
            meta={`${myCommitted.length} live in current sprint`}
          />
        )}
        {sizedNeedsHelp.length === 0 && myAssigned.length === 0 && (
          <p className="px-3 py-4 italic text-[13px] text-ink-3">Nothing in the eng lane needs you yet.</p>
        )}
      </div>
      <RailHeader>Tickets you authored, still in funnel</RailHeader>
      <ul className="p-2 space-y-1">
        {(["picked", "sized", "assigned"] as Stage[]).flatMap((k) =>
          counts[k].filter((t) => t.authorId === user?.id).map((t) => (
            <li key={t.id} className="px-3 py-2 rounded-[6px] hover:bg-rule-soft">
              <Link href={`/t/${t.key}`} className="block">
                <div className="flex items-center gap-2">
                  <TypePill t={t.type} />
                  <span className="font-mono text-[11px] text-ink-3">{t.key}</span>
                </div>
                <div className="text-[12px] text-ink truncate mt-1">{t.title}</div>
              </Link>
            </li>
          ))
        )}
        {(["picked", "sized", "assigned"] as Stage[]).every((k) => counts[k].filter((t) => t.authorId === user?.id).length === 0) && (
          <li className="px-3 py-2 italic text-[12px] text-ink-3">None of your authored tickets are stuck.</li>
        )}
      </ul>
    </aside>
  );
}

function EmRail({ counts, chokes }: { counts: Record<Stage, Ticket[]>; chokes: { pm: number; eng: number; joint: number } }) {
  const users = useAppStore((s) => s.users);
  const engineers = users.filter((u) => u.role === "engineer" && u.capacityPoints > 0);
  const loadByUser: Record<string, number> = {};
  for (const t of counts.assigned.concat(counts.committed)) {
    if (t.assigneeId && t.storyPoints) {
      loadByUser[t.assigneeId] = (loadByUser[t.assigneeId] ?? 0) + t.storyPoints;
    }
  }
  return (
    <aside className="bg-bg-card border border-rule rounded-[8px] sticky top-16 self-start min-w-0 overflow-hidden">
      <RailHeader sub="Will the pod commit cleanly?">EM lane</RailHeader>
      <div className="p-3 space-y-2">
        {engineers.map((u) => {
          const load = loadByUser[u.id] ?? 0;
          const pct = u.capacityPoints > 0 ? load / u.capacityPoints : 0;
          const state = pct > 1 ? "over" : pct > 0.9 ? "at" : "under";
          return (
            <Link
              key={u.id}
              href={`/u/${u.handle}`}
              className="block"
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar user={u} size="xs" />
                <span className="text-[12px] text-ink truncate flex-1">{u.displayName}</span>
                <span className={cn(
                  "font-mono text-[11px]",
                  state === "over" ? "text-danger" : state === "at" ? "text-warn" : "text-ink-3"
                )}>
                  {load}/{u.capacityPoints} pt
                </span>
              </div>
              <div className="h-1.5 bg-rule-soft rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    state === "over" ? "bg-danger" : state === "at" ? "bg-warn" : "bg-ok"
                  )}
                  style={{ width: `${Math.min(pct * 100, 130)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
      <RailHeader>Joint commit readiness</RailHeader>
      <div className="p-3 text-[13px] text-ink-2 space-y-1.5">
        <div className="flex justify-between">
          <span>Assigned tickets</span>
          <span className="font-mono">{counts.assigned.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Joint chokes</span>
          <span className={cn("font-mono", chokes.joint > 0 ? "text-warn" : "text-ok")}>
            {chokes.joint}
          </span>
        </div>
      </div>
    </aside>
  );
}

function LeadershipRail({ sprints, counts }: { sprints: Sprint[]; counts: Record<Stage, Ticket[]> }) {
  // Mock 8-cycle history of funnel volume (committed at end of cycle).
  const history = useMemo(() => {
    const closed = sprints.filter((s) => s.state === "closed");
    const series = Array.from({ length: 8 }, (_, i) => {
      const seed = Math.sin(i * 0.7) * 6;
      return {
        sprint: `W${(i % 26) + 13}`,
        committed: Math.max(20, Math.round(28 + seed)),
        carryover: Math.max(0, Math.round(3 + Math.cos(i) * 2)),
      };
    });
    if (closed.length > 0) {
      series[series.length - 1] = {
        sprint: closed[0].key.split("-")[0],
        committed: closed[0].committedPoints / 5,
        carryover: Math.max(0, (closed[0].committedPoints - closed[0].shippedPoints) / 5),
      };
    }
    return series;
  }, [sprints]);

  const avg = Math.round(history.reduce((a, b) => a + b.committed, 0) / history.length);
  const last = history[history.length - 1]?.committed ?? 0;
  const onTimePct = Math.round(
    (history.reduce((a, b) => a + (b.committed - b.carryover), 0) /
      history.reduce((a, b) => a + b.committed, 0)) *
      100
  );

  const config: ChartConfig = {
    committed: { label: "Committed", color: "var(--accent)" },
  };

  return (
    <aside className="bg-bg-card border border-rule rounded-[8px] sticky top-16 self-start min-w-0 overflow-hidden">
      <RailHeader sub="Last 8 cycles · ritual health">Leadership lane</RailHeader>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Avg / cycle" value={`${avg}`} />
          <Stat label="Last cycle" value={`${last}`} />
          <Stat label="On-time" value={`${onTimePct}%`} accent="ok" />
        </div>
        <div className="h-[140px]">
          <ChartContainer config={config}>
            <LineChart data={history} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} width={28} />
              <ReferenceLine y={avg} stroke="var(--ink-4)" strokeDasharray="3 3" />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v} tickets`} />} />
              <Line
                type="monotone"
                dataKey="committed"
                stroke="var(--color-committed)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
      <RailHeader>This cycle in flight</RailHeader>
      <div className="p-3 text-[13px] text-ink-2 space-y-1.5">
        <Row label="Picked" value={counts.picked.length} />
        <Row label="Sized" value={counts.sized.length} />
        <Row label="Assigned" value={counts.assigned.length} />
        <Row label="Committed" value={counts.committed.length} />
      </div>
    </aside>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "ok" }) {
  return (
    <div className="bg-bg-elevated border border-rule rounded-[6px] p-2 text-center">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{label}</div>
      <div className={cn("display text-[18px] mt-0.5", accent === "ok" ? "text-ok" : "text-ink")}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-3">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </div>
  );
}

function StuckList({
  counts,
  priorities,
}: {
  stage: "all";
  counts: Record<Stage, Ticket[]>;
  priorities: ("P0" | "P1" | "P2")[];
}) {
  const stuck = (["picked", "sized", "assigned"] as Stage[])
    .flatMap((k) => counts[k])
    .filter((t) => priorities.includes(t.priority))
    .slice(0, 5);

  if (stuck.length === 0) {
    return <p className="px-3 py-4 italic text-[12px] text-ink-3">No P0 / P1 stuck. Good.</p>;
  }
  return (
    <ul className="p-2 space-y-1">
      {stuck.map((t) => (
        <li key={t.id}>
          <Link href={`/t/${t.key}`} className="block px-3 py-2 rounded-[6px] hover:bg-rule-soft">
            <div className="flex items-center gap-2 mb-1">
              <PriorityPill p={t.priority} />
              <TypePill t={t.type} />
              <span className="font-mono text-[11px] text-ink-3">{t.key}</span>
            </div>
            <div className="text-[12px] text-ink truncate">{t.title}</div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

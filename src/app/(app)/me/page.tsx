"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, AtSign, Clock } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { TicketCard } from "@/components/tickets/TicketCard";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";
import { SortableList, DragHandle } from "@/components/SortableList";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Pill, PriorityPill, TypePill, toast } from "@/components/ui";
import type { Ticket, Sprint, User, Comment, ActivityEntry, Epic, Role } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { cn, relativeTime, statusLabel } from "@/lib/utils";

const DAY_MS = 86400000;

export default function MyWorkPage() {
  const tickets = useAppStore((s) => s.tickets);
  const sprints = useAppStore((s) => s.sprints);
  const comments = useAppStore((s) => s.comments);
  const activity = useAppStore((s) => s.activity);
  const users = useAppStore((s) => s.users);
  const epics = useAppStore((s) => s.epics);
  const setPersonalRanks = useAppStore((s) => s.setPersonalRanks);
  const user = useCurrentUser();
  const [openKey, setOpenKey] = useState<string | null>(null);

  useDocumentTitle(user ? `My Work · ${user.displayName}` : "My Work");

  if (!user) return null;

  const activeSprint = sprints.find((s) => s.state === "active");
  const planningSprint = sprints.find((s) => s.state === "planning");

  // ─── Filtered ticket lists ──────────────────────────────────────
  const mineInActive = useMemo(
    () => tickets.filter((t) => t.assigneeId === user.id && t.sprintId === activeSprint?.id),
    [tickets, user.id, activeSprint?.id]
  );

  const thisSprint = useMemo(() => {
    const arr = mineInActive.filter((t) => t.status !== "done" && t.status !== "verified");
    return [...arr].sort((a, b) => (a.personalRank ?? 99) - (b.personalRank ?? 99));
  }, [mineInActive]);

  const upNext = useMemo(
    () => tickets.filter((t) => t.assigneeId === user.id && t.status === "backlog"),
    [tickets, user.id]
  );

  const blockingThem = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.assigneeId === user.id &&
          tickets.some(
            (o) => o.linkedWork.some((e) => e.type === "blocked_by" && e.ticketKey === t.key) && o.status !== "done"
          )
      ),
    [tickets, user.id]
  );

  const blockingMe = useMemo(
    () => tickets.filter((t) => t.assigneeId === user.id && t.linkedWork.some((e) => e.type === "blocked_by")),
    [tickets, user.id]
  );

  const authoredOpen = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.authorId === user.id &&
          !["done", "verified", "cancelled", "cannot_reproduce"].includes(t.status)
      ),
    [tickets, user.id]
  );

  // ─── Stats ──────────────────────────────────────────────────────
  const committedPts = mineInActive.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const shippedPts = mineInActive
    .filter((t) => t.status === "done" || t.status === "verified")
    .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const progressPct = committedPts > 0 ? Math.round((shippedPts / committedPts) * 100) : 0;
  const loadPct = user.capacityPoints > 0 ? Math.round((committedPts / user.capacityPoints) * 100) : 0;

  const daysRemaining = activeSprint
    ? Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - Date.now()) / DAY_MS))
    : 0;

  // Deterministic mock for last sprint shipped (until we have per-engineer historical data)
  const lastSprintShipped = useMemo(() => {
    const closed = sprints.find((s) => s.state === "closed");
    if (!closed) return null;
    const seed = user.id.charCodeAt(2) % 8;
    return Math.max(8, 12 + seed); // 12-19 pts
  }, [sprints, user.id]);

  // ─── Mentions awaiting reply ────────────────────────────────────
  const unrepliedMentions = useMemo(
    () => findUnrepliedMentions(comments, user.id),
    [comments, user.id]
  );

  // ─── Time-in-status warnings ────────────────────────────────────
  const staleStatus = useMemo(() => {
    const out: { ticket: Ticket; days: number; threshold: number }[] = [];
    const now = Date.now();
    for (const t of mineInActive) {
      if (t.status === "in_progress" && t.startedAt) {
        const days = Math.floor((now - new Date(t.startedAt).getTime()) / DAY_MS);
        if (days > 3) out.push({ ticket: t, days, threshold: 3 });
      } else if (t.status === "review") {
        // Find last status_change to "review" in activity
        const last = [...activity]
          .reverse()
          .find((a) => a.entityId === t.id && a.action === "status_change" && a.afterValue === "review");
        if (last) {
          const days = Math.floor((now - new Date(last.timestamp).getTime()) / DAY_MS);
          if (days > 2) out.push({ ticket: t, days, threshold: 2 });
        }
      }
    }
    return out;
  }, [mineInActive, activity]);

  // ─── Recent activity on my tickets ──────────────────────────────
  const myEntityIds = useMemo(
    () => new Set(tickets.filter((t) => t.assigneeId === user.id || t.authorId === user.id).map((t) => t.id)),
    [tickets, user.id]
  );
  const recentActivity = useMemo(
    () =>
      [...activity]
        .filter((a) => a.entityType === "ticket" && myEntityIds.has(a.entityId) && a.actorId !== user.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10),
    [activity, myEntityIds, user.id]
  );

  const onReorderThisSprint = (next: typeof thisSprint) => {
    const ranks = next.map((t, idx) => ({ ticketId: t.id, rank: idx + 1 }));
    setPersonalRanks(ranks);
    toast("Personal priority saved. Others don't see this.", { kind: "info" });
  };

  const sprintForCal = planningSprint ?? activeSprint;

  return (
    <div>
      <PageHeader
        eyebrow={`S-08 · My Work · ${user.displayName}`}
        title={
          <>
            What's <em className="text-accent">on your plate</em>.
          </>
        }
        lede={`${activeSprint?.key ?? "No active sprint"} · ${thisSprint.length} tickets in flight, ${upNext.length} waiting in your queue.`}
      />

      {/* Role-aware stats strip */}
      <RoleStatsStrip
        role={user.role}
        user={user}
        tickets={tickets}
        users={users}
        epics={epics}
        sprints={sprints}
        activeSprint={activeSprint ?? null}
        daysRemaining={daysRemaining}
        committedPts={committedPts}
        shippedPts={shippedPts}
        progressPct={progressPct}
        loadPct={loadPct}
        lastSprintShipped={lastSprintShipped}
        authoredOpen={authoredOpen}
      />

      {/* Calendar strip */}
      {sprintForCal && <PlanningCalendarMini sprint={sprintForCal} />}

      {/* Inline alerts */}
      {(unrepliedMentions.length > 0 || staleStatus.length > 0) && (
        <div className="space-y-2 mb-6">
          {unrepliedMentions.length > 0 && (
            <MentionsAlert mentions={unrepliedMentions} />
          )}
          {staleStatus.length > 0 && (
            <StatusAlert items={staleStatus} />
          )}
        </div>
      )}

      {/* Primary work row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Panel
          eyebrow={thisSprint.length > 0 ? "On now · this sprint · drag (⠿) for personal order" : "On now · this sprint"}
          count={thisSprint.length}
        >
          {thisSprint.length === 0 ? (
            <EmptyEcho text="Nothing on your plate this sprint. Pick up an ad-hoc, or grab from the queue below." />
          ) : (
            <div className="flex flex-col gap-2">
              <SortableList
                items={thisSprint}
                onReorder={onReorderThisSprint}
                renderItem={(t, handle) => (
                  <div className="flex items-start gap-2">
                    <DragHandle handleProps={handle} className="mt-3.5 text-[16px]" />
                    <div className="flex-1 min-w-0">
                      <TicketCard ticket={t} onOpen={setOpenKey} />
                    </div>
                  </div>
                )}
              />
            </div>
          )}
        </Panel>

        <Panel eyebrow="In queue · backlog" count={upNext.length}>
          {upNext.length === 0 ? (
            <EmptyEcho text="Nothing queued for you. Backlog is the next stop." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {upNext.map((t) => (
                <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Dependencies: collapse to a single strip when both lanes are empty */}
      {blockingThem.length === 0 && blockingMe.length === 0 ? (
        <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-2.5 mb-6 flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Dependencies
          </span>
          <span className="text-[12px] text-ink-3">·</span>
          <span className="text-[12px] text-ink-2">0 blocking · 0 blocked</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.06em] text-ok">
            clear
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Panel eyebrow="Downstream waits" count={blockingThem.length} accent="warn">
            {blockingThem.length === 0 ? (
              <EmptyEcho text="No one is waiting on you." />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {blockingThem.map((t) => (
                  <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
                ))}
              </div>
            )}
          </Panel>

          <Panel eyebrow="Upstream stuck" count={blockingMe.length} accent="danger">
            {blockingMe.length === 0 ? (
              <EmptyEcho text="Nothing waiting on others." />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {blockingMe.map((t) => (
                  <TicketCard key={t.id} ticket={t} onOpen={setOpenKey} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Tickets I Filed + Recent activity */}
      <div className="grid grid-cols-[1fr_360px] gap-6">
        <FiledPanel tickets={authoredOpen} onOpen={setOpenKey} />
        <ActivityPanel items={recentActivity} />
      </div>

      <TicketSlideOver ticketKey={openKey} onClose={() => setOpenKey(null)} />
    </div>
  );
}

// ─── Role-aware stats strip ─────────────────────────────────────
function RoleStatsStrip({
  role,
  user,
  tickets,
  users,
  epics,
  sprints,
  activeSprint,
  daysRemaining,
  committedPts,
  shippedPts,
  progressPct,
  loadPct,
  lastSprintShipped,
  authoredOpen,
}: {
  role: Role;
  user: User;
  tickets: Ticket[];
  users: User[];
  epics: Epic[];
  sprints: Sprint[];
  activeSprint: Sprint | null;
  daysRemaining: number;
  committedPts: number;
  shippedPts: number;
  progressPct: number;
  loadPct: number;
  lastSprintShipped: number | null;
  authoredOpen: Ticket[];
}) {
  // Engineer / Designer — original eng-centric strip
  if (role === "engineer" || role === "designer") {
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Sprint load"
          value={`${committedPts}/${user.capacityPoints}`}
          unit="pt"
          tint={loadPct > 100 ? "danger" : loadPct > 90 ? "warn" : "ok"}
          progress={Math.min(loadPct, 130)}
          caption={`${loadPct}%${loadPct > 100 ? " · over" : ""}`}
        />
        <StatCard
          label="Sprint progress"
          value={`${shippedPts}/${committedPts}`}
          unit="pt"
          progress={progressPct}
          caption={`${progressPct}% shipped`}
        />
        <StatCard
          label="Days remaining"
          value={String(daysRemaining)}
          unit={daysRemaining === 1 ? "day" : "days"}
          caption={activeSprint?.key ?? "—"}
        />
        <StatCard
          label="Last sprint"
          value={lastSprintShipped != null ? String(lastSprintShipped) : "—"}
          unit={lastSprintShipped != null ? "pt shipped" : ""}
          caption={
            lastSprintShipped != null && committedPts > 0
              ? lastSprintShipped >= committedPts
                ? "↑ vs this sprint"
                : "ahead of last"
              : "no history"
          }
        />
      </div>
    );
  }

  // PM (and admin/guest fall back to this) — picks-driven view
  if (role === "pm" || role === "admin" || role === "guest") {
    const pmChoke = tickets.filter((t) => t.pickedForSprint && t.storyPoints == null).length;
    const mineOpenAuthored = authoredOpen.length;
    // Team progress = all tickets in active sprint
    const teamCommitted = activeSprint?.committedPoints ?? 0;
    const teamShipped = activeSprint
      ? tickets
          .filter((t) => t.sprintId === activeSprint.id && (t.status === "done" || t.status === "verified"))
          .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0)
      : 0;
    const teamPct = teamCommitted > 0 ? Math.round((teamShipped / teamCommitted) * 100) : 0;
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="PM choke"
          value={String(pmChoke)}
          unit={pmChoke === 1 ? "ticket" : "tickets"}
          caption={pmChoke > 0 ? "picked · not sent to Eng" : "all picks handed off"}
          tint={pmChoke > 0 ? "warn" : "ok"}
        />
        <StatCard
          label="My open tickets"
          value={String(mineOpenAuthored)}
          unit={mineOpenAuthored === 1 ? "open" : "open"}
          caption="authored, not yet shipped"
        />
        <StatCard
          label="Days remaining"
          value={String(daysRemaining)}
          unit={daysRemaining === 1 ? "day" : "days"}
          caption={activeSprint?.key ?? "—"}
        />
        <StatCard
          label="Team progress"
          value={`${teamShipped}/${teamCommitted}`}
          unit="pt"
          progress={teamPct}
          caption={`${teamPct}% shipped`}
        />
      </div>
    );
  }

  // EM — pod aggregate
  if (role === "em") {
    const pod = user.pod;
    const podMembers = pod
      ? users.filter((u) => u.pod === pod && u.capacityPoints > 0 && (u.role === "engineer" || u.role === "designer"))
      : [];
    const podCap = podMembers.reduce((acc, u) => acc + u.capacityPoints, 0);
    const podTickets = activeSprint
      ? tickets.filter((t) =>
          t.sprintId === activeSprint.id &&
          podMembers.some((m) => m.id === t.assigneeId)
        )
      : [];
    const podCommit = podTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
    const podShipped = podTickets
      .filter((t) => t.status === "done" || t.status === "verified")
      .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
    const podLoadPct = podCap > 0 ? Math.round((podCommit / podCap) * 100) : 0;
    const podShipPct = podCommit > 0 ? Math.round((podShipped / podCommit) * 100) : 0;
    const overloaded = podMembers.filter((u) => {
      const userCommit = tickets
        .filter((t) => t.sprintId === activeSprint?.id && t.assigneeId === u.id)
        .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
      return u.capacityPoints > 0 && userCommit > u.capacityPoints;
    }).length;
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Pod load"
          value={`${podCommit}/${podCap}`}
          unit="pt"
          tint={podLoadPct > 100 ? "danger" : podLoadPct > 90 ? "warn" : "ok"}
          progress={Math.min(podLoadPct, 130)}
          caption={`${podLoadPct}% · ${podMembers.length} ICs`}
        />
        <StatCard
          label="Pod progress"
          value={`${podShipped}/${podCommit}`}
          unit="pt"
          progress={podShipPct}
          caption={`${podShipPct}% shipped`}
        />
        <StatCard
          label="Days remaining"
          value={String(daysRemaining)}
          unit={daysRemaining === 1 ? "day" : "days"}
          caption={activeSprint?.key ?? "—"}
        />
        <StatCard
          label="Overloaded"
          value={String(overloaded)}
          unit={overloaded === 1 ? "IC" : "ICs"}
          tint={overloaded > 0 ? "warn" : "ok"}
          caption={overloaded > 0 ? "above capacity" : "all within capacity"}
        />
      </div>
    );
  }

  // Leadership — portfolio health
  if (role === "leadership") {
    const onTrack = epics.filter((e) => e.health === "on_track").length;
    const atRisk = epics.filter((e) => e.health === "at_risk").length;
    const blocked = epics.filter((e) => e.health === "blocked").length;
    const totalEpics = epics.length;
    const onTrackPct = totalEpics > 0 ? Math.round((onTrack / totalEpics) * 100) : 0;
    // Cycle on-time = avg of (shipped / committed) across last 4 closed sprints
    const closed = sprints
      .filter((s) => s.state === "closed" && s.committedPoints > 0)
      .slice(-4);
    const avgOnTime =
      closed.length > 0
        ? Math.round(
            (closed.reduce((acc, s) => acc + s.shippedPoints / s.committedPoints, 0) / closed.length) * 100
          )
        : 0;
    return (
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Epics on track"
          value={`${onTrack}/${totalEpics}`}
          unit="epics"
          tint={onTrackPct >= 70 ? "ok" : onTrackPct >= 50 ? "warn" : "danger"}
          progress={onTrackPct}
          caption={`${onTrackPct}% green`}
        />
        <StatCard
          label="At risk"
          value={String(atRisk)}
          unit={atRisk === 1 ? "epic" : "epics"}
          tint={atRisk > 0 ? "warn" : "ok"}
          caption={atRisk > 0 ? "watch this week" : "none flagged"}
        />
        <StatCard
          label="Blocked"
          value={String(blocked)}
          unit={blocked === 1 ? "epic" : "epics"}
          tint={blocked > 0 ? "danger" : "ok"}
          caption={blocked > 0 ? "needs unblock" : "none blocked"}
        />
        <StatCard
          label="Cycle on-time"
          value={`${avgOnTime}%`}
          unit=""
          tint={avgOnTime >= 90 ? "ok" : avgOnTime >= 75 ? "warn" : "danger"}
          progress={Math.min(avgOnTime, 100)}
          caption={`last ${closed.length || 4} sprints`}
        />
      </div>
    );
  }

  // Fallback (shouldn't hit)
  return null;
}

// ─── Stats strip ─────────────────────────────────────────────────
function StatCard({
  label,
  value,
  unit,
  caption,
  progress,
  tint,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  progress?: number;
  tint?: "ok" | "warn" | "danger";
}) {
  const tintBar =
    tint === "danger" ? "bg-danger" :
    tint === "warn" ? "bg-warn" :
    tint === "ok" ? "bg-ok" : "bg-accent";
  const tintBorder =
    tint === "danger" ? "border-l-danger" :
    tint === "warn" ? "border-l-warn" :
    "border-l-accent";
  return (
    <div className={cn("bg-bg-card border border-rule rounded-[8px] p-4 border-l-4", tintBorder)}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="display text-display-m text-ink">{value}</span>
        {unit && <span className="font-mono text-[11px] text-ink-3">{unit}</span>}
      </div>
      {progress != null && (
        <div className="h-1.5 bg-rule-soft rounded-full overflow-hidden mb-1.5">
          <div className={cn("h-full transition-all duration-300", tintBar)} style={{ width: `${Math.min(progress, 130)}%` }} />
        </div>
      )}
      {caption && <div className="font-mono text-[11px] text-ink-3">{caption}</div>}
    </div>
  );
}

// ─── Planning calendar mini ─────────────────────────────────────
function PlanningCalendarMini({ sprint }: { sprint: Sprint }) {
  const sprintStart = new Date(sprint.startDate + "T10:30:00");
  const tue = new Date(sprintStart);
  tue.setHours(10, 0, 0, 0);
  const mon = new Date(tue);
  mon.setDate(tue.getDate() - 1);

  const milestones = [
    { label: "Picklist", ts: setTime(mon, 9, 0) },
    { label: "Estimation", ts: setTime(mon, 14, 0) },
    { label: "Joint", ts: setTime(tue, 10, 0) },
    { label: "Sprint", ts: setTime(tue, 10, 30) },
  ];
  const now = Date.now();
  const reachedIdx = milestones.findIndex((m) => now < m.ts.getTime());
  const activeIdx = reachedIdx === -1 ? milestones.length - 1 : Math.max(0, reachedIdx - 1);

  return (
    <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-4 flex items-center gap-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">
        Cycle for {sprint.key}
      </div>
      <div className="flex items-center gap-2 flex-1">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center min-w-0">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  i < activeIdx ? "bg-ok" : i === activeIdx ? "bg-accent ring-4 ring-accent-soft" : "bg-rule"
                )}
              />
              <span className={cn(
                "font-mono text-[10px] mt-1 text-center",
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
    </div>
  );
}

function setTime(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

// ─── Mentions alert ─────────────────────────────────────────────
function findUnrepliedMentions(comments: Comment[], userId: string) {
  const mentionsOfMe = comments.filter((c) => c.mentions.includes(userId) && c.authorId !== userId && !c.deletedAt);
  return mentionsOfMe.filter((m) => {
    const replies = comments.filter((c) => c.parentCommentId === m.id);
    return !replies.some((r) => r.authorId === userId);
  }).slice(0, 5);
}

function MentionsAlert({ mentions }: { mentions: Comment[] }) {
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);
  return (
    <div className="bg-accent-soft border border-accent rounded-[8px] p-3 flex items-start gap-3">
      <AtSign className="h-4 w-4 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent mb-1.5">
          {mentions.length} mention{mentions.length === 1 ? "" : "s"} awaiting reply
        </div>
        <ul className="space-y-1.5">
          {mentions.map((m) => {
            const author = users.find((u) => u.id === m.authorId);
            const ticket = tickets.find((t) => t.id === m.entityId);
            return (
              <li key={m.id} className="text-[13px]">
                <Link href={ticket ? `/t/${ticket.key}#c-${m.id}` : "#"} className="flex items-center gap-2 hover:underline underline-offset-2">
                  <Avatar user={author} size="xs" />
                  <span className="font-medium text-ink">{author?.displayName}</span>
                  <span className="text-ink-3 truncate flex-1">{m.body.slice(0, 80)}{m.body.length > 80 ? "…" : ""}</span>
                  {ticket && <span className="font-mono text-[11px] text-ink-3 shrink-0">{ticket.key}</span>}
                  <span className="font-mono text-[11px] text-ink-4 shrink-0">{relativeTime(m.createdAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Status alert ───────────────────────────────────────────────
function StatusAlert({ items }: { items: { ticket: Ticket; days: number; threshold: number }[] }) {
  return (
    <div className="bg-warn-soft border border-warn rounded-[8px] p-3 flex items-start gap-3">
      <Clock className="h-4 w-4 text-warn shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn mb-1.5">
          {items.length} ticket{items.length === 1 ? "" : "s"} idle past threshold
        </div>
        <ul className="space-y-1">
          {items.map(({ ticket, days, threshold }) => (
            <li key={ticket.id} className="text-[13px]">
              <Link href={`/t/${ticket.key}`} className="flex items-center gap-2 hover:underline underline-offset-2">
                <TypePill t={ticket.type} />
                <span className="font-mono text-[11px] text-ink-3">{ticket.key}</span>
                <span className="text-ink truncate flex-1">{ticket.title}</span>
                <Pill variant="warn">{statusLabel[ticket.status]} · {days}d / {threshold}d</Pill>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Filed panel ────────────────────────────────────────────────
function FiledPanel({ tickets, onOpen }: { tickets: Ticket[]; onOpen: (k: string) => void }) {
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Authored · open</div>
          <h3 className="display text-display-s text-ink mt-1">Tickets you filed</h3>
        </div>
        <span className="font-mono text-[12px] text-ink-3">{tickets.length} open</span>
      </div>
      {tickets.length === 0 ? (
        <p className="italic text-[13px] text-ink-3 py-4">Nothing open that you filed.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tickets.slice(0, 6).map((t) => (
            <TicketCard key={t.id} ticket={t} onOpen={onOpen} compact />
          ))}
        </div>
      )}
      {tickets.length > 6 && (
        <Link href="/my-bugs" className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep mt-3 inline-block">
          + {tickets.length - 6} more →
        </Link>
      )}
    </section>
  );
}

// ─── Activity panel ─────────────────────────────────────────────
function ActivityPanel({ items }: { items: ActivityEntry[] }) {
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);
  return (
    <section className="bg-bg-card border border-rule rounded-[8px] p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">By others</div>
          <h3 className="display text-display-s text-ink mt-1">Recent activity</h3>
        </div>
        <span className="font-mono text-[12px] text-ink-3">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="italic text-[13px] text-ink-3">No one else has touched your tickets recently.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => {
            const actor = users.find((u) => u.id === a.actorId);
            const ticket = tickets.find((t) => t.id === a.entityId);
            return (
              <li key={a.id} className={cn("flex items-start gap-2.5 text-[13px]", a.aiInfluenced && "bg-ai-soft/40 -mx-2 px-2 py-1 rounded-[6px]")}>
                <Avatar user={actor} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="text-ink-2 leading-snug">
                    <span className="text-ink">{actor?.displayName}</span>{" "}
                    <span className="text-ink-3">{a.action.replace("_", " ")}</span>
                    {a.beforeValue && a.afterValue && (
                      <>
                        {" "}<span className="font-mono text-[11px] text-ink-3">{a.beforeValue} → {a.afterValue}</span>
                      </>
                    )}
                  </div>
                  {ticket && (
                    <Link href={`/t/${ticket.key}`} className="font-mono text-[11px] text-ink-3 hover:text-accent">
                      {ticket.key}
                    </Link>
                  )}
                </div>
                <span className="font-mono text-[11px] text-ink-4 shrink-0">{relativeTime(a.timestamp)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── Existing helpers ───────────────────────────────────────────
function Panel({
  eyebrow,
  count,
  accent,
  children,
}: {
  eyebrow: string;
  count: number;
  accent?: "warn" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-bg-card border border-rule rounded-[8px] p-5",
        accent === "warn" && "border-l-4 border-l-warn",
        accent === "danger" && "border-l-4 border-l-danger"
      )}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 min-w-0 truncate">
          {eyebrow}
        </div>
        <span className="font-mono text-[12px] text-ink-3 shrink-0">
          {count} {count === 1 ? "ticket" : "tickets"}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyEcho({ text }: { text: string }) {
  return <p className="text-[13px] italic text-ink-3 py-4">{text}</p>;
}

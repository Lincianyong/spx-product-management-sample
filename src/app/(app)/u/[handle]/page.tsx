"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, HealthPill, Pill, RolePill } from "@/components/ui";
import { TicketCard } from "@/components/tickets/TicketCard";
import { cn, formatDate, podLabel, roleLabel } from "@/lib/utils";

export default function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const sprints = useAppStore((s) => s.sprints);

  const user = users.find((u) => u.handle === handle);
  if (!user) {
    return (
      <div className="py-20 text-center">
        <h2 className="display text-display-s text-ink">No such user.</h2>
        <Link href="/" className="text-accent hover:underline mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const activeSprint = sprints.find((s) => s.state === "active");
  const inSprint = tickets.filter((t) => t.assigneeId === user.id && t.sprintId === activeSprint?.id);
  const myEpics = epics.filter((e) => e.pmPicId === user.id);
  const isPM = user.role === "pm" || user.role === "leadership";

  // Mock velocity history (last 6 sprints)
  const velocity = [22, 26, 24, 28, 27, 31];
  const blocking = tickets.filter((t) => t.assigneeId === user.id && tickets.some((o) => o.linkedWork.some((e) => e.type === "blocked_by" && e.ticketKey === t.key)));
  const blockedBy = tickets.filter((t) => t.assigneeId === user.id && t.linkedWork.some((e) => e.type === "blocked_by"));

  return (
    <div>
      <div className="flex items-start gap-6 mb-8">
        <Avatar user={user} size="lg" />
        <div className="flex-1">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">{roleLabel[user.role]} · {podLabel(user.pod)}</div>
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
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Velocity · last 6 sprints</div>
              <div className="bg-bg-card border border-rule rounded-[8px] p-5">
                <div className="flex items-end gap-2 h-32">
                  {velocity.map((v, i) => {
                    const max = Math.max(...velocity);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-accent rounded-t-[4px] transition-all duration-300"
                          style={{ height: `${(v / max) * 100}%` }}
                        />
                        <span className="font-mono text-[10px] text-ink-3">{v}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="font-mono text-[11px] text-ink-3 mt-2 text-right">
                  Average · {Math.round(velocity.reduce((a, b) => a + b, 0) / velocity.length)} pts/sprint
                </div>
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
            <Stat label="Capacity" value={`${user.capacityPoints} pts/sprint`} />
            <Stat label="Pod" value={podLabel(user.pod)} />
            <Stat label="Status" value={user.status === "ooo" ? "Out of office" : user.status === "in_meeting" ? "In a meeting" : "Available"} />
          </aside>
        </div>
      )}
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

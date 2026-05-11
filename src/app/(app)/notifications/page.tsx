"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Pill, Button, toast } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const KIND_LABEL: Record<string, string> = {
  mention: "Mention",
  assignment: "Assignment",
  status_change: "Status change",
  sla_breach: "SLA breach",
  sprint_commit: "Sprint commit",
  sprint_close: "Sprint close",
  blocked: "Blocked",
  health_change: "Health change",
  bug_needs_verify: "Bug needs verify",
  triage_new: "New in triage",
  digest: "Digest",
};

const SLA: Record<string, number> = { P0: 4, P1: 24, P2: 168 };

export default function NotificationsPage() {
  useDocumentTitle("Notifications");
  const notifications = useAppStore((s) => s.notifications);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const archive = useAppStore((s) => s.archiveNotification);
  const snooze = useAppStore((s) => s.snoozeNotification);
  const user = useCurrentUser();

  // Inject live SLA-breach signals as virtual notifications (PM only)
  const slaSignals = useMemo(() => {
    if (user?.role !== "pm" && user?.role !== "admin") return [];
    return tickets
      .filter((t) => t.status === "triage")
      .map((t) => {
        const ageHours = Math.round((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
        const limit = SLA[t.priority] ?? 999;
        if (ageHours > limit) {
          return {
            id: `live_sla_${t.id}`,
            userId: user.id,
            kind: "sla_breach" as const,
            body: `${t.key} · ${ageHours}h in Triage (SLA ${limit}h)`,
            entityType: "ticket" as const,
            entityKey: t.key,
            createdAt: t.createdAt,
            read: false,
            archived: false,
            virtual: true,
          };
        }
        return null;
      })
      .filter(Boolean) as (import("@/lib/types").Notification & { virtual?: boolean })[];
  }, [tickets, user]);

  if (!user) return null;

  const now = Date.now();
  const stored = notifications.filter((n) => n.userId === user.id && !n.archived);
  const visible = stored.filter((n) => !n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now);
  const snoozed = stored.filter((n) => n.snoozedUntil && new Date(n.snoozedUntil).getTime() > now);
  const all = [...slaSignals, ...visible];
  const unread = all.filter((n) => !n.read);
  const read = all.filter((n) => n.read);

  return (
    <div>
      <PageHeader
        eyebrow="S-19 · Notifications"
        title={
          <>
            What <em className="text-accent">needs you</em>.
          </>
        }
        lede="Mentions, assignments, status changes you watch, SLA breaches. Default channel: in-app."
        actions={
          <Button variant="secondary" size="sm" onClick={() => stored.filter((n) => !n.read).forEach((n) => markRead(n.id))}>
            Mark all read
          </Button>
        }
      />

      {all.length === 0 && snoozed.length === 0 ? (
        <EmptyState title="All clear." body="No notifications. Quiet morning." />
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <Section title={`Unread · ${unread.length}`}>
              {unread.map((n) => (
                <Row
                  key={n.id}
                  n={n}
                  users={users}
                  onRead={() => !("virtual" in n && n.virtual) && markRead(n.id)}
                  onArchive={() => !("virtual" in n && n.virtual) && archive(n.id)}
                  onSnooze={(hours) => {
                    if ("virtual" in n && n.virtual) return;
                    snooze(n.id, new Date(Date.now() + hours * 3600000).toISOString());
                    toast(`Snoozed for ${hours}h`);
                  }}
                />
              ))}
            </Section>
          )}
          {read.length > 0 && (
            <Section title="Read">
              {read.map((n) => (
                <Row
                  key={n.id}
                  n={n}
                  users={users}
                  onRead={() => markRead(n.id, false)}
                  onArchive={() => archive(n.id)}
                  onSnooze={(hours) => {
                    snooze(n.id, new Date(Date.now() + hours * 3600000).toISOString());
                    toast(`Snoozed for ${hours}h`);
                  }}
                />
              ))}
            </Section>
          )}
          {snoozed.length > 0 && (
            <Section title={`Snoozed · ${snoozed.length}`}>
              {snoozed.map((n) => (
                <div key={n.id} className="flex items-center gap-3 px-4 py-3 rounded-[8px] bg-bg-elevated border border-rule-soft">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    💤 until {n.snoozedUntil ? new Date(n.snoozedUntil).toLocaleString() : ""}
                  </span>
                  <span className="text-[13px] text-ink-2 flex-1">{n.body}</span>
                  <button onClick={() => snooze(n.id, new Date(0).toISOString())} className="text-[12px] text-accent hover:underline">
                    Unsnooze
                  </button>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ n, users, onRead, onArchive, onSnooze }: {
  n: import("@/lib/types").Notification & { virtual?: boolean };
  users: import("@/lib/types").User[];
  onRead: () => void;
  onArchive: () => void;
  onSnooze: (hours: number) => void;
}) {
  const actor = users.find((u) => u.id === n.actorId);
  const href = n.entityType === "ticket" ? `/t/${n.entityKey}` : n.entityType === "epic" ? `/e/${n.entityKey}` : "#";
  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 rounded-[8px] border",
      n.read ? "bg-bg-card border-rule-soft" : "bg-bg-card border-rule border-l-4 border-l-accent",
      n.kind === "sla_breach" && "border-l-4 border-l-danger"
    )}>
      <Avatar user={actor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Pill variant={n.kind === "sla_breach" ? "danger" : n.kind === "mention" ? "accent" : "default"}>{KIND_LABEL[n.kind]}</Pill>
          <span className="text-[12px] text-ink-3 font-mono">{relativeTime(n.createdAt)}</span>
          {n.virtual && <span className="font-mono text-[10px] uppercase text-warn">live</span>}
        </div>
        <Link href={href} className="text-[14px] text-ink hover:text-accent underline-offset-2 hover:underline">
          {n.body}
        </Link>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!n.virtual && (
          <SnoozeMenu onSelect={onSnooze} />
        )}
        <button onClick={onRead} className="text-[12px] text-ink-3 hover:text-ink font-mono uppercase tracking-[0.06em]">
          {n.read ? "Unread" : "Read"}
        </button>
        <button onClick={onArchive} className="text-[12px] text-ink-3 hover:text-danger font-mono uppercase tracking-[0.06em]">
          Archive
        </button>
      </div>
    </div>
  );
}

function SnoozeMenu({ onSelect }: { onSelect: (hours: number) => void }) {
  return (
    <div className="relative group">
      <button className="text-[12px] text-ink-3 hover:text-ink font-mono uppercase tracking-[0.06em]">
        💤 Snooze
      </button>
      <div className="absolute right-0 top-full mt-1 z-30 hidden group-hover:block w-32 bg-bg-card border border-rule rounded-[8px] shadow-lg p-1">
        {[
          { label: "1 hour", hours: 1 },
          { label: "4 hours", hours: 4 },
          { label: "Tomorrow", hours: 24 },
          { label: "Next week", hours: 24 * 7 },
        ].map((o) => (
          <button
            key={o.hours}
            onClick={() => onSelect(o.hours)}
            className="w-full text-left px-3 py-2 text-[12px] rounded-[6px] text-ink-2 hover:bg-rule-soft"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

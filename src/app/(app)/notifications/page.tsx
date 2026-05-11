"use client";

import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Pill, Button } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

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

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const users = useAppStore((s) => s.users);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const archive = useAppStore((s) => s.archiveNotification);
  const user = useCurrentUser();

  if (!user) return null;

  const my = notifications.filter((n) => n.userId === user.id && !n.archived);
  const unread = my.filter((n) => !n.read);
  const read = my.filter((n) => n.read);

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
          <Button variant="secondary" size="sm" onClick={() => my.filter((n) => !n.read).forEach((n) => markRead(n.id))}>
            Mark all read
          </Button>
        }
      />

      {my.length === 0 ? (
        <EmptyState title="All clear." body="No notifications. Quiet morning." />
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <Section title={`Unread · ${unread.length}`}>
              {unread.map((n) => (
                <Row key={n.id} n={n} users={users} onRead={() => markRead(n.id)} onArchive={() => archive(n.id)} />
              ))}
            </Section>
          )}
          {read.length > 0 && (
            <Section title="Read">
              {read.map((n) => (
                <Row key={n.id} n={n} users={users} onRead={() => markRead(n.id, false)} onArchive={() => archive(n.id)} />
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

function Row({ n, users, onRead, onArchive }: {
  n: import("@/lib/types").Notification;
  users: import("@/lib/types").User[];
  onRead: () => void;
  onArchive: () => void;
}) {
  const actor = users.find((u) => u.id === n.actorId);
  const href = n.entityType === "ticket" ? `/t/${n.entityKey}` : n.entityType === "epic" ? `/e/${n.entityKey}` : "#";
  return (
    <div className={cn("flex items-center gap-4 px-4 py-3 rounded-[8px] border", n.read ? "bg-bg-card border-rule-soft" : "bg-bg-card border-rule border-l-4 border-l-accent")}>
      <Avatar user={actor} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Pill variant={n.kind === "sla_breach" ? "danger" : n.kind === "mention" ? "accent" : "default"}>{KIND_LABEL[n.kind]}</Pill>
          <span className="text-[12px] text-ink-3 font-mono">{relativeTime(n.createdAt)}</span>
        </div>
        <Link href={href} className="text-[14px] text-ink hover:text-accent underline-offset-2 hover:underline">
          {n.body}
        </Link>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onRead} className="text-[12px] text-ink-3 hover:text-ink font-mono uppercase tracking-[0.06em]">
          {n.read ? "Mark unread" : "Mark read"}
        </button>
        <button onClick={onArchive} className="text-[12px] text-ink-3 hover:text-danger font-mono uppercase tracking-[0.06em]">
          Archive
        </button>
      </div>
    </div>
  );
}

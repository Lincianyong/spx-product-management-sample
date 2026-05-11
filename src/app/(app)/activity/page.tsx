"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

export default function ActivityPage() {
  const activity = useAppStore((s) => s.activity);
  const users = useAppStore((s) => s.users);
  const tickets = useAppStore((s) => s.tickets);

  const sorted = [...activity].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <PageHeader
        eyebrow="S-20 · Activity Log"
        title={
          <>
            The <em className="text-accent">trail</em>.
          </>
        }
        lede="Every state change with before/after, who, when, and whether AI nudged the change."
      />

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              {["When", "Who", "Entity", "Action", "Before", "After", "Source"].map((h) => (
                <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const actor = users.find((u) => u.id === a.actorId);
              const ticket = tickets.find((t) => t.id === a.entityId);
              return (
                <tr key={a.id} className={cn("border-b border-rule-soft", a.aiInfluenced && "bg-ai-soft/30")}>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{relativeTime(a.timestamp)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar user={actor} size="xs" />
                      <span className="text-[13px]">{actor?.displayName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]">
                    {ticket && <Link href={`/t/${ticket.key}`} className="text-ink hover:text-accent underline-offset-2 hover:underline">{ticket.key}</Link>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink">{a.action.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{a.beforeValue ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">{a.afterValue ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.aiInfluenced ? <Pill variant="ai">✦ AI</Pill> : <Pill variant="neutral">Human</Pill>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

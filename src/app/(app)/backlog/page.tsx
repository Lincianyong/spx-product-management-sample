"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, Pill, PriorityPill, TypePill } from "@/components/ui";
import { cn, daysBetween, formatDate } from "@/lib/utils";

export default function BacklogPage() {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const backlog = useMemo(() => {
    const base = tickets.filter((t) => t.status === "backlog");
    if (projectFilter === "all") return base;
    return base.filter((t) => projects.find((p) => p.id === t.projectId)?.key === projectFilter);
  }, [tickets, projectFilter, projects]);

  const today = new Date().toISOString();

  return (
    <div>
      <PageHeader
        eyebrow="S-03 · Backlog"
        title={
          <>
            <em className="text-accent">DoR-ready</em>, waiting to be picked.
          </>
        }
        lede="Pool of tickets that have made it through Triage. Sort by priority, drop into a sprint via Picklist."
        actions={
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.key}>
                {p.key} · {p.title}
              </option>
            ))}
          </select>
        }
      />

      {backlog.length === 0 ? (
        <EmptyState title="Backlog is dry." body="Add work to keep the engine fed. Create or confirm Triage tickets." />
      ) : (
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-elevated">
              <tr className="border-b border-rule">
                {["", "Key", "Title", "Type", "Priority", "Project", "Created", "Age"].map((h) => (
                  <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backlog.map((t) => {
                const age = daysBetween(t.createdAt, today);
                const stale = age >= 28;
                const project = projects.find((p) => p.id === t.projectId);
                return (
                  <tr key={t.id} className={cn("border-b border-rule-soft hover:bg-bg-elevated", stale && "bg-warn-soft/30")}>
                    <td className="px-4 py-3 w-8">
                      {stale && <Pill variant="warn">stale</Pill>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">
                      <Link href={`/t/${t.key}`} className="text-ink hover:text-accent underline-offset-2 hover:underline">
                        {t.key}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-ink max-w-md truncate">{t.title}</td>
                    <td className="px-4 py-3"><TypePill t={t.type} /></td>
                    <td className="px-4 py-3"><PriorityPill p={t.priority} /></td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{project?.key ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{age}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

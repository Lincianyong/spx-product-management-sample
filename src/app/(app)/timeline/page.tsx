"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, HealthPill } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";

export default function TimelinePage() {
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);

  // Range
  const allDates = epics.flatMap((e) => [new Date(e.startDate).getTime(), new Date(e.targetEndDate).getTime()]);
  const start = Math.min(...allDates);
  const end = Math.max(...allDates);
  const range = end - start;
  const today = Date.now();

  return (
    <div>
      <PageHeader
        eyebrow="S-15 · Timeline"
        title={
          <>
            The <em className="text-accent">arc</em> of the quarter.
          </>
        }
        lede="Epics as rows, time horizontal. Today is the warm line."
      />

      <div className="bg-bg-card border border-rule rounded-[8px] p-6 relative overflow-hidden">
        {/* Today line */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-warn"
          style={{ left: `calc(220px + ${((today - start) / range) * 100}% * (100% - 220px) / 100%)` }}
        >
          <div className="absolute -top-3 -left-6 text-warn font-mono text-[10px] uppercase tracking-[0.14em] bg-bg-card px-1">
            Today
          </div>
        </div>

        <div className="space-y-4 relative">
          {epics.map((e) => {
            const pm = users.find((u) => u.id === e.pmPicId);
            const epicProjects = projects.filter((p) => p.epicId === e.id);
            const left = ((new Date(e.startDate).getTime() - start) / range) * 100;
            const width = ((new Date(e.targetEndDate).getTime() - new Date(e.startDate).getTime()) / range) * 100;
            const barColor =
              e.health === "on_track" ? "bg-ok" : e.health === "at_risk" ? "bg-warn" : e.health === "blocked" ? "bg-danger" : "bg-neutral";
            return (
              <div key={e.id} className="grid grid-cols-[220px_1fr] items-center gap-4">
                <Link href={`/e/${e.key}`} className="flex items-center gap-2 text-[13px] text-ink hover:text-accent">
                  <Avatar user={pm} size="xs" />
                  <div className="truncate">
                    <span className="font-mono text-[11px] text-ink-3 mr-1.5">{e.key}</span>
                    {e.title}
                  </div>
                </Link>
                <div className="relative h-10 bg-rule-soft rounded-[6px]">
                  <div
                    className={cn("absolute top-1 bottom-1 rounded-[4px] opacity-90 flex items-center px-2", barColor)}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em]">{e.quarter}</span>
                  </div>
                  {/* Project sub-bars */}
                  {epicProjects.map((p, idx) => {
                    const pleft = ((new Date(p.startDate).getTime() - start) / range) * 100;
                    const pwidth = ((new Date(p.targetEndDate).getTime() - new Date(p.startDate).getTime()) / range) * 100;
                    return (
                      <div
                        key={p.id}
                        className="absolute top-0 h-1 bg-ink/40 rounded-[2px]"
                        style={{ left: `${pleft}%`, width: `${pwidth}%` }}
                        title={p.title}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[220px_1fr] mt-6 text-[11px] font-mono text-ink-3">
          <span></span>
          <div className="flex justify-between">
            <span>{formatDate(new Date(start).toISOString())}</span>
            <span>{formatDate(new Date(end).toISOString())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

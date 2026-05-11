"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { Avatar, HealthPill, Pill } from "@/components/ui";
import { cn, formatDate, healthLabel } from "@/lib/utils";

export default function PortfolioPage() {
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);

  const total = epics.length;
  const byHealth = {
    on_track: epics.filter((e) => e.health === "on_track").length,
    at_risk: epics.filter((e) => e.health === "at_risk").length,
    blocked: epics.filter((e) => e.health === "blocked").length,
    not_started: epics.filter((e) => e.health === "not_started").length,
  };

  const blockers = tickets
    .filter((t) => t.blocked || t.status === "scheduled")
    .filter((t) => t.priority === "P0" || t.priority === "P1")
    .slice(0, 5);

  const pods = ["routing", "sorting", "forecasting", "platform"] as const;
  const allocByPod = pods.map((pod) => ({
    pod,
    count: projects.filter((p) => p.pod === pod).length,
  }));
  const allocTotal = allocByPod.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div>
      <PageHeader
        eyebrow="S-16 · Portfolio Health"
        title={
          <>
            The <em className="text-accent">whole bet</em>, at a glance.
          </>
        }
        lede="Leadership view. Health rolls up Epic → Portfolio. Click any Epic for the full thread."
      />

      <div className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="Epics" value={total} />
        <Stat label="On Track" value={byHealth.on_track} accent="ok" />
        <Stat label="At Risk" value={byHealth.at_risk} accent="warn" />
        <Stat label="Blocked" value={byHealth.blocked} accent="danger" />
      </div>

      {/* Health distribution bar */}
      <section className="mb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Health distribution</div>
        <div className="flex h-3 w-full rounded-full overflow-hidden border border-rule">
          {byHealth.on_track > 0 && <div className="bg-ok" style={{ width: `${(byHealth.on_track / total) * 100}%` }} />}
          {byHealth.at_risk > 0 && <div className="bg-warn" style={{ width: `${(byHealth.at_risk / total) * 100}%` }} />}
          {byHealth.blocked > 0 && <div className="bg-danger" style={{ width: `${(byHealth.blocked / total) * 100}%` }} />}
          {byHealth.not_started > 0 && <div className="bg-neutral" style={{ width: `${(byHealth.not_started / total) * 100}%` }} />}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-6">
        {/* Epics */}
        <section className="col-span-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Epics</div>
          <div className="space-y-2">
            {epics.map((e) => {
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
            })}
          </div>
        </section>

        {/* Side */}
        <aside className="space-y-6">
          <section>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Top blockers</div>
            <div className="space-y-2">
              {blockers.map((t) => (
                <Link key={t.id} href={`/t/${t.key}`} className="block p-3 rounded-[8px] bg-bg-card border border-rule hover:border-danger">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] text-ink-3">{t.key}</span>
                    <Pill variant={t.priority === "P0" ? "danger" : "warn"}>{t.priority}</Pill>
                  </div>
                  <div className="text-[13px] text-ink truncate">{t.title}</div>
                </Link>
              ))}
              {blockers.length === 0 && <p className="text-[13px] italic text-ink-3">Nothing blocking right now.</p>}
            </div>
          </section>

          <section>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Allocation by pod</div>
            <div className="space-y-2">
              {allocByPod.map((a) => (
                <div key={a.pod} className="flex items-center gap-3">
                  <span className="text-[13px] text-ink w-20 capitalize">{a.pod}</span>
                  <div className="flex-1 h-2 bg-rule-soft rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${(a.count / allocTotal) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[11px] text-ink-3 w-8 text-right">{a.count}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
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

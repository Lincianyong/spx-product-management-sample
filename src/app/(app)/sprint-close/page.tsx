"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  Avatar,
  Button,
  Pill,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@/components/ui";
import { Textarea } from "@/components/ui";
import { TicketCard } from "@/components/tickets/TicketCard";
import { cn, formatDate } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function SprintClosePage() {
  useDocumentTitle("Sprint Close · Retro");
  const sprints = useAppStore((s) => s.sprints);
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const user = useCurrentUser();
  const [whatWorked, setWhatWorked] = useState("");
  const [whatBroke, setWhatBroke] = useState("");
  const [whatNext, setWhatNext] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // Closed sprints first (newest end-date wins), then the active sprint so a
  // PM can preview an in-flight retro without leaving the page.
  const selectable = useMemo(() => {
    const closed = sprints
      .filter((s) => s.state === "closed")
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    const active = sprints.find((s) => s.state === "active");
    return active ? [...closed, active] : closed;
  }, [sprints]);

  const sprint = selectable.find((s) => s.id === selectedSprintId) ?? selectable[0] ?? null;

  if (!sprint) return null;

  const sprintTickets = tickets.filter((t) => t.sprintId === sprint.id);
  const done = sprintTickets.filter((t) => t.status === "done" || t.status === "verified");
  const carryOver = sprintTickets.filter((t) => t.status !== "done" && t.status !== "verified");
  const completionPct = sprintTickets.length === 0 ? 0 : Math.round((done.length / sprintTickets.length) * 100);

  const submit = () => {
    toast(`Retro notes saved for ${sprint.key}`, { kind: "success" });
  };

  return (
    <div>
      <PageHeader
        eyebrow={`S-10 · Sprint Close · ${sprint.key}`}
        title={
          <>
            <em className="text-accent">Look back</em>, then keep moving.
          </>
        }
        lede="15 minutes Monday morning. What worked, what broke, what carries over. Velocity gets recorded automatically."
        actions={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 shrink-0">Sprint</span>
            <Select value={sprint.id} onValueChange={setSelectedSprintId}>
              <SelectTrigger size="sm" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectable.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono">{s.key}</span>
                    <span className="text-ink-3"> · {s.state === "active" ? "in-flight" : `closed ${formatDate(s.endDate)}`}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-8">
        <Stat label="Committed" value={`${sprint.committedPoints} pts`} />
        <Stat label="Shipped" value={`${sprint.shippedPoints} pts`} accent="ok" />
        <Stat label="Completion" value={`${completionPct}%`} />
        <Stat label="Carry-over" value={`${carryOver.length} tickets`} accent={carryOver.length > 0 ? "warn" : undefined} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <Section title="Shipped" tickets={done} />
        <Section title="Carry-over" tickets={carryOver} accent="warn" />
        <aside>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Velocity record</div>
          <div className="bg-bg-card border border-rule rounded-[8px] p-4 space-y-3">
            <Row label="Committed" value={`${sprint.committedPoints} pts`} />
            <Row label="Shipped" value={`${sprint.shippedPoints} pts`} />
            <Row label="Hit rate" value={`${completionPct}%`} />
          </div>
        </aside>
      </div>

      <section>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">Retro notes</div>
        <div className="grid grid-cols-3 gap-3">
          <Textarea label="What worked" value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} />
          <Textarea label="What broke" value={whatBroke} onChange={(e) => setWhatBroke(e.target.value)} />
          <Textarea label="What's next" value={whatNext} onChange={(e) => setWhatNext(e.target.value)} />
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="primary" onClick={submit}>Save retro</Button>
        </div>
      </section>
    </div>
  );
}

function Section({ title, tickets, accent }: { title: string; tickets: import("@/lib/types").Ticket[]; accent?: "warn" }) {
  return (
    <div>
      <div className={cn("font-mono text-[11px] uppercase tracking-[0.14em] mb-3", accent === "warn" ? "text-warn" : "text-ink-3")}>{title} · {tickets.length}</div>
      <div className="space-y-2">
        {tickets.length === 0 ? <p className="italic text-[13px] text-ink-3">Nothing here.</p> : tickets.map((t) => <TicketCard key={t.id} ticket={t} compact />)}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: "ok" | "warn" }) {
  return (
    <div className={cn("bg-bg-card border border-rule rounded-[8px] p-4 border-l-4", accent === "ok" && "border-l-ok", accent === "warn" && "border-l-warn", !accent && "border-l-accent")}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">{label}</div>
      <div className="display text-display-s text-ink">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">{label}</span>
      <span className="text-[14px] text-ink">{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Pill, PriorityPill, TypePill, AiTag, toast } from "@/components/ui";
import { Modal, Textarea } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";

const SLA: Record<string, number> = { P0: 4, P1: 24, P2: 168 };

export default function TriagePage() {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const user = useCurrentUser();
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const triage = tickets.filter((t) => t.status === "triage");

  if (triage.length === 0) {
    return (
      <div>
        <PageHeader
          eyebrow="S-02 · Triage Inbox"
          title={
            <>
              Inbox <em className="text-accent">zero</em>.
            </>
          }
          lede="Nothing to triage. Every ticket has a parent and a priority. Quiet morning."
        />
      </div>
    );
  }

  const confirm = (ticketId: string, projectKey?: string) => {
    if (!user) return;
    const project = projects.find((p) => p.key === projectKey);
    setTicketField(ticketId, { status: "backlog", projectId: project?.id ?? null }, user.id);
    toast("Confirmed → Backlog");
  };

  const decline = () => {
    if (!declineFor || !user) return;
    setTicketStatus(declineFor, "cancelled", user.id);
    setDeclineFor(null);
    setDeclineReason("");
    toast("Declined and closed", { kind: "info" });
  };

  return (
    <div>
      <PageHeader
        eyebrow={`S-02 · Triage Inbox · ${triage.length} waiting`}
        title={
          <>
            Daily <em className="text-accent">sweep</em>.
          </>
        }
        lede="Confirm, decline, or promote. AI suggests parent and dedupe candidates. Final call is yours."
      />

      <div className="space-y-3">
        {triage.map((t) => {
          const author = users.find((u) => u.id === t.authorId);
          const ageHours = Math.round((Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
          const slaHours = SLA[t.priority];
          const slaBreach = ageHours > slaHours;
          return (
            <div
              key={t.id}
              className={cn(
                "bg-bg-card border rounded-[8px] p-4 flex items-start gap-4",
                slaBreach ? "border-l-4 border-l-danger border-danger-soft bg-danger-soft/30" : "border-rule"
              )}
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <TypePill t={t.type} />
                  <PriorityPill p={t.priority} />
                  <span className="font-mono text-[11px] text-ink-3">{t.key}</span>
                  <span className="text-[12px] text-ink-3">·</span>
                  <Avatar user={author} size="xs" />
                  <span className="text-[12px] text-ink-3">{author?.displayName}</span>
                  <span className="text-[12px] text-ink-4 font-mono">{relativeTime(t.createdAt)}</span>
                  {slaBreach && <Pill variant="danger" dot>SLA breached · {ageHours}h vs {slaHours}h</Pill>}
                </div>
                <h3 className="text-[15px] text-ink font-medium">{t.title}</h3>
                <p className="text-[13px] text-ink-3 line-clamp-2">{t.description}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {t.aiSuggestedParent && (
                    <AiTag
                      label={`Parent · ${t.aiSuggestedParent.projectKey}`}
                      confidence={t.aiSuggestedParent.confidence}
                      reasoning={t.aiSuggestedParent.reasoning}
                      onAccept={() => confirm(t.id, t.aiSuggestedParent!.projectKey)}
                    />
                  )}
                  {t.aiDuplicates?.map((d) => (
                    <AiTag
                      key={d.ticketKey}
                      label={`Dup? · ${d.ticketKey}`}
                      confidence={d.confidence}
                      reasoning={`Title similarity + author overlap suggests possible duplicate of ${d.ticketKey}.`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="primary" size="sm" onClick={() => confirm(t.id, t.aiSuggestedParent?.projectKey)}>
                  Confirm → Backlog
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDeclineFor(t.id)}>
                  Decline
                </Button>
                <Button variant="ghost" size="sm">Promote</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!declineFor} onClose={() => setDeclineFor(null)} title="Decline ticket" size="sm">
        <p className="text-[14px] text-ink-2 mb-4">
          Decline reason is required and surfaces back to the reporter. Keep it specific.
        </p>
        <Textarea
          label="Why are you declining?"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          placeholder="e.g., Not a defect — expected behavior per spec PRJ-118 §4."
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setDeclineFor(null)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={decline} disabled={!declineReason.trim()}>
            Decline ticket
          </Button>
        </div>
      </Modal>
    </div>
  );
}

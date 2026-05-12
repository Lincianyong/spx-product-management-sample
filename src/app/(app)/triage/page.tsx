"use client";

import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, Button, Checkbox, Pill, PriorityPill, TypePill, AiTag, toast } from "@/components/ui";
import { Modal, Textarea } from "@/components/ui";
import { cn, relativeTime } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const SLA: Record<string, number> = { P0: 4, P1: 24, P2: 168 };

export default function TriagePage() {
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.epics);
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const user = useCurrentUser();
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [duplicateFor, setDuplicateFor] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState("");
  const [promoteFor, setPromoteFor] = useState<string | null>(null);
  const [promoteEpicId, setPromoteEpicId] = useState("");
  const [promoteTitle, setPromoteTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const triage = useMemo(
    () => tickets.filter((t) => t.status === "triage" || t.status === "reproduced"),
    [tickets]
  );

  useDocumentTitle(triage.length > 0 ? `Triage (${triage.length})` : "Triage");

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allChecked = triage.length > 0 && selected.size === triage.length;

  const confirm = (ticketId: string, epicKey?: string) => {
    if (!user) return;
    const t = tickets.find((x) => x.id === ticketId);
    const project = projects.find((p) => p.key === epicKey);
    // Bug flow: Triage → Reproduced → Backlog (separate step)
    if (t?.type === "bug") {
      setTicketField(ticketId, { status: "reproduced", epicId: project?.id ?? null }, user.id);
      toast("Bug acknowledged · awaiting Reproduced confirmation");
    } else {
      setTicketField(ticketId, { status: "backlog", epicId: project?.id ?? null }, user.id);
      toast("Confirmed → Backlog");
    }
  };

  const markReproduced = (ticketId: string) => {
    if (!user) return;
    setTicketField(ticketId, { status: "backlog" }, user.id);
    toast("Marked Reproduced → Backlog. Author notified.", { kind: "success" });
  };

  const cannotReproduce = (ticketId: string) => {
    if (!user) return;
    setTicketField(ticketId, { status: "cannot_reproduce" }, user.id);
    toast("Closed as Cannot Reproduce. Reporter notified.", { kind: "info" });
  };

  const bulkConfirm = () => {
    if (!user || selected.size === 0) return;
    selected.forEach((id) => {
      const t = triage.find((x) => x.id === id);
      if (!t) return;
      const projKey = t.aiSuggestedParent?.epicKey;
      const project = projects.find((p) => p.key === projKey);
      setTicketField(id, { status: "backlog", epicId: project?.id ?? t.epicId ?? null }, user.id);
    });
    toast(`${selected.size} confirmed → Backlog`, { kind: "success" });
    setSelected(new Set());
  };

  const decline = () => {
    if (!declineFor || !user) return;
    setTicketStatus(declineFor, "cancelled", user.id);
    setDeclineFor(null);
    setDeclineReason("");
    toast("Declined and closed", { kind: "info" });
  };

  const markDuplicate = () => {
    if (!duplicateFor || !user || !duplicateTarget.trim()) return;
    const ticket = tickets.find((t) => t.id === duplicateFor);
    if (!ticket) return;
    setTicketField(
      duplicateFor,
      {
        status: "cancelled",
        linkedWork: [...ticket.linkedWork, { type: "duplicates", ticketKey: duplicateTarget.trim().toUpperCase() }],
      },
      user.id
    );
    setDuplicateFor(null);
    setDuplicateTarget("");
    toast(`Marked as duplicate of ${duplicateTarget.trim().toUpperCase()}`, { kind: "info" });
  };

  const promote = () => {
    if (!promoteFor || !user || !promoteTitle.trim()) return;
    const ticket = tickets.find((t) => t.id === promoteFor);
    if (!ticket) return;
    // 2-level model: "promote" spawns a brand-new Epic and routes this
    // ticket as its first child.
    const titleSlug = promoteTitle.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const code = titleSlug.length >= 2 ? titleSlug : `EP${Date.now() % 1000}`;
    const newEpicId = `ep_${Date.now()}`;
    useAppStore.setState((s) => ({
      epics: [
        ...s.epics,
        {
          id: newEpicId,
          key: code,
          title: promoteTitle.trim(),
          thesis: ticket.description || ticket.title,
          description: (ticket.description || ticket.title).slice(0, 140),
          quarter: "Q2 2026",
          status: "backlog",
          health: "not_started",
          pmPicId: user.id,
          startDate: new Date().toISOString().slice(0, 10),
          targetEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          tags: [],
          position: s.epics.length,
        },
      ],
    }));
    setTicketField(promoteFor, { status: "backlog", epicId: newEpicId }, user.id);
    setPromoteFor(null);
    setPromoteEpicId("");
    setPromoteTitle("");
    toast(`Promoted to new Epic ${code}`, { kind: "success" });
  };

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

  return (
    <div>
      <PageHeader
        eyebrow={`S-02 · Triage Inbox · ${triage.length} waiting`}
        title={
          <>
            Daily <em className="text-accent">sweep</em>.
          </>
        }
        lede="Confirm, decline, mark duplicate, or promote to its own Project. AI suggests parent and dedupe candidates."
      />

      {/* Bulk controls */}
      <div className="bg-bg-elevated border border-rule rounded-[8px] px-4 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selected.size === 0 ? false : allChecked ? true : "indeterminate"}
            onCheckedChange={() => {
              if (allChecked) setSelected(new Set());
              else setSelected(new Set(triage.map((t) => t.id)));
            }}
            aria-label="Select all"
          />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            {selected.size} of {triage.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={bulkConfirm} disabled={selected.size === 0}>
            Bulk confirm → Backlog ({selected.size})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
            Clear
          </Button>
        </div>
      </div>

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
              <Checkbox
                checked={selected.has(t.id)}
                onCheckedChange={() => toggleSelect(t.id)}
                className="mt-1"
                aria-label={`Select ${t.key}`}
              />
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
                      label={`Parent · ${t.aiSuggestedParent?.epicKey}`}
                      confidence={t.aiSuggestedParent.confidence}
                      reasoning={t.aiSuggestedParent.reasoning}
                      onAccept={() => confirm(t.id, t.aiSuggestedParent!.epicKey)}
                    />
                  )}
                  {t.aiDuplicates?.map((d) => (
                    <AiTag
                      key={d.ticketKey}
                      label={`Dup? · ${d.ticketKey}`}
                      confidence={d.confidence}
                      reasoning={`Title similarity + author overlap suggests possible duplicate of ${d.ticketKey}.`}
                      onAccept={() => {
                        setDuplicateFor(t.id);
                        setDuplicateTarget(d.ticketKey);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 w-[200px]">
                {t.type === "bug" && t.status === "triage" && (
                  <>
                    <Button variant="primary" size="sm" onClick={() => confirm(t.id, t.aiSuggestedParent?.epicKey)}>
                      Acknowledge bug
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cannotReproduce(t.id)}>
                      Cannot reproduce
                    </Button>
                  </>
                )}
                {t.type === "bug" && t.status === "reproduced" && (
                  <Button variant="primary" size="sm" onClick={() => markReproduced(t.id)}>
                    Mark Reproduced → Backlog
                  </Button>
                )}
                {t.type !== "bug" && (
                  <Button variant="primary" size="sm" onClick={() => confirm(t.id, t.aiSuggestedParent?.epicKey)}>
                    Confirm → Backlog
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => setDeclineFor(t.id)}>
                  Decline
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDuplicateFor(t.id)}>
                  Mark duplicate
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setPromoteFor(t.id); setPromoteTitle(t.title); }}>
                  Promote to Project
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decline */}
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

      {/* Duplicate */}
      <Modal open={!!duplicateFor} onClose={() => setDuplicateFor(null)} title="Mark as duplicate" size="sm">
        <p className="text-[14px] text-ink-2 mb-4">
          The reporter will be linked to the original. This ticket closes and a `duplicates` link is added.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Original ticket key</span>
          <input
            value={duplicateTarget}
            onChange={(e) => setDuplicateTarget(e.target.value.toUpperCase())}
            placeholder="CDN-3504"
            className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card font-mono"
          />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setDuplicateFor(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={markDuplicate} disabled={!duplicateTarget.trim()}>
            Mark duplicate
          </Button>
        </div>
      </Modal>

      {/* Promote */}
      <Modal open={!!promoteFor} onClose={() => setPromoteFor(null)} title="Promote to Project" size="md">
        <p className="text-[14px] text-ink-2 mb-4">
          Create a new Project under an Epic and route this ticket as its first child. Use when the work is too big for a single ticket.
        </p>
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Project title</span>
            <input
              value={promoteTitle}
              onChange={(e) => setPromoteTitle(e.target.value)}
              placeholder="Title of the new Project"
              className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent Epic</span>
            <select
              value={promoteEpicId}
              onChange={(e) => setPromoteEpicId(e.target.value)}
              className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card"
            >
              <option value="">Select an Epic…</option>
              {epics.map((e) => (
                <option key={e.id} value={e.id}>{e.key} · {e.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setPromoteFor(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={promote} disabled={!promoteEpicId || !promoteTitle.trim()}>
            Promote
          </Button>
        </div>
      </Modal>
    </div>
  );
}

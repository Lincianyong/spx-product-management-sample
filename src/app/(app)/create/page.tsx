"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bug, Compass, FileText, Plus, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  AiTag,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Pill,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { can, type Capability } from "@/lib/permissions";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Epic, Ticket, TicketType } from "@/lib/types";

// ─── Type catalog ────────────────────────────────────────────────────
type CreateType = "epic" | "ticket" | "tech-task" | "bug";

const TYPES: {
  id: CreateType;
  label: string;
  lane: "PM" | "Eng" | "All";
  cap: Capability;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  prefix: string;
}[] = [
  { id: "epic",      label: "Epic",                  lane: "PM",  cap: "create_epic",      icon: Compass, blurb: "Conviction-level bet. Quarter altitude. Title + thesis + PM owner.",                                  prefix: "EPC" },
  { id: "ticket",    label: "Engineering Ticket",    lane: "PM",  cap: "create_ticket",    icon: FileText, blurb: "A unit of engineering work. Routes to Triage. Engineers estimate it next.",                          prefix: "CDN" },
  { id: "tech-task", label: "Tech Task",             lane: "Eng", cap: "create_tech_task", icon: Wrench,  blurb: "Internal infra, migration, refactor. Requires blast radius + rollback plan.",                       prefix: "TCH" },
  { id: "bug",       label: "Bug",                   lane: "All", cap: "create_bug",       icon: Bug,     blurb: "Something broken. Repro / Expected / Actual required. Anyone can file.",                              prefix: "BUG" },
];

// ─── Page ────────────────────────────────────────────────────────────
export default function CreatePage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-3">Loading…</div>}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useCurrentUser();

  const requestedType = params.get("type") as CreateType | null;
  // Filter to types this role is allowed to create.
  const allowed = useMemo(
    () => TYPES.filter((t) => user && can(user.role, t.cap)),
    [user]
  );

  // If the URL asks for a type the role can't create, drop back to selector.
  const type = requestedType && allowed.some((t) => t.id === requestedType) ? requestedType : null;

  useDocumentTitle(
    type
      ? `New ${TYPES.find((t) => t.id === type)?.label}`
      : "Create"
  );

  if (!user) return null;

  const setType = (next: CreateType | null) => {
    const q = new URLSearchParams();
    if (next) q.set("type", next);
    const url = q.toString() ? `/create?${q.toString()}` : "/create";
    router.replace(url, { scroll: false });
  };

  if (!type) {
    return <Selector allowed={allowed} onPick={setType} />;
  }

  const def = TYPES.find((t) => t.id === type)!;
  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setType(null)}
          className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink"
        >
          ← Back to type selector
        </button>
      </div>
      <PageHeader
        eyebrow={def.lane === "All" ? `Create ${def.label}` : `Create ${def.label} · ${def.lane} lane`}
        title={
          <>
            New <em className="text-accent">{def.label.toLowerCase()}</em>.
          </>
        }
        lede={def.blurb}
      />

      {type === "epic" && <EpicForm />}
      {type === "ticket" && <TicketForm />}
      {type === "tech-task" && <TechTaskForm />}
      {type === "bug" && <BugForm />}
    </div>
  );
}

// ─── Selector ────────────────────────────────────────────────────────
function Selector({ allowed, onPick }: { allowed: typeof TYPES; onPick: (t: CreateType) => void }) {
  const user = useCurrentUser();
  const lede =
    !user
      ? "Pick the kind of work."
      : allowed.length === 1
      ? `Your role files ${allowed[0].label.toLowerCase()}s. Click below to start.`
      : "Your role's creation lanes are below. Pick a kind of work.";

  return (
    <div>
      <PageHeader
        eyebrow={user ? `Create · ${user.displayName.split(" ")[0]}` : "Create"}
        title={
          <>
            What are you <em className="text-accent">filing</em>?
          </>
        }
        lede={lede}
      />

      {allowed.length === 0 ? (
        <div className="bg-warn-soft border border-warn rounded-[8px] px-4 py-3 text-[13px] text-warn">
          Your role doesn't have a creation lane assigned.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-w-3xl">
          {allowed.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="text-left bg-bg-card border border-rule rounded-[8px] p-5 hover:border-accent hover:-translate-y-px transition-all duration-150 shadow-sm border-l-4 border-l-accent"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className="h-5 w-5 text-accent" />
                  <Pill variant={t.lane === "PM" ? "accent" : t.lane === "Eng" ? "info" : "neutral"}>
                    {t.lane === "All" ? "Universal" : `${t.lane} lane`}
                  </Pill>
                </div>
                <h3 className="display text-display-s text-ink mb-2 leading-tight">{t.label}</h3>
                <p className="text-[13px] text-ink-3 leading-relaxed">{t.blurb}</p>
                <div className="mt-3 font-mono text-[11px] text-ink-4">{t.prefix}-####</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 max-w-3xl bg-bg-elevated border border-rule rounded-[8px] p-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">Where it lands</div>
        <p className="text-[12px] text-ink-3 leading-relaxed">
          {laneFooter(allowed)}
        </p>
      </div>
    </div>
  );
}

function laneFooter(allowed: typeof TYPES): React.ReactNode {
  const has = (id: CreateType) => allowed.some((t) => t.id === id);
  const parts: React.ReactNode[] = [];
  if (has("epic")) parts.push("Epics enter the backlog directly.");
  if (has("ticket") || has("tech-task") || has("bug")) {
    parts.push(
      <>
        Tickets, Tech Tasks, and Bugs land in{" "}
        <Link href="/triage" className="text-accent hover:underline">Triage</Link>{" "}
        for PM confirmation.
      </>
    );
  }
  if (parts.length === 0) {
    return "Pick a lane above to start.";
  }
  return parts.map((p, i) => (
    <span key={i}>
      {p}
      {i < parts.length - 1 ? " " : ""}
    </span>
  ));
}

// ─── Common form helpers ─────────────────────────────────────────────
const SLASH_COMMANDS = [
  { trigger: "/h2", insert: "## " },
  { trigger: "/h3", insert: "### " },
  { trigger: "/code", insert: "```\n\n```" },
  { trigger: "/task", insert: "- [ ] " },
  { trigger: "/quote", insert: "> " },
];

function MarkdownArea({
  value,
  onChange,
  placeholder,
  minHeight = 200,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState(0);

  const handle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    const caret = e.target.selectionStart ?? v.length;
    setSlashAnchor(caret);
    const before = v.slice(0, caret);
    const m = before.match(/(^|\n|\s)(\/[a-z]*)$/);
    setSlashOpen(!!m);
  };

  const insert = (cmd: typeof SLASH_COMMANDS[number]) => {
    const before = value.slice(0, slashAnchor);
    const after = value.slice(slashAnchor);
    const cleared = before.replace(/\/[a-z]*$/, "");
    onChange(cleared + cmd.insert + after);
    setSlashOpen(false);
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={handle}
        placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "w-full px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] font-mono",
          className
        )}
      />
      {slashOpen && (
        <div className="absolute z-30 left-3 mt-1 w-64 bg-bg-card border border-rule rounded-[8px] shadow-lg p-1">
          {SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.trigger}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(cmd)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[13px] text-ink-2 hover:bg-rule-soft hover:text-ink"
            >
              <span className="font-mono">{cmd.trigger}</span>
              <span className="font-mono text-[11px] text-ink-3">{cmd.insert.replace(/\n/g, "⏎").slice(0, 14)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ParentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const projects = useAppStore((s) => s.projects);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent project</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Ad-hoc (no parent)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Ad-hoc (no parent)</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.key}>{p.key} · {p.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function makeKey(prefix: string) {
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function useGoToTicket() {
  const router = useRouter();
  return (key: string) => router.push(`/t/${key}`);
}

// ─── Engineering Ticket ──────────────────────────────────────────────
function TicketForm() {
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const goTo = useGoToTicket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [acDraft, setAcDraft] = useState("");
  const [ac, setAc] = useState<string[]>([]);

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const newKey = makeKey("CDN");
    const newTicket: Ticket = {
      id: `t_${Date.now()}`,
      key: newKey,
      type: "engineering",
      title: title.trim(),
      description,
      acceptanceCriteria: ac.map((it) => ({ id: `ac_${Math.random().toString(36).slice(2, 8)}`, text: it, done: false })),
      projectId: proj?.id ?? null,
      priority: "P2",
      status: "triage",
      authorId: user.id,
      tags: [],
      pickedForSprint: false,
      picklistRank: null,
      storyPoints: null,
      concernFlags: [],
      assigneeId: null,
      sprintId: null,
      startedAt: null,
      closedAt: null,
      linkedWork: [],
      carryOver: false,
      createdAt: new Date().toISOString(),
    };
    useAppStore.setState((s) => ({ tickets: [...s.tickets, newTicket] }));
    toast(`Created ${newKey} → Triage`);
    goTo(newKey);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to happen?" />
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Description (markdown)</span>
          <div className="mt-1.5">
            <MarkdownArea
              value={description}
              onChange={setDescription}
              placeholder="## What&#10;&#10;## Why&#10;&#10;## How&#10;&#10;## Out of scope"
            />
          </div>
        </div>
        <ParentSelect value={parent} onChange={setParent} />
        <AcEditor items={ac} onChange={setAc} draft={acDraft} setDraft={setAcDraft} />
        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create → Triage</Button>
          <Pill variant="info">Engineering Ticket</Pill>
        </div>
      </div>
      <Aside title="Engineering checklist">
        <ul className="space-y-1.5 text-[13px] text-ink-2">
          <li className={title.length >= 8 ? "text-ok" : ""}>{title.length >= 8 ? "✓" : "○"} Title (≥ 8 chars)</li>
          <li className={description.length > 0 ? "text-ok" : ""}>{description.length > 0 ? "✓" : "○"} Description filled</li>
          <li className={ac.length > 0 ? "text-ok" : ""}>{ac.length > 0 ? "✓" : "○"} ≥ 1 AC item</li>
        </ul>
      </Aside>
    </div>
  );
}

// ─── Tech Task ───────────────────────────────────────────────────────
function TechTaskForm() {
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const goTo = useGoToTicket();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("## Why now\n\n## Plan\n\n## Blast radius\n\n## Rollback plan");
  const [parent, setParent] = useState("");
  const [acDraft, setAcDraft] = useState("");
  const [ac, setAc] = useState<string[]>(["Canary 24h green", "Rollback documented", "Owner signed off"]);
  const [blastRadius, setBlastRadius] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [migrationWindow, setMigrationWindow] = useState("");

  const canSubmit = title.trim().length >= 8 && blastRadius.trim() && rollbackPlan.trim();

  const submit = () => {
    if (!canSubmit || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const newKey = makeKey("TCH");
    useAppStore.setState((s) => ({
      tickets: [...s.tickets, {
        id: `t_${Date.now()}`,
        key: newKey,
        type: "tech_task" as const,
        title: title.trim(),
        description,
        acceptanceCriteria: ac.map((it) => ({ id: `ac_${Math.random().toString(36).slice(2, 8)}`, text: it, done: false })),
        projectId: proj?.id ?? null,
        priority: "P2" as const,
        status: "triage" as const,
        authorId: user.id,
        tags: [],
        pickedForSprint: false,
        picklistRank: null,
        storyPoints: null,
        concernFlags: [],
        assigneeId: null,
        sprintId: null,
        startedAt: null,
        closedAt: null,
        linkedWork: [],
        carryOver: false,
        createdAt: new Date().toISOString(),
        blastRadius,
        rollbackPlan,
        migrationWindow: migrationWindow || undefined,
      }],
    }));
    toast(`Created ${newKey} → Triage`);
    goTo(newKey);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Migrate retrain orchestrator from cron to Argo" />
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Description (markdown)</span>
          <div className="mt-1.5">
            <MarkdownArea value={description} onChange={setDescription} />
          </div>
        </div>
        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4 space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Tech context · required</div>
          <Input label="Blast radius" value={blastRadius} onChange={(e) => setBlastRadius(e.target.value)} placeholder="e.g., Retrain pipeline in all regions" />
          <Input label="Rollback plan" value={rollbackPlan} onChange={(e) => setRollbackPlan(e.target.value)} placeholder="e.g., Re-enable cron job; pause Argo DAG" />
          <Input label="Migration window (optional)" value={migrationWindow} onChange={(e) => setMigrationWindow(e.target.value)} placeholder="e.g., Sun 03:00–05:00 SGT" />
        </div>
        <ParentSelect value={parent} onChange={setParent} />
        <AcEditor items={ac} onChange={setAc} draft={acDraft} setDraft={setAcDraft} />
        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>Create → Triage</Button>
          <Pill variant="neutral">Tech Task</Pill>
        </div>
      </div>
      <Aside title="Tech Task checklist">
        <ul className="space-y-1.5 text-[13px] text-ink-2">
          <li className={title.length >= 8 ? "text-ok" : ""}>{title.length >= 8 ? "✓" : "○"} Title (≥ 8 chars)</li>
          <li className={blastRadius.trim() ? "text-ok" : ""}>{blastRadius.trim() ? "✓" : "○"} Blast radius</li>
          <li className={rollbackPlan.trim() ? "text-ok" : ""}>{rollbackPlan.trim() ? "✓" : "○"} Rollback plan</li>
          <li className={ac.length > 0 ? "text-ok" : ""}>{ac.length > 0 ? "✓" : "○"} ≥ 1 AC item</li>
        </ul>
      </Aside>
    </div>
  );
}

// ─── Bug ─────────────────────────────────────────────────────────────
function BugForm() {
  const user = useCurrentUser();
  const goTo = useGoToTicket();
  const [title, setTitle] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [scope, setScope] = useState("");
  const [severity, setSeverity] = useState<"S1" | "S2" | "S3">("S2");

  const canSubmit = title.trim() && reproSteps.trim() && expected.trim() && actual.trim();

  const submit = () => {
    if (!canSubmit || !user) return;
    const newKey = makeKey("BUG");
    useAppStore.setState((s) => ({
      tickets: [...s.tickets, {
        id: `t_${Date.now()}`,
        key: newKey,
        type: "bug" as const,
        title: title.trim(),
        description: "",
        acceptanceCriteria: [],
        projectId: null,
        priority: severity === "S1" ? "P0" as const : severity === "S2" ? "P1" as const : "P2" as const,
        status: "triage" as const,
        authorId: user.id,
        tags: [],
        pickedForSprint: false,
        picklistRank: null,
        storyPoints: null,
        concernFlags: [],
        assigneeId: null,
        sprintId: null,
        startedAt: null,
        closedAt: null,
        linkedWork: [],
        carryOver: false,
        createdAt: new Date().toISOString(),
        severity,
        reproSteps,
        expectedVsActual: `Expected:\n${expected}\n\nActual:\n${actual}`,
        affectedScope: scope,
      }],
    }));
    toast(`Filed ${newKey} → Triage`);
    goTo(newKey);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Driver app push fires twice on Samsung S22" />
        <Textarea label="Repro steps" value={reproSteps} onChange={(e) => setReproSteps(e.target.value)} placeholder="1. Install app v3.14 on Samsung S22 (OneUI 6.0)&#10;2. Send any push&#10;3. Observe receipt count" />
        <div className="grid grid-cols-2 gap-3">
          <Textarea label="Expected" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="What should happen?" />
          <Textarea label="Actual" value={actual} onChange={(e) => setActual(e.target.value)} placeholder="What's happening instead?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Affected scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g., ~60 drivers, Jakarta" />
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Severity</span>
            <Select value={severity} onValueChange={(v) => setSeverity(v as "S1" | "S2" | "S3")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S1">S1 · Production down · routes to P0</SelectItem>
                <SelectItem value="S2">S2 · Major impact · routes to P1</SelectItem>
                <SelectItem value="S3">S3 · Minor · routes to P2</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>File bug → Triage</Button>
          <Pill variant="danger">Bug</Pill>
        </div>
      </div>
      <Aside title="Bug checklist">
        <ul className="space-y-1.5 text-[13px] text-ink-2">
          <li className={title.trim() ? "text-ok" : ""}>{title.trim() ? "✓" : "○"} Title</li>
          <li className={reproSteps.trim() ? "text-ok" : ""}>{reproSteps.trim() ? "✓" : "○"} Repro steps</li>
          <li className={expected.trim() ? "text-ok" : ""}>{expected.trim() ? "✓" : "○"} Expected behavior</li>
          <li className={actual.trim() ? "text-ok" : ""}>{actual.trim() ? "✓" : "○"} Actual behavior</li>
        </ul>
        <p className="text-[12px] text-ink-3 mt-3">
          PM triages within 4h (P0), 24h (P1), or 1 week (P2). You'll get a ping when the ticket is accepted, declined, or closed as Cannot Reproduce.
        </p>
      </Aside>
    </div>
  );
}

// ─── Epic ────────────────────────────────────────────────────────────
function EpicForm() {
  const router = useRouter();
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [quarter, setQuarter] = useState("Q2 2026");
  const [pmPicId, setPmPicId] = useState(user?.id ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );

  const pmCandidates = users.filter((u) => u.role === "pm" || u.role === "leadership" || u.role === "admin");
  const canSubmit = title.trim().length >= 8 && thesis.trim().length >= 20 && pmPicId;

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagDraft("");
  };

  const submit = () => {
    if (!canSubmit || !user) return;
    const seq = epics.length + 100;
    const newEpic: Epic = {
      id: `ep_${Date.now()}`,
      key: `EPC-${seq.toString().padStart(3, "0")}`,
      title: title.trim(),
      thesis: thesis.trim(),
      quarter,
      status: "backlog",
      health: "not_started",
      pmPicId,
      startDate,
      targetEndDate,
      tags,
      position: epics.length,
    };
    useAppStore.setState((s) => ({ epics: [...s.epics, newEpic] }));
    toast(`Created ${newEpic.key}`, { kind: "success" });
    router.push(`/e/${newEpic.key}`);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Forecasting v2" />
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Thesis (markdown · the conviction)</span>
          <div className="mt-1.5">
            <MarkdownArea value={thesis} onChange={setThesis} placeholder="Why this Epic, why now. What changes for the user. The conviction in 2-4 sentences." />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">PM owner</span>
            <Select value={pmPicId} onValueChange={setPmPicId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a PM…" />
              </SelectTrigger>
              <SelectContent>
                {pmCandidates.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName} · {u.role.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Quarter</span>
            <Select value={quarter} onValueChange={setQuarter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Q2 2026", "Q3 2026", "Q4 2026", "Q1 2027"].map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Start</span>
              <DatePicker value={startDate} onChange={setStartDate} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Target end</span>
              <DatePicker value={targetEndDate} onChange={setTargetEndDate} fromDate={startDate} />
            </label>
          </div>
        </div>

        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Tags</span>
          <div className="flex flex-wrap gap-1.5 my-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 h-6 rounded-[12px] border border-rule bg-bg-elevated text-[12px]">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-ink-4 hover:text-danger">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="add tag, press Enter"
              className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px] flex-1"
            />
            <Button variant="secondary" size="sm" onClick={addTag} disabled={!tagDraft.trim()}>Add</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>Create Epic →</Button>
          <Pill variant="accent">Epic</Pill>
        </div>
      </div>
      <Aside title="Epic checklist">
        <ul className="space-y-1.5 text-[13px] text-ink-2">
          <li className={title.length >= 8 ? "text-ok" : ""}>{title.length >= 8 ? "✓" : "○"} Title (≥ 8 chars)</li>
          <li className={thesis.length >= 20 ? "text-ok" : ""}>{thesis.length >= 20 ? "✓" : "○"} Thesis (≥ 20 chars)</li>
          <li className={pmPicId ? "text-ok" : ""}>{pmPicId ? "✓" : "○"} PM owner</li>
          <li className={startDate && targetEndDate ? "text-ok" : ""}>{startDate && targetEndDate ? "✓" : "○"} Dates</li>
        </ul>
      </Aside>
    </div>
  );
}

// ─── Shared subcomponents ────────────────────────────────────────────
function Aside({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="space-y-3">
      <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">{title}</div>
        {children}
      </div>
    </aside>
  );
}

function AcEditor({
  items,
  onChange,
  draft,
  setDraft,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  draft: string;
  setDraft: (s: string) => void;
}) {
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">
        Acceptance criteria · gates Done
      </div>
      <ul className="space-y-1.5 mb-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Checkbox checked={false} disabled aria-readonly />
            <span className="flex-1 text-[13px] text-ink-2">{it}</span>
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-ink-4 hover:text-danger text-[12px]">×</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add an AC item, press Enter"
          className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px] flex-1"
        />
        <Button variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>
    </div>
  );
}

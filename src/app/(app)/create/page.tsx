"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { AiTag, Button, Input, Textarea, Pill, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { TicketType } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const MODES = [
  { id: "quick", label: "Quick", hint: "Title + parent + type. ~30 seconds." },
  { id: "full", label: "Full", hint: "Full form with AI drafting + autosave." },
  { id: "bulk", label: "Bulk (CSV)", hint: "Paste rows; we'll map fields." },
] as const;

const TEMPLATES: { id: string; name: string; type: TicketType; description: string; ac: string[] }[] = [
  {
    id: "tpl_eng",
    name: "Engineering task",
    type: "engineering",
    description: "## What\n\n## Why\n\n## How\n\n## Out of scope",
    ac: ["Tests cover happy path + edge", "Docs updated", "PR title prefixed with key"],
  },
  {
    id: "tpl_bug",
    name: "Bug report",
    type: "bug",
    description: "## Repro steps\n1. \n2. \n3. \n\n## Expected\n\n## Actual\n\n## Affected scope",
    ac: [],
  },
  {
    id: "tpl_tech",
    name: "Tech task",
    type: "tech_task",
    description: "## Why now\n\n## Plan\n\n## Blast radius\n\n## Rollback plan\n\n## Migration window",
    ac: ["Canary 24h green", "Rollback documented", "Owner signed off"],
  },
];

const SLASH_COMMANDS = [
  { trigger: "/h2", insert: "## " },
  { trigger: "/h3", insert: "### " },
  { trigger: "/code", insert: "```\n\n```" },
  { trigger: "/task", insert: "- [ ] " },
  { trigger: "/quote", insert: "> " },
  { trigger: "/link", insert: "[label](url)" },
];

const DRAFT_KEY = "cadence:create-draft";

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-3">Loading…</div>}>
      <CreatePageInner />
    </Suspense>
  );
}

function CreatePageInner() {
  const params = useSearchParams();
  const initialType = (params.get("type") as TicketType | null) ?? "engineering";
  useDocumentTitle(
    initialType === "tech_task" ? "New Tech Task" : initialType === "bug" ? "New Bug" : "New Ticket"
  );
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("full");

  return (
    <div>
      <PageHeader
        eyebrow={`S-01 · Create Ticket${initialType !== "engineering" ? ` · ${initialType === "bug" ? "Bug" : "Tech Task"}` : ""}`}
        title={
          <>
            Capture <em className="text-accent">cleanly</em>. Triage later.
          </>
        }
        lede="Three modes: a 30-second quick capture, a full editorial form with AI drafting + templates, or a CSV bulk upload."
      />

      <div className="flex items-center gap-2 mb-6">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "px-4 py-3 rounded-[8px] border transition-colors duration-100 text-left",
              mode === m.id ? "bg-bg-card border-accent" : "bg-bg-elevated border-rule hover:border-ink-4"
            )}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{m.label}</div>
            <div className="text-[13px] text-ink mt-0.5">{m.hint}</div>
          </button>
        ))}
      </div>

      {mode === "quick" && <QuickForm initialType={initialType} />}
      {mode === "full" && <FullForm initialType={initialType} />}
      {mode === "bulk" && <BulkForm />}
    </div>
  );
}

function QuickForm({ initialType = "engineering" }: { initialType?: TicketType }) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [type, setType] = useState<TicketType>(initialType);

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const keyPrefix = type === "bug" ? "BUG" : type === "tech_task" ? "TCH" : "CDN";
    const newKey = `${keyPrefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
    useAppStore.setState((s) => ({
      tickets: [...s.tickets, {
        id: `t_${Date.now()}`,
        key: newKey,
        type,
        title: title.trim(),
        description: "",
        acceptanceCriteria: [],
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
      }],
    }));
    toast(`Created ${newKey} → Triage`);
    router.push(`/t/${newKey}`);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Input label="Title" placeholder="What needs to happen?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent</span>
          <select value={parent} onChange={(e) => setParent(e.target.value)} className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]">
            <option value="">Ad-hoc (no parent)</option>
            {projects.map((p) => <option key={p.id} value={p.key}>{p.key} · {p.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]">
            <option value="engineering">Engineering</option>
            <option value="bug">Bug</option>
            <option value="tech_task">Tech Task</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create → Triage</Button>
        <span className="text-[12px] font-mono text-ink-3">Tip · ⌘N anywhere for Quick Create</span>
      </div>
    </div>
  );
}

function FullForm({ initialType = "engineering" }: { initialType?: TicketType }) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [drafted, setDrafted] = useState(false);
  const [recurring, setRecurring] = useState<"none" | "weekly" | "monthly">("none");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [parent, setParent] = useState("");
  const [type, setType] = useState<TicketType>(initialType);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);

  // If type changes via the initial query param, auto-apply matching template.
  useEffect(() => {
    if (initialType === "tech_task") {
      const tpl = TEMPLATES.find((t) => t.id === "tpl_tech");
      if (tpl) {
        setType("tech_task");
        setDescription((d) => d || tpl.description);
        setSubtasks((s) => (s.length ? s : tpl.ac));
      }
    } else if (initialType === "bug") {
      const tpl = TEMPLATES.find((t) => t.id === "tpl_bug");
      if (tpl) {
        setType("bug");
        setDescription((d) => d || tpl.description);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialType]);

  // Autosave draft
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.title || d.description) setHasDraft(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ title, description, parent, type, subtasks, recurring });
    localStorage.setItem(DRAFT_KEY, payload);
  }, [title, description, parent, type, subtasks, recurring]);

  const restoreDraft = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      setTitle(d.title ?? "");
      setDescription(d.description ?? "");
      setParent(d.parent ?? "");
      setType(d.type ?? "engineering");
      setSubtasks(d.subtasks ?? []);
      setRecurring(d.recurring ?? "none");
    } catch {}
    setHasDraft(false);
    toast("Draft restored");
  };

  const applyTemplate = (tplId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setType(tpl.type);
    setDescription((d) => d || tpl.description);
    setSubtasks((s) => (s.length ? s : tpl.ac));
    toast(`Applied template — ${tpl.name}`);
  };

  const draftFromSource = () => {
    if (!source.trim()) return;
    setTitle("Doubled push notifications on Samsung S22 (OneUI 6)");
    setDescription(
      "## Repro steps\n1. Send any push\n2. Receive on Samsung S22 (OneUI 6)\n\n## Expected\nOne notification.\n\n## Actual\nTwo notifications within 30s.\n\n## Affected scope\n~60 drivers, Jakarta region. Observed since last week's app update."
    );
    setDrafted(true);
    toast("AI drafted from source — review and edit", { kind: "info" });
  };

  const onDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setDescription(v);
    const caret = e.target.selectionStart ?? v.length;
    setSlashAnchor(caret);
    // Detect "/<letters>" at line start or after whitespace
    const before = v.slice(0, caret);
    const m = before.match(/(^|\n|\s)(\/[a-z]*)$/);
    setSlashOpen(!!m);
  };

  const insertSlash = (cmd: typeof SLASH_COMMANDS[number]) => {
    const before = description.slice(0, slashAnchor);
    const after = description.slice(slashAnchor);
    const cleared = before.replace(/\/[a-z]*$/, "");
    setDescription(cleared + cmd.insert + after);
    setSlashOpen(false);
  };

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const keyPrefix = type === "bug" ? "BUG" : type === "tech_task" ? "TCH" : "CDN";
    const newKey = `${keyPrefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const parentId = `t_${Date.now()}`;
    const parentTicket = {
      id: parentId,
      key: newKey,
      type,
      title: title.trim(),
      description,
      acceptanceCriteria: subtasks.map((s) => ({ id: `ac_${Math.random().toString(36).slice(2, 8)}`, text: s, done: false })),
      projectId: proj?.id ?? null,
      priority: "P2" as const,
      status: "triage" as const,
      authorId: user.id,
      tags: recurring !== "none" ? [`recurring:${recurring}`] : [],
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
    useAppStore.setState((s) => ({ tickets: [...s.tickets, parentTicket] }));
    if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
    toast(`Created ${newKey} → Triage${recurring !== "none" ? ` · recurs ${recurring}` : ""}`);
    router.push(`/t/${newKey}`);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        {hasDraft && (
          <div className="bg-warn-soft border border-warn rounded-[6px] px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] text-warn">You have an unsaved draft.</span>
            <div className="flex gap-2">
              <button onClick={restoreDraft} className="font-mono text-[11px] uppercase tracking-[0.06em] text-warn hover:opacity-80">Restore</button>
              <button onClick={() => { if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY); setHasDraft(false); }} className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:text-ink">Discard</button>
            </div>
          </div>
        )}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={cn(drafted && "bg-ai-soft/40")} />
        <div className="relative">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Description (markdown · try slash commands)</span>
          <textarea
            value={description}
            onChange={onDescChange}
            placeholder="## What"
            className={cn(
              "mt-1.5 w-full min-h-[200px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] font-mono",
              drafted && "bg-ai-soft/40"
            )}
          />
          {slashOpen && (
            <div className="absolute z-30 left-3 mt-1 w-64 bg-bg-card border border-rule rounded-[8px] shadow-lg p-1">
              {SLASH_COMMANDS.map((cmd) => (
                <button
                  key={cmd.trigger}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertSlash(cmd)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[13px] text-ink-2 hover:bg-rule-soft hover:text-ink"
                >
                  <span className="font-mono">{cmd.trigger}</span>
                  <span className="font-mono text-[11px] text-ink-3">{cmd.insert.replace(/\n/g, "⏎").slice(0, 14)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent</span>
            <select value={parent} onChange={(e) => setParent(e.target.value)} className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]">
              <option value="">Ad-hoc</option>
              {projects.map((p) => <option key={p.id} value={p.key}>{p.key} · {p.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]">
              <option value="engineering">Engineering</option>
              <option value="bug">Bug</option>
              <option value="tech_task">Tech Task</option>
            </select>
          </label>
        </div>

        <SubtasksEditor items={subtasks} onChange={setSubtasks} />

        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Recurring</span>
          <select value={recurring} onChange={(e) => setRecurring(e.target.value as typeof recurring)} className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]">
            <option value="none">Once (not recurring)</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
          </select>
          {recurring !== "none" && <Pill variant="info">Tagged · recurring:{recurring}</Pill>}
        </label>

        <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create → Triage</Button>
      </div>

      <aside className="space-y-4">
        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Templates</div>
          <div className="space-y-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => applyTemplate(tpl.id)}
                className="w-full text-left px-3 py-2 rounded-[6px] bg-bg-card border border-rule hover:border-accent"
              >
                <div className="text-[13px] text-ink">{tpl.name}</div>
                <div className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">{tpl.type}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ai">✦ AI Drafting</span>
          </div>
          <p className="text-[13px] text-ink-3 mb-3">Paste a Slack thread, Lark message, or Sentry trace. AI drafts title + description + AC.</p>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste source here…"
            className="w-full min-h-[100px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-[13px]"
          />
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={draftFromSource} disabled={!source.trim()}>
            Draft with AI
          </Button>
          {drafted && (
            <div className="mt-3 flex items-center gap-2 text-[12px]">
              <AiTag label="Drafted" confidence={0.86} reasoning="Drafted from pasted source. Tinted fields are AI-touched until you edit." />
              <button onClick={() => setDrafted(false)} className="text-accent hover:underline font-mono text-[11px] uppercase">Accept</button>
            </div>
          )}
        </div>

        <p className="text-[11px] font-mono text-ink-3">Autosave on. Drafts live in localStorage; cleared on submit.</p>
      </aside>
    </div>
  );
}

function SubtasksEditor({ items, onChange }: { items: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft("");
  };
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">
        Subtasks · acceptance criteria
      </div>
      <ul className="space-y-1.5 mb-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 accent-accent" disabled />
            <span className="flex-1 text-[13px] text-ink-2">{it}</span>
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-ink-4 hover:text-danger text-[12px]"
            >
              ×
            </button>
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

function BulkForm() {
  const [csv, setCsv] = useState("title,type,priority,project\n");
  const rows = csv.split("\n").filter(Boolean).length - 1;
  return (
    <div className="max-w-3xl">
      <Textarea
        label="CSV (first row = headers)"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        className="min-h-[280px] font-mono"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[12px] text-ink-3 font-mono">{rows} row{rows === 1 ? "" : "s"} detected</span>
        <Button variant="primary" disabled={rows === 0}>Upload {rows} → Triage</Button>
      </div>
    </div>
  );
}

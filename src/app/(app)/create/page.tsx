"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  AiTag,
  Button,
  Input,
  Textarea,
  Pill,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const MODES = [
  { id: "quick", label: "Quick", hint: "Title + parent. ~30 seconds." },
  { id: "full", label: "Full", hint: "Full form with AI drafting + autosave." },
  { id: "bulk", label: "Bulk (CSV)", hint: "Paste rows; we'll map fields." },
] as const;

const ENG_TEMPLATE = {
  description: "## What\n\n## Why\n\n## How\n\n## Out of scope",
  ac: ["Tests cover happy path + edge", "Docs updated", "PR title prefixed with key"],
};

const SLASH_COMMANDS = [
  { trigger: "/h2", insert: "## " },
  { trigger: "/h3", insert: "### " },
  { trigger: "/code", insert: "```\n\n```" },
  { trigger: "/task", insert: "- [ ] " },
  { trigger: "/quote", insert: "> " },
  { trigger: "/link", insert: "[label](url)" },
];

const DRAFT_KEY = "cadence:create-draft-engineering";

export default function CreateTicketPage() {
  useDocumentTitle("New Engineering Ticket");
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("full");

  return (
    <div>
      <PageHeader
        eyebrow="Create Engineering Ticket · PM lane"
        title={
          <>
            New <em className="text-accent">work</em> for the team.
          </>
        }
        lede="Engineering tickets describe a unit of work for the engineers to estimate and pick up. Routes to Triage."
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

      {mode === "quick" && <QuickForm />}
      {mode === "full" && <FullForm />}
      {mode === "bulk" && <BulkForm />}
    </div>
  );
}

function QuickForm() {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const newKey = `CDN-${Math.floor(Math.random() * 9000 + 1000)}`;
    useAppStore.setState((s) => ({
      tickets: [...s.tickets, {
        id: `t_${Date.now()}`,
        key: newKey,
        type: "engineering" as const,
        title: title.trim(),
        description: "",
        acceptanceCriteria: [],
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
      }],
    }));
    toast(`Created ${newKey} → Triage`);
    router.push(`/t/${newKey}`);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Input label="Title" placeholder="What needs to happen?" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent project</span>
        <Select value={parent} onValueChange={setParent}>
          <SelectTrigger>
            <SelectValue placeholder="Ad-hoc (no parent)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Ad-hoc (no parent)</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.key}>{p.key} · {p.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create → Triage</Button>
        <Pill variant="info">Engineering ticket</Pill>
        <span className="text-[12px] font-mono text-ink-3">Tip · ⌘N anywhere for Quick Create</span>
      </div>
    </div>
  );
}

function FullForm() {
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
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);

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
    const payload = JSON.stringify({ title, description, parent, subtasks, recurring });
    localStorage.setItem(DRAFT_KEY, payload);
  }, [title, description, parent, subtasks, recurring]);

  const restoreDraft = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      setTitle(d.title ?? "");
      setDescription(d.description ?? "");
      setParent(d.parent ?? "");
      setSubtasks(d.subtasks ?? []);
      setRecurring(d.recurring ?? "none");
    } catch {}
    setHasDraft(false);
    toast("Draft restored");
  };

  const applyTemplate = () => {
    setDescription((d) => d || ENG_TEMPLATE.description);
    setSubtasks((s) => (s.length ? s : ENG_TEMPLATE.ac));
    toast("Engineering template applied");
  };

  const draftFromSource = () => {
    if (!source.trim()) return;
    setTitle("Drift detection on retrain pipeline");
    setDescription(
      "## What\nDetect when daily retrain produces a model whose validation MAPE deviates >12% from the trailing 7-day baseline.\n\n## Why\nUnblock confidence in nightly model promotions.\n\n## How\nBlock promotion on breach + alert PM/EM channel.\n\n## Out of scope\nPer-region drift breakdown."
    );
    setDrafted(true);
    toast("AI drafted from source — review and edit", { kind: "info" });
  };

  const onDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setDescription(v);
    const caret = e.target.selectionStart ?? v.length;
    setSlashAnchor(caret);
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
    const newKey = `CDN-${Math.floor(Math.random() * 9000 + 1000)}`;
    const parentTicket = {
      id: `t_${Date.now()}`,
      key: newKey,
      type: "engineering" as const,
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

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent project</span>
          <Select value={parent} onValueChange={setParent}>
            <SelectTrigger>
              <SelectValue placeholder="Ad-hoc (no parent)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Ad-hoc (no parent)</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.key}>{p.key} · {p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>

        <SubtasksEditor items={subtasks} onChange={setSubtasks} />

        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Recurring</span>
          <Select value={recurring} onValueChange={(v) => setRecurring(v as typeof recurring)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Once (not recurring)</SelectItem>
              <SelectItem value="weekly">Every week</SelectItem>
              <SelectItem value="monthly">Every month</SelectItem>
            </SelectContent>
          </Select>
          {recurring !== "none" && <Pill variant="info">Tagged · recurring:{recurring}</Pill>}
        </label>

        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create → Triage</Button>
          <Pill variant="info">Engineering ticket</Pill>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Engineering template</div>
          <p className="text-[12px] text-ink-3 mb-3">
            What / Why / How / Out of scope, plus the standard 3-AC checklist.
          </p>
          <Button variant="secondary" size="sm" onClick={applyTemplate} className="w-full">
            Apply template
          </Button>
        </div>

        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ai">✦ AI Drafting</span>
          </div>
          <p className="text-[13px] text-ink-3 mb-3">Paste a Slack thread or Sentry trace. AI drafts title + description + AC.</p>
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
        Acceptance criteria · gates Done
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
  const [csv, setCsv] = useState("title,priority,project\n");
  const rows = csv.split("\n").filter(Boolean).length - 1;
  return (
    <div className="max-w-3xl">
      <Textarea
        label="CSV (first row = headers; type is locked to engineering)"
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

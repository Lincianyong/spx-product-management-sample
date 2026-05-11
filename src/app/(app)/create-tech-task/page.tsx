"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
  AiTag,
  Button,
  Input,
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

const TECH_TEMPLATE = {
  description: "## Why now\n\n## Plan\n\n## Blast radius\n\n## Rollback plan\n\n## Migration window",
  ac: ["Canary 24h green", "Rollback documented", "Owner signed off"],
};

const SLASH_COMMANDS = [
  { trigger: "/h2", insert: "## " },
  { trigger: "/h3", insert: "### " },
  { trigger: "/code", insert: "```\n\n```" },
  { trigger: "/task", insert: "- [ ] " },
];

const DRAFT_KEY = "cadence:create-draft-tech-task";

export default function CreateTechTaskPage() {
  useDocumentTitle("New Tech Task");
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(TECH_TEMPLATE.description);
  const [parent, setParent] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>(TECH_TEMPLATE.ac);
  const [blastRadius, setBlastRadius] = useState("");
  const [rollbackPlan, setRollbackPlan] = useState("");
  const [migrationWindow, setMigrationWindow] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [source, setSource] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.title || (d.description && d.description !== TECH_TEMPLATE.description)) setHasDraft(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({ title, description, parent, subtasks, blastRadius, rollbackPlan, migrationWindow });
    localStorage.setItem(DRAFT_KEY, payload);
  }, [title, description, parent, subtasks, blastRadius, rollbackPlan, migrationWindow]);

  const restoreDraft = () => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      setTitle(d.title ?? "");
      setDescription(d.description ?? TECH_TEMPLATE.description);
      setParent(d.parent ?? "");
      setSubtasks(d.subtasks ?? TECH_TEMPLATE.ac);
      setBlastRadius(d.blastRadius ?? "");
      setRollbackPlan(d.rollbackPlan ?? "");
      setMigrationWindow(d.migrationWindow ?? "");
    } catch {}
    setHasDraft(false);
    toast("Draft restored");
  };

  const draftFromSource = () => {
    if (!source.trim()) return;
    setTitle("Migrate retrain orchestrator from cron to Argo");
    setDescription("## Why now\nCron lacks retries + visibility — a failed retrain at 02:00 silently leaves yesterday's model live.\n\n## Plan\nLift the DAG into Argo Workflows; reuse the same image; add retry policy.\n\n## Blast radius\nRetrain pipeline in staging + prod regions.\n\n## Rollback plan\nRe-enable cron job; pause Argo DAG.\n\n## Migration window\nSun 03:00–05:00 SGT.");
    setBlastRadius("Retrain pipeline only; staging tested 1 week prior");
    setRollbackPlan("Re-enable cron job; Argo DAG paused");
    setMigrationWindow("Sun 03:00–05:00 SGT");
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

  const canSubmit = title.trim().length >= 8 && blastRadius.trim() && rollbackPlan.trim();

  const submit = () => {
    if (!canSubmit || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const newKey = `TCH-${Math.floor(Math.random() * 9000 + 1000)}`;
    useAppStore.setState((s) => ({
      tickets: [...s.tickets, {
        id: `t_${Date.now()}`,
        key: newKey,
        type: "tech_task" as const,
        title: title.trim(),
        description,
        acceptanceCriteria: subtasks.map((it) => ({ id: `ac_${Math.random().toString(36).slice(2, 8)}`, text: it, done: false })),
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
    if (typeof window !== "undefined") localStorage.removeItem(DRAFT_KEY);
    toast(`Created ${newKey} → Triage`);
    router.push(`/t/${newKey}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Create Tech Task · Eng lane"
        title={
          <>
            New <em className="text-accent">tech task</em>.
          </>
        }
        lede="Tech tasks describe internal infrastructure, migrations, refactors. Blast radius + rollback plan are required."
      />

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

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Migrate retrain orchestrator from cron to Argo"
            hint={title.length > 0 && title.length < 8 ? "8 characters minimum" : undefined}
          />

          <div className="relative">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Description (markdown · slash commands enabled)</span>
            <textarea
              value={description}
              onChange={onDescChange}
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

          {/* Required tech-task context */}
          <div className="bg-bg-elevated border border-rule rounded-[8px] p-4 space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Tech context · required</div>
            <Input
              label="Blast radius"
              value={blastRadius}
              onChange={(e) => setBlastRadius(e.target.value)}
              placeholder="e.g., Retrain pipeline in all regions"
            />
            <Input
              label="Rollback plan"
              value={rollbackPlan}
              onChange={(e) => setRollbackPlan(e.target.value)}
              placeholder="e.g., Re-enable cron job; pause Argo DAG"
            />
            <Input
              label="Migration window (optional)"
              value={migrationWindow}
              onChange={(e) => setMigrationWindow(e.target.value)}
              placeholder="e.g., Sun 03:00–05:00 SGT"
            />
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

          <div className="flex items-center gap-2 pt-4 border-t border-rule">
            <Button variant="primary" onClick={submit} disabled={!canSubmit}>Create → Triage</Button>
            <Pill variant="neutral">Tech Task</Pill>
            <span className="font-mono text-[11px] text-ink-3 ml-auto">
              Routes to Triage. PM confirms.
            </span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Tech Task checklist</div>
            <ul className="space-y-1.5 text-[13px] text-ink-2">
              <li className={title.trim().length >= 8 ? "text-ok" : ""}>{title.trim().length >= 8 ? "✓" : "○"} Title (≥ 8 chars)</li>
              <li className={blastRadius.trim() ? "text-ok" : ""}>{blastRadius.trim() ? "✓" : "○"} Blast radius defined</li>
              <li className={rollbackPlan.trim() ? "text-ok" : ""}>{rollbackPlan.trim() ? "✓" : "○"} Rollback plan defined</li>
              <li className={subtasks.length > 0 ? "text-ok" : ""}>{subtasks.length > 0 ? "✓" : "○"} ≥ 1 acceptance criterion</li>
            </ul>
          </div>

          <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ai">✦ AI Drafting</span>
            </div>
            <p className="text-[13px] text-ink-3 mb-3">Paste a Slack thread or design doc. AI drafts the description + tech context.</p>
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
                <AiTag label="Drafted" confidence={0.84} reasoning="Drafted from pasted source. Review and edit." />
                <button onClick={() => setDrafted(false)} className="text-accent hover:underline font-mono text-[11px] uppercase">Accept</button>
              </div>
            )}
          </div>
        </aside>
      </div>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { AiTag, Button, Input, Textarea, Pill, toast } from "@/components/ui";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "quick", label: "Quick", hint: "Title + parent + type. ~30 seconds." },
  { id: "full", label: "Full", hint: "Full form with AI drafting." },
  { id: "bulk", label: "Bulk (CSV)", hint: "Paste rows; we'll map fields." },
] as const;

export default function CreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("quick");
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();

  return (
    <div>
      <PageHeader
        eyebrow="S-01 · Create Ticket"
        title={
          <>
            Capture <em className="text-accent">cleanly</em>. Triage later.
          </>
        }
        lede="Three modes: a 30-second quick capture, a full editorial form with AI drafting, or a CSV bulk upload."
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
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState<string>("");
  const [type, setType] = useState<"engineering" | "bug" | "tech_task">("engineering");
  const projects = useAppStore((s) => s.projects);

  const submit = () => {
    if (!title.trim()) return;
    toast(`Created · routed to Triage`, { kind: "success" });
    setTitle("");
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
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]">
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

function FullForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [drafted, setDrafted] = useState(false);

  const draftFromSource = () => {
    if (!source.trim()) return;
    setTitle("Doubled push notifications on Samsung S22 (OneUI 6)");
    setDescription(
      "From the pasted thread: drivers on Samsung S22 with OneUI 6.0 receive each push twice within 30s. Confirmed by Ronaldo with two device samples.\n\nAffected scope: ~60 drivers, Jakarta region.\nObserved since: last week's app update."
    );
    setDrafted(true);
    toast("AI drafted from source — review and edit", { kind: "info" });
  };

  const acceptDraft = () => setDrafted(false);

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={cn(drafted && "bg-ai-soft/40")} />
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Description (markdown)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(
              "mt-1.5 w-full min-h-[200px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px]",
              drafted && "bg-ai-soft/40"
            )}
          />
        </div>
        <Button variant="primary">Create → Triage</Button>
      </div>

      <aside className="space-y-4">
        <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ai">✦ AI Drafting</span>
          </div>
          <p className="text-[13px] text-ink-3 mb-3">Paste a Slack thread, Lark message, or Sentry trace. AI drafts title + description + AC.</p>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste source here…"
            className="w-full min-h-[120px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-[13px]"
          />
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={draftFromSource} disabled={!source.trim()}>
            Draft with AI
          </Button>
          {drafted && (
            <div className="mt-3 flex items-center gap-2 text-[12px]">
              <AiTag label="Drafted" confidence={0.86} reasoning="Drafted from pasted source. Tinted fields are AI-touched until you edit." />
              <button onClick={acceptDraft} className="text-accent hover:underline font-mono text-[11px] uppercase">Accept</button>
            </div>
          )}
        </div>
      </aside>
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

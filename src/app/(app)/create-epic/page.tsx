"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import {
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
import { Markdown } from "@/components/Markdown";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import type { Epic } from "@/lib/types";

const QUARTER_OPTIONS = ["Q2 2026", "Q3 2026", "Q4 2026", "Q1 2027"];

export default function CreateEpicPage() {
  useDocumentTitle("New Epic");
  const router = useRouter();
  const epics = useAppStore((s) => s.epics);
  const users = useAppStore((s) => s.users);
  const user = useCurrentUser();

  const [title, setTitle] = useState("");
  const [thesis, setThesis] = useState("");
  const [quarter, setQuarter] = useState(QUARTER_OPTIONS[0]);
  const [pmPicId, setPmPicId] = useState(user?.id ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );
  const [showPreview, setShowPreview] = useState(false);

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
    toast(`Created ${newEpic.key} · ${newEpic.title}`, { kind: "success" });
    router.push(`/e/${newEpic.key}`);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Create Epic"
        title={
          <>
            New <em className="text-accent">conviction</em>.
          </>
        }
        lede="Epics are quarter-altitude bets. Title, thesis, PM owner, dates. Projects come later, under it."
      />

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Forecasting v2"
            hint={title.length < 8 ? "8 characters minimum" : undefined}
            error={title.length > 0 && title.length < 8 ? "Too short" : undefined}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Thesis (markdown · the conviction)
              </span>
              <button
                onClick={() => setShowPreview((s) => !s)}
                className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
              >
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>
            {showPreview ? (
              <div className="min-h-[200px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card">
                {thesis ? (
                  <Markdown source={thesis} />
                ) : (
                  <p className="italic text-[13px] text-ink-3">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <textarea
                value={thesis}
                onChange={(e) => setThesis(e.target.value)}
                placeholder="Why this Epic, why now. What changes for the user. The conviction in 2-4 sentences."
                className="w-full min-h-[200px] px-3 py-2 rounded-[6px] border border-rule bg-bg-card text-ink text-[14px] font-mono"
              />
            )}
            {thesis.length > 0 && thesis.length < 20 && (
              <p className="text-[12px] text-danger mt-1">20 characters minimum — make the conviction explicit.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">PM owner (PIC)</span>
              <Select value={pmPicId} onValueChange={setPmPicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a PM…" />
                </SelectTrigger>
                <SelectContent>
                  {pmCandidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName} · {u.role.toUpperCase()}
                    </SelectItem>
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
                  {QUARTER_OPTIONS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Target end</span>
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px]"
                />
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
                placeholder="add tag, press Enter (e.g., ml, routing, mobile)"
                className="h-9 px-3 rounded-[6px] border border-rule bg-bg-card text-[13px] flex-1"
              />
              <Button variant="secondary" size="sm" onClick={addTag} disabled={!tagDraft.trim()}>Add</Button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-rule">
            <Button variant="primary" onClick={submit} disabled={!canSubmit}>
              Create Epic →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/epics")}>Cancel</Button>
            <span className="font-mono text-[11px] text-ink-3 ml-auto">
              Will be created with status <Pill variant="neutral">backlog</Pill> and health <Pill variant="neutral">not started</Pill>
            </span>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Epic checklist</div>
            <ul className="space-y-1.5 text-[13px] text-ink-2">
              <li className={title.trim().length >= 8 ? "text-ok" : ""}>{title.trim().length >= 8 ? "✓" : "○"} Title (≥ 8 chars)</li>
              <li className={thesis.trim().length >= 20 ? "text-ok" : ""}>{thesis.trim().length >= 20 ? "✓" : "○"} Thesis (≥ 20 chars)</li>
              <li className={pmPicId ? "text-ok" : ""}>{pmPicId ? "✓" : "○"} PM owner</li>
              <li className={startDate && targetEndDate ? "text-ok" : ""}>{startDate && targetEndDate ? "✓" : "○"} Dates</li>
            </ul>
          </div>
          <div className="bg-bg-elevated border border-rule rounded-[8px] p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2">Cadence guidance</div>
            <p className="text-[12px] text-ink-3 leading-relaxed">
              Epics are conviction bets, not work items. The thesis should explain <em className="display text-accent">why now</em>, not the implementation. Projects under this Epic come next — open the Epic detail to add them.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

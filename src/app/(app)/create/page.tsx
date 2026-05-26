"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bug, Compass, ImagePlus, Plus, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
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
import type { Epic, Ticket, TicketType, Program } from "@/lib/types";
import { ProgramPicker } from "@/components/ProgramPicker";

// ─── Type catalog ────────────────────────────────────────────────────
// PRD § 10.3: waterfall model has two creation types only.
// Bug is universal; Epic is PM-only. Engineering Ticket + Tech Task
// dropped - work is tracked at Epic + milestone altitude.
type CreateType = "epic" | "bug";

const TYPES: {
  id: CreateType;
  label: string;
  lane: "PM" | "Eng" | "All";
  cap: Capability;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  prefix: string;
}[] = [
  { id: "bug",  label: "Bug",  lane: "All", cap: "create_bug",  icon: Bug,     blurb: "Something broken. Repro / Expected / Actual required. Anyone can file.", prefix: "BUG" },
  { id: "epic", label: "Epic", lane: "PM",  cap: "create_epic", icon: Compass, blurb: "Conviction-level bet. Quarter altitude. Title + thesis + waterfall milestones.", prefix: "EPC" },
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

      <div className="mt-8 bg-bg-elevated border border-rule rounded-[8px] p-4">
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
  if (has("epic")) parts.push("Epics enter the Epic Board with health=not_started until startDate is reached.");
  if (has("bug")) {
    parts.push(
      <>
        Bugs land in{" "}
        <Link href="/backlog" className="text-accent hover:underline">Backlog</Link>{" "}
        as draft → backlog. They're then triaged onto an Epic phase or fixed directly.
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

/**
 * MarkdownArea — Jira-style rich textarea.
 *
 * Source-of-truth invariant: the parent owns the full markdown string
 * including any `![alt](data:image/...)` image markdown for attached
 * images. We expose a single `value` / `onChange` so consumers stay
 * dumb.
 *
 * Editor behaviour:
 *  - The textarea never shows the long base64 data URL. On mount we
 *    parse `value` and swap each `![alt](data:...)` for a compact
 *    `![alt](#img-<id>)` placeholder; the data URL itself lives in
 *    component state, keyed by id.
 *  - Attached images render as a thumbnail strip above the textarea
 *    so the author can see (and remove) what's attached. Removing a
 *    thumbnail also removes its placeholder line from the text.
 *  - On every internal change (typing, attach, remove) we recompose
 *    the full markdown by re-substituting `#img-<id>` with the real
 *    data URL and call `onChange` so the parent stays in sync.
 *  - Preview mode renders the recomposed markdown via <Markdown> so
 *    images appear in their authored positions.
 */
type Attachment = { id: string; filename: string; dataUrl: string };

const newAttachmentId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function parseInitialMarkdown(raw: string): { text: string; attachments: Attachment[] } {
  const attachments: Attachment[] = [];
  const text = raw.replace(/!\[([^\]]*)\]\((data:[^)]+)\)/g, (_, alt, dataUrl) => {
    const id = newAttachmentId();
    attachments.push({ id, filename: alt || "image", dataUrl });
    return `![${alt || "image"}](#img-${id})`;
  });
  return { text, attachments };
}

function composeMarkdown(text: string, attachments: Attachment[]): string {
  const map = new Map(attachments.map((a) => [a.id, a.dataUrl]));
  return text.replace(/#img-([a-z0-9]+)/g, (full, id) => map.get(id) ?? full);
}

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
  // Initial parse lifts data URLs out of the textarea and keeps them
  // in component state. We don't re-sync after mount — the parent
  // value only changes via our own onChange calls.
  const initial = useState(() => parseInitialMarkdown(value))[0];
  const [text, setText] = useState(initial.text);
  const [attachments, setAttachments] = useState<Attachment[]>(initial.attachments);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashAnchor, setSlashAnchor] = useState(0);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dropping, setDropping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single helper: whenever text or attachments changes, push the
  // recomposed full markdown to the parent.
  const pushUp = (nextText: string, nextAttachments: Attachment[]) => {
    onChange(composeMarkdown(nextText, nextAttachments));
  };

  const handle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setText(v);
    pushUp(v, attachments);
    const caret = e.target.selectionStart ?? v.length;
    setSlashAnchor(caret);
    const before = v.slice(0, caret);
    const m = before.match(/(^|\n|\s)(\/[a-z]*)$/);
    setSlashOpen(!!m);
  };

  const insert = (cmd: typeof SLASH_COMMANDS[number]) => {
    const before = text.slice(0, slashAnchor);
    const after = text.slice(slashAnchor);
    const cleared = before.replace(/\/[a-z]*$/, "");
    const next = cleared + cmd.insert + after;
    setText(next);
    pushUp(next, attachments);
    setSlashOpen(false);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const insertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("Image larger than 5 MB; not attached.", { kind: "error" });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const id = newAttachmentId();
    const filename = file.name.replace(/\]/g, "") || "image";
    const att: Attachment = { id, filename, dataUrl };

    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const leading = before && !before.endsWith("\n") ? "\n" : "";
    const trailing = after && !after.startsWith("\n") ? "\n" : "";
    const placeholderMd = `${leading}![${filename}](#img-${id})${trailing}`;
    const nextText = before + placeholderMd + after;
    const nextAtts = [...attachments, att];

    setText(nextText);
    setAttachments(nextAtts);
    pushUp(nextText, nextAtts);

    queueMicrotask(() => {
      const node = textareaRef.current;
      if (!node) return;
      const pos = (before + placeholderMd).length;
      node.focus();
      node.setSelectionRange(pos, pos);
    });
  };

  const removeAttachment = (id: string) => {
    const nextAtts = attachments.filter((a) => a.id !== id);
    // Strip both the full image-line form and any bare `#img-<id>`
    // references just in case the user typed around it.
    const lineRe = new RegExp(`!\\[[^\\]]*\\]\\(#img-${id}\\)\\n?`, "g");
    const tokenRe = new RegExp(`#img-${id}`, "g");
    const nextText = text.replace(lineRe, "").replace(tokenRe, "");
    setAttachments(nextAtts);
    setText(nextText);
    pushUp(nextText, nextAtts);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((it) => it.kind === "file" && it.type.startsWith("image/"));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) void insertImage(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    setDropping(false);
    const files = Array.from(e.dataTransfer.files);
    const image = files.find((f) => f.type.startsWith("image/"));
    if (!image) return;
    e.preventDefault();
    void insertImage(image);
  };

  const handleAttachClick = () => fileInputRef.current?.click();
  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void insertImage(file);
    e.target.value = "";
  };

  // For the preview pane and below-textarea attachments strip we
  // resolve placeholders to real data URLs so images render.
  const composed = composeMarkdown(text, attachments);

  return (
    <div className="relative">
      {/* Edit/Preview + Attach controls */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="inline-flex bg-bg-elevated border border-rule rounded-[6px] p-0.5">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "px-2.5 h-6 text-[11px] font-mono uppercase tracking-[0.06em] rounded-[4px] transition-colors duration-100",
                mode === m
                  ? "bg-bg-card text-ink"
                  : "text-ink-3 hover:text-ink-2"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAttachClick}
          className="inline-flex items-center gap-1.5 px-2 h-7 text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink rounded-[4px] hover:bg-rule-soft"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Attach image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>

      {/* Attachment thumbnails — visible in BOTH edit and preview, so
          the author always sees what's attached even when typing. */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group relative bg-bg-card border border-rule rounded-[6px] p-1.5 flex items-center gap-2 max-w-[240px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.dataUrl}
                alt={a.filename}
                className="w-12 h-12 object-cover rounded-[4px] border border-rule-soft shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-ink truncate" title={a.filename}>{a.filename}</div>
                <div className="font-mono text-[10px] text-ink-3">attachment</div>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                aria-label={`Remove ${a.filename}`}
                className="shrink-0 w-5 h-5 inline-flex items-center justify-center rounded-[4px] text-ink-3 hover:text-danger hover:bg-rule-soft"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handle}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDropping(true); }}
          onDragLeave={() => setDropping(false)}
          placeholder={placeholder}
          style={{ minHeight }}
          className={cn(
            "w-full px-3 py-2 rounded-[6px] border bg-bg-card text-ink text-[14px] font-mono transition-colors duration-100",
            dropping ? "border-accent ring-4 ring-accent-soft" : "border-rule",
            className
          )}
        />
      ) : (
        <div
          style={{ minHeight }}
          className={cn(
            "w-full px-3 py-2 rounded-[6px] border border-rule bg-bg-card overflow-y-auto",
            className
          )}
        >
          {composed.trim() ? (
            <Markdown source={composed} />
          ) : (
            <p className="italic text-[13px] text-ink-3">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-1.5">
        Paste · drop · or attach an image to embed it inline.
      </p>

      {slashOpen && mode === "edit" && (
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

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      {children}
    </label>
  );
}

// Sentinel value for the "no parent epic" option. Radix's SelectItem refuses
// an empty string value at runtime (it throws), so the ad-hoc choice carries
// an explicit non-empty token that's resolved back to "" / null in submit.
const PARENT_NONE = "__none__";

function ParentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const epics = useAppStore((s) => s.epics);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
        Parent Epic · optional
      </span>
      <Select value={value || PARENT_NONE} onValueChange={(v) => onChange(v === PARENT_NONE ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder="Ad-hoc - no parent Epic" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PARENT_NONE}>Ad-hoc - no parent Epic</SelectItem>
          {epics.map((e) => (
            <SelectItem key={e.id} value={e.key}>{e.key} · {e.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-[11px] text-ink-3">
        Tickets can stand alone. Attach an Epic only when this work clearly rolls up to one.
      </span>
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
function BugForm() {
  const user = useCurrentUser();
  const goTo = useGoToTicket();
  const [title, setTitle] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [scope, setScope] = useState("");
  const [severity, setSeverity] = useState<"S1" | "S2" | "S3">("S2");
  const [programs, setPrograms] = useState<Program[]>([]);

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
        epicId: null,
        priority: severity === "S1" ? "P0" as const : severity === "S2" ? "P1" as const : "P2" as const,
        status: "backlog" as const,
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
        programs: programs.length > 0 ? programs : undefined,
      }],
    }));
    toast(`Filed ${newKey} → Backlog`);
    goTo(newKey);
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-2 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Driver app push fires twice on Samsung S22" />
        <FieldLabel label="Repro steps">
          <MarkdownArea
            value={reproSteps}
            onChange={setReproSteps}
            minHeight={140}
            placeholder={"1. Install app v3.14 on Samsung S22 (OneUI 6.0)\n2. Send any push\n3. Observe receipt count"}
          />
        </FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          <FieldLabel label="Expected">
            <MarkdownArea value={expected} onChange={setExpected} minHeight={120} placeholder="What should happen?" />
          </FieldLabel>
          <FieldLabel label="Actual">
            <MarkdownArea value={actual} onChange={setActual} minHeight={120} placeholder="What's happening instead?" />
          </FieldLabel>
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
        <ProgramPicker value={programs} onChange={setPrograms} />
        <div className="flex items-center gap-2 pt-4 border-t border-rule">
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>File bug → Backlog</Button>
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
  const [programs, setPrograms] = useState<Program[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );

  const pmCandidates = users.filter((u) => u.role === "pm");
  const canSubmit = title.trim().length >= 8 && thesis.trim().length >= 20 && pmPicId;

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagDraft("");
  };

  const submit = () => {
    if (!canSubmit || !user) return;
    const titleSlug = title.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const code = titleSlug.length >= 2 ? titleSlug : `EP${epics.length + 1}`;
    const newEpic: Epic = {
      id: `ep_${Date.now()}`,
      key: code,
      title: title.trim(),
      thesis: thesis.trim(),
      description: thesis.trim().slice(0, 140),
      quarter,
      status: "backlog",
      health: "not_started",
      pmPicId,
      startDate,
      targetEndDate,
      tags,
      position: epics.length,
      programs: programs.length > 0 ? programs : undefined,
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

        <ProgramPicker value={programs} onChange={setPrograms} />

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

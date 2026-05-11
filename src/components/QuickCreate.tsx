"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  Button,
  Input,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { can } from "@/lib/permissions";
import type { Ticket, TicketType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

type QuickType = "engineering" | "tech_task" | "bug";

const TYPE_META: Record<QuickType, { label: string; prefix: string; cap: "create_ticket" | "create_tech_task" | "create_bug" }> = {
  engineering: { label: "Engineering Ticket", prefix: "CDN", cap: "create_ticket" },
  tech_task:   { label: "Tech Task",          prefix: "TCH", cap: "create_tech_task" },
  bug:         { label: "Bug",                prefix: "BUG", cap: "create_bug" },
};

export function QuickCreate({ open, onClose }: Props) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();

  const typeOptions = useMemo(() => {
    if (!user) return [] as QuickType[];
    return (Object.keys(TYPE_META) as QuickType[]).filter((t) => can(user.role, TYPE_META[t].cap));
  }, [user]);

  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [type, setType] = useState<QuickType>(typeOptions[0] ?? "engineering");

  if (typeOptions.length > 0 && !typeOptions.includes(type)) {
    setType(typeOptions[0]);
  }

  const close = () => {
    setTitle("");
    setParent("");
    onClose();
  };

  const submit = () => {
    if (!title.trim() || !user) return;
    const meta = TYPE_META[type];
    const proj = projects.find((p) => p.key === parent);
    const newKey = `${meta.prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const ticketType: TicketType = type === "tech_task" ? "tech_task" : type === "bug" ? "bug" : "engineering";
    const newTicket: Ticket = {
      id: `t_${Date.now()}`,
      key: newKey,
      type: ticketType,
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
    };
    useAppStore.setState((s) => ({ tickets: [...s.tickets, newTicket] }));
    toast(`Created ${newKey} → Triage`, { kind: "success" });
    close();
    router.push(`/t/${newKey}`);
  };

  if (typeOptions.length === 0) {
    return (
      <Modal open={open} onClose={close} title="Quick Create" size="sm">
        <p className="text-[14px] text-ink-2">
          Your role has no creation lane assigned. Open the Create page for the full picker.
        </p>
        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" onClick={() => { close(); router.push("/create"); }}>
            Open Create →
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={close} title="Quick Create" size="md">
      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="What needs to happen?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Parent</span>
            <Select value={parent} onValueChange={setParent}>
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
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Type</span>
            <Select value={type} onValueChange={(v) => setType(v as QuickType)} disabled={typeOptions.length === 1}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => { close(); router.push("/create"); }}
            className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
          >
            Open full Create page →
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={!title.trim()}>
              Create → Triage
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

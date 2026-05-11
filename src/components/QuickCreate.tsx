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

export function QuickCreate({ open, onClose }: Props) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();

  // Type options the current role can actually create
  const typeOptions = useMemo(() => {
    if (!user) return [] as { value: TicketType; label: string; prefix: string }[];
    const opts: { value: TicketType; label: string; prefix: string }[] = [];
    if (can(user.role, "create_ticket")) opts.push({ value: "engineering", label: "Engineering Ticket", prefix: "CDN" });
    if (can(user.role, "create_tech_task")) opts.push({ value: "tech_task", label: "Tech Task", prefix: "TCH" });
    if (can(user.role, "create_bug")) opts.push({ value: "bug", label: "Bug", prefix: "BUG" });
    return opts;
  }, [user]);

  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [type, setType] = useState<TicketType>(typeOptions[0]?.value ?? "engineering");

  // Sync default type when typeOptions changes (e.g., user role swap)
  if (typeOptions.length > 0 && !typeOptions.some((o) => o.value === type)) {
    setType(typeOptions[0].value);
  }

  const close = () => {
    setTitle("");
    setParent("");
    onClose();
  };

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const opt = typeOptions.find((o) => o.value === type);
    const keyPrefix = opt?.prefix ?? "CDN";
    const newKey = `${keyPrefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newTicket: Ticket = {
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
          Your role doesn't have a creation lane assigned. Use Report Bug if you've spotted an issue.
        </p>
        <div className="flex justify-end mt-4">
          <Button variant="primary" size="sm" onClick={() => { close(); router.push("/report-bug"); }}>
            Open Report Bug →
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
            <Select value={type} onValueChange={(v) => setType(v as TicketType)} disabled={typeOptions.length === 1}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="font-mono text-[11px] text-ink-3">Routes to Triage. PM confirms.</span>
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

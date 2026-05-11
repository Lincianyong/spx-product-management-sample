"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, Input, toast } from "@/components/ui";
import { useAppStore, useCurrentUser } from "@/lib/store";
import type { Ticket } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuickCreate({ open, onClose }: Props) {
  const router = useRouter();
  const projects = useAppStore((s) => s.projects);
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [type, setType] = useState<"engineering" | "bug" | "tech_task">("engineering");

  const close = () => {
    setTitle("");
    setParent("");
    setType("engineering");
    onClose();
  };

  const submit = () => {
    if (!title.trim() || !user) return;
    const proj = projects.find((p) => p.key === parent);
    const keyPrefix = type === "bug" ? "BUG" : type === "tech_task" ? "TCH" : "CDN";
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
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]"
            >
              <option value="">Ad-hoc (no parent)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.key}>{p.key} · {p.title}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "engineering" | "bug" | "tech_task")}
              className="h-10 px-3 rounded-[6px] border border-rule bg-bg-card text-[14px]"
            >
              <option value="engineering">Engineering</option>
              <option value="bug">Bug</option>
              <option value="tech_task">Tech Task</option>
            </select>
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

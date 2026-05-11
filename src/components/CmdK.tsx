"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { toast } from "@/components/ui";

export function CmdK() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const user = useCurrentUser();
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!user) return null;

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] bg-ink/40"
    >
      <div onClick={() => setOpen(false)} className="absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-xl bg-bg-card rounded-[10px] shadow-lg border border-rule overflow-hidden">
        <Command.Input
          placeholder="Search tickets, epics, projects, actions…"
          className="w-full h-14 px-5 text-[15px] text-ink bg-bg-card outline-none border-b border-rule-soft placeholder:text-ink-4"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-ink-3 text-[13px]">
            No matches. Try a different keyword.
          </Command.Empty>

          <Command.Group heading="Go to" className="text-ink-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em]">
            <Item onSelect={() => go("/epics")}>Epic Board</Item>
            <Item onSelect={() => go("/me")}>My Work</Item>
            <Item onSelect={() => go("/sprint")}>Sprint Board</Item>
            <Item onSelect={() => go("/triage")}>Triage Inbox</Item>
            <Item onSelect={() => go("/backlog")}>Backlog</Item>
            <Item onSelect={() => go("/planning/picklist")}>Sprint Planning · Stage 4a</Item>
            <Item onSelect={() => go("/planning/estimation")}>Sprint Planning · Stage 4b</Item>
            <Item onSelect={() => go("/planning/joint")}>Sprint Planning · Stage 4c</Item>
            <Item onSelect={() => go("/heatmap")}>Workload Heatmap</Item>
            <Item onSelect={() => go("/portfolio")}>Portfolio Health</Item>
            <Item onSelect={() => go("/notifications")}>Notifications</Item>
            <Item onSelect={() => go("/settings")}>Settings</Item>
          </Command.Group>

          <Command.Group heading="Tickets">
            {tickets.slice(0, 30).map((t) => (
              <Item key={t.id} onSelect={() => go(`/t/${t.key}`)}>
                <span className="font-mono text-[11px] text-ink-3 mr-2">{t.key}</span>
                <span className="text-ink">{t.title}</span>
              </Item>
            ))}
          </Command.Group>

          <Command.Group heading="Projects">
            {projects.map((p) => (
              <Item key={p.id} onSelect={() => go(`/p/${p.key}`)}>
                <span className="font-mono text-[11px] text-ink-3 mr-2">{p.key}</span>
                <span className="text-ink">{p.title}</span>
              </Item>
            ))}
          </Command.Group>

          <Command.Group heading="Epics">
            {epics.map((e) => (
              <Item key={e.id} onSelect={() => go(`/e/${e.key}`)}>
                <span className="font-mono text-[11px] text-ink-3 mr-2">{e.key}</span>
                <span className="text-ink">{e.title}</span>
              </Item>
            ))}
          </Command.Group>

          <Command.Group heading="Actions">
            <Item
              onSelect={() => {
                setOpen(false);
                navigator.clipboard?.writeText(window.location.href);
                toast("Link copied", { kind: "success" });
              }}
            >
              Copy link to current page
            </Item>
            {tickets
              .filter((t) => t.assigneeId === user.id && t.status === "in_progress")
              .slice(0, 5)
              .map((t) => (
                <Item
                  key={`act_${t.id}`}
                  onSelect={() => {
                    setTicketStatus(t.id, "review", user.id);
                    setOpen(false);
                    toast(`${t.key} → Review`);
                  }}
                >
                  Move {t.key} to Review
                </Item>
              ))}
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="px-3 py-2 rounded-[6px] cursor-pointer text-[13px] text-ink-2 data-[selected=true]:bg-accent-soft data-[selected=true]:text-ink"
    >
      {children}
    </Command.Item>
  );
}

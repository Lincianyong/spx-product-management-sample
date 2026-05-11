"use client";

import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { toast } from "@/components/ui";
import { can } from "@/lib/permissions";
import type { TicketStatus } from "@/lib/types";
import { statusLabel } from "@/lib/utils";

export function CmdK() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const user = useCurrentUser();
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const setTicketStatus = useAppStore((s) => s.setTicketStatus);
  const setTicketField = useAppStore((s) => s.setTicketField);

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

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  // Natural language matchers
  const nlActions = useMemo(() => {
    if (!query || !user) return [];
    const q = query.trim().toLowerCase();
    const out: { label: string; run: () => void }[] = [];

    // Pattern: "assign <KEY> to <name>"
    const assignMatch = q.match(/^assign\s+([a-z]{2,4}-\d+)\s+to\s+(.+)$/);
    if (assignMatch) {
      const key = assignMatch[1].toUpperCase();
      const namePart = assignMatch[2].trim();
      const ticket = tickets.find((t) => t.key === key);
      const candidate = users.find(
        (u) => u.displayName.toLowerCase().includes(namePart) || u.handle.includes(namePart) || u.email.startsWith(namePart)
      );
      if (ticket && candidate) {
        out.push({
          label: `Assign ${ticket.key} → ${candidate.displayName}`,
          run: () => {
            setTicketField(ticket.id, { assigneeId: candidate.id }, user.id);
            toast(`${ticket.key} assigned to ${candidate.displayName}`);
            setOpen(false);
          },
        });
      }
    }

    // Pattern: "move <KEY> to <status>"
    const moveMatch = q.match(/^(?:move|set)\s+([a-z]{2,4}-\d+)\s+to\s+(.+)$/);
    if (moveMatch) {
      const key = moveMatch[1].toUpperCase();
      const target = moveMatch[2].trim();
      const ticket = tickets.find((t) => t.key === key);
      const status = (Object.keys(statusLabel) as TicketStatus[]).find(
        (s) => statusLabel[s].toLowerCase().includes(target) || s.includes(target.replace(/\s/g, "_"))
      );
      if (ticket && status) {
        out.push({
          label: `Move ${ticket.key} → ${statusLabel[status]}`,
          run: () => {
            setTicketStatus(ticket.id, status, user.id);
            toast(`${ticket.key} → ${statusLabel[status]}`);
            setOpen(false);
          },
        });
      }
    }

    // Pattern: "points <KEY> <num>" / "set points <KEY> <num>"
    const pointsMatch = q.match(/^(?:set\s+)?points?\s+([a-z]{2,4}-\d+)\s+(\d+)$/);
    if (pointsMatch) {
      const key = pointsMatch[1].toUpperCase();
      const points = parseInt(pointsMatch[2], 10);
      const ticket = tickets.find((t) => t.key === key);
      if (ticket && points >= 1 && points <= 21) {
        out.push({
          label: `Set ${ticket.key} points → ${points}`,
          run: () => {
            setTicketField(ticket.id, { storyPoints: points }, user.id);
            toast(`${ticket.key} sized to ${points} pt`);
            setOpen(false);
          },
        });
      }
    }

    // Pattern: "open <KEY>"
    const openMatch = q.match(/^open\s+([a-z]{2,4}-\d+)$/);
    if (openMatch) {
      const key = openMatch[1].toUpperCase();
      out.push({ label: `Open ${key}`, run: () => go(`/t/${key}`) });
    }

    return out;
  }, [query, user, tickets, users, setTicketStatus, setTicketField, router]);

  if (!user) return null;

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
          value={query}
          onValueChange={setQuery}
          placeholder='Try "assign CDN-3504 to Andre" or just search…'
          className="w-full h-14 px-5 text-[15px] text-ink bg-bg-card outline-none border-b border-rule-soft placeholder:text-ink-4"
        />
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-ink-3 text-[13px]">
            No matches. Try a different keyword.
          </Command.Empty>

          {nlActions.length > 0 && (
            <Command.Group heading="Suggested action">
              {nlActions.map((a, i) => (
                <Item key={i} onSelect={a.run}>
                  <span className="font-mono text-[10px] text-ai mr-2">✦</span>
                  {a.label}
                </Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Go to">
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
            <Item onSelect={() => go("/planning/funnel")}>Sprint Funnel</Item>
            {can(user.role, "view_create_epic") && <Item onSelect={() => go("/create-epic")}>New Epic</Item>}
            {can(user.role, "view_create_ticket") && <Item onSelect={() => go("/create")}>New Ticket</Item>}
            {can(user.role, "view_create_tech_task") && <Item onSelect={() => go("/create-tech-task")}>New Tech Task</Item>}
            <Item onSelect={() => go("/report-bug")}>Report Bug</Item>
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
        </Command.List>
        <div className="px-4 py-2 border-t border-rule-soft font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 flex items-center justify-between">
          <span>↑↓ Navigate · ↵ Select · Esc Close</span>
          <span>Try: assign, move, points, open</span>
        </div>
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

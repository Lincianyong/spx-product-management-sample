"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { parseMarkdown, type MdInline, type MdNode } from "@/lib/markdown";
import { useAppStore } from "@/lib/store";
import { Avatar, Checkbox, Pill, PriorityPill } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

interface Props {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: Props) {
  const nodes = parseMarkdown(source);
  return (
    <div className={`text-[14px] text-ink-2 leading-relaxed space-y-3 ${className ?? ""}`}>
      {nodes.map((n, i) => renderBlock(n, i))}
    </div>
  );
}

function renderBlock(n: MdNode, key: number): React.ReactNode {
  switch (n.type) {
    case "h2":
      return (
        <h2 key={key} className="display text-display-s text-ink mt-4 mb-1">
          {n.children.map((c, i) => renderInline(c, i))}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-[15px] font-semibold text-ink mt-3 mb-1">
          {n.children.map((c, i) => renderInline(c, i))}
        </h3>
      );
    case "p":
      return (
        <p key={key} className="text-[14px] text-ink-2 leading-relaxed">
          {n.children.map((c, i) => renderInline(c, i))}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="space-y-1">
          {n.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              {item.checked === null ? (
                <span className="text-ink-3 leading-[1.55]">•</span>
              ) : (
                <Checkbox checked={item.checked} className="mt-1 pointer-events-none" tabIndex={-1} aria-readonly />
              )}
              <span className={item.checked ? "line-through text-ink-4" : ""}>
                {item.children.map((c, j) => renderInline(c, j))}
              </span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal pl-5 space-y-1">
          {n.items.map((item, i) => (
            <li key={i}>{item.children.map((c, j) => renderInline(c, j))}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote key={key} className="border-l-2 border-accent pl-3 italic text-ink-2">
          {n.children.map((c, i) => renderInline(c, i))}
        </blockquote>
      );
    case "code":
      return (
        <pre key={key} className="bg-bg-elevated border border-rule rounded-[6px] p-3 overflow-x-auto">
          <code className="font-mono text-[12px] text-ink-2 whitespace-pre">{n.body}</code>
        </pre>
      );
    case "image":
      // Block-level image. We render via plain <img> (not next/image) because
      // attachments arrive as base64 data URLs, which Next's image loader
      // doesn't optimize.
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          key={key}
          src={n.src}
          alt={n.alt || "attachment"}
          className="block max-w-full max-h-[480px] rounded-[6px] border border-rule my-2"
        />
      );
    case "hr":
      return <hr key={key} className="border-rule-soft" />;
  }
}

function renderInline(n: MdInline, key: number): React.ReactNode {
  switch (n.type) {
    case "text":
      return <Fragment key={key}>{n.value}</Fragment>;
    case "bold":
      return <strong key={key} className="font-semibold text-ink">{n.value}</strong>;
    case "italic":
      return <em key={key} className="italic">{n.value}</em>;
    case "code":
      return <code key={key} className="font-mono text-[12px] bg-bg-elevated px-1 py-0.5 rounded-[4px]">{n.value}</code>;
    case "link":
      return (
        <a key={key} href={n.href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
          {n.value}
        </a>
      );
    case "mention":
      return <MentionChip key={key} handle={n.handle} />;
    case "ticket":
      return <TicketChip key={key} ticketKey={n.key} />;
    case "br":
      return <br key={key} />;
  }
}

function MentionChip({ handle }: { handle: string }) {
  const users = useAppStore((s) => s.users);
  const user = users.find((u) => u.handle === handle);
  if (!user) return <>@{handle}</>;
  return (
    <Link
      href={`/u/${user.handle}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-accent-soft text-accent hover:bg-accent hover:text-bg-card text-[13px] font-medium align-baseline"
    >
      <Avatar user={user} size="xs" />
      @{user.handle}
    </Link>
  );
}

function TicketChip({ ticketKey }: { ticketKey: string }) {
  const tickets = useAppStore((s) => s.tickets);
  const users = useAppStore((s) => s.users);
  const ticket = tickets.find((t) => t.key === ticketKey);
  const [hover, setHover] = useState(false);
  if (!ticket) return <span className="font-mono text-[12px] text-ink-4">{ticketKey}</span>;
  const assignee = users.find((u) => u.id === ticket.assigneeId);
  return (
    <span className="relative inline-block align-baseline" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link
        href={`/t/${ticket.key}`}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-bg-elevated border border-rule hover:border-accent text-ink-2 font-mono text-[12px]"
      >
        {ticket.key}
      </Link>
      {hover && (
        <span className="absolute left-0 top-full mt-1 z-50 w-72 p-3 bg-bg-card border border-rule rounded-[8px] shadow-lg pointer-events-none">
          <span className="flex items-center gap-2 mb-1.5">
            <Pill variant={ticket.status === "done" || ticket.status === "verified" ? "ok" : "default"}>{statusLabel[ticket.status]}</Pill>
            <PriorityPill p={ticket.priority} />
          </span>
          <span className="block text-[13px] text-ink leading-tight line-clamp-2">{ticket.title}</span>
          {assignee && (
            <span className="flex items-center gap-1.5 mt-2">
              <Avatar user={assignee} size="xs" />
              <span className="text-[11px] text-ink-3">{assignee.displayName}</span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn } from "@/lib/utils";
import { RealtimeSimToggle } from "@/components/RealtimeSim";
import { SpxLogo } from "@/components/SpxLogo";

interface NavItem {
  label: string;
  href: string;
  count?: () => number;
  hint?: string;
  prefix?: string; // for active match if different from href
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const tickets = useAppStore((s) => s.tickets);
  const notifications = useAppStore((s) => s.notifications);

  if (!user) return null;

  const triageCount = tickets.filter((t) => t.status === "triage" || t.status === "reproduced").length;
  const myNotifs = notifications.filter((n) => n.userId === user.id && !n.archived && !n.read).length;

  const groups: NavGroup[] = [
    {
      title: "Daily",
      items: [
        { label: "My Work", href: "/me" },
        { label: "Sprint Board", href: "/sprint" },
      ],
    },
    {
      title: "Plan",
      items: [
        { label: "Triage", href: "/triage", count: () => triageCount },
        { label: "Backlog", href: "/backlog" },
        { label: "Picklist", href: "/planning/picklist", hint: "PM" },
        { label: "Estimation", href: "/planning/estimation", hint: "Eng" },
        { label: "Joint Planning", href: "/planning/joint", hint: "All" },
        { label: "Sprint Close", href: "/sprint-close" },
      ],
    },
    {
      title: "Portfolio",
      items: [
        { label: "Epic Board", href: "/epics" },
        { label: "Timeline", href: "/timeline" },
        { label: "Portfolio Health", href: "/portfolio" },
        { label: "Workload Heatmap", href: "/heatmap" },
      ],
    },
    {
      title: "Capture",
      items: [
        { label: "+ New Ticket", href: "/create" },
        { label: "+ Report Bug", href: "/report-bug" },
        { label: "+ Tech Task", href: "/create?type=tech_task", prefix: "/create" },
        { label: "My Bugs", href: "/my-bugs" },
      ],
    },
    {
      title: "Workspace",
      items: [
        { label: "Activity", href: "/activity" },
        { label: "Settings", href: "/settings" },
      ],
    },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-bg-elevated border-r border-rule flex flex-col z-30">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-rule-soft">
        <Link href="/" className="block">
          <SpxLogo size="sm" showExpress />
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-2 flex items-center gap-2">
            <span className="block w-4 h-px bg-rule" />
            <span className="display italic text-ink text-[14px] leading-none normal-case tracking-normal">Cadence</span>
            <span>· AI Eng</span>
          </div>
        </Link>
      </div>

      {/* Scrollable nav body */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const matchPath = item.prefix ?? item.href.split("?")[0];
                // Active when current path equals the item's matchPath, plus avoid /create matching /create?type
                const isActive =
                  pathname === matchPath ||
                  (matchPath !== "/" && pathname.startsWith(matchPath + "/"));
                const count = item.count?.() ?? 0;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-1.5 rounded-[6px] text-[13px] transition-colors duration-100 relative",
                        isActive
                          ? "bg-accent-soft text-ink font-medium"
                          : "text-ink-2 hover:text-ink hover:bg-rule-soft"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-accent" aria-hidden />
                      )}
                      <span className="truncate">{item.label}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {item.hint && (
                          <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.06em]">
                            · {item.hint}
                          </span>
                        )}
                        {count > 0 && (
                          <span className="font-mono text-[11px] text-ink-3 tabular-nums">{count}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom utility */}
      <div className="border-t border-rule-soft px-3 py-3">
        <RealtimeSimToggle />
      </div>
    </aside>
  );
}

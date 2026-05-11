"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bug,
  CheckSquare,
  Columns3,
  Compass,
  FileText,
  Filter,
  Flag,
  Grid3x3,
  Inbox,
  LayoutGrid,
  List,
  Plus,
  Settings as SettingsIcon,
  Sigma,
  TrendingUp,
  User as UserIcon,
  Users,
  Wrench,
} from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn } from "@/lib/utils";
import { can, type Capability } from "@/lib/permissions";
import { RealtimeSimToggle } from "@/components/RealtimeSim";
import { SpxLogo } from "@/components/SpxLogo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: () => number;
  hint?: string;
  prefix?: string;
  requires?: Capability;
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
        { label: "My Work", href: "/me", icon: UserIcon },
        { label: "Sprint Board", href: "/sprint", icon: Columns3 },
      ],
    },
    {
      title: "Plan",
      items: [
        { label: "Triage", href: "/triage", icon: Inbox, count: () => triageCount },
        { label: "Backlog", href: "/backlog", icon: List },
        { label: "Picklist", href: "/planning/picklist", icon: CheckSquare, hint: "PM" },
        { label: "Estimation", href: "/planning/estimation", icon: Sigma, hint: "Eng" },
        { label: "Joint Planning", href: "/planning/joint", icon: Users, hint: "All" },
        { label: "Sprint Funnel", href: "/planning/funnel", icon: Filter },
        { label: "Sprint Close", href: "/sprint-close", icon: Flag },
      ],
    },
    {
      title: "Portfolio",
      items: [
        { label: "Epic Board", href: "/epics", icon: LayoutGrid },
        { label: "Timeline", href: "/timeline", icon: TrendingUp },
        { label: "Portfolio Health", href: "/portfolio", icon: Activity },
        { label: "Workload Heatmap", href: "/heatmap", icon: Grid3x3 },
      ],
    },
    {
      title: "Capture",
      items: [
        { label: "New Epic", href: "/create-epic", icon: Compass, requires: "view_create_epic" },
        { label: "New Ticket", href: "/create", icon: Plus, requires: "view_create_ticket" },
        { label: "New Tech Task", href: "/create-tech-task", icon: Wrench, requires: "view_create_tech_task" },
        { label: "Report Bug", href: "/report-bug", icon: Bug, requires: "view_report_bug" },
        { label: "My Bugs", href: "/my-bugs", icon: FileText, requires: "view_my_bugs" },
      ],
    },
    {
      title: "Workspace",
      items: [
        { label: "Settings", href: "/settings", icon: SettingsIcon },
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
        {groups.map((g) => {
          const visibleItems = g.items.filter((item) => !item.requires || can(user.role, item.requires));
          if (visibleItems.length === 0) return null;
          return (
          <div key={g.title}>
            <div className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const matchPath = item.prefix ?? item.href.split("?")[0];
                const isActive =
                  pathname === matchPath ||
                  (matchPath !== "/" && pathname.startsWith(matchPath + "/"));
                const count = item.count?.() ?? 0;
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-[13px] transition-colors duration-100 relative",
                        isActive
                          ? "bg-accent-soft text-ink font-medium"
                          : "text-ink-2 hover:text-ink hover:bg-rule-soft"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-accent" aria-hidden />
                      )}
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-accent" : "text-ink-3")} />
                      <span className="truncate flex-1">{item.label}</span>
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
          );
        })}
      </nav>

      {/* Bottom utility */}
      <div className="border-t border-rule-soft px-3 py-3">
        <RealtimeSimToggle />
      </div>
    </aside>
  );
}

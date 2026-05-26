"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  FileText,
  Grid3x3,
  LayoutGrid,
  List,
  PlusSquare,
  Settings as SettingsIcon,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { cn, roleLabel } from "@/lib/utils";
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
  /**
   * Extra path prefixes that should also mark this entry active. Used
   * when one sidebar item fronts multiple sibling routes that don't
   * share a slash-prefix (e.g. /guideline + /guideline-pm + /guideline-eng).
   */
  alsoActiveOn?: string[];
  requires?: Capability;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const notifications = useAppStore((s) => s.notifications);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  if (!user) return null;

  const myNotifs = notifications.filter((n) => n.userId === user.id && !n.archived && !n.read).length;

  const groups: NavGroup[] = [
    {
      title: "Daily",
      items: [
        { label: "My Work", href: "/me", icon: UserIcon },
      ],
    },
    {
      title: "Capture",
      items: [
        { label: "Create", href: "/create", icon: PlusSquare, requires: "view_create" },
        { label: "My Tickets", href: "/my-tickets", icon: FileText, requires: "view_my_tickets" },
      ],
    },
    {
      title: "Plan",
      items: [
        { label: "Sprint Board", href: "/sprint", icon: Columns3 },
        { label: "Sprint Close", href: "/sprint-close", icon: CheckCircle2 },
        { label: "Backlog", href: "/backlog", icon: List },
      ],
    },
    {
      title: "Portfolio",
      items: [
        { label: "Epic Board", href: "/epics", icon: LayoutGrid },
        { label: "Timeline", href: "/timeline", icon: TrendingUp },
        { label: "Portfolio Health", href: "/portfolio", icon: Activity },
      ],
    },
    {
      title: "Workspace",
      items: [
        { label: "Guidelines", href: "/guideline", icon: BookOpen, alsoActiveOn: ["/guideline-pm", "/guideline-eng"] },
        { label: "Settings", href: "/settings", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 bg-bg-elevated border-r border-rule flex flex-col z-30 transition-[width] duration-200",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Brand */}
      <div className={cn("border-b border-rule-soft relative", collapsed ? "px-2 pt-3 pb-2" : "px-5 pt-6 pb-5")}>
        {collapsed ? (
          // Collapsed: 64px wide is too tight for the wordmark - show the
          // square favicon S-mark instead. The chevron is the only other
          // affordance.
          <div className="flex flex-col items-center gap-2">
            <Link href="/" className="block w-[22px] h-[22px]" aria-label="Home">
              <Image
                src="/icon.svg"
                alt="SPX"
                width={22}
                height={22}
                priority
              />
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              title="Expand sidebar (⌘\)"
              className="w-6 h-6 inline-flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-rule-soft transition-colors duration-100"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Link href="/" className="block">
              <SpxLogo size="sm" />
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-2 flex items-center gap-2">
                <span className="block w-4 h-px bg-rule" />
                <span className="text-ink text-[13px] leading-none normal-case tracking-normal font-semibold">Cadence</span>
                <span>· {roleLabel[user.role]}</span>
              </div>
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar (⌘\)"
              className="absolute top-3 right-2 w-6 h-6 inline-flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-rule-soft transition-colors duration-100"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Scrollable nav body */}
      <nav className={cn("flex-1 overflow-y-auto py-4 space-y-5", collapsed ? "px-2" : "px-3")}>
        {groups.map((g) => {
          const visibleItems = g.items.filter((item) => !item.requires || can(user.role, item.requires));
          if (visibleItems.length === 0) return null;
          return (
          <div key={g.title}>
            {!collapsed && (
              <div className="px-3 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                {g.title}
              </div>
            )}
            {collapsed && (
              <div className="mx-2 mb-1.5 h-px bg-rule-soft first:hidden" aria-hidden />
            )}
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                const matchPath = item.prefix ?? item.href.split("?")[0];
                const isActive =
                  pathname === matchPath ||
                  (matchPath !== "/" && pathname.startsWith(matchPath + "/")) ||
                  (item.alsoActiveOn?.some((p) => pathname === p || pathname.startsWith(p + "/")) ?? false);
                const count = item.count?.() ?? 0;
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      title={collapsed ? `${item.label}${item.hint ? ` · ${item.hint}` : ""}${count > 0 ? ` (${count})` : ""}` : undefined}
                      className={cn(
                        "flex items-center rounded-[6px] text-[13px] transition-colors duration-100 relative",
                        collapsed ? "h-9 justify-center px-0" : "gap-2 px-3 py-1.5",
                        isActive
                          ? "bg-accent-soft text-ink font-medium"
                          : "text-ink-2 hover:text-ink hover:bg-rule-soft"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-accent" aria-hidden />
                      )}
                      <span className="relative">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-accent" : "text-ink-3")} />
                        {collapsed && count > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-warn text-bg-card font-mono text-[8px] flex items-center justify-center">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <>
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
                        </>
                      )}
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
      <div className={cn("border-t border-rule-soft py-3", collapsed ? "px-2" : "px-3")}>
        <RealtimeSimToggle compact={collapsed} />
      </div>
    </aside>
  );
}

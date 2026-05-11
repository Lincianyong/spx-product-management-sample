"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { landingForRole, cn, roleLabel } from "@/lib/utils";
import { Avatar, RolePill, Pill } from "@/components/ui";
import { ToastViewport, toast } from "@/components/ui";
import type { Role } from "@/lib/types";
import { CmdK } from "@/components/CmdK";

interface NavItem {
  label: string;
  href: string;
  match?: (p: string) => boolean;
  badge?: () => number;
}

function navForRole(role: Role | undefined, triageCount: number, notifCount: number): NavItem[] {
  if (!role) return [];
  const base: NavItem[] = [];
  if (role === "guest") {
    return [{ label: "Report Bug", href: "/report-bug" }];
  }
  if (role === "pm" || role === "admin") {
    base.push({ label: "Epic Board", href: "/epics" });
    base.push({ label: "Triage", href: "/triage", badge: () => triageCount });
    base.push({ label: "Backlog", href: "/backlog" });
    base.push({ label: "Planning", href: "/planning/picklist" });
  }
  if (role === "em") {
    base.push({ label: "Sprint", href: "/sprint" });
    base.push({ label: "Heatmap", href: "/heatmap" });
    base.push({ label: "Planning", href: "/planning/picklist" });
    base.push({ label: "Epic Board", href: "/epics" });
  }
  if (role === "engineer" || role === "designer") {
    base.push({ label: "My Work", href: "/me" });
    base.push({ label: "Sprint", href: "/sprint" });
    base.push({ label: "Epic Board", href: "/epics" });
  }
  if (role === "leadership") {
    base.push({ label: "Portfolio", href: "/portfolio" });
    base.push({ label: "Epic Board", href: "/epics" });
    base.push({ label: "Timeline", href: "/timeline" });
  }
  return base;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useCurrentUser();
  const signOut = useAppStore((s) => s.signOut);
  const resetMockData = useAppStore((s) => s.resetMockData);
  const tickets = useAppStore((s) => s.tickets);
  const notifications = useAppStore((s) => s.notifications);

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated) return null;
  if (!user) return null;

  const triageCount = tickets.filter((t) => t.status === "triage").length;
  const myNotifs = notifications.filter((n) => n.userId === user.id && !n.archived && !n.read).length;

  const nav = navForRole(user.role, triageCount, myNotifs);

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  const handleReset = () => {
    resetMockData();
    toast("Demo data reset.", { kind: "info" });
    router.replace(landingForRole(user.role));
  };

  return (
    <>
      <header className="sticky top-0 z-40 topbar-blur border-b border-rule">
        <div className="max-w-[1440px] mx-auto px-8 h-14 flex items-center gap-6">
          <Link href={landingForRole(user.role)} className="flex items-center gap-2">
            <span className="display text-[22px] text-ink leading-none">Cadence</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hidden md:inline">
              SPX Express
            </span>
          </Link>

          <nav className="flex items-center gap-1 ml-4 flex-1">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              const badge = item.badge ? item.badge() : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 h-9 inline-flex items-center gap-2 rounded-[6px] text-[13px]",
                    "transition-colors duration-100",
                    active ? "text-ink bg-bg-card" : "text-ink-2 hover:text-ink hover:bg-rule-soft"
                  )}
                >
                  {item.label}
                  {badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-warn-soft text-warn font-mono text-[10px]">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                window.dispatchEvent(ev);
              }}
              className="hidden md:inline-flex items-center gap-2 px-3 h-9 rounded-[6px] bg-bg-card border border-rule hover:border-ink-4 transition-colors duration-100 text-[12px] text-ink-3"
            >
              <span>Search…</span>
              <span className="font-mono text-[10px] text-ink-4">⌘K</span>
            </button>

            <Link
              href="/notifications"
              className="relative w-9 h-9 inline-flex items-center justify-center rounded-[6px] bg-bg-card border border-rule hover:border-ink-4 transition-colors duration-100"
              aria-label="Notifications"
            >
              <span className="text-[14px]">○</span>
              {myNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warn text-bg-card font-mono text-[9px] flex items-center justify-center">
                  {myNotifs}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="flex items-center gap-2"
                aria-label="Profile menu"
              >
                <Avatar user={user} size="sm" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-bg-card border border-rule rounded-[8px] shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-rule-soft">
                    <div className="text-[13px] text-ink font-medium">{user.displayName}</div>
                    <div className="text-[12px] text-ink-3 font-mono">{user.email}</div>
                    <div className="mt-2">
                      <RolePill role={user.role} />
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[13px] text-ink-2 hover:bg-rule-soft rounded-[6px]"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleReset}
                    className="w-full text-left px-3 py-2 text-[13px] text-ink-2 hover:bg-rule-soft rounded-[6px]"
                  >
                    Reset demo data
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-[13px] text-danger hover:bg-danger-soft rounded-[6px]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="max-w-[1440px] mx-auto px-8 pt-8 pb-16">{children}</main>
      <ToastViewport />
      <CmdK />
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Moon, Sun } from "lucide-react";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { landingForRole, cn } from "@/lib/utils";
import { Avatar, RolePill } from "@/components/ui";
import { ToastViewport, toast } from "@/components/ui";
import { CmdK } from "@/components/CmdK";
import { QuickCreate } from "@/components/QuickCreate";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { AccessDenied } from "@/components/AccessDenied";
import { pathRequiresCap, can } from "@/lib/permissions";
import { Onboarding } from "@/components/Onboarding";
import { Sidebar } from "@/components/shell/Sidebar";
import type { Role } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAppStore((s) => s.hydrated);
  const user = useCurrentUser();
  const signOut = useAppStore((s) => s.signOut);
  const resetMockData = useAppStore((s) => s.resetMockData);
  const notifications = useAppStore((s) => s.notifications);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const sidebarW = collapsed ? 64 : 240;
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const dispatchMilestoneAtRiskNotifications = useAppStore((s) => s.dispatchMilestoneAtRiskNotifications);

  // PRD § 13.2 / § 9.9: fire milestone_at_risk notifications on every
  // shell hydration. The action is idempotent (dedupes by milestone id).
  useEffect(() => {
    if (!hydrated) return;
    dispatchMilestoneAtRiskNotifications(7);
  }, [hydrated, dispatchMilestoneAtRiskNotifications]);

  // Apply theme to document
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [quickCreate, setQuickCreate] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  // Global keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimer: number | null = null;

    const inEditable = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setQuickCreate(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ",") {
        e.preventDefault();
        navigator.clipboard?.writeText(window.location.href);
        toast("Link copied - current page");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (inEditable(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcuts(true);
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
        window.dispatchEvent(ev);
        return;
      }

      if (e.key === "g" || e.key === "G") {
        gPressed = true;
        if (gTimer) window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }
      if (gPressed) {
        const k = e.key.toLowerCase();
        const map: Record<string, string> = {
          b: "/backlog",
          m: "/me",
          e: "/epics",
          p: "/portfolio",
          n: "/notifications",
        };
        if (map[k]) {
          e.preventDefault();
          gPressed = false;
          router.push(map[k]);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) window.clearTimeout(gTimer);
    };
  }, [router, toggleSidebar]);

  if (!hydrated) return null;
  if (!user) return null;

  const myNotifs = notifications.filter((n) => n.userId === user.id && !n.archived && !n.read).length;

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
      <Sidebar />

      {/* Slim topbar */}
      <header
        className="fixed top-0 right-0 z-20 topbar-blur border-b border-rule h-12 transition-[left] duration-200"
        style={{ left: sidebarW }}
      >
        <div className="h-full px-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
              window.dispatchEvent(ev);
            }}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-[6px] bg-bg-card border border-rule hover:border-ink-4 transition-colors duration-100 text-[12px] text-ink-3 w-72"
          >
            <span>Search tickets, epics, actions…</span>
            <span className="ml-auto font-mono text-[10px] text-ink-4">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-bg-card border border-rule text-ink-3 hover:text-ink hover:border-ink-4 transition-colors duration-100"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/notifications"
              className="relative w-8 h-8 inline-flex items-center justify-center rounded-md bg-bg-card border border-rule text-ink-3 hover:text-ink hover:border-ink-4 transition-colors duration-100"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {myNotifs > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white font-mono text-[9px] flex items-center justify-center font-medium">
                  {myNotifs > 99 ? "99+" : myNotifs}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((s) => !s)}
                className="flex items-center gap-2 px-2 h-8 rounded-[6px] hover:bg-rule-soft transition-colors duration-100"
                aria-label="Profile menu"
              >
                <Avatar user={user} size="xs" />
                <span className="text-[12px] text-ink truncate max-w-[120px]">{user.displayName.split(" ")[0]}</span>
                <span className="text-ink-4 text-[10px]">▾</span>
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
                    href={`/u/${user.handle}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[13px] text-ink-2 hover:bg-rule-soft rounded-[6px]"
                  >
                    My profile
                  </Link>
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

      {/* Main content */}
      <main
        id="main"
        className="pt-12 min-h-screen transition-[margin-left] duration-200"
        style={{ marginLeft: sidebarW }}
      >
        <div className="max-w-[1440px] mx-auto px-8 pt-8 pb-16">
          <RouteGuard pathname={pathname} role={user.role}>
            {children}
          </RouteGuard>
        </div>
      </main>

      <ToastViewport />
      <CmdK />
      <QuickCreate open={quickCreate} onClose={() => setQuickCreate(false)} />
      <ShortcutsHelp open={shortcuts} onClose={() => setShortcuts(false)} />
      <Onboarding />
    </>
  );
}

function RouteGuard({ pathname, role, children }: { pathname: string; role: Role; children: React.ReactNode }) {
  const required = pathRequiresCap(pathname);
  if (!required) return <>{children}</>;
  if (!can(role, required)) {
    return <AccessDenied />;
  }
  return <>{children}</>;
}

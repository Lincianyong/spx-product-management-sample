"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
        toast("Link copied — current page");
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
          b: "/sprint",
          m: "/me",
          e: "/epics",
          t: "/triage",
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
  }, [router]);

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
      <header className="fixed top-0 left-[240px] right-0 z-20 topbar-blur border-b border-rule h-12">
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

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative w-8 h-8 inline-flex items-center justify-center rounded-[6px] bg-bg-card border border-rule hover:border-ink-4 transition-colors duration-100"
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
      <main id="main" className="ml-[240px] pt-12 min-h-screen">
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

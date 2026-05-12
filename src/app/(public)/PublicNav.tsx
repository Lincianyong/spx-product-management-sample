"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/guideline",     label: "Overview" },
  { href: "/guideline-pm",  label: "For PM" },
  { href: "/guideline-eng", label: "For Engineer" },
];

/**
 * Top-nav for the public guideline surface. Renders outside the
 * AppShell - no sidebar, no search header, no onboarding modal. The
 * brand + tab strip on the left; an 'Open the app' CTA on the right.
 */
export function PublicNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 bg-bg-card/95 backdrop-blur border-b border-rule">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center gap-8">
        <Link href="/guideline" className="flex items-center gap-2.5 shrink-0">
          <Image src="/icon.svg" alt="SPX" width={22} height={22} priority />
          <div className="leading-tight">
            <div className="text-[15px] text-ink font-semibold">Cadence</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">User guide</div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 h-9 inline-flex items-center rounded-[6px] text-[13px] transition-colors duration-100",
                  active
                    ? "bg-accent-soft text-ink font-medium"
                    : "text-ink-2 hover:text-ink hover:bg-rule-soft"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/me"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-[6px] bg-accent text-bg-card text-[13px] font-medium hover:bg-accent-deep transition-colors duration-100"
        >
          Open the app →
        </Link>
      </div>
    </header>
  );
}

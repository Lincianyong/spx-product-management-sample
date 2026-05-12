import { PublicNav } from "./PublicNav";

/**
 * Public layout - renders OUTSIDE the (app) AppShell. No sidebar,
 * no auth redirect, no onboarding modal. A docs-style top-nav on
 * top, a constrained centered column for the page body, and a
 * minimal footer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PublicNav />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-rule-soft py-6">
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between text-[12px] text-ink-3">
          <span>SPX Express · AI Engineering · Cadence</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">User guide</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { authenticate, mockAccounts } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import { landingForRole } from "@/lib/utils";
import { seedUsers } from "@/lib/mock-data";
import { SpxLogo } from "@/components/SpxLogo";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function LoginPage() {
  useDocumentTitle("Sign in");
  const router = useRouter();
  const signIn = useAppStore((s) => s.signIn);
  const hydrated = useAppStore((s) => s.hydrated);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && currentUserId) {
      const u = seedUsers.find((x) => x.id === currentUserId);
      if (u) router.replace(landingForRole(u.role));
    }
  }, [hydrated, currentUserId, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = authenticate(email.trim(), password);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    signIn(res.userId);
    const account = mockAccounts.find((a) => a.email === email.trim().toLowerCase());
    if (account) router.replace(landingForRole(account.role));
  };

  const fillSample = (account: typeof mockAccounts[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <main id="main" className="min-h-screen flex">
      {/* Editorial left */}
      <section className="hidden lg:flex flex-col justify-between w-1/2 bg-bg-elevated p-16 border-r border-rule">
        <div>
          <SpxLogo size="md" showExpress />
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 flex items-center gap-3 mt-4">
            <span className="block w-8 h-px bg-rule" />
            <span className="display italic text-ink text-[15px] normal-case tracking-normal">Cadence</span>
            <span>· AI Engineering</span>
          </div>
          <h1 className="display text-display-l text-ink mt-10 leading-[1.05]">
            Plan with <span className="text-accent">conviction</span>.
            <br />
            Ship in <span className="text-accent">cadence</span>.
          </h1>
          <p className="font-body text-body-l text-ink-2 max-w-md mt-6">
            Three altitudes - Epic, Project, Ticket. Three planning stages - picklist, estimation,
            joint commit. One weekly cycle, every team on the same beat.
          </p>
          <Link
            href="/guideline"
            className="inline-flex items-center gap-1.5 mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
          >
            Read the user guide →
          </Link>
        </div>

        <div className="space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Sample accounts · password 12345678
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mockAccounts.map((a) => (
              <button
                key={a.email}
                onClick={() => fillSample(a)}
                className="text-left p-3 rounded-[6px] border border-rule bg-bg-card hover:border-accent transition-colors duration-100"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  {a.role}
                </div>
                <div className="font-body text-[13px] text-ink mt-0.5">{a.displayName}</div>
                <div className="font-mono text-[11px] text-ink-3 mt-0.5">{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Form right */}
      <section className="flex-1 flex flex-col justify-center items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">
              Sign in
            </div>
            <h2 className="display text-display-m text-ink">Welcome back.</h2>
            <p className="text-[14px] text-ink-3 mt-2">Use any sample account from the left.</p>
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@spxexpress.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            error={error ?? undefined}
          />

          <Button type="submit" variant="primary" className="w-full">
            Continue →
          </Button>

          <p className="text-[12px] text-ink-3 text-center font-mono">
            Demo build · no real auth · state in localStorage
          </p>
        </form>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/store";
import { Button, RolePill } from "@/components/ui";
import { landingForRole } from "@/lib/utils";

interface Props {
  reason?: string;
}

export function AccessDenied({ reason }: Props) {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3 flex items-center justify-center gap-3">
        <span className="block w-8 h-px bg-rule" />
        <span>403 · Access</span>
      </div>
      <h1 className="display text-display-l text-ink mb-4">Not your <em className="text-accent">surface</em>.</h1>
      <p className="text-[15px] text-ink-2 mb-2">
        {reason ?? "Your role doesn't have access to this page."}
      </p>
      <div className="flex items-center justify-center gap-2 my-4">
        <span className="font-mono text-[12px] text-ink-3">Logged in as</span>
        <RolePill role={user.role} />
        <span className="text-[13px] text-ink">{user.displayName}</span>
      </div>
      <div className="flex items-center justify-center gap-3 mt-6">
        <Link href={landingForRole(user.role)}>
          <Button variant="primary" size="sm">Go to your home →</Button>
        </Link>
      </div>
    </div>
  );
}

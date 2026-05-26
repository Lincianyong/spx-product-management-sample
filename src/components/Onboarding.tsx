"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, RolePill } from "@/components/ui";
import { useCurrentUser } from "@/lib/store";
import { landingForRole, roleLabel } from "@/lib/utils";

const SEEN_KEY = "cadence:onboarded";

// PRD § 9.1 — role-specific onboarding for the waterfall edition.
const STEPS_BY_ROLE: Record<string, { title: string; body: string }[]> = {
  pm: [
    { title: "Epic Board is your home.", body: "Every Epic in the workspace sits on the board. Five view modes - Kanban, List, Table, Timeline, Backlog - shift altitude without leaving the surface." },
    { title: "Define waterfall phases per Epic.", body: "Open any Epic → Milestones tab → Add phase. Typical waterfall sequence: Requirements → Design → Build → Test → Deploy. Each phase carries a target date and exit criteria; the next phase unlocks when the current one is marked complete." },
    { title: "Health is computed - no manual entry.", body: "deviation = time-burn − progress-burn. Hover any health pill for the math. At T-7 days before an incomplete milestone targetDate, Cadence fires a milestone_at_risk notification to you automatically." },
  ],
  engineer: [
    { title: "My Work is your home.", body: "Four panels show your day: assigned Bugs, queued Bugs, Bugs you're blocking on others, and Bugs blocked. Mentions awaiting reply surface at the top." },
    { title: "Bug status flows in one direction.", body: "scheduled → in_progress → review → verifying → verified. Acceptance Criteria gate the move to verified - check every box first. Mark-blocked requires a reason; the audit trail records it." },
    { title: "Epic context, one click away.", body: "Every Bug's header carries a breadcrumb to its parent Epic. Click it to read the thesis, see sibling Bugs, and check the current milestone phase before you ship." },
  ],
};

export function Onboarding() {
  const user = useCurrentUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const seen = typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) : null;
    const key = `${user.id}:${user.role}`;
    if (!seen?.includes(key)) {
      setOpen(true);
      setStep(0);
    }
  }, [user]);

  if (!user) return null;
  const steps = STEPS_BY_ROLE[user.role] ?? STEPS_BY_ROLE.engineer;
  const current = steps[step];
  if (!current) return null;

  const finish = () => {
    const seen = typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) ?? "" : "";
    const key = `${user.id}:${user.role}`;
    if (typeof window !== "undefined") localStorage.setItem(SEEN_KEY, `${seen};${key}`);
    setOpen(false);
    setStep(0);
    router.push(landingForRole(user.role));
  };

  const skip = () => finish();
  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <Modal open={open} onClose={skip} size="md">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-2 flex items-center justify-between">
          <span>Step {step + 1} of {steps.length}</span>
          <RolePill role={user.role} />
        </div>
        <h2 className="display text-display-m text-ink mb-3">{current.title}</h2>
        <p className="text-[15px] text-ink-2 leading-relaxed mb-6">{current.body}</p>

        <div className="flex items-center gap-1 mb-6">
          {steps.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-rule"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={skip} className="text-[12px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink">Skip</button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="secondary" size="sm" onClick={prev}>Back</Button>}
            <Button variant="primary" size="sm" onClick={next}>
              {step === steps.length - 1 ? `Go to ${roleLabel[user.role]} home →` : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

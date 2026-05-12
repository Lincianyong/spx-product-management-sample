"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, RolePill } from "@/components/ui";
import { useCurrentUser } from "@/lib/store";
import { landingForRole, roleLabel } from "@/lib/utils";

const SEEN_KEY = "cadence:onboarded";

const STEPS_BY_ROLE: Record<string, { title: string; body: string }[]> = {
  pm: [
    { title: "You're the PM.", body: "Epic Board is your home. New work lands directly in Backlog - no triage step." },
    { title: "Three planning stages.", body: "Stage 4a (Monday, alone) you Picklist. 4b (Tuesday, with engineers) they Estimate. 4c (Tuesday, together) you Commit." },
    { title: "Health is computed.", body: "Deviation = time-burn minus progress-burn. Hover any health pill to see the math. AI suggestions show a confidence chip." },
  ],
  engineer: [
    { title: "Welcome, Engineer.", body: "My Work is your home. Two work lanes (This sprint · In queue) and a collapsible Dependencies strip." },
    { title: "Drag on Sprint Board.", body: "Move your own cards across columns. AC items gate Done - check every box before the column flips." },
    { title: "AI is evidence, not author.", body: "Story-point suggestions show confidence + reasoning. Click ✦ to accept, ignore otherwise." },
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

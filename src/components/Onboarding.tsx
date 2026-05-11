"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, RolePill } from "@/components/ui";
import { useCurrentUser } from "@/lib/store";
import { landingForRole, roleLabel } from "@/lib/utils";

const SEEN_KEY = "cadence:onboarded";

const STEPS_BY_ROLE: Record<string, { title: string; body: string }[]> = {
  pm: [
    { title: "You're the PM.", body: "Albert Halim. You'll see Epic Board on your home. Triage is your daily 15-minute sweep — confirm, decline, dedupe." },
    { title: "Three planning stages.", body: "Stage 4a (Monday, alone) you Picklist. 4b (Tuesday, with engineers) they Estimate. 4c (Tuesday, together) you Commit." },
    { title: "Health is computed.", body: "Deviation = time-burn minus progress-burn. Hover any health pill to see the math. AI suggestions show a confidence chip." },
  ],
  leadership: [
    { title: "You're Leadership.", body: "Head of AI view. Portfolio Health is your home — health distribution, on-time trend, top blockers, allocation by pod." },
    { title: "Comment at the Epic level.", body: "Your comments outlive any Project. Use the Epic Detail comments tab to push back on conviction." },
    { title: "Read-mostly.", body: "You can't commit sprints or triage. You can watch and comment on every Epic." },
  ],
  engineer: [
    { title: "Welcome, Andre.", body: "My Work is your home. Four panels: This Sprint, Up Next, You're Blocking, Blocking You." },
    { title: "Drag on Sprint Board.", body: "Move your own cards across columns. AC items gate Done — check every box before the column flips." },
    { title: "AI is evidence, not author.", body: "Story-point suggestions show confidence + reasoning. Click ✦ to accept, ignore otherwise." },
  ],
  guest: [
    { title: "You're a guest.", body: "Ronaldo from Ops. You can file bug reports. You won't see internal planning surfaces." },
    { title: "Three required fields.", body: "Repro, Expected, Actual. The clearer the repro, the faster a fix lands." },
    { title: "We'll loop back.", body: "PM triages within 4h (P0), 24h (P1), or 1 week (P2). You'll get a Lark ping when accepted or declined." },
  ],
  em: [
    { title: "You're an EM.", body: "Sprint Board (pod-filtered) is your home. You facilitate Stage 4b and own capacity in 4c." },
    { title: "Heatmap matters.", body: "Workload Heatmap shows 12 weeks forward. Plan around the red." },
    { title: "Capacity ≤ 125%.", body: "G6 sprint-commit gate blocks pods above 125% load. Soft warning at >100%." },
  ],
  designer: [
    { title: "Welcome, Designer.", body: "My Work is your home. Use the design-task template when creating tickets." },
    { title: "Same flow as engineers.", body: "Stage 4b you estimate; 4c you take assignments. Status flow same as engineering tickets." },
    { title: "AC is first-class.", body: "Every Done requires every AC checked. Use them to clarify deliverables up-front." },
  ],
  admin: [
    { title: "You're Admin.", body: "Full surface access. Settings → Roles, Integrations, Notifications are yours to configure." },
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

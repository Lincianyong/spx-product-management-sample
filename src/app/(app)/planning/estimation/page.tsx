"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PlanningNav } from "@/components/PlanningNav";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { AiTag, Button, PriorityPill, TypePill, toast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { can } from "@/lib/permissions";
import { LaneBanner } from "@/components/LaneBanner";

const CONCERN_FLAGS = ["no repro", "needs decomposition", "blocked", "spike first"];

export default function EstimationPage() {
  useDocumentTitle("Estimation · Stage 4b");
  const tickets = useAppStore((s) => s.tickets);
  const projects = useAppStore((s) => s.projects);
  const setTicketField = useAppStore((s) => s.setTicketField);
  const user = useCurrentUser();
  const router = useRouter();
  const canEstimate = can(user?.role, "set_points");

  const picked = useMemo(
    () => tickets.filter((t) => t.pickedForSprint).sort((a, b) => (a.picklistRank ?? 99) - (b.picklistRank ?? 99)),
    [tickets]
  );

  const allEstimated = picked.every((t) => t.storyPoints != null);

  const setPoints = (ticketId: string, value: string) => {
    if (!canEstimate) {
      toast("Only Engineers / EM can set story points.", { kind: "error" });
      return;
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 21) {
      setTicketField(ticketId, { storyPoints: null }, user?.id ?? "");
    } else {
      setTicketField(ticketId, { storyPoints: num }, user?.id ?? "");
    }
  };

  const toggleFlag = (ticketId: string, flag: string) => {
    if (!canEstimate) {
      toast("Only Engineers / EM can flag concerns.", { kind: "error" });
      return;
    }
    const t = tickets.find((x) => x.id === ticketId);
    if (!t) return;
    const flags = t.concernFlags.includes(flag) ? t.concernFlags.filter((f) => f !== flag) : [...t.concernFlags, flag];
    setTicketField(ticketId, { concernFlags: flags }, user?.id ?? "");
  };

  const hand = () => {
    if (!canEstimate) {
      toast("Only Engineers / EM can hand off to Joint Planning.", { kind: "error" });
      return;
    }
    if (!allEstimated) {
      toast("All picked tickets need a points estimate before handing off.", { kind: "error" });
      return;
    }
    toast("Estimates locked. Handing to Joint Planning →", { kind: "success" });
    router.push("/planning/joint");
  };

  return (
    <div>
      <PageHeader
        eyebrow="S-05 · Stage 4b"
        title={
          <>
            <em className="text-accent">Size</em> the work.
          </>
        }
        lede="Engineers and EM, together. AI suggests a number with reasoning. You decide. Flag what worries you."
      />

      <PlanningNav />

      {!canEstimate && (
        <LaneBanner
          lane="Eng"
          surface="Estimation"
          ownerCopy="Open Picklist (4a) or Joint Planning (4c) for your lane."
        />
      )}

      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          onClick={hand}
          disabled={!allEstimated || !canEstimate}
          title={!canEstimate ? "Only Engineers / EM can hand off" : undefined}
        >
          Hand to Joint Planning →
        </Button>
      </div>

      <div className="space-y-3">
        {picked.map((t, idx) => {
          const proj = projects.find((p) => p.id === t.projectId);
          const tooBig = (t.storyPoints ?? 0) >= 13;
          return (
            <div key={t.id} className="bg-bg-card border border-rule rounded-[8px] p-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[12px] text-ink-3">#{idx + 1}</span>
                    <TypePill t={t.type} />
                    <PriorityPill p={t.priority} />
                    <span className="font-mono text-[12px] text-ink-3">{t.key}</span>
                    {proj && <span className="font-mono text-[11px] text-ink-4">· {proj.key}</span>}
                  </div>
                  <h3 className="text-[15px] text-ink font-medium mb-2">{t.title}</h3>
                  <p className="text-[13px] text-ink-3 line-clamp-2">{t.description}</p>

                  <div className="flex items-center flex-wrap gap-2 mt-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Concerns</span>
                    {CONCERN_FLAGS.map((f) => (
                      <button
                        key={f}
                        onClick={() => toggleFlag(t.id, f)}
                        disabled={!canEstimate}
                        title={!canEstimate ? "Only Engineers / EM can flag concerns" : undefined}
                        className={cn(
                          "px-2 h-6 rounded-[4px] text-[11px] font-mono uppercase tracking-[0.04em] border",
                          t.concernFlags.includes(f)
                            ? "bg-warn-soft text-warn border-warn-soft"
                            : "bg-bg-card text-ink-3 border-rule hover:border-ink-4",
                          !canEstimate && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  <label className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Points</span>
                    <input
                      type="number"
                      min={1}
                      max={21}
                      value={t.storyPoints ?? ""}
                      onChange={(e) => setPoints(t.id, e.target.value)}
                      disabled={!canEstimate}
                      title={!canEstimate ? "Only Engineers / EM can set points" : undefined}
                      className="w-16 h-9 px-2 text-center font-mono text-[14px] rounded-[6px] border border-rule bg-bg-card disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </label>
                  {t.aiSuggestedPoints && canEstimate && (
                    <AiTag
                      label={String(t.aiSuggestedPoints.value)}
                      confidence={t.aiSuggestedPoints.confidence}
                      reasoning={t.aiSuggestedPoints.reasoning}
                      onAccept={() =>
                        setTicketField(t.id, { storyPoints: t.aiSuggestedPoints!.value }, user?.id ?? "")
                      }
                    />
                  )}
                  {tooBig && (
                    <div className="text-[11px] text-warn font-mono uppercase tracking-[0.06em]">
                      ≥ 13 · Decompose?
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { toast } from "@/components/ui";
import { statusLabel } from "@/lib/utils";

const STORAGE_KEY = "cadence:realtime-sim";

function useRealtimeSim() {
  const flashTicket = useAppStore((s) => s.flashTicket);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEY);
    setEnabled(saved === "on");
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | null = null;
    const tick = () => {
      const state = useAppStore.getState();
      const candidates = state.tickets.filter(
        (t) => (t.status === "in_progress" || t.status === "review" || t.status === "scheduled") && t.assigneeId !== state.currentUserId
      );
      if (candidates.length === 0) {
        timer = window.setTimeout(tick, 60000);
        return;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const actor = state.users.find((u) => u.id === pick.assigneeId);
      flashTicket(pick.id);
      toast(
        `${actor?.displayName ?? "Someone"} touched ${pick.key} · ${statusLabel[pick.status]}`,
        { kind: "info", ttl: 3500 }
      );
      const next = 30000 + Math.random() * 60000;
      timer = window.setTimeout(tick, next);
    };
    timer = window.setTimeout(tick, 15000);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, flashTicket]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    toast(next ? "Realtime sim on — expect random card flashes" : "Realtime sim off", { kind: "info" });
  };

  return { enabled, toggle };
}

/** Sidebar-bottom variant — full-width row with label + dot indicator. */
export function RealtimeSimToggle() {
  const { enabled, toggle } = useRealtimeSim();
  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-[12px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:text-ink hover:bg-rule-soft transition-colors duration-100"
      title="Toggle realtime simulation — fires occasional card flashes simulating other users"
    >
      <span className={`w-2 h-2 rounded-full ${enabled ? "bg-ok animate-pulse" : "bg-rule"}`} />
      <span className="flex-1 text-left">Realtime sim</span>
      <span className="text-ink-4">{enabled ? "on" : "off"}</span>
    </button>
  );
}

/** Backwards-compat: the old floating pill. No longer mounted but kept for completeness. */
export function RealtimeSim() {
  const { enabled, toggle } = useRealtimeSim();
  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-rule shadow-sm text-[11px] font-mono uppercase tracking-[0.06em] text-ink-3 hover:border-accent hover:text-ink"
      title="Toggle realtime simulation"
    >
      <span className={`w-2 h-2 rounded-full ${enabled ? "bg-ok animate-pulse" : "bg-rule"}`} />
      Realtime sim {enabled ? "on" : "off"}
    </button>
  );
}

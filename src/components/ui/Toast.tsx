"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ToastEntry {
  id: string;
  body: string;
  kind: "success" | "error" | "info";
  undo?: () => void;
  ttl: number;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (t: Omit<ToastEntry, "id" | "ttl"> & { ttl?: number }) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...t, id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ttl: t.ttl ?? 3000 },
      ],
    })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (body: string, opts?: { kind?: "success" | "error" | "info"; undo?: () => void; ttl?: number }) =>
  useToastStore.getState().push({ body, kind: opts?.kind ?? "success", undo: opts?.undo, ttl: opts?.ttl });

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} entry={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ entry, onClose }: { entry: ToastEntry; onClose: () => void }) {
  useEffect(() => {
    if (entry.kind === "error") return; // errors persist
    const id = setTimeout(onClose, entry.ttl);
    return () => clearTimeout(id);
  }, [entry, onClose]);

  return (
    <div
      role="status"
      className={cn(
        "min-w-[260px] max-w-md px-4 py-3 rounded-[8px] shadow-lg border bg-bg-card text-[13px] flex items-center gap-3 animate-slide-up",
        entry.kind === "success" && "border-l-4 border-l-ok",
        entry.kind === "error" && "border-l-4 border-l-danger",
        entry.kind === "info" && "border-l-4 border-l-accent"
      )}
    >
      <div className="flex-1 text-ink">{entry.body}</div>
      {entry.undo && (
        <button
          type="button"
          onClick={() => {
            entry.undo!();
            onClose();
          }}
          className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep"
        >
          Undo
        </button>
      )}
      <button onClick={onClose} className="text-ink-4 hover:text-ink-2 text-[14px]">✕</button>
    </div>
  );
}

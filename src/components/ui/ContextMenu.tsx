"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  shortcut?: string;
  danger?: boolean;
  divider?: boolean;
}

interface UseContextMenuReturn {
  open: boolean;
  position: { x: number; y: number };
  bind: {
    onContextMenu: (e: React.MouseEvent) => void;
  };
  close: () => void;
}

export function useContextMenu(): UseContextMenuReturn {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  return {
    open,
    position,
    bind: {
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        setPosition({ x: e.clientX, y: e.clientY });
        setOpen(true);
      },
    },
    close: () => setOpen(false),
  };
}

interface Props {
  open: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, position, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Edge handling - flip if near right/bottom
  const w = 220;
  const h = items.length * 36 + 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = Math.min(position.x, vw - w - 8);
  const y = Math.min(position.y, vh - h - 8);

  return (
    <div
      ref={ref}
      style={{ left: x, top: y, width: w }}
      className="fixed z-[80] bg-bg-card border border-rule rounded-[8px] shadow-lg p-1 animate-slide-up"
      role="menu"
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} className="h-px bg-rule-soft my-1" aria-hidden />;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              item.onSelect();
              onClose();
            }}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[6px] text-[13px]",
              "transition-colors duration-100",
              item.danger
                ? "text-danger hover:bg-danger-soft"
                : "text-ink-2 hover:bg-rule-soft hover:text-ink"
            )}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="font-mono text-[10px] text-ink-4">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
}

const sizeCls = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({ open, onClose, children, title, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-ink/40">
      <div
        onClick={onClose}
        className="absolute inset-0"
        aria-hidden
      />
      <div className={cn("relative bg-bg-card rounded-[8px] shadow-lg w-full mx-4 animate-slide-up", sizeCls[size])}>
        {title && (
          <div className="px-6 py-4 border-b border-rule">
            <h2 className="display text-[20px] text-ink">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function SlideOver({ open, onClose, children, widthClass = "w-[640px]" }: { open: boolean; onClose: () => void; children: React.ReactNode; widthClass?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-ink/30" aria-hidden />
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 bg-bg-card border-l border-rule shadow-lg overflow-y-auto animate-slide-over",
          widthClass
        )}
      >
        {children}
      </div>
    </div>
  );
}

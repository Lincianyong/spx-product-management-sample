"use client";

import { Modal } from "@/components/ui";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GROUPS = [
  {
    title: "Global",
    items: [
      ["⌘K", "Open command palette"],
      ["⌘N", "Quick Create ticket"],
      ["/", "Focus search (Cmd-K)"],
      ["⌘⇧,", "Copy link to current entity"],
      ["⌘\\", "Collapse / expand sidebar"],
      ["?", "Open this shortcuts help"],
      ["Esc", "Close any overlay"],
    ],
  },
  {
    title: "Navigation chords (press G, then…)",
    items: [
      ["G B", "Sprint Board"],
      ["G M", "My Work"],
      ["G E", "Epic Board"],
      ["G P", "Portfolio Health"],
      ["G N", "Notifications"],
    ],
  },
  {
    title: "On any ticket card",
    items: [
      ["Right-click", "Context menu (move, copy link, open)"],
      ["Hover", "Quick action chips at bottom"],
      ["Click", "Open slide-over"],
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-2">{g.title}</div>
            <div className="space-y-1">
              {g.items.map(([keys, label]) => (
                <div key={keys} className="flex items-center justify-between py-1.5 border-b border-rule-soft last:border-0">
                  <span className="text-[13px] text-ink-2">{label}</span>
                  <kbd className="font-mono text-[11px] text-ink-2 px-2 py-0.5 rounded-[4px] bg-bg-elevated border border-rule">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}

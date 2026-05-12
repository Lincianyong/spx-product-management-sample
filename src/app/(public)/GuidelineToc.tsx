"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
  /** Group label rendered above this item (and any others sharing it). */
  group?: string;
}

/**
 * GuidelineToc - the sticky left rail on each guideline page. Lists
 * the page's section headings as anchor links and highlights the
 * section currently in the viewport via IntersectionObserver.
 *
 * Sections must render with id={item.id} and a `scroll-mt-20` (or
 * larger) utility so the sticky public-nav doesn't cover the heading
 * after a click.
 */
export function GuidelineToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targets = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // Track which section's top has crossed roughly 30% of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the visible region.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 1],
      }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto pr-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-3">On this page</div>
      <nav>
        <ul className="space-y-0.5">
          {items.map((it, i) => {
            const showGroup =
              it.group && (i === 0 || items[i - 1]?.group !== it.group);
            const isActive = it.id === active;
            return (
              <li key={it.id}>
                {showGroup && (
                  <div
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mt-3 first:mt-0 mb-1"
                    )}
                  >
                    {it.group}
                  </div>
                )}
                <a
                  href={`#${it.id}`}
                  className={cn(
                    "block px-2.5 py-1 rounded-[4px] text-[12px] leading-snug transition-colors duration-100 border-l-2",
                    isActive
                      ? "bg-accent-soft text-ink border-l-accent font-medium"
                      : "text-ink-3 border-l-transparent hover:text-ink hover:bg-rule-soft"
                  )}
                >
                  {it.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

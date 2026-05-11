"use client";

import { useEffect } from "react";

const SUFFIX = "Cadence";

/**
 * Sets document.title with the Cadence suffix.
 * Pass `null` to skip (e.g., loading states).
 *
 * Examples:
 *   useDocumentTitle("Sprint Board · W20")  // → "Sprint Board · W20 · Cadence"
 *   useDocumentTitle("CDN-3504 · Drift detection on retrain pipeline")
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!title) return;
    const prev = document.title;
    document.title = title.includes(SUFFIX) ? title : `${title} · ${SUFFIX}`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

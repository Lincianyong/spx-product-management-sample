import { CycleBar } from "@/components/CycleBar";

/**
 * Shared layout for the entire sprint-cycle journey:
 *   /planning + /planning/picklist + /planning/estimation + /planning/joint
 *   /sprint   + /sprint-close
 *
 * The CycleBar is always at the top so a user navigating between stages
 * keeps their context. Each stage's existing page body renders below.
 *
 * Files literally live under (cycle)/ but the URLs are unchanged — Next's
 * route groups don't affect the pathname.
 */
export default function CycleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CycleBar />
      {children}
    </div>
  );
}

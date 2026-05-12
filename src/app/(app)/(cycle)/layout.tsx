import { CycleBar } from "@/components/CycleBar";

/**
 * Shared layout for the planning module — the four CycleBar stages:
 *   /planning + /planning/picklist + /planning/estimation + /planning/joint
 *
 * /sprint and /sprint-close moved out of this group; they live at the
 * top level under (app)/ and don't render the CycleBar. Sprint Board
 * and Sprint Close each get their own sidebar entry instead.
 *
 * The CycleBar is always at the top so a user navigating between
 * planning stages keeps their context. Each stage's page body renders
 * below. Files literally live under (cycle)/ but the URLs are
 * unchanged — Next's route groups don't affect the pathname.
 */
export default function CycleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <CycleBar />
      {children}
    </div>
  );
}

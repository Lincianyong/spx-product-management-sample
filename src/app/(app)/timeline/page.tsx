"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { EpicSlideOver } from "@/components/epics/EpicSlideOver";
import {
  GanttView,
  MonthView,
  SwimlaneView,
  TimelineModeStrip,
  type TimelineMode,
} from "@/components/epics/TimelineViews";

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-ink-3">Loading…</div>}>
      <TimelineInner />
    </Suspense>
  );
}

function TimelineInner() {
  useDocumentTitle("Timeline");
  const router = useRouter();
  const params = useSearchParams();
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const sprints = useAppStore((s) => s.sprints);
  const users = useAppStore((s) => s.users);
  const initialMode = (params.get("view") as TimelineMode) ?? "gantt";
  const [mode, setMode] = useState<TimelineMode>(initialMode);
  const [openEpicKey, setOpenEpicKey] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(params);
    q.set("view", mode);
    router.replace(`/timeline?${q.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div>
      <PageHeader
        eyebrow="S-15 · Timeline"
        title={
          <>
            The <em className="text-accent">arc</em> of the quarter.
          </>
        }
        lede="Three lenses on the same Epics. Gantt for overlap, Month for this-week density, Swimlane for capacity."
        actions={<TimelineModeStrip mode={mode} onChange={setMode} />}
      />

      {mode === "gantt" && <GanttView epics={epics} onOpenEpic={setOpenEpicKey} />}
      {mode === "month" && <MonthView epics={epics} projects={projects} sprints={sprints} onOpenEpic={setOpenEpicKey} />}
      {mode === "swimlane" && <SwimlaneView epics={epics} projects={projects} users={users} onOpenEpic={setOpenEpicKey} />}

      <EpicSlideOver epicKey={openEpicKey} onClose={() => setOpenEpicKey(null)} />
    </div>
  );
}

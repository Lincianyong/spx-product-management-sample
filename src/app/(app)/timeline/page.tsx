"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Avatar, HealthPill, toast } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Epic } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type Zoom = "week" | "month" | "quarter";
type RangePreset = "auto" | "1m" | "3m" | "6m" | "12m" | "custom";

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export default function TimelinePage() {
  useDocumentTitle("Timeline");
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const users = useAppStore((s) => s.users);
  const user = useCurrentUser();
  const [zoom, setZoom] = useState<Zoom>("month");
  const [rangePreset, setRangePreset] = useState<RangePreset>("auto");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);
  const laneRef = useRef<HTMLDivElement>(null);

  // Date range derived from preset + epics
  const { start, end } = useMemo(() => {
    const allDates = epics.flatMap((e) => [new Date(e.startDate).getTime(), new Date(e.targetEndDate).getTime()]);
    const epicMin = allDates.length ? Math.min(...allDates) : Date.now();
    const epicMax = allDates.length ? Math.max(...allDates) : Date.now() + 90 * 86400000;
    if (rangePreset === "auto") return { start: epicMin, end: epicMax };
    if (rangePreset === "custom") {
      const cf = customFrom ? new Date(customFrom).getTime() : epicMin;
      const ct = customTo ? new Date(customTo).getTime() : epicMax;
      return { start: Math.min(cf, ct), end: Math.max(cf, ct) };
    }
    const months = rangePreset === "1m" ? 1 : rangePreset === "3m" ? 3 : rangePreset === "6m" ? 6 : 12;
    const todayTs = Date.now();
    return { start: todayTs - months * 15 * 86400000, end: todayTs + months * 15 * 86400000 };
  }, [epics, rangePreset, customFrom, customTo]);

  const range = end - start;
  const today = Date.now();

  // Initialize custom inputs from current range when entering custom mode
  const onPresetChange = (next: RangePreset) => {
    if (next === "custom" && !customFrom) {
      setCustomFrom(isoDate(start));
      setCustomTo(isoDate(end));
    }
    setRangePreset(next);
  };

  const visibleEpics = epics.filter((e) => {
    const es = new Date(e.startDate).getTime();
    const ee = new Date(e.targetEndDate).getTime();
    return ee >= start && es <= end;
  });

  // Dependency arrows derived from Project linked_work edges aggregated to Epic level
  const dependencies = useMemo(() => {
    const deps: { from: Epic; to: Epic }[] = [];
    for (const proj of projects) {
      // Treat target_end_date alignment: not used explicitly here. We synthesize dependencies
      // by walking the Project.epicId graph: if a Project depends on another Project's tickets,
      // we generate Epic→Epic edges only when the Epic ids differ.
      // For demo purposes, derive deps from ticket linked_work edges that cross Epics.
      const epicId = proj.epicId;
      const tickets = useAppStore.getState().tickets.filter((t) => t.projectId === proj.id);
      for (const t of tickets) {
        for (const edge of t.linkedWork) {
          if (edge.type !== "blocked_by") continue;
          const other = useAppStore.getState().tickets.find((x) => x.key === edge.ticketKey);
          if (!other) continue;
          const otherProj = useAppStore.getState().projects.find((p) => p.id === other.projectId);
          const otherEpicId = otherProj?.epicId;
          if (!otherEpicId || otherEpicId === epicId) continue;
          const fromEpic = epics.find((e) => e.id === otherEpicId);
          const toEpic = epics.find((e) => e.id === epicId);
          if (fromEpic && toEpic && !deps.some((d) => d.from.id === fromEpic.id && d.to.id === toEpic.id)) {
            deps.push({ from: fromEpic, to: toEpic });
          }
        }
      }
    }
    return deps;
  }, [projects, epics]);

  // Tick marks based on zoom
  const ticks = useMemo(() => {
    const arr: { date: Date; label: string }[] = [];
    const startD = new Date(start);
    if (zoom === "week") {
      for (let d = new Date(startD); d.getTime() <= end; d.setDate(d.getDate() + 7)) {
        arr.push({ date: new Date(d), label: `W${weekNum(d)}` });
      }
    } else if (zoom === "month") {
      const d = new Date(startD.getFullYear(), startD.getMonth(), 1);
      while (d.getTime() <= end) {
        arr.push({ date: new Date(d), label: d.toLocaleDateString("en-US", { month: "short" }) });
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      const d = new Date(startD.getFullYear(), Math.floor(startD.getMonth() / 3) * 3, 1);
      while (d.getTime() <= end) {
        const q = Math.floor(d.getMonth() / 3) + 1;
        arr.push({ date: new Date(d), label: `Q${q} ${d.getFullYear()}` });
        d.setMonth(d.getMonth() + 3);
      }
    }
    return arr;
  }, [start, end, zoom]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const rect = laneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.movementX;
    const dxFrac = dx / rect.width;
    const dxDays = Math.round((dxFrac * range) / 86400000);
    if (dxDays !== 0) setDragOffsetDays((v) => v + dxDays);
  };

  const onMouseUp = () => {
    if (!draggingId) return;
    if (dragOffsetDays !== 0) {
      const ep = epics.find((e) => e.id === draggingId);
      if (ep) {
        const newStart = new Date(new Date(ep.startDate).getTime() + dragOffsetDays * 86400000).toISOString().slice(0, 10);
        const newEnd = new Date(new Date(ep.targetEndDate).getTime() + dragOffsetDays * 86400000).toISOString().slice(0, 10);
        useAppStore.setState((s) => ({
          epics: s.epics.map((e) => (e.id === ep.id ? { ...e, startDate: newStart, targetEndDate: newEnd } : e)),
        }));
        toast(`Rescheduled ${ep.key} by ${dragOffsetDays > 0 ? "+" : ""}${dragOffsetDays}d`);
      }
    }
    setDraggingId(null);
    setDragOffsetDays(0);
  };

  return (
    <div onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <PageHeader
        eyebrow="S-15 · Timeline"
        title={
          <>
            The <em className="text-accent">arc</em> of the quarter.
          </>
        }
        lede="Epics as rows, time horizontal. Drag a bar to reschedule. Pick a custom date range to focus."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mr-1">Zoom</span>
              {(["week", "month", "quarter"] as Zoom[]).map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={cn(
                    "px-2.5 h-8 text-[11px] font-mono uppercase rounded-[6px] border transition-colors duration-100",
                    zoom === z ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
                  )}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Range bar */}
      <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Range</span>
        <div className="flex items-center gap-1">
          {([
            { v: "auto", label: "Auto" },
            { v: "1m", label: "1M" },
            { v: "3m", label: "3M" },
            { v: "6m", label: "6M" },
            { v: "12m", label: "12M" },
            { v: "custom", label: "Custom" },
          ] as { v: RangePreset; label: string }[]).map((o) => (
            <button
              key={o.v}
              onClick={() => onPresetChange(o.v)}
              className={cn(
                "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border transition-colors duration-100",
                rangePreset === o.v ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {rangePreset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <label className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 px-2 text-[12px] rounded-[6px] border border-rule bg-bg-card"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 px-2 text-[12px] rounded-[6px] border border-rule bg-bg-card"
              />
            </label>
          </div>
        )}
        <span className="ml-auto font-mono text-[11px] text-ink-3">
          {formatDate(isoDate(start))} – {formatDate(isoDate(end))} · {visibleEpics.length} of {epics.length} Epics in range
        </span>
      </div>

      <div className="bg-bg-card border border-rule rounded-[8px] p-6 relative overflow-hidden">
        {/* Today line */}
        <div
          className="absolute top-6 bottom-6 border-l-2 border-warn pointer-events-none"
          style={{ left: `calc(220px + ${((today - start) / range) * 100}%)`, transform: "translateX(220px)" }}
        />
        <div className="grid grid-cols-[220px_1fr] gap-4 mb-3">
          <span></span>
          <div className="relative h-5 flex">
            {ticks.map((tk, i) => {
              const left = ((tk.date.getTime() - start) / range) * 100;
              return (
                <span
                  key={i}
                  style={{ left: `${left}%` }}
                  className="absolute top-0 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 border-l border-rule-soft pl-1 h-5"
                >
                  {tk.label}
                </span>
              );
            })}
          </div>
        </div>

        <div ref={laneRef} className="space-y-3 relative">
          {visibleEpics.length === 0 && (
            <p className="text-[13px] italic text-ink-3 py-6 text-center">No Epics fall in this date range. Widen the range or pick Auto.</p>
          )}
          {visibleEpics.map((e) => {
            const isDragged = draggingId === e.id;
            const offset = isDragged ? (dragOffsetDays / (range / 86400000)) * 100 : 0;
            const left = ((new Date(e.startDate).getTime() - start) / range) * 100 + offset;
            const width = ((new Date(e.targetEndDate).getTime() - new Date(e.startDate).getTime()) / range) * 100;
            const barColor = e.health === "on_track" ? "bg-ok" : e.health === "at_risk" ? "bg-warn" : e.health === "blocked" ? "bg-danger" : "bg-neutral";
            return (
              <div key={e.id} data-epic-id={e.id} className="grid grid-cols-[220px_1fr] items-center gap-4">
                <Link href={`/e/${e.key}`} className="text-[13px] text-ink hover:text-accent underline-offset-2 hover:underline truncate">
                  <span className="font-mono text-[11px] text-ink-3 mr-2">{e.key}</span>
                  {e.title}
                </Link>
                <div className="relative h-6">
                  <button
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      setDraggingId(e.id);
                      setDragOffsetDays(0);
                    }}
                    className={cn(
                      "absolute top-0 bottom-0 rounded-[4px] opacity-90 flex items-center px-2 cursor-grab active:cursor-grabbing",
                      barColor,
                      isDragged && "ring-2 ring-accent shadow-lg"
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em] truncate">{e.quarter}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dependency arrows — SVG overlay */}
          {dependencies.length > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ marginLeft: "220px", width: "calc(100% - 220px)" }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-4)" />
                </marker>
              </defs>
              {dependencies.map((d, i) => {
                const fromX = ((new Date(d.from.targetEndDate).getTime() - start) / range) * 100;
                const toX = ((new Date(d.to.startDate).getTime() - start) / range) * 100;
                const fromY = epics.findIndex((e) => e.id === d.from.id) * 36 + 12;
                const toY = epics.findIndex((e) => e.id === d.to.id) * 36 + 12;
                return (
                  <line
                    key={i}
                    x1={`${fromX}%`}
                    y1={fromY}
                    x2={`${toX}%`}
                    y2={toY}
                    stroke="var(--ink-4)"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>
          )}
        </div>

        <div className="grid grid-cols-[220px_1fr] mt-6 text-[11px] font-mono text-ink-3">
          <span></span>
          <div className="flex justify-between">
            <span>{formatDate(new Date(start).toISOString())}</span>
            <span>{formatDate(new Date(end).toISOString())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function weekNum(d: Date) {
  const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

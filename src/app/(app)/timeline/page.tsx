"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore } from "@/lib/store";
import { HealthPill, toast } from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Epic } from "@/lib/types";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type Zoom = "week" | "month" | "quarter";
type RangePreset = "auto" | "1m" | "3m" | "6m" | "12m" | "custom";

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY_MS = 86400000;
const LABEL_W = 220;
const ROW_H = 28;          // bar row height
const ROW_GAP = 12;         // gap between rows
const ROW_STRIDE = ROW_H + ROW_GAP;

// Pixels per day per zoom level. Higher = wider chart, more horizontal scroll.
const PX_PER_DAY: Record<Zoom, number> = {
  week: 18,     // ≈ 126px / week
  month: 6,     // ≈ 180px / month
  quarter: 2.5, // ≈ 225px / quarter
};

export default function TimelinePage() {
  useDocumentTitle("Timeline");
  const epics = useAppStore((s) => s.epics);
  const projects = useAppStore((s) => s.projects);
  const [zoom, setZoom] = useState<Zoom>("month");
  const [rangePreset, setRangePreset] = useState<RangePreset>("auto");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Date range derived from preset + epics
  const { start, end } = useMemo(() => {
    const allDates = epics.flatMap((e) => [new Date(e.startDate).getTime(), new Date(e.targetEndDate).getTime()]);
    const epicMin = allDates.length ? Math.min(...allDates) : Date.now();
    const epicMax = allDates.length ? Math.max(...allDates) : Date.now() + 90 * DAY_MS;
    if (rangePreset === "auto") return { start: epicMin, end: epicMax };
    if (rangePreset === "custom") {
      const cf = customFrom ? new Date(customFrom).getTime() : epicMin;
      const ct = customTo ? new Date(customTo).getTime() : epicMax;
      return { start: Math.min(cf, ct), end: Math.max(cf, ct) };
    }
    const months = rangePreset === "1m" ? 1 : rangePreset === "3m" ? 3 : rangePreset === "6m" ? 6 : 12;
    const todayTs = Date.now();
    return { start: todayTs - months * 15 * DAY_MS, end: todayTs + months * 15 * DAY_MS };
  }, [epics, rangePreset, customFrom, customTo]);

  const totalDays = Math.max(1, Math.round((end - start) / DAY_MS));
  const dayPx = PX_PER_DAY[zoom];
  const laneWidth = Math.max(600, Math.round(totalDays * dayPx));
  const today = Date.now();

  const onPresetChange = (next: RangePreset) => {
    if (next === "custom" && !customFrom) {
      setCustomFrom(isoDate(start));
      setCustomTo(isoDate(end));
    }
    setRangePreset(next);
  };

  const visibleEpics = useMemo(
    () =>
      epics.filter((e) => {
        const es = new Date(e.startDate).getTime();
        const ee = new Date(e.targetEndDate).getTime();
        return ee >= start && es <= end;
      }),
    [epics, start, end]
  );

  // Dependency arrows derived from cross-Epic blocked-by edges
  const dependencies = useMemo(() => {
    const deps: { from: Epic; to: Epic }[] = [];
    for (const proj of projects) {
      const epicId = proj.epicId;
      const projTickets = useAppStore.getState().tickets.filter((t) => t.projectId === proj.id);
      for (const t of projTickets) {
        for (const edge of t.linkedWork) {
          if (edge.type !== "blocked_by") continue;
          const other = useAppStore.getState().tickets.find((x) => x.key === edge.ticketKey);
          if (!other) continue;
          const otherProj = useAppStore.getState().projects.find((p) => p.id === other.projectId);
          const otherEpicId = otherProj?.epicId;
          if (!otherEpicId || otherEpicId === epicId) continue;
          const fromEpic = visibleEpics.find((e) => e.id === otherEpicId);
          const toEpic = visibleEpics.find((e) => e.id === epicId);
          if (fromEpic && toEpic && !deps.some((d) => d.from.id === fromEpic.id && d.to.id === toEpic.id)) {
            deps.push({ from: fromEpic, to: toEpic });
          }
        }
      }
    }
    return deps;
  }, [projects, visibleEpics]);

  // Tick marks based on zoom
  const ticks = useMemo(() => {
    const arr: { date: Date; label: string }[] = [];
    const startD = new Date(start);
    if (zoom === "week") {
      const d = new Date(startD);
      d.setDate(d.getDate() - d.getDay() + 1); // align to Monday
      while (d.getTime() <= end) {
        arr.push({ date: new Date(d), label: `W${weekNum(d)}` });
        d.setDate(d.getDate() + 7);
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
        arr.push({ date: new Date(d), label: `Q${q} '${String(d.getFullYear()).slice(2)}` });
        d.setMonth(d.getMonth() + 3);
      }
    }
    return arr;
  }, [start, end, zoom]);

  // px helpers — relative to lane (NOT the wrapper).
  const dateToPx = (ms: number) => Math.round(((ms - start) / DAY_MS) * dayPx);
  const todayPx = dateToPx(today);

  // Auto-scroll the today indicator into view on mount / when range changes.
  useEffect(() => {
    if (!scrollRef.current) return;
    if (todayPx < 0 || todayPx > laneWidth) return;
    // Center today in the viewport when possible
    const viewport = scrollRef.current.clientWidth - LABEL_W;
    const desired = Math.max(0, todayPx - viewport / 2);
    scrollRef.current.scrollLeft = desired;
  }, [rangePreset, zoom, laneWidth, todayPx]);

  // Drag math is in pixels, then converted to days
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const dxDays = Math.round((e.movementX / dayPx) * 1);
    if (dxDays !== 0) setDragOffsetDays((v) => v + dxDays);
  };

  const onMouseUp = () => {
    if (!draggingId) return;
    if (dragOffsetDays !== 0) {
      const ep = epics.find((e) => e.id === draggingId);
      if (ep) {
        const newStart = isoDate(new Date(ep.startDate).getTime() + dragOffsetDays * DAY_MS);
        const newEnd = isoDate(new Date(ep.targetEndDate).getTime() + dragOffsetDays * DAY_MS);
        useAppStore.setState((s) => ({
          epics: s.epics.map((e) => (e.id === ep.id ? { ...e, startDate: newStart, targetEndDate: newEnd } : e)),
        }));
        toast(`Rescheduled ${ep.key} by ${dragOffsetDays > 0 ? "+" : ""}${dragOffsetDays}d`);
      }
    }
    setDraggingId(null);
    setDragOffsetDays(0);
  };

  const todayInRange = today >= start && today <= end;
  const wrapperWidth = LABEL_W + laneWidth;
  const chartHeight = visibleEpics.length * ROW_STRIDE;

  return (
    <div onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <PageHeader
        eyebrow="S-15 · Timeline"
        title={
          <>
            The <em className="text-accent">arc</em> of the quarter.
          </>
        }
        lede="Epics as rows, time horizontal. Drag a bar to reschedule. Wide ranges scroll horizontally — the title column pins."
        actions={
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
          {formatDate(isoDate(start))} – {formatDate(isoDate(end))} · {visibleEpics.length} of {epics.length} Epics in range · {laneWidth}px wide
        </span>
      </div>

      {/* Slidable chart container */}
      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
          <div style={{ width: wrapperWidth }} className="relative">
            {/* Header row: label spacer + tick row */}
            <div className="flex border-b border-rule-soft bg-bg-elevated/40">
              <div
                style={{ width: LABEL_W }}
                className="shrink-0 sticky left-0 z-20 bg-bg-elevated h-9 border-r border-rule flex items-end px-4 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3"
              >
                Epic
              </div>
              <div className="relative h-9" style={{ width: laneWidth }}>
                {ticks.map((tk, i) => {
                  const px = dateToPx(tk.date.getTime());
                  return (
                    <span
                      key={i}
                      style={{ left: px }}
                      className="absolute top-0 bottom-0 border-l border-rule-soft pl-1 pt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3"
                    >
                      {tk.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Lane body */}
            <div className="relative" style={{ minHeight: chartHeight + 12 }}>
              {/* Today line — single offset, lane-relative */}
              {todayInRange && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-warn pointer-events-none z-10"
                  style={{ left: LABEL_W + todayPx }}
                >
                  <span className="absolute -top-0.5 left-1 font-mono text-[9px] uppercase tracking-[0.14em] text-warn bg-bg-card px-1 rounded-sm">
                    Today
                  </span>
                </div>
              )}

              {visibleEpics.length === 0 ? (
                <p className="text-[13px] italic text-ink-3 py-12 text-center">
                  No Epics fall in this date range. Widen the range or pick Auto.
                </p>
              ) : (
                <>
                  {/* Rows */}
                  <div className="flex flex-col gap-3 py-3">
                    {visibleEpics.map((e) => {
                      const isDragged = draggingId === e.id;
                      const epicStartPx = dateToPx(new Date(e.startDate).getTime());
                      const epicEndPx = dateToPx(new Date(e.targetEndDate).getTime());
                      const offsetPx = isDragged ? Math.round(dragOffsetDays * dayPx) : 0;
                      const left = Math.max(0, epicStartPx + offsetPx);
                      const width = Math.max(20, epicEndPx - epicStartPx);
                      const barColor =
                        e.health === "on_track" ? "bg-ok" :
                        e.health === "at_risk" ? "bg-warn" :
                        e.health === "blocked" ? "bg-danger" : "bg-neutral";
                      return (
                        <div key={e.id} data-epic-id={e.id} className="flex items-center" style={{ height: ROW_H }}>
                          <Link
                            href={`/e/${e.key}`}
                            style={{ width: LABEL_W }}
                            className="shrink-0 sticky left-0 z-10 bg-bg-card border-r border-rule px-4 text-[13px] text-ink hover:text-accent underline-offset-2 hover:underline truncate flex items-center gap-2 h-full"
                          >
                            <HealthPill h={e.health} />
                            <span className="font-mono text-[11px] text-ink-3 shrink-0">{e.key}</span>
                            <span className="truncate">{e.title}</span>
                          </Link>
                          <div className="relative h-full" style={{ width: laneWidth }}>
                            <button
                              type="button"
                              onMouseDown={(ev) => {
                                ev.preventDefault();
                                setDraggingId(e.id);
                                setDragOffsetDays(0);
                              }}
                              className={cn(
                                "absolute top-1 bottom-1 rounded-[4px] opacity-90 flex items-center px-2 cursor-grab active:cursor-grabbing transition-shadow duration-100",
                                barColor,
                                isDragged && "ring-2 ring-accent shadow-lg z-10"
                              )}
                              style={{ left, width }}
                              title={`${e.key} · ${formatDate(e.startDate)} → ${formatDate(e.targetEndDate)}${isDragged && dragOffsetDays !== 0 ? ` (${dragOffsetDays > 0 ? "+" : ""}${dragOffsetDays}d)` : ""}`}
                            >
                              <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em] truncate">
                                {e.quarter}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dependency arrows — SVG inside lane, offset by LABEL_W */}
                  {dependencies.length > 0 && (
                    <svg
                      className="absolute top-0 pointer-events-none"
                      style={{ left: LABEL_W, width: laneWidth, height: chartHeight + 12 }}
                      width={laneWidth}
                      height={chartHeight + 12}
                    >
                      <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-4)" />
                        </marker>
                      </defs>
                      {dependencies.map((d, i) => {
                        const fromX = dateToPx(new Date(d.from.targetEndDate).getTime());
                        const toX = dateToPx(new Date(d.to.startDate).getTime());
                        const fromIdx = visibleEpics.findIndex((e) => e.id === d.from.id);
                        const toIdx = visibleEpics.findIndex((e) => e.id === d.to.id);
                        if (fromIdx < 0 || toIdx < 0) return null;
                        const fromY = 12 + fromIdx * ROW_STRIDE + ROW_H / 2;
                        const toY = 12 + toIdx * ROW_STRIDE + ROW_H / 2;
                        return (
                          <line
                            key={i}
                            x1={fromX}
                            y1={fromY}
                            x2={toX}
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
                </>
              )}
            </div>

            {/* Footer — start/end dates pinned to lane edges */}
            <div className="flex border-t border-rule-soft bg-bg-elevated/40">
              <div
                style={{ width: LABEL_W }}
                className="shrink-0 sticky left-0 z-10 bg-bg-elevated h-7 border-r border-rule"
              />
              <div className="flex justify-between items-center px-3 h-7 font-mono text-[11px] text-ink-3" style={{ width: laneWidth }}>
                <span>{formatDate(isoDate(start))}</span>
                <span>{formatDate(isoDate(end))}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 border-t border-rule-soft font-mono text-[11px] text-ink-3 flex justify-between">
          <span>← scroll →</span>
          <span>{ticks.length} ticks · {visibleEpics.length} rows</span>
        </div>
      </div>
    </div>
  );
}

function weekNum(d: Date) {
  const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

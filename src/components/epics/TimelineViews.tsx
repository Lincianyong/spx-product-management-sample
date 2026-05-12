"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Diamond, Flag } from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  DatePicker,
  HealthPill,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import type { Epic, Project, Sprint, User } from "@/lib/types";

export type TimelineMode = "gantt" | "month" | "swimlane";

const DAY_MS = 86400000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function TimelineModeStrip({ mode, onChange }: { mode: TimelineMode; onChange: (m: TimelineMode) => void }) {
  const modes: { id: TimelineMode; label: string }[] = [
    { id: "gantt", label: "Gantt" },
    { id: "month", label: "Month" },
    { id: "swimlane", label: "Swimlane" },
  ];
  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "px-3 h-8 text-[12px] font-mono uppercase tracking-[0.06em] rounded-[6px] border transition-colors duration-100",
            mode === m.id ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────
function healthBg(h: Epic["health"]) {
  return h === "on_track" ? "bg-ok" : h === "at_risk" ? "bg-warn" : h === "blocked" ? "bg-danger" : "bg-neutral";
}
function epicActiveOn(e: Epic, ts: number) {
  return new Date(e.startDate).getTime() <= ts && new Date(e.targetEndDate).getTime() >= ts;
}
function projectActiveOn(p: Project, ts: number) {
  return new Date(p.startDate).getTime() <= ts && new Date(p.targetEndDate).getTime() >= ts;
}
function setTime(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function weekNum(d: Date) {
  const yearStart = new Date(d.getFullYear(), 0, 1).getTime();
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

// ─── Gantt ───────────────────────────────────────
type Zoom = "week" | "month" | "quarter";
type RangePreset = "auto" | "1m" | "3m" | "6m" | "12m" | "custom";
const LABEL_W = 220;
const ROW_H = 28;
const ROW_GAP = 12;
const ROW_STRIDE = ROW_H + ROW_GAP;
const PX_PER_DAY: Record<Zoom, number> = { week: 18, month: 6, quarter: 2.5 };

export function GanttView({
  epics,
  onOpenEpic,
}: {
  epics: Epic[];
  projects?: Project[];
  onOpenEpic: (k: string) => void;
}) {
  const [zoom, setZoom] = useState<Zoom>("month");
  const [rangePreset, setRangePreset] = useState<RangePreset>("auto");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const dateToPx = (ms: number) => Math.round(((ms - start) / DAY_MS) * dayPx);
  const todayPx = dateToPx(today);
  const visibleEpics = epics.filter((e) => {
    const es = new Date(e.startDate).getTime();
    const ee = new Date(e.targetEndDate).getTime();
    return ee >= start && es <= end;
  });

  useEffect(() => {
    if (!scrollRef.current) return;
    if (todayPx < 0 || todayPx > laneWidth) return;
    const viewport = scrollRef.current.clientWidth - LABEL_W;
    scrollRef.current.scrollLeft = Math.max(0, todayPx - viewport / 2);
  }, [rangePreset, zoom, laneWidth, todayPx]);

  const ticks = useMemo(() => {
    const arr: { date: Date; label: string }[] = [];
    const startD = new Date(start);
    if (zoom === "week") {
      const d = new Date(startD);
      d.setDate(d.getDate() - d.getDay() + 1);
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

  const onPresetChange = (next: RangePreset) => {
    if (next === "custom" && !customFrom) {
      setCustomFrom(isoDate(start));
      setCustomTo(isoDate(end));
    }
    setRangePreset(next);
  };
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const dxDays = Math.round(e.movementX / dayPx);
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

  const wrapperWidth = LABEL_W + laneWidth;
  const chartHeight = visibleEpics.length * ROW_STRIDE;
  const todayInRange = today >= start && today <= end;

  return (
    <div onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
      <div className="bg-bg-card border border-rule rounded-[8px] p-3 mb-4 flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Zoom</span>
        <div className="flex items-center gap-1">
          {(["week", "month", "quarter"] as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={cn(
                "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border",
                zoom === z ? "bg-accent text-bg-card border-accent" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              )}
            >
              {z}
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 ml-2">Range</span>
        <div className="flex items-center gap-1">
          {([
            { v: "auto", label: "Auto" }, { v: "1m", label: "1M" }, { v: "3m", label: "3M" },
            { v: "6m", label: "6M" }, { v: "12m", label: "12M" }, { v: "custom", label: "Custom" },
          ] as { v: RangePreset; label: string }[]).map((o) => (
            <button
              key={o.v}
              onClick={() => onPresetChange(o.v)}
              className={cn(
                "px-2.5 h-7 text-[11px] font-mono uppercase rounded-[4px] border",
                rangePreset === o.v ? "bg-ink text-bg-card border-ink" : "bg-bg-card text-ink-2 border-rule hover:border-ink-4"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {rangePreset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <DatePicker size="sm" value={customFrom} onChange={setCustomFrom} className="w-40" />
            <DatePicker size="sm" value={customTo} onChange={setCustomTo} fromDate={customFrom} className="w-40" />
          </div>
        )}
        <span className="ml-auto font-mono text-[11px] text-ink-3">
          {formatDate(isoDate(start))} – {formatDate(isoDate(end))} · {visibleEpics.length} of {epics.length}
        </span>
      </div>

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden">
          <div style={{ width: wrapperWidth }} className="relative">
            <div className="flex border-b border-rule-soft bg-bg-elevated/40">
              <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-20 bg-bg-elevated h-9 border-r border-rule flex items-end px-4 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                Epic
              </div>
              <div className="relative h-9" style={{ width: laneWidth }}>
                {ticks.map((tk, i) => {
                  const px = dateToPx(tk.date.getTime());
                  return (
                    <span key={i} style={{ left: px }} className="absolute top-0 bottom-0 border-l border-rule-soft pl-1 pt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                      {tk.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="relative" style={{ minHeight: chartHeight + 12 }}>
              {todayInRange && (
                <div className="absolute top-0 bottom-0 border-l-2 border-warn pointer-events-none z-10" style={{ left: LABEL_W + todayPx }}>
                  <span className="absolute -top-0.5 left-1 font-mono text-[9px] uppercase tracking-[0.14em] text-warn bg-bg-card px-1 rounded-sm">Today</span>
                </div>
              )}

              {visibleEpics.length === 0 ? (
                <p className="text-[13px] italic text-ink-3 py-12 text-center">No Epics fall in this range.</p>
              ) : (
                <div className="flex flex-col gap-3 py-3">
                  {visibleEpics.map((e) => {
                    const isDragged = draggingId === e.id;
                    const epicStartPx = dateToPx(new Date(e.startDate).getTime());
                    const epicEndPx = dateToPx(new Date(e.targetEndDate).getTime());
                    const offsetPx = isDragged ? Math.round(dragOffsetDays * dayPx) : 0;
                    const left = Math.max(0, epicStartPx + offsetPx);
                    const width = Math.max(20, epicEndPx - epicStartPx);
                    return (
                      <div key={e.id} className="flex items-center" style={{ height: ROW_H }}>
                        <button onClick={() => onOpenEpic(e.key)} style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-10 bg-bg-card border-r border-rule px-4 text-[13px] text-ink hover:text-accent underline-offset-2 hover:underline truncate flex items-center gap-2 h-full text-left">
                          <HealthPill h={e.health} />
                          <span className="font-mono text-[11px] text-ink-3 shrink-0">{e.key}</span>
                          <span className="truncate">{e.title}</span>
                        </button>
                        <div className="relative h-full" style={{ width: laneWidth }}>
                          <button
                            type="button"
                            onMouseDown={(ev) => { ev.preventDefault(); setDraggingId(e.id); setDragOffsetDays(0); }}
                            className={cn("absolute top-1 bottom-1 rounded-[4px] opacity-90 flex items-center px-2 cursor-grab active:cursor-grabbing transition-shadow duration-100", healthBg(e.health), isDragged && "ring-2 ring-accent shadow-lg z-10")}
                            style={{ left, width }}
                            title={`${e.key} · ${formatDate(e.startDate)} → ${formatDate(e.targetEndDate)}${isDragged && dragOffsetDays !== 0 ? ` (${dragOffsetDays > 0 ? "+" : ""}${dragOffsetDays}d)` : ""}`}
                          >
                            <span className="font-mono text-[10px] text-bg-card uppercase tracking-[0.06em] truncate">{e.quarter}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex border-t border-rule-soft bg-bg-elevated/40">
              <div style={{ width: LABEL_W }} className="shrink-0 sticky left-0 z-10 bg-bg-elevated h-7 border-r border-rule" />
              <div className="flex justify-between items-center px-3 h-7 font-mono text-[11px] text-ink-3" style={{ width: laneWidth }}>
                <span>{formatDate(isoDate(start))}</span>
                <span>{formatDate(isoDate(end))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Month grid view ─────────────────────────────────────────────
export function MonthView({
  epics,
  projects,
  sprints,
  onOpenEpic,
}: {
  epics: Epic[];
  projects: Project[];
  sprints: Sprint[];
  onOpenEpic: (k: string) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const sprintCommitDays = sprints
    .filter((s) => s.state !== "planning")
    .map((s) => setTime(new Date(s.startDate), 10, 30));

  const today = new Date();

  return (
    <div>
      <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-4 flex items-center gap-3">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-rule hover:border-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="display text-[20px] text-ink">
          {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-rule hover:border-accent">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => setCursor(startOfMonth(new Date()))} className="ml-2 font-mono text-[11px] uppercase tracking-[0.06em] text-accent hover:text-accent-deep">
          Today
        </button>
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          <span className="flex items-center gap-1"><Diamond className="h-2.5 w-2.5 text-warn" />Sprint commit</span>
          <span className="flex items-center gap-1"><Flag className="h-2.5 w-2.5 text-accent" />Planning</span>
        </div>
      </div>

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <div className="grid grid-cols-7 bg-bg-elevated border-b border-rule">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-3 py-2 border-r border-rule-soft last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6">
          {cells.map((day, i) => {
            const inMonth = day.getMonth() === monthStart.getMonth();
            const isToday = sameDay(day, today);
            const ts = day.getTime();
            const dayEpics = epics.filter((e) => epicActiveOn(e, ts));
            const dayProjects = projects.filter((p) => projectActiveOn(p, ts) && sameDay(new Date(p.startDate), day));
            const commitMatch = sprintCommitDays.find((s) => sameDay(s, day));
            const sprintForCommit = commitMatch ? sprints.find((s) => sameDay(new Date(s.startDate), day)) : undefined;
            const isMonday = day.getDay() === 1;
            const isTuesday = day.getDay() === 2;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[110px] border-b border-r border-rule-soft last:border-r-0 p-1.5 flex flex-col gap-0.5",
                  !inMonth && "bg-bg-elevated/40 opacity-50",
                  isToday && "bg-accent-soft/30"
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    "font-mono text-[11px]",
                    isToday ? "text-accent font-medium" : inMonth ? "text-ink" : "text-ink-4"
                  )}>
                    {day.getDate()}
                  </span>
                  <div className="flex items-center gap-1">
                    {commitMatch && (
                      <span title={`Sprint commit · ${sprintForCommit?.key}`}>
                        <Diamond className="h-2.5 w-2.5 text-warn" />
                      </span>
                    )}
                    {(isMonday || isTuesday) && (
                      <span title={isMonday ? "Mon · Picklist 09:00, Estimation 14:00" : "Tue · Joint 10:00, Sprint 10:30"}>
                        <Flag className="h-2.5 w-2.5 text-accent" />
                      </span>
                    )}
                  </div>
                </div>
                {dayEpics.slice(0, 3).map((e) => {
                  const isStart = sameDay(new Date(e.startDate), day);
                  const isEnd = sameDay(new Date(e.targetEndDate), day);
                  return (
                    <button
                      key={e.id}
                      onClick={() => onOpenEpic(e.key)}
                      className={cn(
                        "h-4 text-[10px] font-mono text-bg-card truncate text-left px-1 hover:brightness-110 transition-all",
                        healthBg(e.health),
                        isStart && "rounded-l-[3px] border-l-2 border-bg-card",
                        isEnd && "rounded-r-[3px] border-r-2 border-bg-card"
                      )}
                      title={`${e.key} · ${e.title}`}
                    >
                      {(isStart || day.getDay() === 0) ? e.key : ""}
                    </button>
                  );
                })}
                {dayEpics.length > 3 && (
                  <span className="font-mono text-[9px] text-ink-3">+ {dayEpics.length - 3} more</span>
                )}
                {dayProjects.length > 0 && dayProjects.slice(0, 1).map((p) => (
                  <span key={p.id} className="font-mono text-[9px] text-ink-3 truncate" title={`${p.key} starts`}>
                    ▸ {p.key}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="font-mono text-[11px] text-ink-3 mt-2">
        {epics.filter((e) => {
          const es = new Date(e.startDate).getTime();
          const ee = new Date(e.targetEndDate).getTime();
          return ee >= monthStart.getTime() && es <= monthEnd.getTime();
        }).length} Epics active this month · click any to open the side panel
      </p>
    </div>
  );
}

// ─── Swimlane view ──────────────────────────────────────────────
type SwimGroup = "pm" | "pod" | "health" | "quarter";

export function SwimlaneView({
  epics,
  projects,
  users,
  onOpenEpic,
}: {
  epics: Epic[];
  projects: Project[];
  users: User[];
  onOpenEpic: (k: string) => void;
}) {
  const today = new Date();
  const currentQ = Math.floor(today.getMonth() / 3);
  const [quarterIdx, setQuarterIdx] = useState(currentQ);
  const [year, setYear] = useState(today.getFullYear());
  const [group, setGroup] = useState<SwimGroup>("pm");

  const qStart = useMemo(() => new Date(year, quarterIdx * 3, 1), [year, quarterIdx]);
  const qEnd = useMemo(() => new Date(year, quarterIdx * 3 + 3, 0), [year, quarterIdx]);

  const weeks = useMemo(() => {
    const arr: { start: Date; end: Date; label: string }[] = [];
    const cursor = startOfWeek(qStart);
    while (cursor <= qEnd) {
      const wEnd = addDays(cursor, 6);
      arr.push({ start: new Date(cursor), end: wEnd, label: `W${weekNum(cursor)}` });
      cursor.setDate(cursor.getDate() + 7);
    }
    return arr;
  }, [qStart, qEnd]);

  const inQuarter = useMemo(
    () =>
      epics.filter((e) => {
        const es = new Date(e.startDate);
        const ee = new Date(e.targetEndDate);
        return ee >= qStart && es <= qEnd;
      }),
    [epics, qStart, qEnd]
  );

  type Group = { key: string; label: string; epics: Epic[] };
  const groups: Group[] = useMemo(() => {
    if (group === "pm") {
      const ids = Array.from(new Set(inQuarter.map((e) => e.pmPicId)));
      return ids.map((id) => ({ key: id, label: users.find((u) => u.id === id)?.displayName ?? "Unknown", epics: inQuarter.filter((e) => e.pmPicId === id) }));
    }
    if (group === "pod") {
      const podOf = (e: Epic): string => {
        const childProjects = projects.filter((p) => p.epicId === e.id);
        const pods = childProjects.map((p) => p.pod);
        return pods[0] ?? "—";
      };
      const pods = Array.from(new Set(inQuarter.map(podOf)));
      return pods.map((pod) => ({ key: pod, label: pod.charAt(0).toUpperCase() + pod.slice(1), epics: inQuarter.filter((e) => podOf(e) === pod) }));
    }
    if (group === "health") {
      const order: Epic["health"][] = ["on_track", "at_risk", "blocked", "not_started"];
      return order
        .map((h) => ({ key: h, label: h.replace("_", " "), epics: inQuarter.filter((e) => e.health === h) }))
        .filter((g) => g.epics.length > 0);
    }
    const quarters = Array.from(new Set(inQuarter.map((e) => e.quarter)));
    return quarters.map((q) => ({ key: q, label: q, epics: inQuarter.filter((e) => e.quarter === q) }));
  }, [inQuarter, group, users, projects]);

  const goQuarter = (delta: number) => {
    let q = quarterIdx + delta;
    let y = year;
    while (q < 0) { q += 4; y -= 1; }
    while (q > 3) { q -= 4; y += 1; }
    setQuarterIdx(q);
    setYear(y);
  };

  return (
    <div>
      <div className="bg-bg-card border border-rule rounded-[8px] px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
        <button onClick={() => goQuarter(-1)} className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-rule hover:border-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="display text-[20px] text-ink">Q{quarterIdx + 1} {year}</div>
        <button onClick={() => goQuarter(1)} className="w-8 h-8 inline-flex items-center justify-center rounded-[6px] border border-rule hover:border-accent">
          <ChevronRight className="h-4 w-4" />
        </button>

        <span className="ml-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Group</span>
        <Select value={group} onValueChange={(v) => setGroup(v as SwimGroup)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pm">PM owner</SelectItem>
            <SelectItem value="pod">Pod</SelectItem>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="quarter">Quarter tag</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto font-mono text-[11px] text-ink-3">
          {inQuarter.length} Epics active · {weeks.length} weeks
        </span>
      </div>

      <div className="bg-bg-card border border-rule rounded-[8px] overflow-x-auto">
        <div style={{ minWidth: 200 + weeks.length * 80 }}>
          <div className="flex border-b border-rule-soft bg-bg-elevated/40">
            <div className="w-[200px] shrink-0 sticky left-0 z-10 bg-bg-elevated h-9 border-r border-rule flex items-end px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              {group === "pm" ? "PM" : group === "pod" ? "Pod" : group === "health" ? "Health" : "Quarter"}
            </div>
            <div className="flex flex-1">
              {weeks.map((w, i) => (
                <div key={i} style={{ width: 80 }} className="border-r border-rule-soft last:border-r-0 font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3 px-2 py-2 flex flex-col items-start">
                  <span>{w.label}</span>
                  <span className="text-[9px] text-ink-4">{w.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          </div>

          {groups.map((g) => (
            <div key={g.key} className="flex border-b border-rule-soft">
              <div className="w-[200px] shrink-0 sticky left-0 z-10 bg-bg-card border-r border-rule px-3 py-3 text-[13px] text-ink-2 flex items-center gap-2">
                <span className="font-medium truncate">{g.label}</span>
                <span className="font-mono text-[10px] text-ink-3">{g.epics.length}</span>
              </div>
              <div className="relative flex-1 py-2" style={{ minHeight: 24 * Math.max(1, g.epics.length) + 16 }}>
                <div className="absolute inset-0 flex pointer-events-none">
                  {weeks.map((_, i) => (
                    <div key={i} style={{ width: 80 }} className="border-r border-rule-soft last:border-r-0 h-full" />
                  ))}
                </div>
                <div className="relative flex flex-col gap-1">
                  {g.epics.map((e) => {
                    const es = new Date(e.startDate).getTime();
                    const ee = new Date(e.targetEndDate).getTime();
                    const startWk = weeks.findIndex((w) => ee >= w.start.getTime() && es <= w.end.getTime());
                    const endWk = (() => {
                      for (let i = weeks.length - 1; i >= 0; i--) {
                        const w = weeks[i];
                        if (ee >= w.start.getTime() && es <= w.end.getTime()) return i;
                      }
                      return startWk;
                    })();
                    if (startWk < 0) return null;
                    const left = startWk * 80 + 4;
                    const width = (endWk - startWk + 1) * 80 - 8;
                    return (
                      <button
                        key={e.id}
                        onClick={() => onOpenEpic(e.key)}
                        title={`${e.key} · ${e.title} (${formatDate(e.startDate)} → ${formatDate(e.targetEndDate)})`}
                        className={cn(
                          "h-5 rounded-[4px] flex items-center px-2 font-mono text-[10px] text-bg-card hover:brightness-110 transition-all text-left",
                          healthBg(e.health)
                        )}
                        style={{ marginLeft: left, width }}
                      >
                        <span className="truncate">{e.key} · {e.title}</span>
                      </button>
                    );
                  })}
                  {g.epics.length === 0 && (
                    <span className="italic text-[12px] text-ink-4 px-3">No epics this quarter.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="font-mono text-[11px] text-ink-3 mt-2">
        Click any bar to open the Epic side panel.
      </p>
    </div>
  );
}

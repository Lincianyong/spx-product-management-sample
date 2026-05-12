import type { Sprint } from "./types";

/**
 * Single source of truth for the sprint cycle calendar.
 *
 * Cadence (per the spec):
 *   Mon 09:00 - 4a Picklist (PM alone)     → PM hands off by Mon 14:00
 *   Mon 14:00 - 4b Estimation (Engineers)  → Eng finishes by Tue 10:00
 *   Tue 10:00 - 4c Joint Planning          → Sprint commits by Tue 10:30
 *   Tue 10:30 - Sprint active until next Monday
 */
export interface CycleCalendar {
  picklistStart: Date; // Mon 09:00
  picklistDue: Date;   // Mon 14:00
  estimationDue: Date; // Tue 10:00
  jointDue: Date;      // Tue 10:30
  sprintStart: Date;   // Tue 10:30
}

export type CycleStage =
  | "pre_picklist"
  | "picklist"
  | "estimation"
  | "joint"
  | "active"
  | "post_active";

export function calendarFor(sprint: Sprint): CycleCalendar {
  const sprintStart = new Date(sprint.startDate + "T10:30:00");
  // Sprint commits Tuesday 10:30 → Monday is the day before.
  const tue = new Date(sprintStart);
  tue.setHours(10, 0, 0, 0);
  const mon = new Date(tue);
  mon.setDate(tue.getDate() - 1);

  const picklistStart = new Date(mon);
  picklistStart.setHours(9, 0, 0, 0);
  const picklistDue = new Date(mon);
  picklistDue.setHours(14, 0, 0, 0);
  const estimationDue = new Date(tue);
  estimationDue.setHours(10, 0, 0, 0);
  const jointDue = new Date(tue);
  jointDue.setHours(10, 30, 0, 0);

  return { picklistStart, picklistDue, estimationDue, jointDue, sprintStart };
}

export function cycleStageNow(cal: CycleCalendar, now: Date): CycleStage {
  if (now < cal.picklistStart) return "pre_picklist";
  if (now < cal.picklistDue) return "picklist";
  if (now < cal.estimationDue) return "estimation";
  if (now < cal.jointDue) return "joint";
  if (now < cal.sprintStart) return "joint";
  return "active";
}

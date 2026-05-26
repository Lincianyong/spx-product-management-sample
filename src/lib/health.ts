import type { Epic, Milestone, Ticket, Health } from "./types";

export interface HealthSignal {
  health: Health;
  timeBurn: number;     // 0..1
  progressBurn: number; // 0..1
  deviation: number;
  reason: string;
  /** Which signal drove progressBurn: milestones (PRD primary) or tickets (fallback). */
  basis: "milestones" | "tickets" | "none";
}

/**
 * Compute an epic's health from milestone completion (primary) or ticket
 * burn (fallback). PRD § 12 + § 13.3:
 *
 *   deviation = timeBurn - progressBurn
 *
 *   timeBurn     = (now - startDate) / (targetEndDate - startDate)   // [0,1]
 *   progressBurn = completedMilestones / totalMilestones
 *                  → falls back to doneTickets / totalTickets if no milestones
 *
 *   health =
 *     not_started  if now < startDate
 *     blocked      if now > targetEndDate AND progressBurn < 1
 *     blocked      if deviation >= 0.25
 *     at_risk      if deviation 0.10 - 0.24
 *     on_track     if deviation < 0.10
 *
 * No scheduled job - this runs on every page render.
 */
export function computeEpicHealth(
  epic: Epic,
  milestones: Milestone[] = [],
  tickets: Ticket[] = [],
): HealthSignal {
  const now = Date.now();
  const start = new Date(epic.startDate).getTime();
  const end = new Date(epic.targetEndDate).getTime();
  const span = Math.max(1, end - start);
  const timeBurn = Math.max(0, Math.min(1, (now - start) / span));

  const ms = milestones.filter((m) => m.epicId === epic.id);
  const epicTickets = tickets.filter((t) => t.epicId === epic.id);

  let progressBurn = 0;
  let basis: HealthSignal["basis"] = "none";
  if (ms.length > 0) {
    basis = "milestones";
    const done = ms.filter((m) => m.status === "complete").length;
    progressBurn = done / ms.length;
  } else if (epicTickets.length > 0) {
    basis = "tickets";
    const done = epicTickets.filter((t) => t.status === "done" || t.status === "verified").length;
    progressBurn = done / epicTickets.length;
  }

  if (now < start) {
    return {
      health: "not_started",
      timeBurn: 0,
      progressBurn: 0,
      deviation: 0,
      reason: `Starts ${epic.startDate}`,
      basis,
    };
  }

  const deviation = timeBurn - progressBurn;

  if (now > end && progressBurn < 1) {
    return {
      health: "blocked",
      timeBurn: 1,
      progressBurn,
      deviation: 1 - progressBurn,
      reason: `Past target end · ${Math.round((1 - progressBurn) * 100)}% remaining`,
      basis,
    };
  }

  let health: Health = "on_track";
  if (deviation >= 0.25) health = "blocked";
  else if (deviation >= 0.1) health = "at_risk";

  return {
    health,
    timeBurn,
    progressBurn,
    deviation,
    reason: `time-burn ${Math.round(timeBurn * 100)}% · progress-burn ${Math.round(progressBurn * 100)}%`,
    basis,
  };
}

/**
 * Returns milestones whose targetDate is within `windowDays` days from now
 * and which haven't been completed. Used to fire `milestone_at_risk`
 * notifications at T-7 per PRD § 13.2.
 */
export function milestonesAtRisk(
  milestones: Milestone[],
  windowDays = 7,
  now = Date.now(),
): Milestone[] {
  const cutoff = now + windowDays * 86_400_000;
  return milestones.filter((m) => {
    if (m.status === "complete") return false;
    const target = new Date(m.targetDate).getTime();
    return target >= now && target <= cutoff;
  });
}

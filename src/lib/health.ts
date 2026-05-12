import type { Epic, Ticket, Health } from "./types";

export interface HealthSignal {
  health: Health;
  timeBurn: number; // 0..1
  progressBurn: number; // 0..1
  deviation: number;
  reason: string;
}

/**
 * Compute an epic's health from its own dates + the ticket burn rate.
 * Previously this lived on Project; with the merged model the formula
 * is the same, just one level up.
 */
export function computeEpicHealth(epic: Epic, tickets: Ticket[]): HealthSignal {
  const epicTickets = tickets.filter((t) => t.epicId === epic.id);
  const totalPoints = epicTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const shippedPoints = epicTickets
    .filter((t) => t.status === "done" || t.status === "verified")
    .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);

  const now = Date.now();
  const start = new Date(epic.startDate).getTime();
  const end = new Date(epic.targetEndDate).getTime();
  const span = Math.max(1, end - start);

  const timeBurn = Math.max(0, Math.min(1, (now - start) / span));
  const progressBurn = totalPoints > 0 ? shippedPoints / totalPoints : 0;
  const deviation = timeBurn - progressBurn;

  if (now < start) {
    return {
      health: "not_started",
      timeBurn: 0,
      progressBurn: 0,
      deviation: 0,
      reason: `Starts ${epic.startDate}`,
    };
  }
  if (now > end && progressBurn < 1) {
    return {
      health: "blocked",
      timeBurn: 1,
      progressBurn,
      deviation: 1 - progressBurn,
      reason: `Past target end · ${Math.round((1 - progressBurn) * 100)}% remaining`,
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
  };
}

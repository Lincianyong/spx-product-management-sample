import type { Project, Epic, Ticket, Health } from "./types";

export interface HealthSignal {
  health: Health;
  timeBurn: number; // 0..1
  progressBurn: number; // 0..1
  deviation: number;
  reason: string;
}

export function computeProjectHealth(project: Project, tickets: Ticket[]): HealthSignal {
  const projTickets = tickets.filter((t) => t.projectId === project.id);
  const totalPoints = projTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
  const shippedPoints = projTickets
    .filter((t) => t.status === "done" || t.status === "verified")
    .reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);

  const now = Date.now();
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.targetEndDate).getTime();
  const span = Math.max(1, end - start);

  const timeBurn = Math.max(0, Math.min(1, (now - start) / span));
  const progressBurn = totalPoints > 0 ? shippedPoints / totalPoints : 0;
  const deviation = timeBurn - progressBurn;

  // Pre-start
  if (now < start) {
    return {
      health: "not_started",
      timeBurn: 0,
      progressBurn: 0,
      deviation: 0,
      reason: `Starts ${project.startDate}`,
    };
  }
  // Past end with remaining
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

export function computeEpicHealth(epic: Epic, projects: Project[], tickets: Ticket[]): HealthSignal {
  const childProjects = projects.filter((p) => p.epicId === epic.id);
  if (childProjects.length === 0) {
    return { health: "not_started", timeBurn: 0, progressBurn: 0, deviation: 0, reason: "No child projects" };
  }
  const signals = childProjects.map((p) => computeProjectHealth(p, tickets));
  // Worst-of
  const order: Record<Health, number> = { blocked: 3, at_risk: 2, on_track: 1, not_started: 0 };
  const worst = signals.reduce((acc, s) => (order[s.health] > order[acc.health] ? s : acc), signals[0]);
  return {
    health: worst.health,
    timeBurn: worst.timeBurn,
    progressBurn: worst.progressBurn,
    deviation: worst.deviation,
    reason: `Worst-of ${childProjects.length} project${childProjects.length === 1 ? "" : "s"} — ${worst.reason}`,
  };
}

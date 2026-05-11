import { clsx, type ClassValue } from "clsx";
import type { Priority, Health, TicketStatus, TicketType, Role } from "./types";

export const cn = (...args: ClassValue[]) => clsx(...args);

export const priorityLabel: Record<Priority, string> = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
};

export const healthLabel: Record<Health, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  blocked: "Blocked",
  not_started: "Not Started",
};

export const statusLabel: Record<TicketStatus, string> = {
  draft: "Draft",
  triage: "Triage",
  backlog: "Backlog",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  review: "Review",
  verifying: "Verifying",
  done: "Done",
  verified: "Verified",
  cancelled: "Cancelled",
};

export const typeLabel: Record<TicketType, string> = {
  engineering: "ENG",
  bug: "BUG",
  tech_task: "TECH",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  pm: "PM",
  em: "EM",
  engineer: "Engineer",
  designer: "Designer",
  leadership: "Leadership",
  guest: "Guest",
};

export const podLabel = (pod: string | undefined) =>
  pod ? pod.charAt(0).toUpperCase() + pod.slice(1) : "—";

// Avatar color picker mapping
export const avatarBg: Record<string, string> = {
  a: "bg-accent text-bg",
  b: "bg-info text-bg",
  c: "bg-warn text-bg",
  d: "bg-ai text-bg",
  e: "bg-ok text-bg",
  f: "bg-danger text-bg",
};

// Time helpers
export const daysBetween = (a: string, b: string) => {
  const ad = new Date(a).getTime();
  const bd = new Date(b).getTime();
  return Math.round((bd - ad) / (1000 * 60 * 60 * 24));
};

export const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Role landing
import type { Role as R } from "./types";
export const landingForRole = (role: R): string => {
  switch (role) {
    case "pm":
      return "/epics";
    case "leadership":
      return "/portfolio";
    case "em":
      return "/sprint";
    case "engineer":
    case "designer":
      return "/me";
    case "guest":
      return "/report-bug";
    case "admin":
      return "/settings";
    default:
      return "/me";
  }
};

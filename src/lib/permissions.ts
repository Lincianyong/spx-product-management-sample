import type { Role } from "./types";

// Surface-level access: which roles can land on which URLs.
// NOTE: capabilities are intentionally flattened — every role gets every cap
// for now. The matrix below is kept (and re-imposed via PERMISSIONS_LEGACY)
// so we can tighten it again later without recreating the structure.
export type Capability =
  | "view_triage"
  | "view_backlog"
  | "view_planning"
  | "view_sprint"
  | "view_my_work"
  | "view_epics"
  | "view_portfolio"
  | "view_heatmap"
  | "view_timeline"
  | "view_notifications"
  | "view_settings"
  | "view_report_bug"
  | "view_create"
  | "view_my_bugs"
  | "commit_sprint"
  | "edit_epic"
  | "edit_project"
  | "triage_action"
  | "create_ticket"
  | "set_points"
  | "assign_ticket"
  | "comment";

const ALL: Capability[] = [
  "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
  "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
  "view_notifications", "view_settings", "view_create",
  "view_report_bug", "view_my_bugs",
  "commit_sprint", "edit_epic", "edit_project", "triage_action",
  "create_ticket", "set_points", "assign_ticket", "comment",
];

// Flat: every role gets every capability.
export const PERMISSIONS: Record<Role, Capability[]> = {
  admin: ALL,
  pm: ALL,
  em: ALL,
  engineer: ALL,
  designer: ALL,
  leadership: ALL,
  guest: ALL,
};

// Kept for future re-tightening. Mirrors the docs' R-01 to R-07 + RC matrix.
// To re-enable role-based gates, replace PERMISSIONS export above with this.
export const PERMISSIONS_LEGACY: Record<Role, Capability[]> = {
  admin: [...ALL, "view_report_bug"],
  pm: [
    "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings", "view_create",
    "commit_sprint", "edit_epic", "edit_project", "triage_action",
    "create_ticket", "assign_ticket", "comment",
  ],
  em: [
    "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings", "view_create",
    "commit_sprint", "edit_project", "create_ticket", "set_points", "assign_ticket", "comment",
  ],
  engineer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_create",
    "create_ticket", "set_points", "comment",
  ],
  designer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_create",
    "create_ticket", "set_points", "comment",
  ],
  leadership: [
    "view_portfolio", "view_epics", "view_timeline", "view_heatmap",
    "view_notifications", "view_settings", "comment",
  ],
  guest: ["view_report_bug", "view_my_bugs"],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(cap);
}

// Map URL prefix → required capability.
// With flat PERMISSIONS, every role passes. The guard is wired so we can re-impose later.
const URL_GUARD: { prefix: string; cap: Capability }[] = [
  { prefix: "/triage", cap: "view_triage" },
  { prefix: "/backlog", cap: "view_backlog" },
  { prefix: "/planning", cap: "view_planning" },
  { prefix: "/sprint-close", cap: "view_sprint" },
  { prefix: "/sprint", cap: "view_sprint" },
  { prefix: "/me", cap: "view_my_work" },
  { prefix: "/epics", cap: "view_epics" },
  { prefix: "/portfolio", cap: "view_portfolio" },
  { prefix: "/heatmap", cap: "view_heatmap" },
  { prefix: "/timeline", cap: "view_timeline" },
  { prefix: "/notifications", cap: "view_notifications" },
  { prefix: "/settings", cap: "view_settings" },
  { prefix: "/create", cap: "view_create" },
  { prefix: "/report-bug", cap: "view_report_bug" },
  { prefix: "/my-bugs", cap: "view_my_bugs" },
];

export function pathRequiresCap(pathname: string): Capability | null {
  for (const g of URL_GUARD) {
    if (pathname === g.prefix || pathname.startsWith(g.prefix + "/")) return g.cap;
  }
  return null;
}

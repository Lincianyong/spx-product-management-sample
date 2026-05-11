import type { Role } from "./types";

// Surface-level access: which roles can land on which URLs.
// Mirror the docs' R-01 to R-07 + RC matrix.
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
  | "view_activity"
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
  "view_notifications", "view_activity", "view_settings", "view_create",
  "commit_sprint", "edit_epic", "edit_project", "triage_action",
  "create_ticket", "set_points", "assign_ticket", "comment",
];

export const PERMISSIONS: Record<Role, Capability[]> = {
  admin: [...ALL, "view_report_bug"],
  pm: [
    "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_activity", "view_settings", "view_create",
    "commit_sprint", "edit_epic", "edit_project", "triage_action",
    "create_ticket", "assign_ticket", "comment",
  ],
  em: [
    "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_activity", "view_settings", "view_create",
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

// Map URL prefix → required capability
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
  { prefix: "/activity", cap: "view_activity" },
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

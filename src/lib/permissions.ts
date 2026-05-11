import type { Role } from "./types";

// Surface-level access + action-level capabilities.
// Most surfaces are flat (every role can view) — but creation is gated
// per the lane: PM lane = Epic + Ticket + Bug, Eng lane = Tech Task + Bug.
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
  | "view_my_bugs"
  | "view_report_bug"
  // Creation surfaces (URL-gated, lane-specific)
  | "view_create_epic"
  | "view_create_ticket"
  | "view_create_tech_task"
  // Action capabilities
  | "create_epic"
  | "create_ticket"
  | "create_tech_task"
  | "create_bug"
  | "commit_sprint"
  | "edit_epic"
  | "edit_project"
  | "triage_action"
  | "set_points"
  | "assign_ticket"
  | "comment";

const FLAT_VIEWS: Capability[] = [
  "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
  "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
  "view_notifications", "view_settings", "view_my_bugs", "view_report_bug",
];

const FLAT_ACTIONS: Capability[] = [
  "commit_sprint", "edit_epic", "edit_project", "triage_action",
  "set_points", "assign_ticket", "comment",
];

// Per-role create capabilities. This is the lane logic the spec describes:
// PM lane creates Epics + Engineering tickets + Bugs.
// Eng lane creates Tech Tasks + Bugs.
// Admin gets everything; Guest only files Bugs; Leadership reads + comments + may file Bugs.
export const PERMISSIONS: Record<Role, Capability[]> = {
  admin: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "view_create_epic", "view_create_ticket", "view_create_tech_task",
    "create_epic", "create_ticket", "create_tech_task", "create_bug",
  ],
  pm: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "view_create_epic", "view_create_ticket",
    "create_epic", "create_ticket", "create_bug",
  ],
  em: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "view_create_tech_task",
    "create_tech_task", "create_bug",
  ],
  engineer: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "view_create_tech_task",
    "create_tech_task", "create_bug",
  ],
  designer: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "view_create_tech_task",
    "create_tech_task", "create_bug",
  ],
  leadership: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_bug",
  ],
  guest: [
    "view_report_bug", "view_my_bugs",
    "create_bug",
  ],
};

// Legacy spec-strict matrix — kept for reference. Replace PERMISSIONS with this
// to re-impose the docs' R-01 to R-07 + RC matrix verbatim.
export const PERMISSIONS_LEGACY: Record<Role, Capability[]> = {
  admin: [...FLAT_VIEWS, ...FLAT_ACTIONS, "view_create_epic", "view_create_ticket", "view_create_tech_task", "create_epic", "create_ticket", "create_tech_task", "create_bug"],
  pm: [
    "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings",
    "view_create_epic", "view_create_ticket", "view_my_bugs", "view_report_bug",
    "commit_sprint", "edit_epic", "edit_project", "triage_action",
    "create_ticket", "create_epic", "create_bug", "assign_ticket", "comment",
  ],
  em: [
    "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings", "view_create_tech_task",
    "view_my_bugs", "view_report_bug",
    "commit_sprint", "edit_project", "create_tech_task", "create_bug",
    "set_points", "assign_ticket", "comment",
  ],
  engineer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_create_tech_task",
    "view_my_bugs", "view_report_bug",
    "create_tech_task", "create_bug", "set_points", "comment",
  ],
  designer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_create_tech_task",
    "view_my_bugs", "view_report_bug",
    "create_tech_task", "create_bug", "set_points", "comment",
  ],
  leadership: [
    "view_portfolio", "view_epics", "view_timeline", "view_heatmap",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug",
    "create_bug", "comment",
  ],
  guest: ["view_report_bug", "view_my_bugs", "create_bug"],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(cap);
}

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
  // Lane-specific creation gates
  { prefix: "/create-epic", cap: "view_create_epic" },
  { prefix: "/create-tech-task", cap: "view_create_tech_task" },
  { prefix: "/create", cap: "view_create_ticket" }, // generic ticket = engineering only
  { prefix: "/report-bug", cap: "view_report_bug" },
  { prefix: "/my-bugs", cap: "view_my_bugs" },
];

export function pathRequiresCap(pathname: string): Capability | null {
  for (const g of URL_GUARD) {
    if (pathname === g.prefix || pathname.startsWith(g.prefix + "/")) return g.cap;
  }
  return null;
}

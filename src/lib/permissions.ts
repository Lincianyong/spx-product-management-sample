import type { Role } from "./types";

// All surface-level views are flat (every role can navigate to every page) —
// EXCEPT lane-specific creation, which is gated on the unified Create page
// by `create_*` capabilities.
//
// To re-impose the docs' R-01 to R-07 + RC matrix verbatim, swap the
// PERMISSIONS export for PERMISSIONS_LEGACY at the bottom of this file.
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
  | "view_create"
  // Action capabilities — ONLY the create_* family is enforced today.
  // The rest stay listed for future re-tightening.
  | "create_epic"
  | "create_ticket"
  | "create_tech_task"
  | "create_bug"
  | "pick_for_sprint"   // Stage 4a — PM lane (check picks, drag rank, send to Eng)
  | "set_points"        // Stage 4b — Eng lane (estimate, concern flags, hand to Joint)
  | "commit_sprint"     // Stage 4c — PM/EM (assign + commit)
  | "edit_epic"
  | "edit_project"
  | "triage_action"
  | "assign_ticket"
  | "comment";

const FLAT_VIEWS: Capability[] = [
  "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
  "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
  "view_notifications", "view_settings", "view_my_bugs", "view_report_bug",
  "view_create",
];

// Universal-action caps: anyone can comment / edit (still lane-gated for picklist+estimation
// at the action level below).
const FLAT_ACTIONS: Capability[] = [
  "edit_epic", "edit_project", "triage_action", "assign_ticket", "comment",
];

// Lane-specific creation per the spec:
//   PM lane    → Epic + Engineering Ticket + Bug
//   Eng lane   → Tech Task + Bug
//   Leadership → Bug
//   Guest      → Bug
//   Admin      → all
export const PERMISSIONS: Record<Role, Capability[]> = {
  admin: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_epic", "create_ticket", "create_tech_task", "create_bug",
    "pick_for_sprint", "set_points", "commit_sprint",
  ],
  pm: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_epic", "create_ticket", "create_bug",
    "pick_for_sprint",   // Stage 4a — PM lane
    "commit_sprint",     // Stage 4c — assigns + commits
  ],
  em: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_tech_task", "create_bug",
    "set_points",        // Stage 4b — facilitates estimation
    "commit_sprint",     // Stage 4c — also commits
  ],
  engineer: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_tech_task", "create_bug",
    "set_points",        // Stage 4b — Eng lane
  ],
  designer: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_tech_task", "create_bug",
    "set_points",
  ],
  leadership: [
    ...FLAT_VIEWS,
    ...FLAT_ACTIONS,
    "create_bug",
  ],
  // Guest is the one role still surface-restricted — they only see Bug.
  guest: [
    "view_report_bug", "view_my_bugs", "view_create",
    "create_bug",
  ],
};

// Legacy spec-strict matrix — kept for reference. Replace PERMISSIONS with this
// to re-impose the docs' R-01 to R-07 + RC matrix verbatim.
export const PERMISSIONS_LEGACY: Record<Role, Capability[]> = {
  admin: [...FLAT_VIEWS, ...FLAT_ACTIONS, "create_epic", "create_ticket", "create_tech_task", "create_bug"],
  pm: [
    "view_triage", "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug", "view_create",
    "commit_sprint", "edit_epic", "edit_project", "triage_action",
    "create_ticket", "create_epic", "create_bug", "assign_ticket", "comment",
  ],
  em: [
    "view_backlog", "view_planning", "view_sprint", "view_my_work",
    "view_epics", "view_portfolio", "view_heatmap", "view_timeline",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug", "view_create",
    "commit_sprint", "edit_project", "create_tech_task", "create_bug",
    "set_points", "assign_ticket", "comment",
  ],
  engineer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug", "view_create",
    "create_tech_task", "create_bug", "set_points", "comment",
  ],
  designer: [
    "view_sprint", "view_my_work", "view_epics", "view_backlog",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug", "view_create",
    "create_tech_task", "create_bug", "set_points", "comment",
  ],
  leadership: [
    "view_portfolio", "view_epics", "view_timeline", "view_heatmap",
    "view_notifications", "view_settings", "view_my_bugs", "view_report_bug", "view_create",
    "create_bug", "comment",
  ],
  guest: ["view_report_bug", "view_my_bugs", "view_create", "create_bug"],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(cap);
}

// URL guard: only the unified Create surface is URL-gated by capability.
// Everything else is open under the flat-caps default.
const URL_GUARD: { prefix: string; cap: Capability }[] = [
  { prefix: "/create", cap: "view_create" },
  { prefix: "/my-bugs", cap: "view_my_bugs" },
];

export function pathRequiresCap(pathname: string): Capability | null {
  for (const g of URL_GUARD) {
    if (pathname === g.prefix || pathname.startsWith(g.prefix + "/")) return g.cap;
  }
  return null;
}

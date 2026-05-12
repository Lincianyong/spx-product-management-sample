import type { Role } from "./types";

/**
 * Permissions matrix collapsed to the two roles that remain: PM and
 * Engineer. Every signed-in user can navigate to every page; the matrix
 * only gates lane-specific creation + planning actions.
 */
export type Capability =
  // Lane / action capabilities
  | "create_epic"
  | "create_ticket"
  | "create_tech_task"
  | "create_bug"
  | "pick_for_sprint" // Stage 4a — PM lane
  | "set_points"      // Stage 4b — Eng lane
  | "commit_sprint"   // Stage 4c — PM commits
  | "edit_epic"
  | "assign_ticket"
  | "comment"
  // View-level (kept for back-compat in URL guards / older sidebar items)
  | "view_create"
  | "view_my_bugs";

const FLAT_ACTIONS: Capability[] = [
  "edit_epic",
  "assign_ticket",
  "comment",
  "view_create",
  "view_my_bugs",
];

export const PERMISSIONS: Record<Role, Capability[]> = {
  pm: [
    ...FLAT_ACTIONS,
    "create_epic",
    "create_ticket",
    "create_bug",
    "pick_for_sprint",
    "commit_sprint",
  ],
  engineer: [
    ...FLAT_ACTIONS,
    "create_tech_task",
    "create_bug",
    "set_points",
  ],
};

export function can(role: Role | undefined, cap: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(cap);
}

// Only /create + /my-bugs are URL-gated by capability; everything else is open.
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

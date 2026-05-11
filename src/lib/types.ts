export type Role =
  | "admin"
  | "pm"
  | "em"
  | "engineer"
  | "designer"
  | "leadership"
  | "guest";

export type Pod = "routing" | "sorting" | "forecasting" | "platform";

export type Priority = "P0" | "P1" | "P2";

export type Health = "on_track" | "at_risk" | "blocked" | "not_started";

export type TicketType = "engineering" | "bug" | "tech_task";

export type TicketStatus =
  | "draft"
  | "triage"
  | "reproduced"
  | "backlog"
  | "scheduled"
  | "in_progress"
  | "review"
  | "verifying"
  | "done"
  | "verified"
  | "cannot_reproduce"
  | "cancelled";

export type SprintState = "planning" | "active" | "closed";

export type ProjectStatus =
  | "backlog"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export interface User {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  role: Role;
  pod?: Pod;
  capacityPoints: number;
  expertiseTags: string[];
  status: "available" | "in_meeting" | "ooo";
  initials: string;
  colorKey: "a" | "b" | "c" | "d" | "e" | "f";
}

export interface Epic {
  id: string;
  key: string; // EPC-###
  title: string;
  thesis: string;
  quarter: string;
  status: ProjectStatus;
  health: Health;
  pmPicId: string;
  startDate: string;
  targetEndDate: string;
  tags: string[];
  position: number;
}

export interface Project {
  id: string;
  key: string; // PRJ-###
  title: string;
  description: string;
  epicId: string;
  status: ProjectStatus;
  health: Health;
  pmPicId: string;
  emPicId: string;
  startDate: string;
  targetEndDate: string;
  tags: string[];
  pod: Pod;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  done: boolean;
}

export interface LinkedWorkEdge {
  type: "blocks" | "blocked_by" | "relates_to" | "duplicates";
  ticketKey: string;
}

export interface Ticket {
  id: string;
  key: string; // CDN-#### / BUG-#### / TCH-####
  type: TicketType;
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  projectId: string | null; // null = ad-hoc
  priority: Priority;
  status: TicketStatus;
  authorId: string;
  tags: string[];
  pickedForSprint: boolean;
  picklistRank: number | null;
  storyPoints: number | null;
  concernFlags: string[];
  assigneeId: string | null;
  sprintId: string | null;
  startedAt: string | null;
  closedAt: string | null;
  linkedWork: LinkedWorkEdge[];
  carryOver: boolean;
  createdAt: string;
  backlogRank?: number;
  personalRank?: number;
  // Bug-specific
  severity?: "S1" | "S2" | "S3";
  reproSteps?: string;
  expectedVsActual?: string;
  affectedScope?: string;
  sentryLink?: string;
  // Tech-specific
  blastRadius?: string;
  rollbackPlan?: string;
  migrationWindow?: string;
  // AI-suggested
  aiSuggestedParent?: { projectKey: string; confidence: number; reasoning: string };
  aiSuggestedPoints?: { value: number; confidence: number; reasoning: string };
  aiSuggestedAssignee?: { userId: string; confidence: number; reasoning: string };
  aiDuplicates?: { ticketKey: string; confidence: number }[];
  blocked?: { reason: string; blockerKey?: string };
}

export interface Sprint {
  id: string;
  key: string; // W##-YYYY
  startDate: string;
  endDate: string;
  state: SprintState;
  committedPoints: number;
  shippedPoints: number;
  committedAt: string | null;
}

export interface Comment {
  id: string;
  entityType: "ticket" | "epic" | "project" | "ac_item";
  entityId: string;
  parentCommentId: string | null;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  editedAt: string | null;
  deletedAt?: string | null;
  reactions: Record<string, string[]>;
  resolvedById: string | null;
  resolvedAt?: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  kind:
    | "mention"
    | "assignment"
    | "status_change"
    | "sla_breach"
    | "sprint_commit"
    | "sprint_close"
    | "blocked"
    | "health_change"
    | "bug_needs_verify"
    | "triage_new"
    | "digest";
  body: string;
  entityType?: "ticket" | "epic" | "project" | "sprint";
  entityKey?: string;
  actorId?: string;
  createdAt: string;
  read: boolean;
  archived: boolean;
  snoozedUntil?: string;
}

export interface ActivityEntry {
  id: string;
  entityType: "ticket" | "epic" | "project" | "sprint";
  entityId: string;
  actorId: string;
  action: string;
  field?: string;
  beforeValue?: string;
  afterValue?: string;
  timestamp: string;
  aiInfluenced: boolean;
}

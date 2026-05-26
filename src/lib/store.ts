"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Ticket,
  Sprint,
  Epic,
  Milestone,
  Comment,
  Notification,
  ActivityEntry,
  User,
  TicketStatus,
} from "./types";
import { STATUS_TRANSITIONS } from "./types";
import {
  seedUsers,
  seedEpics,
  seedTickets,
  seedSprints,
  seedComments,
  seedNotifications,
  seedActivity,
  seedMilestones,
} from "./mock-data";

export interface SavedView {
  id: string;
  name: string;
  surface: "epics" | "sprint";
  ownerId: string;
  createdAt: string;
  // Epic-board specific
  viewMode?: "kanban" | "list" | "table" | "timeline" | "backlog";
  groupBy?: "health" | "quarter" | "pic" | "program";
  // Sprint-board specific
  sprintFilter?: "me" | "all";
}

export interface AppState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  // Transient: which ticket was just moved (for flash animation)
  recentlyMovedTicketId: string | null;
  flashTicket: (ticketId: string) => void;

  // Transient: currently selected sprint to view on the board (defaults to active)
  selectedSprintId: string | null;
  selectSprint: (sprintId: string | null) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;

  currentUserId: string | null;
  signIn: (userId: string) => void;
  signOut: () => void;

  savedViews: SavedView[];
  saveView: (v: Omit<SavedView, "id" | "createdAt">) => string;
  deleteView: (id: string) => void;

  users: User[];
  epics: Epic[];
  milestones: Milestone[];
  tickets: Ticket[];
  sprints: Sprint[];
  comments: Comment[];
  notifications: Notification[];
  activity: ActivityEntry[];

  // Mutations
  addMilestone: (epicId: string, m: Omit<Milestone, "id" | "epicId" | "order" | "status" | "actualDate">, actorId: string) => string;
  updateMilestone: (id: string, patch: Partial<Milestone>, actorId: string) => void;
  completeMilestone: (id: string, actorId: string) => void;
  deleteMilestone: (id: string, actorId: string) => void;
  setTicketStatus: (ticketId: string, status: TicketStatus, actorId: string, opts?: { force?: boolean }) => void;
  isValidTransition: (ticketId: string, to: TicketStatus) => boolean;
  toggleAcceptanceCriterion: (ticketId: string, acId: string, actorId: string) => void;
  setTicketField: (ticketId: string, patch: Partial<Ticket>, actorId: string) => void;
  /** Block / unblock a ticket with full audit. Pass null to unblock. */
  setTicketBlocked: (
    ticketId: string,
    blocked: { reason: string; blockerKey?: string } | null,
    actorId: string
  ) => void;
  /** Append a free-form status update from the actor to the activity log. */
  addStatusNote: (ticketId: string, note: string, actorId: string) => void;
  addComment: (c: Omit<Comment, "id" | "createdAt" | "editedAt" | "reactions" | "resolvedById">) => void;
  editComment: (commentId: string, body: string, editorId: string) => void;
  deleteComment: (commentId: string, deleterId: string) => void;
  resolveComment: (commentId: string, userId: string) => void;
  unresolveComment: (commentId: string) => void;
  reactToComment: (commentId: string, emoji: string, userId: string) => void;
  markNotificationRead: (id: string, read?: boolean) => void;
  archiveNotification: (id: string) => void;
  snoozeNotification: (id: string, until: string) => void;

  channelPrefs: Record<string, { inApp: boolean; lark: boolean; email: boolean }>;
  setChannelPref: (event: string, channel: "inApp" | "lark" | "email", on: boolean) => void;

  setPickedForSprint: (ticketIds: string[], picked: boolean) => void;
  setPicklistRanks: (ranks: { ticketId: string; rank: number }[]) => void;
  setBacklogRanks: (ranks: { ticketId: string; rank: number }[]) => void;
  setPersonalRanks: (ranks: { ticketId: string; rank: number }[]) => void;
  commitSprint: (sprintId: string) => void;

  resetMockData: () => void;
}

const baseSeed = () => ({
  users: seedUsers,
  epics: seedEpics,
  milestones: seedMilestones,
  tickets: seedTickets,
  sprints: seedSprints,
  comments: seedComments,
  notifications: seedNotifications,
  activity: seedActivity,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      recentlyMovedTicketId: null,
      flashTicket: (ticketId) => {
        set({ recentlyMovedTicketId: ticketId });
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            const cur = useAppStore.getState().recentlyMovedTicketId;
            if (cur === ticketId) set({ recentlyMovedTicketId: null });
          }, 1500);
        }
      },

      selectedSprintId: null,
      selectSprint: (sprintId) => set({ selectedSprintId: sprintId }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      theme: "light",
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setTheme: (t) => set({ theme: t }),

      currentUserId: null,
      signIn: (userId) => set({ currentUserId: userId }),
      signOut: () => set({ currentUserId: null }),

      savedViews: [],
      saveView: (v) => {
        const id = `sv_${Date.now()}`;
        set((s) => ({
          savedViews: [...s.savedViews, { ...v, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      deleteView: (id) => set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),

      ...baseSeed(),

      addMilestone: (epicId, m, actorId) => {
        const id = `m_${Math.random().toString(36).slice(2, 10)}`;
        set((s) => {
          const siblings = s.milestones.filter((x) => x.epicId === epicId);
          const order = siblings.reduce((acc, x) => Math.max(acc, x.order), 0) + 1;
          // First-ever milestone: if epic has started, it goes in_progress; otherwise pending.
          const epic = s.epics.find((e) => e.id === epicId);
          const epicStarted = epic ? new Date(epic.startDate).getTime() <= Date.now() : false;
          const status: Milestone["status"] = siblings.length === 0 && epicStarted ? "in_progress" : "pending";
          const milestone: Milestone = {
            id,
            epicId,
            order,
            status,
            actualDate: null,
            name: m.name,
            targetDate: m.targetDate,
            entryCriteria: m.entryCriteria,
            exitCriteria: m.exitCriteria,
          };
          return {
            milestones: [...s.milestones, milestone],
            activity: [
              ...s.activity,
              {
                id: `a_${Date.now()}`,
                entityType: "epic" as const,
                entityId: epicId,
                actorId,
                action: "milestone_added",
                afterValue: m.name,
                timestamp: new Date().toISOString(),
                aiInfluenced: false,
              },
            ],
          };
        });
        return id;
      },

      updateMilestone: (id, patch, actorId) =>
        set((s) => ({
          milestones: s.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)),
          activity: [
            ...s.activity,
            {
              id: `a_${Date.now()}`,
              entityType: "epic" as const,
              entityId: s.milestones.find((m) => m.id === id)?.epicId ?? "",
              actorId,
              action: "milestone_updated",
              timestamp: new Date().toISOString(),
              aiInfluenced: false,
            },
          ],
        })),

      completeMilestone: (id, actorId) =>
        set((s) => {
          const m = s.milestones.find((x) => x.id === id);
          if (!m) return s;
          const now = new Date().toISOString();
          const slipDays = Math.max(0, Math.round((Date.now() - new Date(m.targetDate).getTime()) / 86_400_000));

          // Find the next milestone in order and auto-advance to in_progress.
          const siblings = s.milestones
            .filter((x) => x.epicId === m.epicId)
            .sort((a, b) => a.order - b.order);
          const idx = siblings.findIndex((x) => x.id === id);
          const next = siblings[idx + 1];

          return {
            milestones: s.milestones.map((x) => {
              if (x.id === id) return { ...x, status: "complete" as const, actualDate: now };
              if (next && x.id === next.id && x.status === "pending") return { ...x, status: "in_progress" as const };
              return x;
            }),
            activity: [
              ...s.activity,
              {
                id: `a_${Date.now()}`,
                entityType: "epic" as const,
                entityId: m.epicId,
                actorId,
                action: slipDays > 0 ? `milestone_complete_slipped_${slipDays}d` : "milestone_complete",
                afterValue: m.name,
                timestamp: now,
                aiInfluenced: false,
              },
            ],
          };
        }),

      deleteMilestone: (id, actorId) =>
        set((s) => {
          const m = s.milestones.find((x) => x.id === id);
          if (!m) return s;
          return {
            milestones: s.milestones.filter((x) => x.id !== id),
            activity: [
              ...s.activity,
              {
                id: `a_${Date.now()}`,
                entityType: "epic" as const,
                entityId: m.epicId,
                actorId,
                action: "milestone_deleted",
                beforeValue: m.name,
                timestamp: new Date().toISOString(),
                aiInfluenced: false,
              },
            ],
          };
        }),

      isValidTransition: (ticketId: string, to: TicketStatus): boolean => {
        const ticket = get().tickets.find((t: Ticket) => t.id === ticketId);
        if (!ticket) return false;
        const allowed = STATUS_TRANSITIONS[ticket.type]?.[ticket.status] ?? [];
        return allowed.includes(to);
      },

      setTicketStatus: (ticketId, status, actorId, opts) =>
        set((s) => {
          const ticket = s.tickets.find((t) => t.id === ticketId);
          if (!ticket) return s;
          // Validate transition (unless forced)
          if (!opts?.force) {
            const allowed = STATUS_TRANSITIONS[ticket.type]?.[ticket.status] ?? [];
            if (!allowed.includes(status) && status !== ticket.status) {
              return s;
            }
          }
          const before = ticket.status;
          const updates: Partial<Ticket> = { status };
          if (status === "in_progress" && !ticket.startedAt) updates.startedAt = new Date().toISOString();
          if ((status === "done" || status === "verified") && !ticket.closedAt)
            updates.closedAt = new Date().toISOString();

          // Bug-specific side effects: notify reporter on Verifying
          const newNotifications: typeof s.notifications = [];
          if (ticket.type === "bug" && status === "verifying") {
            newNotifications.push({
              id: `n_${Date.now()}_v`,
              userId: ticket.authorId,
              kind: "bug_needs_verify",
              body: `${ticket.key} is ready for you to verify`,
              entityType: "ticket",
              entityKey: ticket.key,
              actorId,
              createdAt: new Date().toISOString(),
              read: false,
              archived: false,
            });
          }
          if (ticket.type === "bug" && status === "verified") {
            // Close out any prior verify reminders
          }

          return {
            tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)),
            activity: [
              ...s.activity,
              {
                id: `a_${Date.now()}`,
                entityType: "ticket",
                entityId: ticketId,
                actorId,
                action: "status_change",
                field: "status",
                beforeValue: before,
                afterValue: status,
                timestamp: new Date().toISOString(),
                aiInfluenced: false,
              },
            ],
            notifications: [...s.notifications, ...newNotifications],
          };
        }),

      toggleAcceptanceCriterion: (ticketId, acId, actorId) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  acceptanceCriteria: t.acceptanceCriteria.map((ac) =>
                    ac.id === acId ? { ...ac, done: !ac.done } : ac
                  ),
                }
              : t
          ),
          activity: [
            ...s.activity,
            {
              id: `a_${Date.now()}`,
              entityType: "ticket",
              entityId: ticketId,
              actorId,
              action: "ac_toggle",
              field: "ac",
              timestamp: new Date().toISOString(),
              aiInfluenced: false,
            },
          ],
        })),

      setTicketField: (ticketId, patch, actorId) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, ...patch } : t)),
          activity: [
            ...s.activity,
            {
              id: `a_${Date.now()}`,
              entityType: "ticket",
              entityId: ticketId,
              actorId,
              action: "field_update",
              field: Object.keys(patch).join(","),
              timestamp: new Date().toISOString(),
              aiInfluenced: false,
            },
          ],
        })),

      setTicketBlocked: (ticketId, blocked, actorId) =>
        set((s) => {
          const prev = s.tickets.find((t) => t.id === ticketId);
          if (!prev) return {};
          // Mirror the change onto the linked-work graph so the /me lanes
          // and any future blocker query don't have to read both
          // representations. When a blocker key is named, we add a
          // `blocked_by` edge; when unblocking, we strip whatever
          // `blocked_by` edges were there.
          let nextLinked = prev.linkedWork;
          if (blocked && blocked.blockerKey) {
            const key = blocked.blockerKey.trim().toUpperCase();
            if (!prev.linkedWork.some((e) => e.type === "blocked_by" && e.ticketKey === key)) {
              nextLinked = [...prev.linkedWork, { type: "blocked_by", ticketKey: key }];
            }
          } else if (!blocked) {
            nextLinked = prev.linkedWork.filter((e) => e.type !== "blocked_by");
          }
          return {
            tickets: s.tickets.map((t) =>
              t.id === ticketId
                ? { ...t, blocked: blocked ?? undefined, linkedWork: nextLinked }
                : t
            ),
            activity: [
              ...s.activity,
              {
                id: `a_${Date.now()}`,
                entityType: "ticket",
                entityId: ticketId,
                actorId,
                action: blocked ? "blocked" : "unblocked",
                field: "blocked",
                beforeValue: prev.blocked?.reason ?? undefined,
                afterValue: blocked
                  ? blocked.blockerKey
                    ? `${blocked.reason} (by ${blocked.blockerKey.toUpperCase()})`
                    : blocked.reason
                  : undefined,
                timestamp: new Date().toISOString(),
                aiInfluenced: false,
              },
            ],
          };
        }),

      addStatusNote: (ticketId, note, actorId) => {
        const trimmed = note.trim();
        if (!trimmed) return;
        set((s) => ({
          activity: [
            ...s.activity,
            {
              id: `a_${Date.now()}`,
              entityType: "ticket",
              entityId: ticketId,
              actorId,
              action: "status_note",
              field: "note",
              afterValue: trimmed,
              timestamp: new Date().toISOString(),
              aiInfluenced: false,
            },
          ],
        }));
      },

      addComment: (c) =>
        set((s) => ({
          comments: [
            ...s.comments,
            {
              ...c,
              id: `c_${Date.now()}`,
              createdAt: new Date().toISOString(),
              editedAt: null,
              reactions: {},
              resolvedById: null,
            },
          ],
        })),

      editComment: (commentId, body, editorId) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId && c.authorId === editorId
              ? { ...c, body, editedAt: new Date().toISOString() }
              : c
          ),
        })),

      deleteComment: (commentId, deleterId) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId
              ? { ...c, body: "[deleted]", deletedAt: new Date().toISOString(), authorId: c.authorId }
              : c
          ),
        })),

      resolveComment: (commentId, userId) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId ? { ...c, resolvedById: userId, resolvedAt: new Date().toISOString() } : c
          ),
        })),

      unresolveComment: (commentId) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === commentId ? { ...c, resolvedById: null, resolvedAt: null } : c
          ),
        })),

      reactToComment: (commentId, emoji, userId) =>
        set((s) => ({
          comments: s.comments.map((c) => {
            if (c.id !== commentId) return c;
            const existing = c.reactions[emoji] ?? [];
            const next = existing.includes(userId)
              ? existing.filter((x) => x !== userId)
              : [...existing, userId];
            const reactions = { ...c.reactions, [emoji]: next };
            if (next.length === 0) delete reactions[emoji];
            return { ...c, reactions };
          }),
        })),

      markNotificationRead: (id, read = true) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read } : n)),
        })),

      archiveNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, archived: true } : n)),
        })),

      snoozeNotification: (id, until) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, snoozedUntil: until, read: true } : n)),
        })),

      channelPrefs: {
        mention: { inApp: true, lark: true, email: false },
        assignment: { inApp: true, lark: true, email: false },
        status_change: { inApp: true, lark: false, email: false },
        sla_breach: { inApp: true, lark: true, email: true },
        sprint_commit: { inApp: true, lark: true, email: false },
        bug_needs_verify: { inApp: true, lark: true, email: false },
        digest: { inApp: false, lark: false, email: true },
      },
      setChannelPref: (event, channel, on) =>
        set((s) => {
          const prev = s.channelPrefs[event] ?? { inApp: false, lark: false, email: false };
          return {
            channelPrefs: { ...s.channelPrefs, [event]: { ...prev, [channel]: on } },
          };
        }),

      setPickedForSprint: (ticketIds, picked) =>
        set((s) => ({
          tickets: s.tickets.map((t) =>
            ticketIds.includes(t.id) ? { ...t, pickedForSprint: picked } : t
          ),
        })),

      setPicklistRanks: (ranks) =>
        set((s) => ({
          tickets: s.tickets.map((t) => {
            const r = ranks.find((x) => x.ticketId === t.id);
            return r ? { ...t, picklistRank: r.rank } : t;
          }),
        })),

      setBacklogRanks: (ranks) =>
        set((s) => ({
          tickets: s.tickets.map((t) => {
            const r = ranks.find((x) => x.ticketId === t.id);
            return r ? { ...t, backlogRank: r.rank } : t;
          }),
        })),

      setPersonalRanks: (ranks) =>
        set((s) => ({
          tickets: s.tickets.map((t) => {
            const r = ranks.find((x) => x.ticketId === t.id);
            return r ? { ...t, personalRank: r.rank } : t;
          }),
        })),

      commitSprint: (sprintId) =>
        set((s) => {
          const sprintTickets = s.tickets.filter((t) => t.pickedForSprint && t.sprintId === sprintId);
          const totalPoints = sprintTickets.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0);
          return {
            sprints: s.sprints.map((sp) =>
              sp.id === sprintId
                ? {
                    ...sp,
                    state: "active",
                    committedPoints: totalPoints,
                    committedAt: new Date().toISOString(),
                  }
                : sp
            ),
            tickets: s.tickets.map((t) =>
              t.pickedForSprint && t.sprintId === sprintId && t.status === "backlog"
                ? { ...t, status: "scheduled" }
                : t
            ),
          };
        }),

      resetMockData: () => set({ ...baseSeed(), currentUserId: null }),
    }),
    {
      name: "cadence-v1",
      // Bumped when the persisted shape grew (theme + sidebarCollapsed
      // were added). Bumped again to v7 to re-seed Epic.programs so the
      // portfolio allocation chart shows variety on existing installs.
      version: 8,
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage))),
      // Defensive merge: if the persisted blob is malformed (different shape
      // from a previous build), fall back to current defaults instead of
      // crashing the app on hydration.
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        try {
          return { ...current, ...(persisted as Partial<AppState>) };
        } catch {
          return current;
        }
      },
      migrate: (persisted) => {
        // Older payloads predate Epic.programs (and other data refreshes),
        // so drop persisted data fields and keep only UI prefs. The store
        // will fall back to the current seed for everything else.
        if (!persisted || typeof persisted !== "object") return persisted as Partial<AppState>;
        const p = persisted as Partial<AppState>;
        return {
          currentUserId: p.currentUserId,
          sidebarCollapsed: p.sidebarCollapsed,
          theme: p.theme,
          channelPrefs: p.channelPrefs,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        users: s.users,
        epics: s.epics,
        milestones: s.milestones,
        tickets: s.tickets,
        sprints: s.sprints,
        comments: s.comments,
        notifications: s.notifications,
        activity: s.activity,
        savedViews: s.savedViews,
        channelPrefs: s.channelPrefs,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
      }),
    }
  )
);

// ─── Selectors ──────────────────────────────────────────────────────
export const useCurrentUser = () => {
  const userId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  return userId ? users.find((u) => u.id === userId) ?? null : null;
};

export const userById = (id: string | null | undefined) => {
  if (!id) return undefined;
  return useAppStore.getState().users.find((u) => u.id === id);
};

export const epicByKey = (key: string) =>
  useAppStore.getState().epics.find((e) => e.key === key);

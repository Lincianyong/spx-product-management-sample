"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Ticket,
  Sprint,
  Epic,
  Project,
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
  seedProjects,
  seedTickets,
  seedSprints,
  seedComments,
  seedNotifications,
  seedActivity,
} from "./mock-data";

export interface SavedView {
  id: string;
  name: string;
  surface: "epics";
  viewMode: "kanban" | "list" | "table" | "timeline" | "backlog";
  groupBy: "health" | "quarter" | "pic";
  ownerId: string;
  createdAt: string;
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
  projects: Project[];
  tickets: Ticket[];
  sprints: Sprint[];
  comments: Comment[];
  notifications: Notification[];
  activity: ActivityEntry[];

  // Mutations
  setTicketStatus: (ticketId: string, status: TicketStatus, actorId: string, opts?: { force?: boolean }) => void;
  isValidTransition: (ticketId: string, to: TicketStatus) => boolean;
  toggleAcceptanceCriterion: (ticketId: string, acId: string, actorId: string) => void;
  setTicketField: (ticketId: string, patch: Partial<Ticket>, actorId: string) => void;
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
  projects: seedProjects,
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
      // were added). Old payloads are simply ignored — we keep defaults.
      version: 3,
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
      migrate: (persisted) => persisted as Partial<AppState>,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        users: s.users,
        epics: s.epics,
        projects: s.projects,
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

export const projectByKey = (key: string) =>
  useAppStore.getState().projects.find((p) => p.key === key);

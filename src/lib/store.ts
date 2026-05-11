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

export interface AppState {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  currentUserId: string | null;
  signIn: (userId: string) => void;
  signOut: () => void;

  users: User[];
  epics: Epic[];
  projects: Project[];
  tickets: Ticket[];
  sprints: Sprint[];
  comments: Comment[];
  notifications: Notification[];
  activity: ActivityEntry[];

  // Mutations
  setTicketStatus: (ticketId: string, status: TicketStatus, actorId: string) => void;
  toggleAcceptanceCriterion: (ticketId: string, acId: string, actorId: string) => void;
  setTicketField: (ticketId: string, patch: Partial<Ticket>, actorId: string) => void;
  addComment: (c: Omit<Comment, "id" | "createdAt" | "editedAt" | "reactions" | "resolvedById">) => void;
  reactToComment: (commentId: string, emoji: string, userId: string) => void;
  markNotificationRead: (id: string, read?: boolean) => void;
  archiveNotification: (id: string) => void;

  setPickedForSprint: (ticketIds: string[], picked: boolean) => void;
  setPicklistRanks: (ranks: { ticketId: string; rank: number }[]) => void;
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

      currentUserId: null,
      signIn: (userId) => set({ currentUserId: userId }),
      signOut: () => set({ currentUserId: null }),

      ...baseSeed(),

      setTicketStatus: (ticketId, status, actorId) =>
        set((s) => {
          const ticket = s.tickets.find((t) => t.id === ticketId);
          if (!ticket) return s;
          const before = ticket.status;
          const updates: Partial<Ticket> = { status };
          if (status === "in_progress" && !ticket.startedAt) updates.startedAt = new Date().toISOString();
          if ((status === "done" || status === "verified") && !ticket.closedAt)
            updates.closedAt = new Date().toISOString();
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
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage))),
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

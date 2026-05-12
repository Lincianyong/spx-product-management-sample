# Cadence

Editorial product-management tool for SPX Express AI Engineering - built in Next.js as a UI-first sample (no database, all state in localStorage via Zustand).

## Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Sample accounts (password `12345678` for all)

| Email | Role | Lands on |
|---|---|---|
| `pm@spxexpress.com` | PM (Albert Halim) | Epic Board |
| `pmlead@spxexpress.com` | Leadership (Diana Wijaya) | Portfolio Health |
| `eng@spxexpress.com` | Engineer (Andre Halim) | My Work |
| `guest@spxexpress.com` | Guest (Ronaldo Tan) | Bug Report |

## What's wired

- **Sprint loop**: `/sprint` (drag-drop kanban + ad-hoc lane + sprint progress)
- **Engineer daily home**: `/me` (four panels)
- **Ticket detail**: `/t/[key]` (also opens as slide-over from boards)
- **Epic Board**: `/epics` (5 view modes - Kanban / List / Table / Timeline / Backlog)
- **Project & Epic detail**: `/p/[key]`, `/e/[key]`
- **Three-stage planning**: `/planning/picklist` → `/estimation` → `/joint` (sprint commit with VR validation gate)
- **Triage Inbox**: `/triage` (AI parent + dedupe suggestions with reasoning tooltips)
- **Backlog**: `/backlog` (stale-flagged, filterable)
- **Create**: `/create` (Quick / Full with AI drafting / Bulk CSV)
- **Bug Report (Guest)**: `/report-bug`
- **Workload Heatmap**: `/heatmap` (12-week forward, color by % capacity)
- **Portfolio Health (Leadership)**: `/portfolio`
- **Timeline**: `/timeline`
- **Notifications**: `/notifications`
- **Cmd-K palette**: ⌘K anywhere (fuzzy search + actions)
- **Engineer / PM profile**: `/u/[handle]`
- **Sprint Close / Retro**: `/sprint-close`
- **Activity Log**: `/activity`
- **Settings**: `/settings` (role matrix, integrations, notifications)

## Design system

Three families, three altitudes:
- **Instrument Serif (italic, ≥22px)** - display headlines
- **Inter** - body (Geist would be the closer match per spec; substituted for Next-bundled availability)
- **JetBrains Mono** - captions, pills, IDs, technical strings

Surface: warm cream `#F6F2EB` · Accent: deep forest green `#1E3A2E` · AI: violet `#5B3FB8`

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript · Tailwind
- Zustand + localStorage for state
- @dnd-kit for Sprint Board drag-drop
- cmdk for Cmd-K palette

## Demo data reset

Avatar menu → "Reset demo data" - restores seed Epics, Projects, Tickets, Sprints, Users, Comments, Notifications.

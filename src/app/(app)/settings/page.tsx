"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button, Pill, RolePill, toast } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";

const TABS = ["workspace", "roles", "integrations", "notifications"] as const;

const ROLE_MATRIX: Record<string, Record<string, "✓" | "—" | "PIC" | "Read">> = {
  "Create Ticket": { admin: "✓", pm: "✓", em: "✓", engineer: "✓", designer: "✓", leadership: "—", guest: "✓" },
  "Triage": { admin: "✓", pm: "✓", em: "—", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Promote Triage→Backlog": { admin: "✓", pm: "✓", em: "—", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Create Project": { admin: "✓", pm: "✓", em: "PIC", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Edit Project": { admin: "✓", pm: "✓", em: "PIC", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Create Epic": { admin: "✓", pm: "✓", em: "—", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Edit Epic": { admin: "✓", pm: "PIC", em: "—", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Commit Sprint": { admin: "✓", pm: "✓", em: "✓", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Set Story Points": { admin: "✓", pm: "—", em: "✓", engineer: "✓", designer: "✓", leadership: "—", guest: "—" },
  "Assign Ticket": { admin: "✓", pm: "✓", em: "✓", engineer: "—", designer: "—", leadership: "—", guest: "—" },
  "Comment": { admin: "✓", pm: "✓", em: "✓", engineer: "✓", designer: "✓", leadership: "✓", guest: "—" },
  "View Portfolio": { admin: "✓", pm: "✓", em: "✓", engineer: "✓", designer: "✓", leadership: "✓", guest: "—" },
};

export default function SettingsPage() {
  const user = useCurrentUser();
  const resetMockData = useAppStore((s) => s.resetMockData);
  const [tab, setTab] = useState<(typeof TABS)[number]>("workspace");

  return (
    <div>
      <PageHeader
        eyebrow="S-21 · Settings"
        title={
          <>
            <em className="text-accent">Workspace</em> configuration.
          </>
        }
        lede="Admin-only in production. In this demo, anyone can see it for reference."
      />

      <div className="flex border-b border-rule mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 h-10 text-[13px] font-mono uppercase tracking-[0.06em] transition-colors duration-100 border-b-2 -mb-px capitalize",
              tab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "workspace" && (
        <div className="max-w-2xl space-y-4">
          <Row label="Workspace name" value="SPX Express · AI Engineering" />
          <Row label="Identity provider" value="SPX SSO (SAML 2.0)" />
          <Row label="Sprint length" value="1 week (Mon–Sun)" />
          <Row label="Pods" value="Routing · Sorting · Forecasting · Platform" />
          <Row label="Markdown subset" value="GitHub-flavored (GFM)" />
          <Row label="AC gates Done" value="Yes" />
          <Row label="Triage SLA" value="P0 4h · P1 24h · P2 1 week" />
          <div className="pt-4 border-t border-rule">
            <Button variant="danger" size="sm" onClick={() => { resetMockData(); toast("Demo data reset"); }}>
              Reset demo data
            </Button>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="bg-bg-card border border-rule rounded-[8px] overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-elevated">
              <tr className="border-b border-rule">
                <th className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">Capability</th>
                {["admin", "pm", "em", "engineer", "designer", "leadership", "guest"].map((r) => (
                  <th key={r} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">
                    {roleLabel[r as keyof typeof roleLabel]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_MATRIX).map(([cap, row]) => (
                <tr key={cap} className="border-b border-rule-soft">
                  <td className="px-4 py-2.5 text-[13px] text-ink">{cap}</td>
                  {Object.entries(row).map(([role, val]) => (
                    <td key={role} className="px-4 py-2.5 font-mono text-[12px] text-ink-3">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "integrations" && (
        <div className="grid grid-cols-3 gap-3 max-w-3xl">
          {[
            { name: "Lark", status: "Connected", body: "Sprint commit, mention, SLA breach → #cadence." },
            { name: "Slack", status: "Off", body: "Optional secondary channel for high-signal events." },
            { name: "GitHub", status: "Connected", body: "PR ↔ ticket linking via [CDN-####] in titles." },
            { name: "Sentry", status: "Connected", body: "Bug Triage auto-attaches Sentry trace links." },
            { name: "Linear", status: "Off", body: "One-way export for V2." },
            { name: "PagerDuty", status: "Off", body: "P0 escalation routing for SRE." },
          ].map((i) => (
            <div key={i.name} className="bg-bg-card border border-rule rounded-[8px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] text-ink font-medium">{i.name}</span>
                <Pill variant={i.status === "Connected" ? "ok" : "neutral"} dot>{i.status}</Pill>
              </div>
              <p className="text-[12px] text-ink-3">{i.body}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "notifications" && <NotificationPrefsTable />}
    </div>
  );
}

function NotificationPrefsTable() {
  const prefs = useAppStore((s) => s.channelPrefs);
  const setPref = useAppStore((s) => s.setChannelPref);
  const events: { key: string; label: string }[] = [
    { key: "mention", label: "Mention" },
    { key: "assignment", label: "Assigned to me" },
    { key: "status_change", label: "Status on watched" },
    { key: "sla_breach", label: "SLA breach (my Triage)" },
    { key: "sprint_commit", label: "Sprint commit" },
    { key: "bug_needs_verify", label: "Bug needs verification" },
    { key: "digest", label: "Daily digest" },
  ];
  return (
    <div className="max-w-3xl">
      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              {["Event", "In-app", "Lark", "Email"].map((h) => (
                <th key={h} className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const p = prefs[e.key] ?? { inApp: false, lark: false, email: false };
              return (
                <tr key={e.key} className="border-b border-rule-soft">
                  <td className="px-4 py-2.5 text-[13px] text-ink">{e.label}</td>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={p.inApp} onChange={(ev) => setPref(e.key, "inApp", ev.target.checked)} className="w-4 h-4 accent-accent" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={p.lark} onChange={(ev) => setPref(e.key, "lark", ev.target.checked)} className="w-4 h-4 accent-accent" />
                  </td>
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={p.email} onChange={(ev) => setPref(e.key, "email", ev.target.checked)} className="w-4 h-4 accent-accent" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ink-3 mt-3 font-mono">Preferences persist to localStorage and survive page reloads.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3 border-b border-rule-soft py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <span className="text-[14px] text-ink">{value}</span>
    </div>
  );
}

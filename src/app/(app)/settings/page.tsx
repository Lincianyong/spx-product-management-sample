"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppStore, useCurrentUser } from "@/lib/store";
import { Button, Checkbox, Pill, Modal, Input, toast } from "@/components/ui";
import { cn, roleLabel } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const TABS = ["workspace", "sso", "roles", "integrations", "notifications"] as const;
type Tab = (typeof TABS)[number];

const ROLE_MATRIX: Record<string, Record<string, "✓" | "-" | "PIC" | "Read">> = {
  "Create Ticket":      { pm: "✓",   engineer: "✓" },
  "Create Epic":        { pm: "✓",   engineer: "-" },
  "Edit Epic":          { pm: "PIC", engineer: "-" },
  "Commit Sprint":      { pm: "✓",   engineer: "-" },
  "Set Story Points":   { pm: "-",   engineer: "✓" },
  "Assign Ticket":      { pm: "✓",   engineer: "-" },
  "Comment":            { pm: "✓",   engineer: "✓" },
  "View Portfolio":     { pm: "✓",   engineer: "✓" },
};

interface Integration {
  id: string;
  name: string;
  status: "Connected" | "Off";
  body: string;
  authType: "OAuth" | "API key" | "Webhook";
  account?: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "lark", name: "Lark", status: "Connected", body: "Sprint commit + mentions → #cadence.", authType: "OAuth", account: "spxexpress.lark.com" },
  { id: "slack", name: "Slack", status: "Off", body: "Optional secondary channel for high-signal events.", authType: "OAuth" },
  { id: "github", name: "GitHub", status: "Connected", body: "PR ↔ ticket linking via [CDN-####] in titles.", authType: "OAuth", account: "spx/forecasting" },
  { id: "sentry", name: "Sentry", status: "Connected", body: "Bug reports auto-attach Sentry trace links.", authType: "API key", account: "spx-prod-org" },
  { id: "linear", name: "Linear", status: "Off", body: "One-way export for V2.", authType: "API key" },
  { id: "pagerduty", name: "PagerDuty", status: "Off", body: "P0 escalation routing for SRE.", authType: "OAuth" },
];

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const user = useCurrentUser();
  const resetMockData = useAppStore((s) => s.resetMockData);
  const [tab, setTab] = useState<Tab>("workspace");
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [connectFor, setConnectFor] = useState<Integration | null>(null);
  const [connectInput, setConnectInput] = useState("");

  const toggleIntegration = (id: string) => {
    const integ = integrations.find((i) => i.id === id);
    if (!integ) return;
    if (integ.status === "Connected") {
      setIntegrations((arr) => arr.map((i) => (i.id === id ? { ...i, status: "Off" as const, account: undefined } : i)));
      toast(`${integ.name} disconnected`, { kind: "info" });
    } else {
      setConnectFor(integ);
      setConnectInput("");
    }
  };

  const finishConnect = () => {
    if (!connectFor) return;
    if (!connectInput.trim()) return;
    setIntegrations((arr) => arr.map((i) => (i.id === connectFor.id ? { ...i, status: "Connected" as const, account: connectInput.trim() } : i)));
    toast(`${connectFor.name} connected`);
    setConnectFor(null);
    setConnectInput("");
  };

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

      <div className="flex border-b border-rule mb-6 flex-wrap">
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
          <div className="pt-4 border-t border-rule">
            <Button variant="danger" size="sm" onClick={() => { resetMockData(); toast("Demo data reset"); }}>
              Reset demo data
            </Button>
          </div>
        </div>
      )}

      {tab === "sso" && (
        <div className="max-w-2xl space-y-4">
          <Row label="Protocol" value="SAML 2.0 (SP-initiated)" />
          <Row label="IdP" value="SPX Identity (Okta)" />
          <Row label="Login URL" value="https://idp.spx-express.com/saml/login" />
          <Row label="ACS callback" value="https://cadence.spx-express.com/auth/sso/callback" />
          <Row label="Entity ID" value="urn:cadence:sp" />
          <Row label="Session TTL" value="8h sliding · 24h hard cap" />
          <Row label="Group → Role mapping" value="cadence-pms → pm · cadence-leads → leadership · everyone → engineer" />
          <Row label="API token TTL" value="90 days" />
          <Row label="MFA" value="Enforced at IdP" />
          <div className="pt-4 border-t border-rule flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast("Metadata XML downloaded")}>Download SP metadata</Button>
            <Button variant="secondary" size="sm" onClick={() => toast("Test login successful · Albert Halim")}>Test login</Button>
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
          {integrations.map((i) => (
            <div key={i.id} className="bg-bg-card border border-rule rounded-[8px] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] text-ink font-medium">{i.name}</span>
                <Pill variant={i.status === "Connected" ? "ok" : "neutral"} dot>{i.status}</Pill>
              </div>
              <p className="text-[12px] text-ink-3 mb-2">{i.body}</p>
              {i.account && <p className="font-mono text-[11px] text-ink-3 mb-2">{i.account}</p>}
              <Button
                variant={i.status === "Connected" ? "secondary" : "primary"}
                size="sm"
                onClick={() => toggleIntegration(i.id)}
                className="w-full"
              >
                {i.status === "Connected" ? "Disconnect" : `Connect via ${i.authType}`}
              </Button>
            </div>
          ))}
        </div>
      )}

      {tab === "notifications" && <NotificationPrefsTable />}

      <Modal open={!!connectFor} onClose={() => setConnectFor(null)} title={`Connect ${connectFor?.name ?? ""}`} size="sm">
        <p className="text-[14px] text-ink-2 mb-4">
          Provide the {connectFor?.authType?.toLowerCase() ?? "credential"} for {connectFor?.name}.
          Demo: enter any account identifier (e.g., workspace name or API key alias).
        </p>
        <Input
          label={connectFor?.authType === "API key" ? "API key" : "Workspace / account"}
          value={connectInput}
          onChange={(e) => setConnectInput(e.target.value)}
          placeholder={connectFor?.authType === "API key" ? "sk-..." : "workspace.example.com"}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" size="sm" onClick={() => setConnectFor(null)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={finishConnect} disabled={!connectInput.trim()}>Connect</Button>
        </div>
      </Modal>
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
    { key: "sprint_commit", label: "Sprint commit" },
    { key: "bug_needs_verify", label: "Bug needs verification" },
    { key: "digest", label: "Daily digest" },
  ];
  return (
    <div className="max-w-2xl">
      <div className="bg-bg-card border border-rule rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-elevated">
            <tr className="border-b border-rule">
              {["Event", "In-app"].map((h) => (
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
                    <Checkbox checked={p.inApp} onCheckedChange={(c) => setPref(e.key, "inApp", Boolean(c))} />
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

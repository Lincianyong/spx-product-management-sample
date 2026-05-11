"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Input, Textarea, Pill, toast } from "@/components/ui";
import { useCurrentUser } from "@/lib/store";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function ReportBugPage() {
  useDocumentTitle("Report Bug");
  const user = useCurrentUser();
  const [title, setTitle] = useState("");
  const [repro, setRepro] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [scope, setScope] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!title.trim() || !repro.trim() || !expected.trim() || !actual.trim()) {
      toast("Repro, Expected, and Actual are all required.", { kind: "error" });
      return;
    }
    setSubmitted(true);
    toast("Bug filed → routed to Triage", { kind: "success" });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl">
        <PageHeader
          eyebrow="Bug Report · Filed"
          title={<>Thanks, <em className="text-accent">we'll take it from here</em>.</>}
          lede={`Filed as a new Triage ticket. The PM will confirm and route within 4h (P0), 24h (P1), or 1 week (P2). You'll get a Lark ping when it's accepted or declined.`}
        />
        <Button variant="secondary" onClick={() => { setSubmitted(false); setTitle(""); setRepro(""); setExpected(""); setActual(""); setScope(""); }}>
          File another bug
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow={`Bug Report · Guest · ${user?.displayName}`}
        title={
          <>
            What's <em className="text-accent">broken</em>?
          </>
        }
        lede="The clearer the repro, the faster a fix lands. Title, three fields, file it. PM triages."
      />

      <div className="space-y-4">
        <Input
          label="Title"
          placeholder="e.g., Driver app push fires twice on Samsung S22"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Repro steps"
          placeholder="1. Install app v3.14 on Samsung S22 (OneUI 6.0)\n2. Send any push\n3. Observe receipt count"
          value={repro}
          onChange={(e) => setRepro(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Textarea label="Expected" placeholder="What should happen?" value={expected} onChange={(e) => setExpected(e.target.value)} />
          <Textarea label="Actual" placeholder="What's happening instead?" value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <Input
          label="Affected scope"
          placeholder="e.g., ~60 drivers, Jakarta region"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[12px] font-mono text-ink-3 flex items-center gap-2">
            <Pill variant="ai">Guest</Pill>
            You only see your own bugs. PM sees the full Triage queue.
          </span>
          <Button variant="primary" onClick={submit}>File bug → Triage</Button>
        </div>
      </div>
    </div>
  );
}

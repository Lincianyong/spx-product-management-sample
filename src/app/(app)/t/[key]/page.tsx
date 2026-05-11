"use client";

import { use } from "react";
import { TicketView } from "@/components/tickets/TicketView";

export default function TicketPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  return (
    <div className="max-w-6xl mx-auto">
      <TicketView ticketKey={key} variant="page" />
    </div>
  );
}

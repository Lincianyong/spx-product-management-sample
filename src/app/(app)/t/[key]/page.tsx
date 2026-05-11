"use client";

import { TicketView } from "@/components/tickets/TicketView";

export default function TicketPage({ params }: { params: { key: string } }) {
  return (
    <div className="max-w-6xl mx-auto">
      <TicketView ticketKey={params.key} variant="page" />
    </div>
  );
}

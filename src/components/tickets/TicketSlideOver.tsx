"use client";

import { SlideOver } from "@/components/ui";
import { TicketView } from "./TicketView";

interface Props {
  ticketKey: string | null;
  onClose: () => void;
}

export function TicketSlideOver({ ticketKey, onClose }: Props) {
  return (
    <SlideOver open={!!ticketKey} onClose={onClose} widthClass="w-[760px]">
      {ticketKey && <TicketView ticketKey={ticketKey} variant="slide-over" onClose={onClose} />}
    </SlideOver>
  );
}

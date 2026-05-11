"use client";

import { SlideOver } from "@/components/ui";
import { EpicView } from "./EpicView";

interface Props {
  epicKey: string | null;
  onClose: () => void;
}

export function EpicSlideOver({ epicKey, onClose }: Props) {
  return (
    <SlideOver open={!!epicKey} onClose={onClose} widthClass="w-[760px]">
      {epicKey && <EpicView epicKey={epicKey} variant="slide-over" onClose={onClose} />}
    </SlideOver>
  );
}

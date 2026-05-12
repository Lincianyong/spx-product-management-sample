"use client";

import { Eye } from "lucide-react";
import { useCurrentUser } from "@/lib/store";
import { roleLabel } from "@/lib/utils";
import { RolePill } from "@/components/ui";

interface Props {
  lane: "PM" | "Eng" | "All";
  surface: string;
  ownerCopy: string;
}

/**
 * Renders only when the current viewer is NOT the lane owner.
 * Tells them this surface is read-only and points at where they should be.
 */
export function LaneBanner({ lane, surface, ownerCopy }: Props) {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <div className="bg-info-soft border border-info rounded-[8px] px-4 py-3 mb-4 flex items-start gap-3">
      <Eye className="h-4 w-4 text-info shrink-0 mt-0.5" />
      <div className="flex-1 text-[13px] text-ink-2">
        <span className="font-medium text-ink">{surface}</span> is the {lane} lane -{" "}
        you're viewing it as <RolePill role={user.role} />, so actions here are read-only.
        <span className="text-ink-3"> {ownerCopy}</span>
      </div>
    </div>
  );
}

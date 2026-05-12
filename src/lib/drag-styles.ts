/**
 * Shared drag visual treatment so the Sprint Board and Epic Board feel
 * like the same affordance instead of two cousins that drift.
 *
 * - Source card while dragging: faded to 40% so the drop target is the
 *   star, not the source.
 * - DragOverlay wrapper: 95% opaque, slight tilt, lifted shadow, accent
 *   ring so the card reads as "in flight" against any background.
 */
export const DRAG_SOURCE_OPACITY = 0.4;

export const DRAG_OVERLAY_CLASS =
  "opacity-95 rotate-[-1deg] shadow-xl ring-2 ring-accent rounded-[8px]";

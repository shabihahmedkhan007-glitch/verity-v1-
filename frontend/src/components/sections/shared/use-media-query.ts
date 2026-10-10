"use client";

import { useSyncExternalStore } from "react";

export type Viewport = "mobile" | "tablet" | "narrow-desktop" | "desktop";

const MOBILE = "(max-width: 767.98px)";
const TABLET = "(max-width: 1023.98px)";
const NARROW = "(max-width: 1279.98px)";

function subscribe(cb: () => void) {
  const lists = [MOBILE, TABLET, NARROW].map((q) => window.matchMedia(q));
  lists.forEach((m) => m.addEventListener("change", cb));
  return () => lists.forEach((m) => m.removeEventListener("change", cb));
}

function snapshot(): Viewport {
  if (window.matchMedia(MOBILE).matches) return "mobile";
  if (window.matchMedia(TABLET).matches) return "tablet";
  if (window.matchMedia(NARROW).matches) return "narrow-desktop";
  return "desktop";
}

/** Width bucket from the spec's responsive table (UI_UX_SPEC 10). Server snapshot is "desktop". */
export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, snapshot, () => "desktop");
}

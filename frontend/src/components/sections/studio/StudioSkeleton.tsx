"use client";

import { AppHeader } from "@/components/sections/shared/AppHeader";
import { STUDIO_ROOT } from "./studio-root";

const STEPS = ["Spec", "Plan", "Lock", "Build", "Rounds", "Prove"];

/** Static first paint for /studio (the Suspense fallback): Figure 1 with every step hollow. Reads no store or URL. */
export function StudioSkeleton() {
  return (
    <div className={`${STUDIO_ROOT} grid h-dvh grid-cols-1 grid-rows-[var(--topbar-h)_minmax(0,1fr)_var(--bottombar-h)] overflow-hidden xl:grid-cols-[minmax(0,1fr)_var(--inspector-w)]`}>
      <div className="col-span-full">
        <AppHeader />
      </div>
      <div className="fig1" role="status" aria-label="Loading the recorded run.">
        <div className="fig1-scroll">
          <div className="fig1-grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(120px, 1fr))` }} aria-hidden>
            {STEPS.map((s, i) => (
              <div key={s} style={{ gridRow: 1, gridColumn: i + 1 }}>
                <p className="fig1-step" data-state="pending" data-last={i === STEPS.length - 1 ? "" : undefined}>
                  {s}
                </p>
              </div>
            ))}
            {STEPS.map((s, i) => (
              <div key={`b-${s}`} className="fig1-col" style={{ gridRow: 2, gridColumn: i + 1 }}>
                <div className="fbox" data-pending>
                  <span className="fbox-empty">&nbsp;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fig1-say">
          <p className="fbox-s">Loading the recorded run.</p>
        </div>
      </div>
      <div className="hidden min-h-0 border-l xl:block" aria-hidden />
      <div className="col-span-full border-t bg-surface" aria-hidden />
    </div>
  );
}

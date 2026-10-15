"use client";

import { Wordmark } from "@/components/brand/Wordmark";
import { VignetteGrid } from "@/components/sections/shared/VignetteGrid";
import { STUDIO_ROOT } from "./studio-root";

const STEPS = ["Spec", "Plan", "Lock", "Build", "Rounds", "Prove"];

/** Static first paint for /studio (the Suspense fallback): the same frame with every step hollow. Reads no store or URL. */
export function StudioSkeleton() {
  return (
    <div className={`${STUDIO_ROOT} studio`} role="status" aria-label="Loading the recorded run.">
      <VignetteGrid />
      <header className="s-band sband">
        <span className="logo">
          <Wordmark size="md" />
        </span>
      </header>
      <div className="s-meta smeta" aria-hidden />
      <div className="s-main" aria-hidden>
        <div className="s-fig">
          <div className="fig1">
            <div className="fig1-scroll">
              <div className="fig1-grid" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(120px, 1fr))` }}>
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
          </div>
        </div>
        <div className="s-detail dp" />
        <div className="s-tbl t1" />
      </div>
      <div className="s-time tlb">
        <div className="tlb-row" />
        <div className="tlb-say">
          <p>Loading the recorded run.</p>
        </div>
      </div>
    </div>
  );
}

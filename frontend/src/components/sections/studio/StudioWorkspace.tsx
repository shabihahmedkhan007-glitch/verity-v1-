"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/domain/EmptyState";
import { useLive, usePlayback, useRun, useUi } from "@/lib/store";
import { StudioBand } from "./chrome/StudioBand";
import { DetailPanel } from "./detail/DetailPanel";
import { useFollowFocus } from "./detail/follow";
import { LoopFigure } from "./figure/LoopFigure";
import { STUDIO_ROOT } from "./studio-root";
import { CharacteristicsTable } from "./table/CharacteristicsTable";
import { TimelineBar } from "./timeline/TimelineBar";

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Controls that already use Space or the arrow keys for themselves. */
function ownsKeys(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const role = el.getAttribute("role");
  return (
    el.tagName === "BUTTON" ||
    el.tagName === "A" ||
    el.tagName === "SUMMARY" ||
    role === "slider" ||
    role === "tab" ||
    role === "radio" ||
    role === "switch" ||
    role === "checkbox" ||
    role === "button"
  );
}

/**
 * The studio: band and metadata line, Figure 1 with the detail panel beside it, Table 1 under the figure, and one
 * timeline bar at the bottom. Full viewport with no page scroll on desktop; stacks (figure, detail, table) when narrow.
 */
export function StudioWorkspace({ mode }: { mode: "replay" | "live" }) {
  const run = useRun((r) => r);
  const playback = usePlayback();
  const { select } = useUi();
  const live = useLive();
  const follow = useFollowFocus(run);

  const isLive = mode === "live";
  const { seek, play, pause, restart, setSpeed } = playback;

  // Keyboard shortcuts (UI_UX_SPEC 3.6, 9): only when focus is not in a text field. Escape hands the detail panel
  // back to following the run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextField(e.target)) return;
      if (e.key === "Escape") {
        select(null);
        return;
      }
      if (mode !== "replay") return;
      const own = ownsKeys(e.target);
      if (e.key === " " && !own) {
        e.preventDefault();
        if (playback.status === "playing") pause();
        else play();
      } else if (e.key === "ArrowLeft" && !own) {
        const prev = [...playback.chapters].reverse().find((c) => c.tMs < playback.tMs - 1500);
        seek(prev ? prev.tMs : 0);
      } else if (e.key === "ArrowRight" && !own) {
        const next = playback.chapters.find((c) => c.tMs > playback.tMs + 100);
        seek(next ? next.tMs : playback.durationMs);
      } else if (e.key === "1") {
        setSpeed(1);
      } else if (e.key === "2") {
        setSpeed(2);
      } else if (e.key === "Home" && !own) {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, playback.status, playback.tMs, playback.durationMs, playback.chapters, select, play, pause, seek, restart, setSpeed]);

  // Main area by state (UI_UX_SPEC 3.5). Loading and connecting still draw the figure, every step hollow.
  const noData = run.spec === null && run.plan.blocks.length === 0 && run.candidateOrder.length === 0;
  const notice =
    !isLive && playback.status === "loading"
      ? "Loading the recorded run."
      : isLive && noData && (live.connection === "idle" || live.connection === "connecting")
        ? "Connecting to the live run."
        : null;

  let main: ReactNode;
  if (!isLive && playback.status === "error") {
    main = (
      <div className="s-empty">
        <EmptyState
          title="The recorded run could not be read."
          action={
            <button type="button" className="btn sm" onClick={() => window.location.reload()}>
              Try again
            </button>
          }
        />
      </div>
    );
  } else if (isLive && live.connection === "error" && noData) {
    main = (
      <div className="s-empty">
        <EmptyState
          title="This live run is not available anymore."
          action={
            <div className="s-empty-acts">
              <Link prefetch={false} href="/studio?run=golden" className="btn sm">
                Watch the recorded run
              </Link>
              <Link prefetch={false} href="/try" className="btn ghost sm">
                Try it live
              </Link>
            </div>
          }
        />
      </div>
    );
  } else {
    main = (
      <>
        <section className="s-fig" aria-label="Figure 1: the loop">
          <LoopFigure live={isLive} />
        </section>
        <DetailPanel run={run} follow={follow} />
        <CharacteristicsTable run={run} follow={follow} />
      </>
    );
  }

  return (
    <div className={`${STUDIO_ROOT} studio`}>
      <StudioBand run={run} mode={mode} />
      <main className="s-main" aria-label="Run">
        {main}
      </main>
      <TimelineBar run={run} mode={mode} notice={notice} />
    </div>
  );
}

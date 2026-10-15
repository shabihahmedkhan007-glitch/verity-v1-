"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/domain/EmptyState";
import { LiveBar } from "@/components/domain/LiveBar";
import { ReplayBar } from "@/components/domain/ReplayBar";
import { RunCompleteBar } from "@/components/domain/RunCompleteBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AppHeader } from "@/components/sections/shared/AppHeader";
import { RunStoryMobile } from "@/components/sections/shared/RunStoryMobile";
import { useViewport } from "@/components/sections/shared/use-media-query";
import { useRunZip } from "@/components/sections/shared/use-run-zip";
import { ModeBadge } from "@/components/domain/ModeBadge";
import { useRunSummary } from "@/lib/hooks/use-run-views";
import { useLive, usePlayback, useRun, useUi } from "@/lib/store";
import { InspectorPanel } from "./InspectorPanel";
import { RunBanner } from "./RunBanner";
import { LoopFigure } from "./figure/LoopFigure";
import { STUDIO_ROOT } from "./studio-root";
import { StudioTopBar } from "./StudioTopBar";

const FINISHED = new Set(["done", "error", "cap_reached", "stopped"]);

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

function CompleteBar({
  outcome,
  winnerLabel,
  resultsHref,
  onReplay,
}: {
  outcome: "complete" | "partial" | "no_winner";
  winnerLabel: string | null;
  resultsHref: string;
  onReplay?: () => void;
}) {
  const router = useRouter();
  const { download } = useRunZip();
  return (
    <RunCompleteBar
      outcome={outcome}
      winnerLabel={winnerLabel}
      onSeeResults={() => router.push(resultsHref)}
      onDownload={() => void download()}
      onReplay={onReplay}
    />
  );
}

export function StudioWorkspace({ mode }: { mode: "replay" | "live" }) {
  const router = useRouter();
  const viewport = useViewport();
  const playback = usePlayback();
  const ui = useUi();
  const live = useLive();
  const summary = useRunSummary();
  const runId = useRun((r) => r.runId);
  const phase = useRun((r) => r.phase);
  const spec = useRun((r) => r.spec);
  const order = useRun((r) => r.candidateOrder);
  const planBlocks = useRun((r) => r.plan.blocks.length);
  const elapsedMs = useRun((r) => r.tMs);
  const round = useRun((r) => r.round);
  const caption = useRun((r) => r.caption);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isLive = mode === "live";
  const finished = FINISHED.has(phase);
  const { select, selection } = ui;
  const { seek, play, pause, restart, setSpeed } = playback;
  const resultsHref = `/results?run=${encodeURIComponent(isLive ? runId : "golden")}`;

  // Keyboard shortcuts (UI_UX_SPEC 3.6, 9): only when focus is not in a text field.
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

  const confirmStop = () => {
    setStopConfirm(false);
    setStopping(true);
    void live.stopRun().finally(() => setStopping(false));
  };

  const connectionForBar = live.connection === "idle" ? "connecting" : live.connection;

  const bottomBar = (() => {
    if (finished) {
      const winner = summary.candidates.find((c) => c.id === summary.winnerId) ?? null;
      const outcome = !winner ? "no_winner" : phase === "done" ? "complete" : "partial";
      return (
        <CompleteBar
          outcome={outcome}
          winnerLabel={winner?.label ?? null}
          resultsHref={resultsHref}
          onReplay={isLive ? undefined : () => restart()}
        />
      );
    }
    if (isLive) {
      return (
        <LiveBar
          connection={connectionForBar}
          elapsedMs={elapsedMs}
          usedUsd={summary.credits.usedUsd}
          capUsd={summary.credits.capUsd}
          round={round}
          totalRounds={null}
          onStop={() => setStopConfirm(true)}
          stopping={stopping}
        />
      );
    }
    return (
      <ReplayBar
        status={playback.status}
        tMs={playback.tMs}
        durationMs={playback.durationMs}
        chapters={playback.chapters}
        speed={playback.speed}
        onPlay={play}
        onPause={pause}
        onSeek={seek}
        onRestart={restart}
        onSpeed={setSpeed}
        onSkipToEnd={() => {
          seek(playback.durationMs);
          router.push(resultsHref);
        }}
      />
    );
  })();

  // Canvas area content by state (UI_UX_SPEC 3.5).
  const noData = spec === null && planBlocks === 0 && order.length === 0;
  let canvas: React.ReactNode;
  if (!isLive && playback.status === "error") {
    canvas = (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="The recorded run could not be read."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  } else if (isLive && live.connection === "error" && noData) {
    canvas = (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title="This live run is not available anymore."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="h-10 px-4">
                <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-4">
                <Link prefetch={false} href="/try">Try live</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  } else {
    // Loading and connecting render the figure itself: every step hollow, so the screen is never blank.
    const waiting =
      !isLive && playback.status === "loading"
        ? "Loading the recorded run."
        : isLive && noData && (live.connection === "idle" || live.connection === "connecting")
          ? "Connecting to the live run."
          : null;
    canvas = <LoopFigure live={isLive} caption={waiting ?? caption?.text ?? ""} />;
  }

  const topBar = (
    <StudioTopBar
      stopConfirm={stopConfirm}
      onRequestStop={() => setStopConfirm(true)}
      onCancelStop={() => setStopConfirm(false)}
      onConfirmStop={confirmStop}
    />
  );

  if (viewport === "mobile") {
    return (
      <div className={`${STUDIO_ROOT} flex min-h-dvh flex-col`}>
        <AppHeader
          context={
            <>
              <h1 className="truncate text-sm font-medium text-foreground">{summary.title}</h1>
              <ModeBadge mode={summary.mode} />
            </>
          }
        />
        <RunBanner />
        <main className="flex-1 px-4 py-5">
          <RunStoryMobile controls={bottomBar} />
        </main>
      </div>
    );
  }

  const inspectorInline = viewport === "desktop";

  return (
    <div className={`${STUDIO_ROOT} grid h-dvh grid-cols-1 grid-rows-[var(--topbar-h)_auto_minmax(0,1fr)_auto] overflow-hidden xl:grid-cols-[minmax(0,1fr)_var(--inspector-w)]`}>
      <div className="col-span-full">{topBar}</div>
      <div className="col-span-full">
        <RunBanner />
      </div>
      <main className="relative min-h-0 min-w-0 bg-background" aria-label="Run">
        {canvas}
      </main>
      {inspectorInline ? (
        <aside className="min-h-0 border-l" aria-label="Inspector">
          <InspectorPanel />
        </aside>
      ) : (
        <Sheet open={selection !== null} onOpenChange={(open) => (open ? undefined : select(null))}>
          <SheetContent side="right" showCloseButton={false} className="w-[360px] gap-0 p-0 sm:max-w-[360px]">
            <SheetTitle className="sr-only">Inspector</SheetTitle>
            <SheetDescription className="sr-only">Details of the selected item.</SheetDescription>
            {/* The sheet portals outside the studio root, so it carries the datasheet scope itself. */}
            <div className={`${STUDIO_ROOT} h-full`}>
              <InspectorPanel />
            </div>
          </SheetContent>
        </Sheet>
      )}
      <div className="col-span-full min-h-[var(--bottombar-h)] border-t bg-surface">{bottomBar}</div>
    </div>
  );
}

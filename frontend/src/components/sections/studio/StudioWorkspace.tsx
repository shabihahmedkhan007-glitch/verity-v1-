"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RunCanvasLazy } from "@/components/canvas/RunCanvasLazy";
import { CaptionLine } from "@/components/domain/CaptionLine";
import { CountdownGate } from "@/components/domain/CountdownGate";
import { EmptyState } from "@/components/domain/EmptyState";
import { LiveBar } from "@/components/domain/LiveBar";
import { ReplayBar } from "@/components/domain/ReplayBar";
import { RunCompleteBar } from "@/components/domain/RunCompleteBar";
import { StageRail } from "@/components/domain/StageRail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AppHeader } from "@/components/sections/shared/AppHeader";
import { RunStoryMobile } from "@/components/sections/shared/RunStoryMobile";
import { useViewport } from "@/components/sections/shared/use-media-query";
import { useRunZip } from "@/components/sections/shared/use-run-zip";
import { ModeBadge } from "@/components/domain/ModeBadge";
import type { StageId } from "@/lib/contracts/types";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { useRunSummary, useStageViews } from "@/lib/hooks/use-run-views";
import { useLive, usePlayback, useRun, useUi } from "@/lib/store";
import { InspectorPanel } from "./InspectorPanel";
import { RunBanner } from "./RunBanner";
import { CanvasPlaceholder } from "./StudioSkeleton";
import { StudioTopBar } from "./StudioTopBar";

const STAGE_STATUS: Partial<Record<StageId, string>> = {
  rtl: "drafting",
  lint: "linting",
  sim: "simulating",
  fix: "fixing",
  synth: "synthesizing",
};

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

/** The plan countdown. It sits top-right over the empty tree zone, because the plan stage has no versions yet. */
function GateOverlay({ live }: { live: boolean }) {
  const countdown = useCountdown();
  const { steer } = useLive();
  if (countdown.state === "closed") return null;
  return (
    <CountdownGate
      state={countdown.state}
      remainingMs={countdown.remainingMs}
      totalMs={countdown.totalMs}
      readOnly={!live}
      onBuildNow={() => void steer({ kind: "gate", action: "build_now" })}
      onHold={() => void steer({ kind: "gate", action: "hold" })}
      onResume={() => void steer({ kind: "gate", action: "resume" })}
    />
  );
}

/** The narration line, in the strip the canvas keeps free under the world. */
function CanvasOverlay() {
  const caption = useRun((r) => r.caption);
  return (
    <div className="pointer-events-none flex max-w-[36rem] flex-col items-start gap-3">
      {caption ? (
        <div className="rounded-md border bg-background px-3 py-2">
          <CaptionLine text={caption.text} chapter={caption.chapter} announce />
        </div>
      ) : (
        <CaptionLine text={null} announce />
      )}
    </div>
  );
}

export function StudioWorkspace({ mode }: { mode: "replay" | "live" }) {
  const router = useRouter();
  const viewport = useViewport();
  const playback = usePlayback();
  const ui = useUi();
  const live = useLive();
  const summary = useRunSummary();
  const stages = useStageViews();
  const runId = useRun((r) => r.runId);
  const phase = useRun((r) => r.phase);
  const plan = useRun((r) => r.plan);
  const spec = useRun((r) => r.spec);
  const candidates = useRun((r) => r.candidates);
  const order = useRun((r) => r.candidateOrder);
  const winnerId = useRun((r) => r.winnerId);
  const elapsedMs = useRun((r) => r.tMs);
  const round = useRun((r) => r.round);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isLive = mode === "live";
  const finished = FINISHED.has(phase);
  const { select, selection } = ui;
  const { seek, play, pause, restart, setSpeed } = playback;
  const resultsHref = `/results?run=${encodeURIComponent(isLive ? runId : "golden")}`;

  const onSelectStage = useCallback(
    (id: StageId) => {
      if (id === "spec") return select({ kind: "spec", id: "spec" });
      if (id === "lock") return select({ kind: "golden", id: "golden" });
      if (id === "plan") {
        const first = plan.lastDiff?.changed[0] ?? plan.blocks[0]?.id;
        return first ? select({ kind: "block", id: first }) : undefined;
      }
      if (id === "prove") return winnerId ? select({ kind: "candidate", id: winnerId }) : undefined;
      const wanted = STAGE_STATUS[id];
      const inStage = wanted ? [...order].reverse().find((cid) => candidates[cid]?.status === wanted) : undefined;
      const target = inStage ?? order[order.length - 1];
      return target ? select({ kind: "candidate", id: target }) : undefined;
    },
    [plan, order, candidates, winnerId, select],
  );

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
  const noData = spec === null && plan.blocks.length === 0 && order.length === 0;
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
  } else if (!isLive && playback.status === "loading") {
    canvas = <CanvasPlaceholder caption="Loading the recorded run." />;
  } else if (isLive && noData && (live.connection === "idle" || live.connection === "connecting")) {
    canvas = <CanvasPlaceholder caption="Connecting to the live run." />;
  } else {
    canvas = (
      <RunCanvasLazy
        variant="studio"
        interactive
        overlay={<CanvasOverlay />}
        topOverlay={<GateOverlay live={isLive} />}
      />
    );
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
      <div className="flex min-h-dvh flex-col">
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
    <div className="grid h-dvh grid-cols-1 grid-rows-[var(--topbar-h)_var(--rail-h)_auto_minmax(0,1fr)_auto] overflow-hidden xl:grid-cols-[minmax(0,1fr)_var(--inspector-w)]">
      <div className="col-span-full">{topBar}</div>
      <div className="col-span-full flex items-center overflow-x-auto border-b bg-background px-4">
        <StageRail stages={stages} onSelect={onSelectStage} orientation="horizontal" density="full" />
      </div>
      <div className="col-span-full">
        <RunBanner />
      </div>
      <main className="relative min-h-0 min-w-0 bg-background" aria-label="Run canvas">
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
            <InspectorPanel />
          </SheetContent>
        </Sheet>
      )}
      <div className="col-span-full min-h-[var(--bottombar-h)] border-t bg-surface">{bottomBar}</div>
    </div>
  );
}

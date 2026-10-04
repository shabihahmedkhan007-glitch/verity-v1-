"use client";

import { useRouter } from "next/navigation";
import { Pause, Play, RotateCcw } from "lucide-react";
import { RunCanvasLazy } from "@/components/canvas/RunCanvasLazy";
import { CaptionLine } from "@/components/domain/CaptionLine";
import { EmptyState } from "@/components/domain/EmptyState";
import { SampleDataBadge } from "@/components/domain/SampleDataBadge";
import { StageRail } from "@/components/domain/StageRail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useReplayDriver } from "@/lib/hooks/use-replay-driver";
import { useStageViews } from "@/lib/hooks/use-run-views";
import { useRun, usePlayback } from "@/lib/store";
import { RunStoryMobile } from "@/components/sections/shared/RunStoryMobile";
import { useViewport } from "@/components/sections/shared/use-media-query";

const FRAME = "rounded-xl border bg-surface overflow-hidden xl:rounded-r-none xl:border-r-0";

function LoadingCanvas() {
  return (
    <div className="grid h-full grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 p-6" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex flex-col items-center gap-6 pt-4">
        <Skeleton className="h-24 w-44" />
        <div className="flex gap-4">
          <Skeleton className="h-24 w-44" />
          <Skeleton className="h-24 w-44" />
        </div>
      </div>
    </div>
  );
}

/** The landing hero: the recorded run, playing itself. Read-only; a click opens it in the Studio. */
export function HeroReplay() {
  useReplayDriver({ src: "/runs/golden.json", autoplay: true, loop: true });
  const router = useRouter();
  const viewport = useViewport();
  const reducedMotion = useReducedMotion();
  const stages = useStageViews();
  const playback = usePlayback();
  const caption = useRun((r) => r.caption);
  const sample = useRun((r) => r.sample);

  const { status, tMs, durationMs } = playback;
  const open = () => router.push("/studio?run=golden");
  const playing = status === "playing";
  const finishedPaused = reducedMotion && !playing && durationMs > 0 && tMs >= durationMs - 50;

  if (viewport === "mobile") {
    return <RunStoryMobile variant="hero" />;
  }

  let captionText: string | null = caption?.text ?? null;
  if (status === "loading") captionText = "Loading the recorded run.";
  if (finishedPaused) captionText = "The recorded run, finished. Press play to watch it from the start.";

  const playLabel = playing ? "Pause" : reducedMotion ? "Play the run" : "Play";

  return (
    <div>
      <div className={FRAME}>
        <div className="border-b px-3 py-2">
          <StageRail stages={stages} density="compact" />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="group relative aspect-[16/10] xl:aspect-auto xl:h-[min(34rem,calc(100svh-17rem))]">
              {status === "error" ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    title="The recorded run did not load."
                    body="The rest of Verity still works."
                    action={
                      <Button variant="outline" onClick={() => window.location.reload()}>
                        Try again
                      </Button>
                    }
                  />
                </div>
              ) : status === "loading" ? (
                <LoadingCanvas />
              ) : (
                <div className="absolute inset-0">
                  <RunCanvasLazy variant="theater" interactive={false} onOpen={open} />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 border border-transparent transition-colors group-hover:border-border-strong" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Open in Studio</TooltipContent>
        </Tooltip>
        <div className="flex min-h-14 items-center gap-3 border-t px-4 py-2">
          <div className="min-w-0 flex-1">
            <CaptionLine text={captionText} chapter={caption?.chapter} />
          </div>
          {status === "ended" ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Replay"
              onClick={() => playback.restart()}
              className="size-8"
            >
              <RotateCcw />
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={status === "loading" || status === "error"}
            onClick={() => (playing ? playback.pause() : playback.play())}
            className="h-8 shrink-0 gap-2 px-3"
          >
            {playing ? <Pause /> : <Play />}
            {playLabel}
          </Button>
        </div>
      </div>
      {sample ? (
        <div className="mt-3">
          <SampleDataBadge />
        </div>
      ) : null}
    </div>
  );
}

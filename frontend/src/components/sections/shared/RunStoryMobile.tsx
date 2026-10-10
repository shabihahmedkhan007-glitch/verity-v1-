"use client";

import type { ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { CandidateCard } from "@/components/domain/CandidateCard";
import { CaptionLine } from "@/components/domain/CaptionLine";
import { StageRail } from "@/components/domain/StageRail";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { InspectorPanel } from "@/components/sections/studio/InspectorPanel";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useStageViews } from "@/lib/hooks/use-run-views";
import { usePlayback, useRun, useUi } from "@/lib/store";

export type RunStoryMobileProps = {
  /** "hero" is the landing version (current version only, pause control). "studio" lists every version. */
  variant?: "hero" | "studio";
  /** Bottom transport (replay bar, live bar or complete bar), supplied by the Studio workspace. */
  controls?: ReactNode;
};

/** Narrow-screen run story (UI_UX_SPEC 10): the full story and data, without the canvas. */
export function RunStoryMobile({ variant = "studio", controls }: RunStoryMobileProps) {
  const stages = useStageViews();
  const candidates = useRun((r) => r.candidates);
  const order = useRun((r) => r.candidateOrder);
  const baselineId = useRun((r) => r.baselineId);
  const winnerId = useRun((r) => r.winnerId);
  const winnerBy = useRun((r) => r.winnerBy);
  const priority = useRun((r) => r.spec?.priority ?? "area");
  const caption = useRun((r) => r.caption);
  const { selection, select } = useUi();
  const playback = usePlayback();
  const reducedMotion = useReducedMotion();

  const baseline = baselineId ? (candidates[baselineId]?.ppa ?? null) : null;
  const ids = variant === "hero" ? order.slice(-1) : order;
  const playing = playback.status === "playing";

  const card = (id: string) => {
    const c = candidates[id];
    if (!c) return null;
    return (
      <CandidateCard
        candidate={c}
        baseline={baseline}
        priority={priority}
        variant="row"
        parentLabel={c.parentId ? (candidates[c.parentId]?.label ?? null) : null}
        isWinner={winnerId === id}
        winnerBy={winnerId === id ? (winnerBy ?? undefined) : undefined}
        selected={selection?.id === id}
      />
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-5">
      {variant === "studio" ? (
        <p className="text-sm text-fg-subtle">Open on a laptop to see the full canvas.</p>
      ) : null}
      <div className="rounded-lg border bg-surface p-4">
        <StageRail stages={stages} orientation="vertical" />
      </div>
      <CaptionLine
        text={caption?.text ?? (playback.status === "loading" ? "Loading the recorded run." : null)}
        chapter={caption?.chapter}
        announce={variant === "studio"}
      />
      {variant === "hero" ? (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-8 gap-2 px-3"
            disabled={playback.status === "loading" || playback.status === "error"}
            onClick={() => (playing ? playback.pause() : playback.play())}
          >
            {playing ? <Pause /> : <Play />}
            {playing ? "Pause" : reducedMotion ? "Play the run" : "Play"}
          </Button>
        </div>
      ) : null}
      {ids.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Versions">
          {ids.map((id) => (
            <li key={id}>
              {variant === "studio" ? (
                <button
                  type="button"
                  onClick={() => select({ kind: "candidate", id })}
                  className="block w-full rounded-lg text-left"
                  aria-label={`Open ${candidates[id]?.label ?? id}`}
                >
                  {card(id)}
                </button>
              ) : (
                card(id)
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {controls ? <div className="sticky bottom-0 -mx-4 border-t bg-background">{controls}</div> : null}
      {variant === "studio" ? (
        <Sheet open={selection !== null} onOpenChange={(open) => (open ? undefined : select(null))}>
          <SheetContent side="right" showCloseButton={false} className="w-full max-w-none gap-0 p-0 sm:max-w-none">
            <SheetTitle className="sr-only">Inspector</SheetTitle>
            <SheetDescription className="sr-only">Details of the selected item.</SheetDescription>
            <InspectorPanel />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

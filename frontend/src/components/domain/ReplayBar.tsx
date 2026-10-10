"use client";

import { useEffect, useRef } from "react";
import { Keyboard, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatClock } from "@/lib/format";
import type { Chapter } from "@/lib/contracts/types";
import type { PlaybackStatus } from "@/lib/contracts/view-types";

export type ReplayBarProps = {
  status: PlaybackStatus;
  tMs: number;
  durationMs: number;
  chapters: Chapter[];
  speed: 1 | 2;
  onPlay(): void;
  onPause(): void;
  onSeek(tMs: number): void;
  onRestart(): void;
  onSpeed(s: 1 | 2): void;
  onSkipToEnd(): void;
};

const SHORTCUTS: [string, string][] = [
  ["Space", "Play or pause"],
  ["Left, Right", "Previous or next chapter"],
  ["1, 2", "Speed 1x or 2x"],
  ["Home", "Restart"],
  ["Escape", "Clear the selection"],
];

function currentChapter(chapters: Chapter[], tMs: number): Chapter | null {
  let found: Chapter | null = null;
  for (const c of chapters) if (c.tMs <= tMs) found = c;
  return found;
}

/** Replay transport: play, pause, scrub with chapter ticks, speed and skip to results. */
export function ReplayBar({
  status,
  tMs,
  durationMs,
  chapters,
  speed,
  onPlay,
  onPause,
  onSeek,
  onRestart,
  onSpeed,
  onSkipToEnd,
}: ReplayBarProps) {
  const sliderWrap = useRef<HTMLDivElement>(null);
  const unavailable = status === "loading" || status === "error";
  const chapter = currentChapter(chapters, tMs);
  const clock = `${formatClock(tMs)} of ${formatClock(durationMs)}`;

  // Radix puts the name and value text on the thumb, and the shadcn Slider does not forward them.
  useEffect(() => {
    const thumb = sliderWrap.current?.querySelector('[role="slider"]');
    if (!thumb) return;
    thumb.setAttribute("aria-label", "Replay position");
    thumb.setAttribute("aria-valuetext", chapter ? `${clock}, ${chapter.label}` : clock);
  }, [clock, chapter, status]);

  return (
    <div className="flex h-full min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1">
      <div className="flex items-center gap-1">
        {status === "ended" ? (
          <Button type="button" variant="outline" className="h-8 px-3" onClick={onRestart}>
            <RotateCcw aria-hidden />
            Watch again
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              disabled={unavailable}
              aria-label={status === "playing" ? "Pause" : "Play"}
              onClick={status === "playing" ? onPause : onPlay}
            >
              {status === "playing" ? <Pause aria-hidden /> : <Play aria-hidden />}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" disabled={unavailable} aria-label="Restart" onClick={onRestart}>
                  <RotateCcw aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restart</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      <p className="font-mono text-sm whitespace-nowrap text-fg-muted" aria-hidden>
        {formatClock(tMs)} / {formatClock(durationMs)}
      </p>

      {status === "error" ? (
        <p role="alert" className="min-w-0 flex-1 text-sm text-fail">
          The recording could not be loaded.
        </p>
      ) : (
        <div ref={sliderWrap} className="relative min-w-40 flex-1 px-3">
          <Slider
            min={0}
            max={Math.max(1, durationMs)}
            step={1000}
            value={[Math.min(Math.max(tMs, 0), Math.max(1, durationMs))]}
            disabled={unavailable}
            onValueChange={(v) => onSeek(v[0] ?? 0)}
            className="h-4 **:data-[slot=slider-range]:bg-fg-muted **:data-[slot=slider-thumb]:border-foreground **:data-[slot=slider-thumb]:bg-foreground **:data-[slot=slider-track]:bg-surface-3"
          />
          <div aria-hidden className="relative mx-3 -mt-1 h-8 max-sm:h-2">
            {chapters.map((c, i) => {
              const pct = durationMs > 0 ? (c.tMs / durationMs) * 100 : 0;
              const shift = pct < 3 ? "translate-x-0" : pct > 96 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span
                  key={c.id}
                  className={`absolute top-0 flex flex-col ${shift} ${pct < 3 ? "items-start" : pct > 96 ? "items-end" : "items-center"}`}
                  style={{ left: `${pct}%` }}
                >
                  <span className="h-1.5 w-px bg-border-strong" />
                  <span className={`text-xs leading-3 whitespace-nowrap max-sm:hidden ${c.id === chapter?.id ? "text-foreground" : "text-fg-subtle"} ${i % 2 === 1 ? "mt-3" : ""}`}>
                    {c.label}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={String(speed)}
        disabled={unavailable}
        aria-label="Playback speed"
        onValueChange={(v) => {
          if (v === "1") onSpeed(1);
          if (v === "2") onSpeed(2);
        }}
      >
        <ToggleGroupItem value="1" aria-label="Speed 1x" className="h-8 min-w-8 data-[state=on]:border-foreground data-[state=on]:bg-surface-3">
          1x
        </ToggleGroupItem>
        <ToggleGroupItem value="2" aria-label="Speed 2x" className="h-8 min-w-8 data-[state=on]:border-foreground data-[state=on]:bg-surface-3">
          2x
        </ToggleGroupItem>
      </ToggleGroup>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" className="h-8 px-2.5" disabled={unavailable} onClick={onSkipToEnd} aria-label="Skip to results">
            <SkipForward aria-hidden />
            <span className="max-lg:hidden">Skip to results</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Skip to results</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Keyboard shortcuts">
            <Keyboard aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="flex-col items-start gap-0.5">
          <span className="font-medium">Keyboard shortcuts</span>
          {SHORTCUTS.map(([keys, action]) => (
            <span key={keys}>{`${keys}: ${action}`}</span>
          ))}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

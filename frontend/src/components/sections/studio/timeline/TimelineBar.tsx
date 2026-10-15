"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import type { Chapter, RunState } from "@/lib/contracts/types";
import { formatClock, formatDelta, formatUsd } from "@/lib/format";
import { priorityMetric } from "@/lib/run/fitness";
import { useLive, usePlayback } from "@/lib/store";
import { useRunZip } from "@/components/sections/shared/use-run-zip";
import { proofText } from "../figure/proof";
import { Narration, type NarrationStatus } from "./Narration";

const FINISHED = new Set(["done", "error", "cap_reached", "stopped"]);

function currentChapter(chapters: Chapter[], tMs: number): Chapter | null {
  let found: Chapter | null = null;
  for (const c of chapters) if (c.tMs <= tMs) found = c;
  return found;
}

/** "Winner v5: area −17.4% vs v1. PROVEN EQUAL (EQY)." Built only from the record. */
function winnerLine(run: RunState): string {
  const winner = run.winnerId ? run.candidates[run.winnerId] : undefined;
  if (!winner) return "No version passed the locked tests.";
  const lead = run.phase === "done" ? `Winner ${winner.label}` : `Best so far ${winner.label}`;
  const base = run.baselineId ? run.candidates[run.baselineId] : undefined;
  const parts: string[] = [];
  const metric = priorityMetric(run.spec?.priority ?? "area");
  const key = metric.key === "area" ? "areaUm2" : metric.key === "clockPeriod" ? "clockPeriodNs" : "powerMw";
  const value = winner.ppa?.[key] ?? null;
  const baseValue = base?.ppa?.[key] ?? null;
  if (value !== null && baseValue !== null && base && base.id !== winner.id) {
    parts.push(`${metric.label.toLowerCase()} ${formatDelta(value, baseValue, { lowerIsBetter: true }).text} vs ${base.label}`);
  }
  if (winner.eqy) parts.push(proofText(winner.eqy, base?.label ?? "v1").label);
  return parts.length > 0 ? `${lead}: ${parts.join(". ")}.` : `${lead}.`;
}

function Scrubber({
  tMs,
  durationMs,
  chapters,
  disabled,
  onSeek,
}: {
  tMs: number;
  durationMs: number;
  chapters: Chapter[];
  disabled: boolean;
  onSeek(t: number): void;
}) {
  const max = Math.max(1, durationMs);
  const value = Math.min(Math.max(tMs, 0), max);
  const chapter = currentChapter(chapters, value);
  const clock = `${formatClock(value)} of ${formatClock(durationMs)}`;
  const pct = (value / max) * 100;
  return (
    <div className="tlb-scrub">
      <input
        type="range"
        min={0}
        max={max}
        step={500}
        value={value}
        disabled={disabled}
        aria-label="Replay position"
        aria-valuetext={chapter ? `${clock}, ${chapter.label}` : clock}
        onChange={(e) => onSeek(Number(e.target.value))}
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
      <ol className="tlb-ch" aria-label="Chapters">
        {chapters.map((c, i) => {
          const at = (c.tMs / max) * 100;
          return (
            <li
              key={c.id}
              style={{ left: `${at}%` }}
              data-row={i % 2}
              data-edge={at < 3 ? "start" : at > 96 ? "end" : undefined}
              data-on={c.id === chapter?.id ? "" : undefined}
            >
              <button type="button" disabled={disabled} onClick={() => onSeek(c.tMs)} aria-label={`Jump to ${c.label}, ${formatClock(c.tMs)}`}>
                {c.label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Next steps when the run has ended. The winner line itself sits on the narration row underneath. */
function EndActions({ run, resultsHref, onReplay }: { run: RunState; resultsHref: string; onReplay?: () => void }) {
  const zip = useRunZip();
  const hasWinner = Boolean(run.winnerId);
  return (
    <div className="tlb-end">
      <div className="tlb-acts">
        {onReplay ? (
          <button type="button" className="btn ghost sm" onClick={onReplay}>
            <RotateCcw aria-hidden className="ico" />
            Watch again
          </button>
        ) : null}
        {hasWinner ? (
          <button type="button" className="btn ghost sm" onClick={() => void zip.download()} disabled={zip.state === "busy"}>
            <Download aria-hidden className="ico" />
            {zip.state === "busy" ? "Preparing" : zip.state === "error" ? "Download failed, retry" : "Download zip"}
          </button>
        ) : null}
        <Link prefetch={false} href={resultsHref} className="btn sm">
          See results
        </Link>
      </div>
    </div>
  );
}

/**
 * The one bar at the bottom of the studio. Replay: play and pause, a chapter scrubber, speed and skip. Live:
 * connection, elapsed time, round, credits and Stop. When the run ends it carries the winner line and the next
 * steps. The narration sits on its own line underneath.
 */
export function TimelineBar({ run, mode, notice }: { run: RunState; mode: "replay" | "live"; notice: string | null }) {
  const router = useRouter();
  const playback = usePlayback();
  const live = useLive();
  const [stopConfirm, setStopConfirm] = useState(false);
  const [stopping, setStopping] = useState(false);

  const isLive = mode === "live";
  const finished = FINISHED.has(run.phase);
  const resultsHref = `/results?run=${encodeURIComponent(isLive ? run.runId : "golden")}`;
  const unavailable = playback.status === "loading" || playback.status === "error";
  const playing = playback.status === "playing";

  const status: NarrationStatus | null = (() => {
    const recorded = (
      <Link prefetch={false} href="/studio?run=golden" className="btn ghost xs">
        Watch the recorded run
      </Link>
    );
    const another = (
      <Link prefetch={false} href="/try" className="btn ghost xs">
        Start another
      </Link>
    );
    if (isLive && live.connection === "error" && (run.phase === "starting" || run.phase === "running" || run.phase === "idle")) {
      return {
        tone: "fail",
        word: "Lost",
        text: "Lost connection to the live run. The run may still finish on the server.",
        actions: (
          <>
            <button type="button" className="btn ghost xs" onClick={() => window.location.reload()}>
              Reconnect
            </button>
            {recorded}
          </>
        ),
      };
    }
    if (run.phase === "error") {
      return { tone: "fail", word: "Error", text: `The run stopped: ${live.error ?? "the agent reported an error."} Everything finished so far is kept.`, actions: another };
    }
    if (run.phase === "cap_reached") {
      const cap = run.credits.capUsd !== null ? ` (${formatUsd(run.credits.capUsd)})` : "";
      return { tone: "warn", word: "Cap", text: `Credit cap reached${cap}. The agent stopped after round ${run.round} and kept the best version so far.` };
    }
    if (run.phase === "stopped") return { tone: "plain", word: "Stopped", text: "You stopped the run. Everything finished so far is kept.", actions: another };
    return null;
  })();

  const confirmStop = () => {
    setStopConfirm(false);
    setStopping(true);
    void live.stopRun().finally(() => setStopping(false));
  };

  let left: ReactNode;
  let middle: ReactNode;
  let right: ReactNode;

  if (isLive) {
    const conn = live.connection === "idle" ? "connecting" : live.connection;
    const cap = run.credits.capUsd;
    const ratio = cap ? Math.min(1, run.credits.usedUsd / cap) : 0;
    left = (
      <div className="tlb-l">
        <span className={`mk ${conn === "open" ? "win" : conn === "error" ? "fail" : "warn"}`}>
          {conn === "open" ? "Live" : conn === "error" ? "Live, disconnected" : conn === "retrying" ? "Live, reconnecting" : conn === "closed" ? "Live, closed" : "Live, connecting"}
        </span>
        <span className="tlb-time mono" aria-label={`Elapsed ${formatClock(run.tMs)}`}>
          {formatClock(run.tMs)}
        </span>
      </div>
    );
    middle = (
      <div className="tlb-live">
        <span className="tlb-round">{run.round > 0 ? `Round ${run.round}` : "Building"}</span>
        <span className="tlb-credits">
          <span className="mono">{cap ? `${formatUsd(run.credits.usedUsd)} of ${formatUsd(cap)}` : `${formatUsd(run.credits.usedUsd)} spent`}</span>
          {cap ? (
            <span className="tlb-meter" role="meter" aria-label="Credits used" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={run.credits.usedUsd}>
              <span style={{ transform: `scaleX(${ratio})` }} />
            </span>
          ) : null}
        </span>
      </div>
    );
    right = finished ? (
      <EndActions run={run} resultsHref={resultsHref} />
    ) : run.phase === "running" || run.phase === "starting" ? (
      stopConfirm ? (
        <div className="tlb-acts" role="group" aria-label="Confirm stopping the run">
          <span className="tlb-q">Stop this run? You keep everything finished so far.</span>
          <button type="button" className="btn sm" onClick={confirmStop}>
            Stop
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setStopConfirm(false)}>
            Keep running
          </button>
        </div>
      ) : (
        <button type="button" className="btn ghost sm" onClick={() => setStopConfirm(true)} disabled={stopping}>
          {stopping ? "Stopping" : "Stop run"}
        </button>
      )
    ) : null;
  } else {
    left = (
      <div className="tlb-l">
        {playback.status === "ended" ? (
          <button type="button" className="tlb-play" aria-label="Watch again" onClick={playback.restart}>
            <RotateCcw aria-hidden className="ico" />
          </button>
        ) : (
          <>
            <button type="button" className="tlb-play" disabled={unavailable} aria-label={playing ? "Pause" : "Play"} onClick={playing ? playback.pause : playback.play}>
              {playing ? <Pause aria-hidden className="ico" /> : <Play aria-hidden className="ico" />}
            </button>
            <button type="button" className="tlb-ico" disabled={unavailable} aria-label="Restart" onClick={playback.restart}>
              <RotateCcw aria-hidden className="ico" />
            </button>
          </>
        )}
        <span className="tlb-time mono" aria-hidden>
          {formatClock(playback.tMs)} / {formatClock(playback.durationMs)}
        </span>
      </div>
    );
    middle =
      playback.status === "error" ? (
        <p role="alert" className="tlb-err">
          The recording could not be loaded.
        </p>
      ) : (
        <Scrubber tMs={playback.tMs} durationMs={playback.durationMs} chapters={playback.chapters} disabled={unavailable} onSeek={playback.seek} />
      );
    right = finished ? (
      <EndActions run={run} resultsHref={resultsHref} onReplay={playback.restart} />
    ) : (
      <div className="tlb-acts">
        <div className="tlb-speed" role="group" aria-label="Playback speed">
          {([1, 2] as const).map((s) => (
            <button key={s} type="button" aria-pressed={playback.speed === s} disabled={unavailable} onClick={() => playback.setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn ghost sm"
          disabled={unavailable}
          onClick={() => {
            playback.seek(playback.durationMs);
            router.push(resultsHref);
          }}
        >
          <SkipForward aria-hidden className="ico" />
          Skip to results
        </button>
      </div>
    );
  }

  return (
    <footer className="s-time tlb" aria-label={isLive ? "Live run controls" : "Replay controls"}>
      <div className="tlb-row" data-live={isLive ? "" : undefined}>
        {left}
        {middle}
        {right}
      </div>
      <Narration
        text={notice ?? (finished ? winnerLine(run) : (run.caption?.text ?? null))}
        chapter={notice ? undefined : finished ? "Result" : run.caption?.chapter}
        strong={finished && !notice}
        status={status}
      />
    </footer>
  );
}

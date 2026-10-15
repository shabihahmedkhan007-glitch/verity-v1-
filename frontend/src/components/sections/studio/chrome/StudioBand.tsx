"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import type { RunState } from "@/lib/contracts/types";
import { formatUsd } from "@/lib/format";
import { selectRunSummary } from "@/lib/run/selectors";
import { useLive } from "@/lib/store";

/** "VRT-MAC4" from the run's preset id, the same part-number style as the landing datasheet. */
function partNumber(run: RunState): string | null {
  const id = run.spec?.presetId;
  return id ? `VRT-${id.toUpperCase()}` : null;
}

/**
 * The landing's header band, plus one metadata line: sample stamp, mode, human inputs and cost. Replaces the old
 * top bar and the studio's use of AppHeader.
 */
export function StudioBand({ run, mode }: { run: RunState; mode: "replay" | "live" }) {
  const summary = useMemo(() => selectRunSummary(run), [run]);
  const { connection } = useLive();
  const part = partNumber(run);
  const isLive = mode === "live";
  const conn = connection === "idle" ? "connecting" : connection;

  const modeMk = isLive
    ? conn === "open"
      ? { tone: "win", word: "Live" }
      : conn === "error"
        ? { tone: "fail", word: "Live, disconnected" }
        : { tone: "warn", word: conn === "retrying" ? "Live, reconnecting" : conn === "closed" ? "Live, closed" : "Live, connecting" }
    : { tone: "plain", word: "Replay" };

  const cost = isLive
    ? run.credits.capUsd !== null
      ? `${formatUsd(run.credits.usedUsd)} of ${formatUsd(run.credits.capUsd)}`
      : `${formatUsd(run.credits.usedUsd)} spent`
    : `${formatUsd(0)} replay`;
  const items = summary.humanInputItems;

  return (
    <>
      <header className="s-band sband">
        <Link prefetch={false} href="/" className="logo" aria-label="Verity home">
          <Wordmark size="md" />
        </Link>
        <span className="sband-sep" aria-hidden>
          /
        </span>
        {part ? <span className="sband-part">{part}</span> : null}
        <h1 className="sband-title">{run.spec?.title ?? run.title}</h1>
        <div className="sband-right">
          {isLive ? null : (
            <Link prefetch={false} href="/try" className="btn ghost sm">
              Try it live
            </Link>
          )}
        </div>
      </header>
      <div className="s-meta smeta" role="group" aria-label="Run information">
        {run.sample ? <span className="stamp">SAMPLE DATA</span> : null}
        <span className={`mk ${modeMk.tone}`}>{modeMk.word}</span>
        <details className="smeta-pop">
          <summary>
            Human inputs <b className="mono">{items.length}</b>
          </summary>
          {items.length > 0 ? (
            <ol>
              {items.map((it, i) => (
                <li key={i}>
                  {it.label}
                  {it.local ? " (this replay only)" : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p>None yet. The run is on Autopilot.</p>
          )}
        </details>
        <span className="smeta-cost" title={summary.recordedUsd !== null ? `The recording reports ${formatUsd(summary.recordedUsd)}.` : undefined}>
          <b className="mono">{cost}</b>
        </span>
      </div>
    </>
  );
}

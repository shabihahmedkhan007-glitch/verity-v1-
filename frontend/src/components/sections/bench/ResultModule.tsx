"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Equivalence, PPA, RunState } from "@/lib/contracts/types";
import type { LiveConnection } from "@/lib/contracts/view-types";
import { formatArea, formatMw, formatNs, formatUsd } from "@/lib/format";
import { useVerityStore } from "@/lib/store";
import { Mod } from "../studio/chrome/Mod";
import { Seg7 } from "../studio/chrome/Seg7";
import { Sq } from "../studio/loop/LoopModule";
import { TERMINAL, discardWhy, dropNotesOf, scoreRows, type ScoreRow } from "./derive";

const PHASE_WORD: Record<RunState["phase"], string> = {
  idle: "No run",
  starting: "Starting",
  running: "Running",
  done: "Done",
  error: "Error",
  cap_reached: "Cap reached",
  stopped: "Stopped",
};

function fmt(key: ScoreRow["key"], v: number | null): string {
  if (v === null) return "not measured";
  return key === "area" ? formatArea(v) : key === "clock" ? formatNs(v) : formatMw(v);
}

/** Elapsed time on the seven-segment readout. Its own component so the clock tick re-renders only this. */
function Elapsed() {
  const tMs = useVerityStore((s) => s.tMs);
  const total = Math.max(0, Math.floor(tMs / 1000));
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  return <Seg7 text={text} label={`Elapsed ${text}`} />;
}

/** The status strip: phase, connection, elapsed, credits, and Stop while running. */
export function StatusModule({
  run,
  hasRun,
  connection,
  stopping,
  onStop,
  onReconnect,
}: {
  run: RunState;
  hasRun: boolean;
  connection: LiveConnection;
  stopping: boolean;
  onStop(): void;
  onReconnect(): void;
}) {
  const active = hasRun && !TERMINAL.has(run.phase);
  const conn =
    connection === "retrying" ? "Reconnecting" : connection === "error" ? "Connection lost" : connection === "connecting" ? "Connecting" : null;
  const kind = !hasRun ? "wait" : run.phase === "done" ? "pass" : TERMINAL.has(run.phase) ? "fail" : "run";
  return (
    <Mod label="Status" className="b-status" right={<span className="word">{hasRun ? run.runId : "Idle"}</span>}>
      <div className="b-status-body">
        <div className="b-phase">
          <Sq kind={kind} />
          <span className="b-phase-w">{PHASE_WORD[hasRun ? run.phase : "idle"]}</span>
          {conn && active ? <span className="word">{conn}</span> : null}
        </div>
        <div className="disp">
          <div className="grp">
            <span className="lab">Elapsed</span>
            {hasRun ? <Elapsed /> : <Seg7 text="0:00" label="Elapsed 0:00" />}
          </div>
          <div className="grp">
            <span className="lab">Round</span>
            <span className="dn">{hasRun ? run.round : 0}</span>
          </div>
          <div className="grp">
            <span className="lab">Credits</span>
            <span className="dn">{hasRun ? formatUsd(run.credits.usedUsd) : formatUsd(0)}</span>
          </div>
        </div>
        <div className="b-acts">
          {active ? (
            <button type="button" className="btn ghost xs" disabled={stopping} onClick={onStop}>
              {stopping ? "Stopping..." : "Stop"}
            </button>
          ) : null}
          {active && connection === "error" ? (
            <button type="button" className="btn ghost xs" onClick={onReconnect}>
              Reconnect
            </button>
          ) : null}
          {hasRun && TERMINAL.has(run.phase) ? (
            <Link prefetch={false} href={`/studio?run=${encodeURIComponent(run.runId)}`} className="btn ghost xs">
              Open in studio
            </Link>
          ) : null}
        </div>
      </div>
    </Mod>
  );
}

function Scoreboard({ winner, human, winnerLabel }: { winner: PPA; human: { ppa: PPA; eqy: Equivalence }; winnerLabel: string }) {
  const rows = scoreRows(winner, human.ppa);
  const eqy = human.eqy.status;
  return (
    <section className="b-sec" aria-label="Verity against the human reference">
      <h3 className="dp-h">Verity vs human reference</h3>
      <table className="t1-tbl b-score">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">Verity {winnerLabel}</th>
            <th scope="col">Human</th>
            <th scope="col">Verity vs human</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              <td className="m">{fmt(r.key, r.verity)}</td>
              <td className="m">{fmt(r.key, r.human)}</td>
              <td className="m">
                {r.delta ? (
                  <span className="t1-d" data-dir={r.delta.direction}>
                    {r.delta.text} {r.delta.direction === "better" ? "(Verity better)" : r.delta.direction === "worse" ? "(human better)" : "(even)"}
                  </span>
                ) : (
                  <span className="t1-na">n/a</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="b-note">
        <span className={`rkq ${eqy === "proven" ? "pass" : "fail"}`} aria-hidden />{" "}
        {eqy === "proven"
          ? "Proven equivalent to the human design (Yosys EQY)."
          : eqy === "not_equivalent"
            ? "Not equivalent to the human design (Yosys EQY)."
            : eqy === "inconclusive"
              ? "Equivalence with the human design is inconclusive (Yosys EQY). Tested, not proven."
              : "Equivalence with the human design was not checked."}
      </p>
      <p className="b-note b-dim">
        Human reference: the pack&apos;s hand-written reference.v at the same knobs, same tools and settings
        {human.ppa.tools.length ? ` (${human.ppa.tools.join(", ")}, ${human.ppa.pdk})` : ""}. Shown even when the human design wins.
      </p>
    </section>
  );
}

/**
 * RESULT: the winner with units, tools and its v1 baseline, the vs-human scoreboard (D14), and every discarded version
 * with the reason from its own run record. Nothing here is computed beyond reading and formatting run data.
 */
export function ResultModule({
  run,
  hasRun,
  human,
  humanFeature,
}: {
  run: RunState;
  hasRun: boolean;
  human: { ppa: PPA; eqy: Equivalence } | null;
  humanFeature: boolean;
}) {
  const log = useVerityStore((s) => s.log);
  const dropNotes = useMemo(() => (hasRun ? dropNotesOf(log) : new Map<string, string>()), [hasRun, log]);
  const finished = hasRun && TERMINAL.has(run.phase);
  const winner = run.winnerId ? run.candidates[run.winnerId] : null;
  const base = run.baselineId ? run.candidates[run.baselineId] : null;
  const discarded = run.candidateOrder
    .map((id) => run.candidates[id])
    .filter((c) => c !== undefined)
    .map((c) => ({ c, why: discardWhy(c, run, dropNotes) }))
    .filter((d): d is { c: (typeof d)["c"]; why: string } => d.why !== null);

  return (
    <Mod label="Result" className="b-result">
      <div className="b-result-body" tabIndex={0} aria-label="Result, scrollable">
        {!hasRun ? (
          <p className="b-empty">The winner, its measured numbers and the comparison with a human-written design appear here when a run ends.</p>
        ) : !winner ? (
          <p className="b-empty">{finished ? "This run ended without a measured winner." : "No winner yet. Versions are still being built and tested."}</p>
        ) : (
          <section className="b-sec" aria-label="Winner">
            <h3 className="dp-h">
              {finished ? "Winner" : "Best so far"} {winner.label}
            </h3>
            {winner.ppa ? (
              <dl className="dp-dl">
                <dt>Area</dt>
                <dd className="m">{winner.ppa.areaUm2 !== null ? formatArea(winner.ppa.areaUm2) : "not measured"}</dd>
                <dt>Clock period</dt>
                <dd className="m">{winner.ppa.clockPeriodNs !== null ? formatNs(winner.ppa.clockPeriodNs) : "not measured"}</dd>
                <dt>Power</dt>
                <dd className="m">{winner.ppa.powerMw !== null ? `${formatMw(winner.ppa.powerMw)} (estimate)` : "not measured"}</dd>
              </dl>
            ) : (
              <p className="b-note">Not measured yet.</p>
            )}
            {winner.fitness && base && winner.id !== base.id ? (
              <p className="b-note">
                vs {base.label}: area {gain(winner.fitness.gains.area)}, clock {gain(winner.fitness.gains.timing)}, power {gain(winner.fitness.gains.power)}.
              </p>
            ) : winner.id === base?.id ? (
              <p className="b-note">The winner is the first verified version ({base.label}); no later version beat it.</p>
            ) : null}
            {winner.eqy ? (
              <p className="b-note">
                <span className={`rkq ${winner.eqy.status === "proven" ? "pass" : "fail"}`} aria-hidden />{" "}
                {winner.eqy.status === "proven" ? `Proven equal to ${base?.label ?? "v1"} (Yosys EQY).` : `Equivalence with ${base?.label ?? "v1"}: ${winner.eqy.status.replace("_", " ")}.`}
              </p>
            ) : null}
            {winner.ppa ? (
              <p className="b-note b-dim">
                Measured by {winner.ppa.tools.join(", ") || "open tools"} on {winner.ppa.pdk}. Open tools, not signoff.
              </p>
            ) : null}
          </section>
        )}

        {hasRun && winner?.ppa && human ? (
          <Scoreboard winner={winner.ppa} human={human} winnerLabel={winner.label} />
        ) : hasRun ? (
          <section className="b-sec" aria-label="Verity against the human reference">
            <h3 className="dp-h">Verity vs human reference</h3>
            <p className="b-note">
              {!humanFeature
                ? "Comparison with the human-written design is not available from this backend yet."
                : finished
                  ? "The agent did not send a human reference measurement for this run."
                  : "Measured against the human-written design after the winner is chosen."}
            </p>
          </section>
        ) : null}

        {discarded.length > 0 ? (
          <section className="b-sec" aria-label="Discarded versions">
            <h3 className="dp-h">Discarded, and why</h3>
            <ul className="b-disc">
              {discarded.map(({ c, why }) => (
                <li key={c.id}>
                  <span className="b-disc-v">
                    <span className={`rkq ${c.status === "rejected" ? "fail" : "drop"}`} aria-hidden />
                    {c.label}
                  </span>
                  <span>{why}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Mod>
  );
}

/** Agent-computed gain in percent, positive = better (types.ts Fitness.gains). */
function gain(g: number | null): string {
  if (g === null) return "not measured";
  const s = Math.abs(g).toFixed(1);
  return g > 0 ? `${s}% better` : g < 0 ? `${s}% worse` : "no change";
}

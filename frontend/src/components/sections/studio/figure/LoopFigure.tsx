"use client";

import { useCallback, useMemo, useRef } from "react";
import { Lock } from "lucide-react";
import type { Candidate, RunState } from "@/lib/contracts/types";
import { CountdownGate } from "@/components/domain/CountdownGate";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { useLive, useRun, useUi } from "@/lib/store";
import { CandidateBox } from "./CandidateBox";
import { deriveColumns, goalText, gridTemplate, isHalted, portLines, type FigureColumn } from "./derive";
import { describeSpec } from "./describe";
import { proofText } from "./proof";
import { Wires, type Wire } from "./Wires";

function PlanGate() {
  const countdown = useCountdown();
  const { steer } = useLive();
  if (countdown.state === "closed") return null;
  return (
    <CountdownGate
      state={countdown.state}
      remainingMs={countdown.remainingMs}
      totalMs={countdown.totalMs}
      onBuildNow={() => void steer({ kind: "gate", action: "build_now" })}
      onHold={() => void steer({ kind: "gate", action: "hold" })}
      onResume={() => void steer({ kind: "gate", action: "resume" })}
    />
  );
}

function StepHead({ col, last, count }: { col: FigureColumn; last: boolean; count: number | null }) {
  return (
    <h3 className="fig1-step" data-state={col.state} data-last={last ? "" : undefined}>
      {col.label}
      <span className="sr">{col.state === "current" ? ", in progress" : col.state === "done" ? ", done" : col.state === "skipped" ? ", skipped" : ", not reached yet"}</span>
      {col.state === "skipped" ? (
        <span className="n" aria-hidden>
          skipped
        </span>
      ) : count !== null && count > 0 ? (
        <span className="n" aria-hidden>
          {count === 1 ? "1 version" : `${count} versions`}
        </span>
      ) : null}
    </h3>
  );
}

/**
 * Figure 1, live: the loop drawn as a fixed figure (no pan, no zoom, no dragging). One column per loop step, and one
 * per round present in the run data. Every value is read from the run state; nothing is invented here.
 */
export function LoopFigure({ live }: { live: boolean }) {
  const run = useRun((r) => r);
  const { selection, select, instant } = useUi();

  const gridRef = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLElement>());
  const boxRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) boxes.current.set(id, el);
    else boxes.current.delete(id);
  }, []);
  // Stable ref callbacks, so a re-render never detaches and re-attaches a box (that made the wires blink).
  const specRef = useCallback((el: HTMLElement | null) => boxRef("spec", el), [boxRef]);
  const planRef = useCallback((el: HTMLElement | null) => boxRef("plan", el), [boxRef]);
  const goldenRef = useCallback((el: HTMLElement | null) => boxRef("golden", el), [boxRef]);

  const cols = useMemo(() => deriveColumns(run), [run]);
  const onSelectCandidate = useCallback((id: string) => select({ kind: "candidate", id }), [select]);

  const { spec, plan, candidates, winnerId } = run;
  const baselineId = run.baselineId ?? firstBuildId(cols);
  const baseline = baselineId ? (candidates[baselineId]?.ppa ?? null) : null;
  const winner = winnerId ? candidates[winnerId] : undefined;

  const wires = useMemo(() => buildWires(run, baselineId), [run, baselineId]);
  const halted = isHalted(run);
  const baselineLabel = baselineId ? (candidates[baselineId]?.label ?? "v1") : "v1";

  const isSel = (kind: string, id: string) => selection !== null && selection.kind === kind && selection.id === id;
  const changed = new Set(plan.lastDiff?.changed ?? []);
  const added = new Set(plan.lastDiff?.added ?? []);
  const ports = spec ? portLines(spec.ports) : null;

  const body = (col: FigureColumn) => {
    switch (col.kind) {
      case "spec":
        return spec ? (
          <button
            type="button"
            ref={specRef}
            className="fbox"
            aria-pressed={isSel("spec", "spec")}
            aria-label={describeSpec(spec)}
            onClick={() => select({ kind: "spec", id: "spec" })}
          >
            <span className="fbox-t">{spec.title}</span>
            {ports ? (
              <span className="fbox-m">
                {ports[0]}
                <br />
                {`to ${ports[1]}`}
              </span>
            ) : null}
            <span className="fbox-s">{goalText(spec.priority)}</span>
            <span className="fbox-tag">Human input</span>
          </button>
        ) : (
          <div className="fbox" data-pending>
            <span className="fbox-empty">Reading the spec.</span>
          </div>
        );

      case "plan":
        return (
          <div className="fbox" data-pending={plan.blocks.length === 0 ? "" : undefined} ref={planRef}>
            {plan.blocks.length === 0 ? (
              <span className="fbox-empty">{col.state === "current" ? "Drafting the plan." : "The agent drafts blocks here."}</span>
            ) : (
              <>
                <span className="fbox-m">
                  {plan.blocks.length} blocks, rev {plan.revision}
                </span>
                <ul className="plan-list">
                  {plan.blocks.map((b) => (
                    <li key={b.id}>
                      <button type="button" aria-pressed={isSel("block", b.id)} onClick={() => select({ kind: "block", id: b.id })}>
                        {b.name}
                        {added.has(b.id) ? <span className="chg">New</span> : changed.has(b.id) ? <span className="chg">Changed</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {live ? <PlanGate /> : null}
          </div>
        );

      case "lock":
        return col.state === "pending" ? (
          <div className="fbox" data-pending>
            <span className="fbox-row fbox-t">
              <Lock aria-hidden className="ico" />
              Golden model
            </span>
            <span className="fbox-empty">Locks after the plan.</span>
          </div>
        ) : (
          <button
            type="button"
            ref={goldenRef}
            className="fbox"
            aria-pressed={isSel("golden", "golden")}
            aria-label={`Golden model, ${spec?.testCount ?? 0} tests, locked. The agent cannot edit it.`}
            onClick={() => select({ kind: "golden", id: "golden" })}
          >
            <span className="fbox-row fbox-t">
              <Lock aria-hidden className="ico" />
              Golden model
            </span>
            {spec ? <span className="fbox-m">{spec.testCount} tests</span> : null}
            <span className="fbox-tag">AI cannot edit</span>
            <span className="fbox-s">Checks every version</span>
          </button>
        );

      case "build":
      case "round":
        return col.candidates.length === 0 ? (
          <div className="fbox" data-pending>
            <span className="fbox-empty">
              {col.kind === "build" ? (col.state === "pending" ? "v1 is written after the lock." : "Writing v1.") : "Versions are being drafted."}
            </span>
          </div>
        ) : (
          col.candidates.map((c) => (
            <CandidateBox
              key={c.id}
              c={c}
              parentLabel={c.parentId ? (candidates[c.parentId]?.label ?? null) : null}
              baseline={baseline}
              baselineLabel={baselineLabel}
              priority={spec?.priority ?? "area"}
              isWinner={c.id === winnerId}
              halted={halted}
              selected={isSel("candidate", c.id)}
              onSelect={onSelectCandidate}
              boxRef={boxRef}
            />
          ))
        );

      case "rounds":
        return (
          <div className="fbox" data-pending>
            <span className="fbox-empty">
              {col.state === "skipped" ? "No rounds: this run skipped evolution." : "Versions compete in rounds once v1 passes."}
            </span>
          </div>
        );

      case "prove":
        return <ProveBox col={col} winner={winner} baselineId={baselineId} baselineLabel={baselineLabel} halted={halted} onSelect={onSelectCandidate} />;
    }
  };

  return (
    <figure className={`fig1${instant ? " is-instant" : ""}`} data-halted={halted ? "" : undefined} aria-labelledby="fig1-h">
      <h2 id="fig1-h" className="sr">
        {live ? "Figure 1. The loop, live" : "Figure 1. The loop, replayed"}
      </h2>
      <div className="fig1-scroll">
        <div ref={gridRef} className="fig1-grid" style={{ gridTemplateColumns: gridTemplate(cols) }}>
          {cols.map((col, i) => (
            <div key={`h-${col.key}`} style={{ gridRow: 1, gridColumn: i + 1 }}>
              <StepHead col={col} last={i === cols.length - 1} count={"candidates" in col ? col.candidates.length : null} />
            </div>
          ))}
          {cols.map((col, i) => (
            <div key={`b-${col.key}`} className="fig1-col" style={{ gridRow: 2, gridColumn: i + 1 }}>
              {body(col)}
            </div>
          ))}
          {/* After the boxes, so their refs are attached when the wires measure. Drawn underneath by z-index. */}
          <Wires gridRef={gridRef} boxes={boxes} wires={wires} />
        </div>
      </div>
      <figcaption className="fig1-cap">
        <b>Figure 1.</b> {live ? "The loop, live." : "The loop, replayed from a recorded run."} Hollow steps are not reached yet. Every version keeps its attempt history; numbers are relative to {baselineLabel}.
      </figcaption>
    </figure>
  );
}

function firstBuildId(cols: FigureColumn[]): string | null {
  const build = cols.find((c) => c.kind === "build");
  return build && build.kind === "build" ? (build.candidates[0]?.id ?? null) : null;
}

function buildWires(run: RunState, baselineId: string | null): Wire[] {
  const out: Wire[] = [];
  for (const id of run.candidateOrder) {
    const c = run.candidates[id];
    if (c?.parentId && run.candidates[c.parentId]) out.push({ kind: "lineage", id: `l-${c.parentId}-${c.id}`, from: c.parentId, to: c.id });
  }
  if (baselineId && run.stages.lock.status !== "pending") out.push({ kind: "checks", id: "checks", from: "golden", to: baselineId });
  const winner = run.winnerId ? run.candidates[run.winnerId] : undefined;
  if (winner?.eqy && baselineId && winner.id !== baselineId) {
    const p = proofText(winner.eqy, run.candidates[baselineId]?.label ?? "v1");
    out.push({ kind: "proof", id: "proof", from: winner.id, to: baselineId, result: p.result, label: p.label });
  }
  return out;
}

function ProveBox({
  col,
  winner,
  baselineId,
  baselineLabel,
  halted,
  onSelect,
}: {
  col: FigureColumn;
  winner: Candidate | undefined;
  baselineId: string | null;
  baselineLabel: string;
  halted: boolean;
  onSelect(id: string): void;
}) {
  if (!winner) {
    return (
      <div className="fbox" data-pending>
        <span className="fbox-t">Equivalence</span>
        <span className="fbox-empty">The winner is checked against {baselineLabel} with Yosys EQY.</span>
      </div>
    );
  }
  // The first verified version itself won: there is nothing to prove it equal to.
  if (winner.id === baselineId) {
    return (
      <button type="button" className="fbox" onClick={() => onSelect(winner.id)}>
        <span className="fbox-t">{winner.label} won</span>
        <span className="fbox-empty">The winner is the first verified version. No equivalence check is needed.</span>
      </button>
    );
  }
  const eqy = winner.eqy;
  const result = eqy ? proofText(eqy, baselineLabel) : null;
  const checking = !result && col.state === "current" && !halted;
  const state = result ? result.label : checking ? "checking" : halted ? "stopped before the check" : "not run yet";
  return (
    <button type="button" className="fbox" aria-label={`${winner.label} vs ${baselineLabel}, Yosys EQY: ${state}.`} onClick={() => onSelect(winner.id)}>
      <span className="fbox-t">
        {winner.label} vs {baselineLabel}
      </span>
      <span className="fbox-m">Yosys EQY</span>
      {result ? (
        <span className="prove-r" data-r={result.result}>
          {result.label.replace(" (EQY)", "")}
        </span>
      ) : checking ? (
        <span className="prove-r" data-r="run">
          checking
        </span>
      ) : (
        <span className="fbox-empty">{halted ? "The run stopped before the check." : "Not run yet."}</span>
      )}
    </button>
  );
}

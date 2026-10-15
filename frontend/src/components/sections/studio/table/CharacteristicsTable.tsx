"use client";

import { memo, useCallback } from "react";
import type { Candidate, PPA, RunState } from "@/lib/contracts/types";
import type { Selection } from "@/lib/contracts/view-types";
import { formatArea, formatDelta, formatNs } from "@/lib/format";
import { formatScore } from "@/components/domain/signed";
import { useUi } from "@/lib/store";
import { rejectedText } from "../figure/derive";

type Tone = "pass" | "fail" | "info";

function statusOf(c: Candidate): { tone: Tone; word: string } {
  switch (c.status) {
    case "drafting":
      return { tone: "info", word: "Writing" };
    case "linting":
      return { tone: "info", word: "Linting" };
    case "simulating":
      return { tone: "info", word: "Simulating" };
    case "fail":
      return { tone: "fail", word: "Fail" };
    case "fixing":
      return { tone: "fail", word: "Fixing" };
    case "pass":
      return { tone: "pass", word: "Pass" };
    case "synthesizing":
      return { tone: "info", word: "Measuring" };
    case "measured":
      return { tone: "pass", word: "Measured" };
    case "rejected":
      return { tone: "fail", word: "Rejected" };
  }
}

/** Why a row has no measured numbers yet. Never a number that is not in the record. */
function unmeasured(c: Candidate): string {
  if (c.status === "rejected") return `Never measured: ${rejectedText(c).toLowerCase()}`;
  if (c.status === "synthesizing") return "Measuring";
  if (c.status === "fail" || c.status === "fixing") return "Not measured: fails the locked tests";
  return "Not measured yet";
}

type RowProps = {
  c: Candidate;
  base: PPA | null;
  isWinner: boolean;
  pinned: boolean;
  followed: boolean;
  onPick(id: string): void;
};

const Row = memo(function Row({ c, base, isWinner, pinned, followed, onPick }: RowProps) {
  const st = statusOf(c);
  const v = c.verification;
  const area = c.ppa?.areaUm2 ?? null;
  const clk = c.ppa?.clockPeriodNs ?? null;
  const measured = c.ppa !== null && (area !== null || clk !== null);
  const delta = !c.isBaseline && area !== null && base?.areaUm2 ? formatDelta(area, base.areaUm2, { lowerIsBetter: true }) : null;
  const tags: string[] = [];
  if (c.isBaseline) tags.push("Baseline");
  if (c.isElite && !isWinner) tags.push("Elite");
  if (isWinner) tags.push("Winner");

  return (
    <tr
      data-on={pinned ? "" : undefined}
      data-follow={followed && !pinned ? "" : undefined}
      data-tone={st.tone}
      data-rejected={c.status === "rejected" ? "" : undefined}
      onClick={() => onPick(c.id)}
    >
      <th scope="row">
        <button type="button" className="t1-ver" aria-pressed={pinned} aria-label={`${c.label}, show details`}>
          {c.label}
        </button>
      </th>
      <td className="mono t1-by">{c.createdBy}</td>
      <td className="num mono">{v ? `${v.passed}/${v.total}` : <span className="t1-na">not run</span>}</td>
      <td className="num mono">{c.fixCount}</td>
      {measured ? (
        <>
          <td className="num mono">{area !== null ? formatArea(area) : <span className="t1-na">n/a</span>}</td>
          <td className="num mono">
            {c.isBaseline ? (
              <span className="t1-na">baseline</span>
            ) : delta ? (
              <span className="t1-d" data-dir={delta.direction}>
                {delta.text}
                <span className="sr">{delta.direction === "better" ? " smaller than v1" : delta.direction === "worse" ? " larger than v1" : " about the same as v1"}</span>
              </span>
            ) : (
              <span className="t1-na">n/a</span>
            )}
          </td>
          <td className="num mono">{clk !== null ? formatNs(clk) : <span className="t1-na">n/a</span>}</td>
          <td className="num mono">{c.fitness ? formatScore(c.fitness.score) : <span className="t1-na">n/a</span>}</td>
        </>
      ) : (
        <td colSpan={4} className="t1-wait">
          {unmeasured(c)}
        </td>
      )}
      <td>
        <span className={`mk ${st.tone}`}>{st.word}</span>
        {tags.length > 0 ? <span className="t1-tags">{tags.join(", ")}</span> : null}
      </td>
    </tr>
  );
});

/**
 * Table 1, characteristics: one row per version, filled in only as the record measures it. Clicking a row pins the
 * detail panel to that version (the same ui.select the figure uses).
 */
export function CharacteristicsTable({ run, follow }: { run: RunState; follow: Selection | null }) {
  const { selection, select } = useUi();
  const order = run.candidateOrder.map((id) => run.candidates[id]).filter((c): c is Candidate => Boolean(c));
  const baselineId = run.baselineId ?? order.find((c) => c.isBaseline)?.id ?? null;
  const baseline = baselineId ? run.candidates[baselineId] : undefined;
  const baselineLabel = baseline?.label ?? "v1";
  const toolsPpa = baseline?.ppa ?? order.find((c) => c.ppa)?.ppa ?? null;
  const tools = toolsPpa ? [...toolsPpa.tools, toolsPpa.pdk].filter(Boolean).join(", ") : null;
  const pick = useCallback((id: string) => select({ kind: "candidate", id }), [select]);

  return (
    <section className="s-tbl t1" aria-labelledby="t1-title">
      <header className="t1-h">
        <h2 id="t1-title" className="t1-title">
          <span className="n">Table 1.</span> Characteristics
        </h2>
        <p className="t1-sub">
          Relative to {baselineLabel}
          {tools ? `, ${tools}` : ""}. Measured values only.{run.sample ? " Sample data." : ""}
        </p>
      </header>
      <div className="t1-scroll">
        <table className="dtbl t1-tbl" aria-labelledby="t1-title">
          <thead>
            <tr>
              <th scope="col">Ver</th>
              <th scope="col">By</th>
              <th scope="col" className="num">
                Tests
              </th>
              <th scope="col" className="num">
                Fix
              </th>
              <th scope="col" className="num">
                Area
              </th>
              <th scope="col" className="num">
                Area vs {baselineLabel}
              </th>
              <th scope="col" className="num">
                Clock
              </th>
              <th scope="col" className="num">
                Fitness
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {order.length === 0 ? (
              <tr>
                <td colSpan={9} className="t1-wait">
                  No versions yet. v1 is written after the golden model is locked.
                </td>
              </tr>
            ) : (
              order.map((c) => (
                <Row
                  key={c.id}
                  c={c}
                  base={baseline?.ppa ?? null}
                  isWinner={c.id === run.winnerId}
                  pinned={selection?.kind === "candidate" && selection.id === c.id}
                  followed={follow?.kind === "candidate" && follow.id === c.id}
                  onPick={pick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

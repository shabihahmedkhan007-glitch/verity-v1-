import { memo } from "react";
import type { Candidate, PPA, Priority } from "@/lib/contracts/types";
import { formatArea, formatDelta, formatMw, formatNs } from "@/lib/format";
import { priorityMetric } from "@/lib/run/fitness";
import { formatScore } from "@/components/domain/signed";
import { describeCandidate } from "./describe";
import { fixedText } from "./derive";

const RUNNING_WORD: Partial<Record<Candidate["status"], string>> = {
  drafting: "writing",
  linting: "linting",
  simulating: "simulating",
  fixing: "fixing",
};

type Tone = "run" | "fail" | "pass" | "rejected";

function toneOf(c: Candidate): Tone {
  if (c.status === "rejected") return "rejected";
  if (c.status === "fail" || c.status === "fixing") return "fail";
  if (c.status === "pass" || c.status === "measured") return "pass";
  return "run";
}

function metricValue(ppa: PPA, key: "area" | "clockPeriod" | "power"): number | null {
  return key === "area" ? ppa.areaUm2 : key === "clockPeriod" ? ppa.clockPeriodNs : ppa.powerMw;
}

function formatMetric(v: number, key: "area" | "clockPeriod" | "power"): string {
  return key === "area" ? formatArea(v) : key === "clockPeriod" ? formatNs(v) : formatMw(v);
}

/** The measured line: the run's priority metric against v1, and fitness. Only real numbers from the record. */
function PpaLine({ c, baseline, priority }: { c: Candidate; baseline: PPA | null; priority: Priority }) {
  if (c.status === "synthesizing") return <p className="cb-ppa wait">Measuring</p>;
  if (!c.ppa) return null;
  const metric = priorityMetric(priority);
  const value = metricValue(c.ppa, metric.key);
  if (value === null) return null;
  const base = baseline ? metricValue(baseline, metric.key) : null;
  const fitness = c.fitness && !c.isBaseline ? <span className="f"><span className="k">F</span>{formatScore(c.fitness.score)}</span> : null;

  if (c.isBaseline || base === null) {
    return (
      <p className="cb-ppa">
        <span className="k">{metric.label}</span>
        <span className="v">{formatMetric(value, metric.key)}</span>
      </p>
    );
  }
  const d = formatDelta(value, base, { lowerIsBetter: true });
  return (
    <p className="cb-ppa" title={`${metric.label} ${formatMetric(value, metric.key)}, ${d.text} relative to v1`}>
      <span className="k">{metric.label}</span>
      <span className="v" data-dir={d.direction}>
        {d.text}
      </span>
      {fitness}
    </p>
  );
}

export type CandidateBoxProps = {
  c: Candidate;
  parentLabel: string | null;
  baseline: PPA | null;
  priority: Priority;
  isWinner: boolean;
  selected: boolean;
  onSelect(id: string): void;
  boxRef(id: string, el: HTMLElement | null): void;
};

/**
 * One version. It always shows the whole attempt history (A1 failed, A2 passed), never only the latest state,
 * so the self-fix stays on screen after the status flips to PASS.
 */
export const CandidateBox = memo(function CandidateBox({ c, parentLabel, baseline, priority, isWinner, selected, onSelect, boxRef }: CandidateBoxProps) {
  const tone = toneOf(c);
  const running = RUNNING_WORD[c.status];
  const fixed = c.status === "rejected" ? `Rejected after ${c.attempts.length} attempts` : fixedText(c.fixCount);
  const tags: string[] = [];
  if (c.isBaseline) tags.push("Baseline");
  if (c.isElite && !isWinner) tags.push("Elite");
  if (isWinner) tags.push("Winner");

  return (
    <button
      type="button"
      ref={(el) => boxRef(c.id, el)}
      className="fbox cbox"
      data-tone={tone}
      data-winner={isWinner ? "" : undefined}
      aria-pressed={selected}
      aria-label={describeCandidate(c, parentLabel, baseline, isWinner)}
      onClick={() => onSelect(c.id)}
    >
      <span className="cb-head">
        <span className="cb-label">{c.label}</span>
        <span className="cb-op">{c.createdBy}</span>
        {tags.length > 0 ? (
          <span className="cb-tags">
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </span>
        ) : null}
      </span>
      <ol className="cb-att">
        {c.attempts.map((a) => {
          const v = a.verification;
          const ok = v.lint === "pass" && v.passed === v.total;
          return (
            <li key={a.n} data-r={ok ? "pass" : "fail"}>
              <span className="an">A{a.n}</span>
              <span className="sq" />
              <span>{v.lint === "pass" ? `${v.passed}/${v.total}` : "lint"}</span>
              <span className="w">{ok ? "Pass" : "Fail"}</span>
            </li>
          );
        })}
        {running ? (
          <li data-r="run">
            <span className="an">A{c.attempts.length + 1}</span>
            <span className="sq" />
            <span className="w">{running}</span>
          </li>
        ) : null}
      </ol>
      {fixed ? <span className="cb-note">{fixed}</span> : null}
      <PpaLine c={c} baseline={baseline} priority={priority} />
    </button>
  );
});

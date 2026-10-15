import type { Candidate, PPA, Priority, Spec } from "@/lib/contracts/types";
import { formatPct } from "@/lib/format";
import { priorityMetric } from "@/lib/run/fitness";
import { rejectedText } from "./derive";

const IN_PROGRESS_TEXT: Partial<Record<Candidate["status"], string>> = {
  drafting: "being written",
  linting: "being linted",
  simulating: "being simulated",
  fixing: "being fixed",
};

const LOWER_WORD = { area: ["smaller", "larger"], clockPeriod: ["faster", "slower"], power: ["lower power", "higher power"] } as const;

function metricOf(p: PPA, key: "area" | "clockPeriod" | "power"): number | null {
  return key === "area" ? p.areaUm2 : key === "clockPeriod" ? p.clockPeriodNs : p.powerMw;
}

/**
 * One plain sentence per version for screen readers (UI_UX_SPEC 9). Includes the attempt history and the run's own
 * priority metric against its baseline (area, clock period or power).
 */
export function describeCandidate(
  c: Candidate,
  parentLabel: string | null,
  baseline: PPA | null,
  isWinner: boolean,
  baselineLabel: string,
  priority: Priority,
): string {
  const parts: string[] = [`Version ${c.label}`];
  parts.push(parentLabel ? `${c.createdBy} from ${parentLabel}` : c.createdBy === "INIT" ? "first draft" : c.createdBy);
  for (const a of c.attempts) {
    const v = a.verification;
    parts.push(`attempt ${a.n} ${v.passed === v.total && v.lint === "pass" ? "passed" : "failed"} ${v.passed} of ${v.total} tests`);
  }
  if (c.status === "rejected") parts.push(rejectedText(c).toLowerCase());
  else if (c.status === "synthesizing") parts.push("being measured");
  else {
    const text = IN_PROGRESS_TEXT[c.status];
    if (text) parts.push(text);
  }
  const metric = priorityMetric(priority);
  const value = c.ppa ? metricOf(c.ppa, metric.key) : null;
  const base = baseline ? metricOf(baseline, metric.key) : null;
  if (value !== null && base !== null && base !== 0 && !c.isBaseline) {
    const delta = ((value - base) / base) * 100;
    const [better, worse] = LOWER_WORD[metric.key];
    if (Math.abs(delta) >= 0.5) parts.push(`${metric.label.toLowerCase()} ${formatPct(Math.abs(delta))} ${delta < 0 ? better : worse} than ${baselineLabel}`);
  }
  if (c.fixCount > 0) parts.push(c.fixCount === 1 ? "fixed once" : `fixed ${c.fixCount} times`);
  if (c.isBaseline) parts.push("baseline");
  if (c.isElite) parts.push("elite");
  if (isWinner) parts.push("winner");
  return `${parts.join(", ")}.`;
}

export function describeSpec(spec: Spec | null): string {
  if (!spec) return "Spec, not read yet.";
  const goal = spec.priority === "area" ? "smallest area" : spec.priority === "speed" ? "fastest clock" : "lowest power";
  return `Spec: ${spec.title}. Goal: ${goal}.`;
}

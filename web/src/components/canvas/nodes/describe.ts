import type { Candidate, PPA, PlanBlock, Spec } from "@/lib/contracts/types";
import { formatPct } from "@/lib/format";

const IN_PROGRESS_TEXT: Partial<Record<Candidate["status"], string>> = {
  drafting: "being written",
  linting: "being linted",
  simulating: "being simulated",
  fixing: "being fixed",
};

/** One plain sentence for screen readers (UI_UX_SPEC 9). Never color alone. */
export function describeCandidate(
  c: Candidate,
  parentLabel: string | null,
  baseline: PPA | null,
  isWinner: boolean,
): string {
  const parts: string[] = [`Version ${c.label}`];
  parts.push(parentLabel ? `${c.createdBy} from ${parentLabel}` : c.createdBy === "INIT" ? "first draft" : c.createdBy);
  const v = c.verification;
  if (c.status === "fail" && v) parts.push(`failed ${v.total - v.passed} of ${v.total} tests`);
  else if ((c.status === "pass" || c.status === "measured" || c.status === "synthesizing") && v) {
    parts.push(`passed ${v.passed} of ${v.total} tests`);
    if (c.status === "synthesizing") parts.push("being measured");
  } else if (c.status === "rejected") parts.push(`rejected after ${c.attempts.length} attempts`);
  else {
    const text = IN_PROGRESS_TEXT[c.status];
    if (text) parts.push(text);
  }
  if (c.ppa && baseline && c.ppa.areaUm2 !== null && baseline.areaUm2 !== null && !c.isBaseline) {
    const delta = ((c.ppa.areaUm2 - baseline.areaUm2) / baseline.areaUm2) * 100;
    if (Math.abs(delta) >= 0.5) parts.push(`area ${formatPct(Math.abs(delta))} ${delta < 0 ? "smaller" : "larger"} than the baseline`);
  }
  if (c.fixCount > 0) parts.push(c.fixCount === 1 ? "fixed once" : `fixed ${c.fixCount} times`);
  if (c.isBaseline) parts.push("baseline");
  if (c.isElite) parts.push("elite");
  if (isWinner) parts.push("winner");
  return `${parts.join(", ")}.`;
}

export function describeBlock(block: PlanBlock, status: string, changed: boolean): string {
  const pins = block.pins.length > 0 ? `, ${block.pins.length} pinned` : "";
  return `Plan block ${block.name}, ${status}${pins}${changed ? ", changed by the latest plan" : ""}.`;
}

export function describeSpec(spec: Spec | null): string {
  if (!spec) return "Spec, not read yet.";
  const goal = spec.priority === "area" ? "smallest area" : spec.priority === "speed" ? "fastest clock" : "lowest power";
  return `Spec: ${spec.title}. Goal: ${goal}.`;
}

import type { CandidateStatus, Fitness } from "@/lib/contracts/types";
import { formatScore, formatSigned } from "./signed";

export type FitnessBreakdownProps = { fitness: Fitness | null; status: CandidateStatus };

function Term({ weight, name, gain }: { weight: number; name: string; gain: number | null }) {
  return (
    <span className="whitespace-nowrap">
      {weight.toFixed(2)} x {name} {gain === null ? "n/a" : formatSigned(gain)}
    </span>
  );
}

/** Shows how a fitness score is built from the weighted gains, with the numbers filled in. */
export function FitnessBreakdown({ fitness, status }: FitnessBreakdownProps) {
  if (!fitness) {
    const baseline = status === "measured";
    return (
      <p className="rounded-lg border border-border bg-surface p-3 text-sm text-fg-muted">
        {baseline
          ? "Baseline. Every gain and fitness score is measured against this version."
          : "Not ranked. Only versions that pass the locked tests and are measured get a fitness score."}
      </p>
    );
  }
  const { weights, gains } = fitness;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3">
      <p className="text-sm text-foreground">
        Fitness <span className="font-mono font-semibold">{formatScore(fitness.score)}</span>
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-xs text-fg-muted">
        <span>=</span>
        <Term weight={weights.area} name="area" gain={gains.area} />
        <span>+</span>
        <Term weight={weights.timing} name="timing" gain={gains.timing} />
        <span>+</span>
        <Term weight={weights.power} name="power" gain={gains.power} />
      </p>
      <p className="text-xs text-fg-subtle">Gains are percent better than v1. Positive is better.</p>
    </div>
  );
}

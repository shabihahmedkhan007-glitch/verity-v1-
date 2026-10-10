"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { CandidateCard } from "@/components/domain/CandidateCard";
import { useVerityStore } from "@/lib/store";
import type { VerityNode } from "@/lib/canvas/zones";
import { describeCandidate } from "./describe";
import { HANDLES, NodeShell } from "./NodeShell";

const CANDIDATE_HANDLES = [HANDLES.top, HANDLES.bottom, HANDLES.left, HANDLES.rightIn, HANDLES.rightOut];

export const CandidateNode = memo(function CandidateNode({ data, selected }: NodeProps<VerityNode>) {
  const candidate = useVerityStore((s) => s.snapshot.run.candidates[data.refId]);
  const parentLabel = useVerityStore((s) => {
    const p = s.snapshot.run.candidates[data.refId]?.parentId;
    return p ? (s.snapshot.run.candidates[p]?.label ?? null) : null;
  });
  const baseline = useVerityStore((s) => {
    const id = s.snapshot.run.baselineId;
    return id ? (s.snapshot.run.candidates[id]?.ppa ?? null) : null;
  });
  const priority = useVerityStore((s) => s.snapshot.run.spec?.priority ?? "area");
  const isWinner = useVerityStore((s) => s.snapshot.run.winnerId === data.refId);
  const winnerBy = useVerityStore((s) => s.snapshot.run.winnerBy);
  const seen = useVerityStore((s) => Boolean(s.seenDiffs[data.refId]));

  if (!candidate) {
    // The node can exist a moment before its candidate record arrives.
    return (
      <NodeShell handles={CANDIDATE_HANDLES} summary={`Version ${data.label}, starting.`}>
        <div className="flex h-full w-full items-center rounded-lg border border-dashed border-border-strong bg-surface px-3 text-sm font-bold">
          {data.label}
        </div>
      </NodeShell>
    );
  }

  const hasDiff = candidate.status !== "drafting" && (candidate.parentId !== null || candidate.attempts.length > 1);
  return (
    <NodeShell handles={CANDIDATE_HANDLES} summary={describeCandidate(candidate, parentLabel, baseline, isWinner)}>
      <CandidateCard
        candidate={candidate}
        baseline={baseline}
        priority={priority}
        variant="node"
        isWinner={isWinner}
        winnerBy={isWinner && winnerBy ? winnerBy : undefined}
        selected={selected}
        diffUnseen={hasDiff && !seen}
        parentLabel={parentLabel}
      />
    </NodeShell>
  );
});

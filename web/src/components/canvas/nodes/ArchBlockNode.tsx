"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { ArchBlockCard } from "@/components/domain/ArchBlockCard";
import { useVerityStore } from "@/lib/store";
import type { PlanBlock } from "@/lib/contracts/types";
import type { VerityNode } from "@/lib/canvas/zones";
import { describeBlock } from "./describe";
import { HANDLES, NodeShell, useFreshDiff } from "./NodeShell";

type BlockStatus = "drafting" | "drafted" | "replanning" | "approved" | "built";
const BLOCK_STATUSES: ReadonlySet<string> = new Set(["drafting", "drafted", "replanning", "approved", "built"]);

export const ArchBlockNode = memo(function ArchBlockNode({ data, id, selected }: NodeProps<VerityNode>) {
  const planBlock = useVerityStore((s) => s.snapshot.run.plan.blocks.find((b) => b.id === data.refId));
  const readOnly = useVerityStore((s) => s.snapshot.run.mode === "replay");
  const select = useVerityStore((s) => s.select);
  const diff = useFreshDiff(data.diff, data.diffAtMs);

  const block: PlanBlock = planBlock ?? { id: data.refId, name: data.label, reason: "", pinOptions: [], pins: [], variants: [] };
  const status: BlockStatus = BLOCK_STATUSES.has(data.status) ? (data.status as BlockStatus) : "drafted";

  return (
    <NodeShell handles={[HANDLES.top, HANDLES.bottom]} summary={describeBlock(block, status, diff === "changed")} selected={selected}>
      <ArchBlockCard
        key={`${id}:${diff ?? "none"}:${data.diffAtMs ?? 0}`}
        block={block}
        status={status}
        diff={diff}
        movedByUser={data.origin === "user"}
        readOnly={readOnly}
        onSteer={() => select({ kind: "block", id: data.refId })}
      />
    </NodeShell>
  );
});

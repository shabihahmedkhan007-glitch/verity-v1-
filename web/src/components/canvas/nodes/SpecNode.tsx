"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { SpecCard } from "@/components/domain/SpecCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useVerityStore } from "@/lib/store";
import type { VerityNode } from "@/lib/canvas/zones";
import { describeSpec } from "./describe";
import { HANDLES, NodeShell } from "./NodeShell";

export const SpecNode = memo(function SpecNode({ selected }: NodeProps<VerityNode>) {
  const spec = useVerityStore((s) => s.snapshot.run.spec);
  return (
    <NodeShell handles={[HANDLES.bottom]} summary={describeSpec(spec)} selected={selected}>
      {spec ? <SpecCard spec={spec} variant="node" /> : <Skeleton className="h-full w-full rounded-lg" aria-hidden />}
    </NodeShell>
  );
});

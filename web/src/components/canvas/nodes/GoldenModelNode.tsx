"use client";

import { memo, useMemo } from "react";
import type { NodeProps } from "@xyflow/react";
import { GoldenModelCard } from "@/components/domain/GoldenModelCard";
import { useVerityStore } from "@/lib/store";
import type { VerityNode } from "@/lib/canvas/zones";
import { HANDLES, NodeShell } from "./NodeShell";

export const GoldenModelNode = memo(function GoldenModelNode({ data, selected }: NodeProps<VerityNode>) {
  const testCount = useVerityStore((s) => s.snapshot.run.spec?.testCount ?? 0);
  const artifacts = useVerityStore((s) => s.snapshot.run.artifacts);
  const files = useMemo(() => artifacts.filter((a) => a.path.startsWith("tests/")).map((a) => a.path), [artifacts]);
  const locked = data.status === "locked";
  return (
    <NodeShell
      handles={[HANDLES.top, HANDLES.bottom, HANDLES.rightOut]}
      selected={selected}
      summary={locked ? `Golden model, ${testCount} tests, locked. The agent cannot edit them.` : "Golden model, locking the tests."}
    >
      <GoldenModelCard testCount={testCount} files={files} status={locked ? "locked" : "pending"} variant="node" />
    </NodeShell>
  );
});

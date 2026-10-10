"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

const CORNER = 8;

/**
 * The dashed green proof edge (winner to v1). It leaves the winner's bottom, runs under the tree, up the right
 * margin and into v1 from the right, so it never crosses a version card. data.xr (the vertical run) and data.yb
 * (the horizontal run) come from the reducer's layout pass. The label sits on the free stretch beside v1.
 */
export const ProofEdge = memo(function ProofEdge({ id, sourceX, sourceY, targetX, targetY, style, label, data }: EdgeProps) {
  const xr = typeof data?.xr === "number" ? data.xr : null;
  const yb = typeof data?.yb === "number" ? data.yb : null;
  const r = CORNER;
  const path =
    xr !== null && yb !== null
      ? [
          `M ${sourceX} ${sourceY}`,
          `L ${sourceX} ${yb - r}`,
          `Q ${sourceX} ${yb} ${sourceX + r} ${yb}`,
          `L ${xr - r} ${yb}`,
          `Q ${xr} ${yb} ${xr} ${yb - r}`,
          `L ${xr} ${targetY + r}`,
          `Q ${xr} ${targetY} ${xr - r} ${targetY}`,
          `L ${targetX} ${targetY}`,
        ].join(" ")
      : `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  const labelX = xr !== null ? targetX + (xr - targetX) / 2 : (sourceX + targetX) / 2;
  const labelY = xr !== null ? targetY : (sourceY + targetY) / 2;
  return (
    <>
      <BaseEdge id={id} path={path} style={style} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-sm bg-background px-1.5 py-0.5 text-xs text-fg-muted"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

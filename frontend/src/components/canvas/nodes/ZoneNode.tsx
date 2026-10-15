"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { VerityNode } from "@/lib/canvas/zones";

const DESCRIPTIONS = {
  plan: "AI-drafted blocks. Pins and toggles steer the plan.",
  tree: "Versions compete. Green passed the locked tests.",
} as const;

/** A zone frame: dashed outline, header and one line of help. Not selectable, not focusable, behind the content. */
export const ZoneNode = memo(function ZoneNode({ data }: NodeProps<VerityNode>) {
  return (
    <div className="h-full w-full rounded-lg border border-dashed border-border bg-background" aria-hidden="true">
      <div className="px-4 pt-3">
        <p className="text-xs font-medium text-foreground">{data.label}</p>
        <p className="mt-0.5 text-xs text-fg-subtle">{DESCRIPTIONS[data.zone]}</p>
        {data.note ? <p className="mt-0.5 text-xs text-fg-muted">{data.note}</p> : null}
      </div>
    </div>
  );
});

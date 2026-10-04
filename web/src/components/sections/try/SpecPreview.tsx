"use client";

import { GoldenModelCard } from "@/components/domain/GoldenModelCard";
import { SpecCard } from "@/components/domain/SpecCard";
import type { Spec } from "@/lib/contracts/types";

/** What the agent receives for the chosen preset and goal. */
export function SpecPreview({ spec }: { spec: Spec }) {
  return (
    <aside aria-label="What the agent receives" className="space-y-4 lg:sticky lg:top-6">
      <h2 className="text-xl font-bold text-foreground">What the agent receives</h2>
      <SpecCard spec={spec} variant="full" />
      <GoldenModelCard variant="mini" status="locked" testCount={spec.testCount} files={[]} />
      <p className="text-sm text-fg-muted">Up to {spec.maxLines} lines of Verilog.</p>
    </aside>
  );
}

import { Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateListItem } from "@/lib/contracts/view-types";
import { formatScore } from "./signed";
import { OperatorBadge } from "./OperatorBadge";
import { StatusBadge } from "./StatusBadge";

export type CandidateListProps = { items: CandidateListItem[]; selectedId: string | null; onSelect(id: string): void };

/** Every version as a keyboard friendly list. This is the non-canvas way to reach each version. */
export function CandidateList({ items, selectedId, onSelect }: CandidateListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-fg-muted">No versions yet.</p>;
  }
  return (
    <ul aria-label="Versions" className="flex flex-col gap-1">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex min-h-9 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150",
                selected ? "border-border-strong bg-surface-3" : "border-transparent hover:bg-surface-2",
              )}
            >
              <span className="text-sm font-bold text-foreground">{item.label}</span>
              <StatusBadge status={item.status} size="sm" />
              <OperatorBadge by={item.createdBy} size="sm" />
              <span className="ml-auto flex items-center gap-2">
                {item.tags.includes("elite") ? (
                  <span title="Elite">
                    <Star aria-hidden className="size-3.5 text-fg-muted" />
                    <span className="sr-only">Elite</span>
                  </span>
                ) : null}
                {item.tags.includes("winner") ? (
                  <span title="Winner">
                    <Crown aria-hidden className="size-3.5 text-pass" />
                    <span className="sr-only">Winner</span>
                  </span>
                ) : null}
                {item.tags.includes("baseline") ? <span className="text-xs text-fg-muted">Baseline</span> : null}
                {item.fitness !== null ? (
                  <span className="font-mono text-xs text-fg-muted">F {formatScore(item.fitness)}</span>
                ) : null}
              </span>
              {item.hidden ? <span className="basis-full text-xs text-fg-subtle">Not shown on the canvas</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

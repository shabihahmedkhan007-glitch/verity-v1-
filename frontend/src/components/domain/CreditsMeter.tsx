import { Coins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import type { RunMode } from "@/lib/contracts/types";

export type CreditsMeterProps = { mode: RunMode; usedUsd: number; capUsd: number | null; recordedUsd?: number };

/** Spend against the cap. Replays cost nothing; live runs show a meter that turns warn above 80 percent. */
export function CreditsMeter({ mode, usedUsd, capUsd, recordedUsd }: CreditsMeterProps) {
  if (mode === "replay") {
    const tip =
      recordedUsd !== undefined
        ? `Replays cost nothing. The original run cost ${formatUsd(recordedUsd)}.`
        : "Replays cost nothing.";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-6 items-center gap-1.5 rounded-md px-1.5 text-sm text-fg-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Coins aria-hidden className="size-4" />
            <span className="font-mono">{formatUsd(0)}</span>
            <span>replay</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    );
  }

  const ratio = capUsd && capUsd > 0 ? Math.min(1, usedUsd / capUsd) : 0;
  const reached = capUsd !== null && usedUsd >= capUsd;
  const warn = capUsd !== null && ratio >= 0.8;
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <Coins aria-hidden className={cn("size-4", warn ? "text-warn" : "text-fg-muted")} />
      <span className={cn("font-mono", warn ? "text-warn" : "text-foreground")}>
        {capUsd === null ? formatUsd(usedUsd) : `${formatUsd(usedUsd)} of ${formatUsd(capUsd)}`}
      </span>
      {capUsd !== null ? (
        <Progress
          value={ratio * 100}
          aria-label="Credits used"
          className={cn("h-1.5 w-20 rounded-[2px] bg-surface-3", warn ? "[&>div]:bg-warn" : "[&>div]:bg-fg-muted")}
        />
      ) : null}
      {reached ? <span className="text-warn">Cap reached</span> : null}
    </div>
  );
}

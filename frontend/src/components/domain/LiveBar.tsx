import { Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format";
import { CreditsMeter } from "./CreditsMeter";
import { ModeBadge, type ModeBadgeProps } from "./ModeBadge";

export type LiveBarProps = {
  connection: string;
  elapsedMs: number;
  usedUsd: number;
  capUsd: number | null;
  round: number;
  totalRounds: number | null;
  onStop(): void;
  stopping?: boolean;
};

const CONNECTIONS = ["connecting", "open", "retrying", "closed", "error"] as const;

function toConnection(value: string): ModeBadgeProps["connection"] {
  return (CONNECTIONS as readonly string[]).includes(value) ? (value as ModeBadgeProps["connection"]) : undefined;
}

/** Live transport: connection, elapsed time, round, credits and the Stop button. */
export function LiveBar({ connection, elapsedMs, usedUsd, capUsd, round, totalRounds, onStop, stopping }: LiveBarProps) {
  return (
    <div className="flex h-full min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1">
      <ModeBadge mode="live" connection={toConnection(connection)} />
      <p className="text-sm text-fg-muted">
        {round > 0 ? (totalRounds ? `Round ${round} of ${totalRounds}` : `Round ${round}`) : "Starting"}
      </p>
      <p className="inline-flex items-center gap-1.5 text-sm text-fg-muted">
        <Timer aria-hidden className="size-4" />
        <span className="font-mono">{formatClock(elapsedMs)}</span>
      </p>
      <CreditsMeter mode="live" usedUsd={usedUsd} capUsd={capUsd} />
      <Button type="button" variant="destructive" className="ml-auto h-8 px-3" onClick={onStop} disabled={stopping}>
        <Square aria-hidden />
        {stopping ? "Stopping" : "Stop run"}
      </Button>
    </div>
  );
}

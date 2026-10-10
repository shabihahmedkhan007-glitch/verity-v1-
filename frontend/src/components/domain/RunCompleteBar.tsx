import { Check, CircleAlert, Download, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RunCompleteBarProps = {
  outcome: "complete" | "partial" | "no_winner";
  winnerLabel: string | null;
  onSeeResults(): void;
  onDownload(): void;
  onReplay?: () => void;
};

/** End-of-run bar: what happened, then the next steps. */
export function RunCompleteBar({ outcome, winnerLabel, onSeeResults, onDownload, onReplay }: RunCompleteBarProps) {
  const label = winnerLabel ?? "none";
  const message =
    outcome === "complete"
      ? `Run complete. Winner: ${label}.`
      : outcome === "partial"
        ? `Run stopped early. Best so far: ${label}.`
        : "No version passed the locked tests.";
  const Icon = outcome === "complete" ? Check : outcome === "partial" ? TriangleAlert : CircleAlert;
  const tone = outcome === "complete" ? "text-pass" : outcome === "partial" ? "text-warn" : "text-fail";
  return (
    <div className="flex h-full min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon aria-hidden className={`size-4 ${tone}`} />
        {message}
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {onReplay ? (
          <Button type="button" variant="ghost" className="h-10 px-4" onClick={onReplay}>
            <RotateCcw aria-hidden />
            Watch again
          </Button>
        ) : null}
        {outcome !== "no_winner" ? (
          <Button type="button" variant="secondary" className="h-10 px-4" onClick={onDownload}>
            <Download aria-hidden />
            Download design (.zip)
          </Button>
        ) : null}
        <Button type="button" className="h-10 px-4" onClick={onSeeResults}>
          See results
        </Button>
      </div>
    </div>
  );
}

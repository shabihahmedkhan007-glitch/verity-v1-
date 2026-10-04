import { Check, CirclePause, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type CountdownGateProps = {
  state: "counting" | "held" | "waiting" | "closed";
  remainingMs: number;
  totalMs: number;
  readOnly?: boolean;
  onBuildNow?: () => void;
  onHold?: () => void;
  onResume?: () => void;
};

/** Plan approval gate. The countdown is adjustable: hold it, build now, or turn Autopilot off to wait for a click. */
export function CountdownGate({ state, remainingMs, totalMs, readOnly, onBuildNow, onHold, onResume }: CountdownGateProps) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;

  let title: string;
  let icon = <Timer aria-hidden className="size-4 text-fg-muted" />;
  switch (state) {
    case "counting":
      title = `Building in ${seconds} s`;
      break;
    case "held":
      title = `Held at ${seconds} s`;
      icon = <CirclePause aria-hidden className="size-4 text-fg-muted" />;
      break;
    case "waiting":
      title = "Waiting for you.";
      break;
    case "closed":
      title = "Plan approved. Building.";
      icon = <Check aria-hidden className="size-4 text-fg-muted" />;
      break;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p role="timer" aria-live="off" className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </p>
        {readOnly || state === "closed" ? null : (
          <div className="ml-auto flex items-center gap-2">
            {state === "counting" ? (
              <>
                <Button type="button" size="sm" className="h-10 px-4" onClick={onBuildNow}>
                  Build now
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-10 px-4" onClick={onHold}>
                  <CirclePause aria-hidden />
                  Hold
                </Button>
              </>
            ) : null}
            {state === "held" ? (
              <>
                <Button type="button" size="sm" className="h-10 px-4" onClick={onResume}>
                  Resume
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-10 px-4" onClick={onBuildNow}>
                  Build now
                </Button>
              </>
            ) : null}
            {state === "waiting" ? (
              <Button type="button" size="sm" className="h-10 px-4" onClick={onBuildNow}>
                Build
              </Button>
            ) : null}
          </div>
        )}
      </div>
      {state === "counting" || state === "held" ? (
        <Progress
          value={ratio * 100}
          aria-label="Time until the build starts"
          className="h-1 rounded-[2px] bg-surface-3 [&>div]:bg-fg-muted"
        />
      ) : null}
      {state === "counting" && !readOnly ? (
        <p className="text-xs text-fg-subtle">
          Steer by pinning a block or toggling a variant. Every change restarts the countdown.
        </p>
      ) : null}
      {readOnly && state !== "closed" ? <p className="text-xs text-fg-subtle">The recording ran on Autopilot.</p> : null}
    </div>
  );
}

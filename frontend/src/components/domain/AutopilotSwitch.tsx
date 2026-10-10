"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type AutopilotSwitchProps = { on: boolean; onChange?: (on: boolean) => void; readOnly?: boolean };

/** Autopilot toggle. In a replay it is shown on and disabled because the recording ran on Autopilot. */
export function AutopilotSwitch({ on, onChange, readOnly }: AutopilotSwitchProps) {
  const id = useId();
  const tip = readOnly
    ? "The recording ran on Autopilot."
    : on
      ? "On: nothing waits for you. Every step continues on its own."
      : "Off: the run waits for you at each plan gate.";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex min-h-6 items-center gap-2" tabIndex={readOnly ? 0 : undefined}>
          <Switch
            id={id}
            checked={on}
            disabled={readOnly}
            onCheckedChange={(next) => onChange?.(next)}
            aria-label="Autopilot"
            className="data-checked:bg-fg-muted dark:data-checked:bg-fg-muted"
          />
          <label htmlFor={id} className="text-sm text-fg-muted select-none">
            Autopilot
          </label>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

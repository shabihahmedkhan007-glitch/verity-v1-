"use client";

import { useId } from "react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { Preset } from "@/lib/contracts/view-types";

export type PresetOptionProps = { preset: Preset; value: string; recommended?: boolean };

/** One preset as a radio card. Render inside a RadioGroup. */
export function PresetOption({ preset, value, recommended }: PresetOptionProps) {
  const id = useId();
  const isRecommended = recommended ?? preset.recommended ?? false;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150",
        "hover:bg-surface-2 has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-surface-2",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
      )}
    >
      <RadioGroupItem
        id={id}
        value={value}
        className="mt-0.5 data-checked:border-foreground data-checked:bg-foreground dark:data-checked:bg-foreground"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-medium text-foreground">{preset.title}</span>
          {isRecommended ? (
            <span className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-xs font-medium text-fg-muted">Recommended</span>
          ) : null}
        </span>
        <span className="text-sm text-fg-muted">{preset.oneLine}</span>
        <span className="text-xs text-fg-subtle">{`About ${preset.approxMinutes} minutes`}</span>
      </span>
    </label>
  );
}

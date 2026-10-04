"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Priority } from "@/lib/contracts/types";

export type PriorityRadioProps = { value: Priority; onChange(p: Priority): void; disabled?: boolean };

const OPTIONS: { value: Priority; label: string }[] = [
  { value: "area", label: "Smallest area" },
  { value: "speed", label: "Fastest clock" },
  { value: "power", label: "Lowest power" },
];

/** Single-select goal. A ToggleGroup, so arrow keys move and the selected option stays selected. */
export function PriorityRadio({ value, onChange, disabled }: PriorityRadioProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      disabled={disabled}
      aria-label="Goal"
      spacing={0}
      onValueChange={(next) => {
        if (next) onChange(next as Priority);
      }}
    >
      {OPTIONS.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-10 px-3 text-sm data-[state=on]:border-foreground data-[state=on]:bg-surface-3 data-[state=on]:text-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

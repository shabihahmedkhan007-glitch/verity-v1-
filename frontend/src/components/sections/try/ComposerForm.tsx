"use client";

import Link from "next/link";
import { Callout } from "@/components/domain/Callout";
import { PresetOption } from "@/components/domain/PresetOption";
import { PriorityRadio } from "@/components/domain/PriorityRadio";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { PRESETS } from "@/lib/contracts/presets";
import type { Priority } from "@/lib/contracts/types";
import type { LiveHealth } from "@/lib/contracts/view-types";
import { formatUsd } from "@/lib/format";
import { AccessCodePrompt, type AccessCodePromptProps } from "./AccessCodePrompt";
import { LiveUnavailable } from "./LiveUnavailable";

export type ComposerFormProps = {
  presetId: string;
  onPresetChange(id: string): void;
  priority: Priority;
  onPriorityChange(p: Priority): void;
  health: LiveHealth;
  starting: boolean;
  startError: string | null;
  onStart(): void;
  onRetry(): void;
  /** Set when the agent asks for an access code: the prompt replaces the Start button. */
  accessCode?: AccessCodePromptProps | null;
};

function StepLabel({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="flex items-baseline gap-3 text-xl font-bold text-foreground">
      <span className="font-mono text-sm font-normal text-fg-subtle" aria-hidden>
        {n}
      </span>
      {children}
    </h2>
  );
}

export function ComposerForm({
  presetId,
  onPresetChange,
  priority,
  onPriorityChange,
  health,
  starting,
  startError,
  onStart,
  onRetry,
  accessCode,
}: ComposerFormProps) {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const available = health.status === "ready" || health.status === "checking";
  const cap = formatUsd(health.capUsd ?? 0.5);

  const startLabel = starting
    ? "Starting..."
    : health.status === "checking"
      ? "Checking live availability"
      : "Start live run";

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (health.status === "ready" && !starting && !accessCode) onStart();
      }}
    >
      <section className="space-y-4">
        <StepLabel n={1}>Choose a chip</StepLabel>
        <RadioGroup
          value={presetId}
          onValueChange={onPresetChange}
          aria-label="Chip"
          className="gap-3"
        >
          {PRESETS.map((p) => (
            <PresetOption key={p.id} preset={p} value={p.id} recommended={p.recommended} />
          ))}
        </RadioGroup>
      </section>

      <section className="space-y-4">
        <StepLabel n={2}>Choose a goal</StepLabel>
        <PriorityRadio value={priority} onChange={onPriorityChange} disabled={starting} />
      </section>

      {available && accessCode ? (
        <AccessCodePrompt {...accessCode} />
      ) : available ? (
        <section className="space-y-4">
          <p className="text-base text-fg-muted">
            Credit cap for this run: {cap}. About {preset.approxMinutes} minutes. You can stop at any time.
          </p>
          {startError ? (
            <Callout
              tone="fail"
              title="Could not start the run."
              body={startError || "The agent did not respond."}
              actions={
                <>
                  <Button type="button" variant="outline" className="h-10 px-4" onClick={onRetry}>
                    Try again
                  </Button>
                  <Button asChild variant="ghost" className="h-10 px-4">
                    <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
                  </Button>
                </>
              }
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              className="h-10 px-5 text-base"
              disabled={health.status !== "ready" || starting}
            >
              {startLabel}
            </Button>
            <span className="text-sm text-fg-muted">
              or{" "}
              <Link prefetch={false}
                href="/studio?run=golden"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Watch the recorded run (free)
              </Link>
            </span>
          </div>
        </section>
      ) : (
        <LiveUnavailable health={health} />
      )}
    </form>
  );
}

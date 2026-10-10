"use client";

import Link from "next/link";
import { AutopilotSwitch } from "@/components/domain/AutopilotSwitch";
import { CreditsMeter } from "@/components/domain/CreditsMeter";
import { HumanInputsCounter } from "@/components/domain/HumanInputsCounter";
import { ModeBadge } from "@/components/domain/ModeBadge";
import { SampleDataBadge } from "@/components/domain/SampleDataBadge";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/sections/shared/AppHeader";
import { useRunSummary } from "@/lib/hooks/use-run-views";
import { useLive, useUi } from "@/lib/store";

export type StudioTopBarProps = {
  stopConfirm: boolean;
  onRequestStop: () => void;
  onCancelStop: () => void;
  onConfirmStop: () => void;
};

export function StudioTopBar({ stopConfirm, onRequestStop, onCancelStop, onConfirmStop }: StudioTopBarProps) {
  const summary = useRunSummary();
  const { autopilot, setAutopilot } = useUi();
  const live = useLive();
  const isLive = summary.mode === "live";
  const running = summary.phase === "running" || summary.phase === "starting";

  const context = (
    <>
      <h1 className="truncate text-sm font-medium text-foreground">{summary.title}</h1>
      <ModeBadge
        mode={summary.mode}
        connection={isLive ? (live.connection === "idle" ? "connecting" : live.connection) : undefined}
      />
      {summary.sample ? <SampleDataBadge /> : null}
    </>
  );

  const actions = (
    <>
      <HumanInputsCounter items={summary.humanInputItems} />
      <CreditsMeter
        mode={summary.mode}
        usedUsd={summary.credits.usedUsd}
        capUsd={summary.credits.capUsd}
        recordedUsd={summary.recordedUsd ?? undefined}
      />
      <AutopilotSwitch
        on={isLive ? autopilot : true}
        readOnly={!isLive}
        onChange={(on) => {
          setAutopilot(on);
          void live.steer({ kind: "autopilot", on });
        }}
      />
      {isLive ? (
        running ? (
          stopConfirm ? (
            <div className="flex items-center gap-2" role="group" aria-label="Confirm stopping the run">
              <span className="hidden text-sm text-fg-muted xl:inline">
                Stop this run? You keep everything finished so far.
              </span>
              <Button variant="destructive" className="h-8 px-3" onClick={onConfirmStop}>
                Stop
              </Button>
              <Button variant="ghost" className="h-8 px-3" onClick={onCancelStop}>
                Keep running
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="h-8 px-3" onClick={onRequestStop}>
              Stop run
            </Button>
          )
        ) : null
      ) : (
        <Button asChild variant="outline" className="h-8 px-3">
          <Link prefetch={false} href="/try">Try live</Link>
        </Button>
      )}
    </>
  );

  return <AppHeader context={context} actions={actions} />;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/sections/shared/AppHeader";
import { PRESETS } from "@/lib/contracts/presets";
import type { Priority } from "@/lib/contracts/types";
import { useLiveHealth } from "@/lib/hooks/use-live-health";
import { useLive } from "@/lib/store";
import { ComposerForm } from "./ComposerForm";
import { SpecPreview } from "./SpecPreview";

export function TryView() {
  const router = useRouter();
  const health = useLiveHealth();
  const live = useLive();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [priority, setPriority] = useState<Priority>(PRESETS[0].spec.priority);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  const start = async () => {
    setStarting(true);
    setStartError(null);
    const result = await live.startLive(preset.id, priority);
    if ("runId" in result) {
      router.push(`/studio?run=${encodeURIComponent(result.runId)}`);
      return;
    }
    setStarting(false);
    setStartError(result.error);
  };

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader
        actions={
          <Button asChild variant="outline" className="h-8 px-3">
            <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-[64rem] flex-1 px-6 py-10 md:py-14">
        <h1 className="text-2xl font-bold text-foreground">Run Verity live</h1>
        <p className="mt-2 max-w-[65ch] text-base text-fg-muted">
          Pick a chip and a goal. Live runs use presets and a credit cap, so every run finishes on
          budget. Autopilot is on: watch, or steer if you like.
        </p>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <ComposerForm
            presetId={presetId}
            onPresetChange={(id) => {
              setPresetId(id);
              const next = PRESETS.find((p) => p.id === id);
              if (next) setPriority(next.spec.priority);
            }}
            priority={priority}
            onPriorityChange={setPriority}
            health={health}
            starting={starting}
            startError={startError}
            onStart={() => void start()}
            onRetry={() => void start()}
          />
          <SpecPreview spec={{ ...preset.spec, priority }} />
        </div>
      </main>
    </div>
  );
}

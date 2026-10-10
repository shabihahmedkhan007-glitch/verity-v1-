"use client";

import { useSearchParams } from "next/navigation";
import { useLiveRun } from "@/lib/hooks/use-live-run";
import { useReplayDriver } from "@/lib/hooks/use-replay-driver";
import { StudioWorkspace } from "./StudioWorkspace";

function StudioReplay() {
  useReplayDriver({ src: "/runs/golden.json", autoplay: true, loop: false });
  return <StudioWorkspace mode="replay" />;
}

function StudioLive({ runId }: { runId: string }) {
  useLiveRun(runId);
  return <StudioWorkspace mode="live" />;
}

/** Client root of /studio. `?run=golden` (the default) replays the recording; any other id is a live run. */
export function StudioView() {
  const runId = useSearchParams().get("run") ?? "golden";
  return runId === "golden" ? <StudioReplay /> : <StudioLive key={runId} runId={runId} />;
}

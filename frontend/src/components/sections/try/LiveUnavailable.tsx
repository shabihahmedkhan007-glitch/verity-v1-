"use client";

import Link from "next/link";
import { Callout } from "@/components/domain/Callout";
import { Button } from "@/components/ui/button";
import type { LiveHealth } from "@/lib/contracts/view-types";

const RECORDED = "The recorded run shows the same loop and costs nothing.";

function RecordedButton({ primary }: { primary: boolean }) {
  return (
    <Button asChild variant={primary ? "default" : "outline"} className="h-10 px-4">
      <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
    </Button>
  );
}

/** Replaces the Start button when live runs cannot be started (UI_UX_SPEC 6.2). Presets stay visible above it. */
export function LiveUnavailable({ health }: { health: LiveHealth }) {
  switch (health.status) {
    case "budget_exhausted":
      return (
        <Callout
          tone="warn"
          title="Today's live budget is used up."
          body="Live runs open again tomorrow. The recorded run shows the same loop."
          actions={<RecordedButton primary />}
        />
      );
    case "busy":
      return (
        <Callout
          tone="info"
          title="Another live run is in progress."
          body="Live runs are limited so every run stays on budget. Try again in a few minutes."
          actions={
            <>
              <Button variant="outline" className="h-10 px-4" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <RecordedButton primary={false} />
            </>
          }
        />
      );
    case "error":
      return (
        <Callout
          tone="fail"
          title="Live runs could not be reached."
          body={`The agent did not respond. ${RECORDED}`}
          actions={
            <>
              <Button variant="outline" className="h-10 px-4" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <RecordedButton primary={false} />
            </>
          }
        />
      );
    default:
      return (
        <Callout
          tone="info"
          title="Live runs are offline right now."
          body={RECORDED}
          actions={<RecordedButton primary />}
        />
      );
  }
}

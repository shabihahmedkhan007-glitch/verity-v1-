"use client";

import Link from "next/link";
import { Callout } from "@/components/domain/Callout";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { useLive, useRun } from "@/lib/store";

const small = "h-8 px-3";

/** Cap, error, stopped and lost-connection messages (UI_UX_SPEC 3.5). Renders nothing for a healthy run. */
export function RunBanner() {
  const phase = useRun((r) => r.phase);
  const runId = useRun((r) => r.runId);
  const round = useRun((r) => r.round);
  const capUsd = useRun((r) => r.credits.capUsd);
  const mode = useRun((r) => r.mode);
  const { connection, error } = useLive();

  const resultsHref = `/results?run=${encodeURIComponent(runId)}`;
  const recorded = (
    <Button asChild variant="outline" className={small}>
      <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
    </Button>
  );

  if (mode === "live" && connection === "error" && (phase === "starting" || phase === "running" || phase === "idle")) {
    return (
      <Callout
        tone="fail"
        title="Lost connection to the live run."
        body="The run may still finish on the server."
        actions={
          <>
            <Button variant="outline" className={small} onClick={() => window.location.reload()}>
              Reconnect
            </Button>
            {recorded}
          </>
        }
      />
    );
  }

  if (phase === "error") {
    return (
      <Callout
        tone="fail"
        title={`The run stopped: ${error ?? "the agent reported an error."}`}
        body="Everything finished so far is kept."
        actions={
          <>
            <Button asChild variant="outline" className={small}>
              <Link prefetch={false} href={resultsHref}>See results so far</Link>
            </Button>
            <Button asChild variant="ghost" className={small}>
              <Link prefetch={false} href="/try">Start another</Link>
            </Button>
          </>
        }
      />
    );
  }

  if (phase === "cap_reached") {
    return (
      <Callout
        tone="warn"
        title={`Credit cap reached${capUsd !== null ? ` (${formatUsd(capUsd)})` : ""}.`}
        body={`The agent stopped after round ${round} and kept the best version so far.`}
        actions={
          <Button asChild variant="outline" className={small}>
            <Link prefetch={false} href={resultsHref}>See results so far</Link>
          </Button>
        }
      />
    );
  }

  if (phase === "stopped") {
    return (
      <Callout
        tone="info"
        title="You stopped the run."
        actions={
          <>
            <Button asChild variant="outline" className={small}>
              <Link prefetch={false} href={resultsHref}>See results so far</Link>
            </Button>
            <Button asChild variant="ghost" className={small}>
              <Link prefetch={false} href="/try">Start another</Link>
            </Button>
          </>
        }
      />
    );
  }

  return null;
}

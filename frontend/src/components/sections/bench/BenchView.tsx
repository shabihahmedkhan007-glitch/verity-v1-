"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RackBar } from "@/components/sections/shared/RackBar";
import { VignetteGrid } from "@/components/sections/shared/VignetteGrid";
import { useLiveHealth } from "@/lib/hooks/use-live-health";
import { useLiveRun } from "@/lib/hooks/use-live-run";
import { useLiveSession } from "@/lib/hooks/use-live-session";
import { initialSnapshot } from "@/lib/run/reducer";
import { useLive, useRun, useUi, useVerityStore } from "@/lib/store";
import { Mod } from "../studio/chrome/Mod";
import { DetailPanel } from "../studio/detail/DetailPanel";
import { useFollowFocus } from "../studio/detail/follow";
import { LoopModule } from "../studio/loop/LoopModule";
import { STUDIO_ROOT } from "../studio/studio-root";
import { CharacteristicsTable } from "../studio/table/CharacteristicsTable";
import { NarrationFor } from "../studio/timeline/TimelineBar";
import { TERMINAL, currentCandidate, humanRefOf } from "./derive";
import { RequestModule, type RunRequest } from "./RequestModule";
import { ResultModule, StatusModule } from "./ResultModule";
import { RtlModule } from "./RtlModule";
import "./bench.css";

/** What the modules show before any run: an empty record, never the store's leftover replay. */
const IDLE_RUN = initialSnapshot({ runId: "bench", mode: "live", sample: false, title: "No run yet" }).run;

/** Owns the event stream of the run in the URL. Keyed by the page so Reconnect opens a fresh stream. */
function LiveFeed({ runId }: { runId: string }) {
  useLiveRun(runId);
  return null;
}

/**
 * /bench (spec 2026-10-17 section 6.1): REQUEST on the left, LIVE (loop, RTL, monitor) in the middle, RESULT on the
 * right. The run id lives in `?run=`, so a reload rejoins the stream. Live runs leave the studio for this page (D15);
 * a finished run opens in the studio.
 */
export function BenchView() {
  const router = useRouter();
  const pathname = usePathname();
  const urlRun = useSearchParams().get("run");
  const health = useLiveHealth();
  const live = useLive();
  const hasSession = useLiveSession();
  const storeRun = useRun((r) => r);
  const source = useVerityStore((s) => s.source);
  const storeRunId = useVerityStore((s) => s.runId);
  const log = useVerityStore((s) => s.log);
  const { selection, select } = useUi();

  const [feed, setFeed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const [stopping, setStopping] = useState(false);
  // State updates land after the click; the ref blocks a second Run fired in the same tick.
  const inFlight = useRef(false);

  const hasRun = urlRun !== null && source === "live" && storeRunId === urlRun && storeRun.runId === urlRun;
  const run = hasRun ? storeRun : IDLE_RUN;
  const follow = useFollowFocus(run);
  const active = hasRun && !TERMINAL.has(run.phase);
  const needsCode = (health.authRequired === true || rejected) && !hasSession;
  const human = useMemo(() => (hasRun ? humanRefOf(log) : null), [hasRun, log]);
  const pinned = selection?.kind === "candidate" && run.candidates[selection.id] !== undefined;
  const current = currentCandidate(run, selection, follow);

  // Escape hands the detail panel and the RTL view back to following the run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  const startRun = async (req: RunRequest) => {
    if (inFlight.current || starting || active) return;
    inFlight.current = true;
    setStarting(true);
    setStartError(null);
    select(null);
    const res = await live.startLive(req.familyId, req.priority, req.sendKnobs ? req.knobs : undefined, req.title);
    setStarting(false);
    inFlight.current = false;
    if ("runId" in res) {
      setStopping(false);
      router.replace(`${pathname}?run=${encodeURIComponent(res.runId)}`);
      return;
    }
    if (res.reason === "unauthorized") setRejected(true);
    else setStartError(res.error);
  };

  const submitCode = async (code: string): Promise<string | null> => {
    const { createSession } = await import("@/lib/sources/live");
    const result = await createSession(code);
    if (!result.ok) return result.error;
    setRejected(false);
    setStartError(null);
    return null;
  };

  const stop = async () => {
    setStopping(true);
    const before = useVerityStore.getState().error;
    await live.stopRun();
    const after = useVerityStore.getState().error;
    if (after && after !== before) setStopping(false);
  };

  const noData = run.spec === null && run.candidateOrder.length === 0;
  const notice = !urlRun
    ? "Pick a chip and press Run. Every step of the agent appears here."
    : !hasRun || (noData && (live.connection === "idle" || live.connection === "connecting"))
      ? "Connecting to the live run."
      : null;

  return (
    <div className={`${STUDIO_ROOT} bench`}>
      <VignetteGrid />
      <RackBar current="bench" />
      {urlRun ? <LiveFeed key={`${urlRun}:${feed}`} runId={urlRun} /> : null}
      <main className="b-main" aria-label="Bench">
        <h1 className="sr">Verity bench: build a chip live</h1>
        <div className="b-col b-left">
          <RequestModule
            health={health}
            locked={active}
            starting={starting}
            startError={startError ?? (hasRun && live.error && !TERMINAL.has(run.phase) ? live.error : null)}
            needsCode={needsCode}
            codeNotice={rejected ? "Your session was not accepted. Enter the access code again." : null}
            credits={hasRun ? run.credits : null}
            hasRun={hasRun}
            onSubmitCode={submitCode}
            onRun={(req) => void startRun(req)}
          />
        </div>
        <div className="b-col b-center">
          <LoopModule run={run} />
          <RtlModule candidate={current} pinned={pinned} />
          <Mod label="Monitor" className="b-mon">
            <div className="mon">
              <NarrationFor run={run} mode="live" notice={notice} />
              <DetailPanel run={run} follow={follow} />
            </div>
          </Mod>
        </div>
        <div className="b-col b-right">
          <StatusModule
            run={run}
            hasRun={hasRun}
            connection={live.connection}
            stopping={stopping && active}
            onStop={() => void stop()}
            onReconnect={() => setFeed((n) => n + 1)}
          />
          <CharacteristicsTable run={run} follow={follow} />
          <ResultModule run={run} hasRun={hasRun} human={human} humanFeature={health.features?.includes("human_ref") === true} />
        </div>
      </main>
    </div>
  );
}

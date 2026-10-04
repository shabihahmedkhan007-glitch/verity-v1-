"use client";

import { useEffect } from "react";
import { isLiveConfigured } from "@/lib/env";
import { openEventStream } from "@/lib/sources/live";
import { useVerityStore } from "@/lib/store";

/** Three failed reconnects inside this window turn the connection into "error". */
const RECONNECT_WINDOW_MS = 30_000;
const MAX_FAILED_RECONNECTS = 3;
const CLOCK_STEP_MS = 250;
const TRAILING_EVENTS_MS = 1000;
const TERMINAL = new Set(["done", "error", "cap_reached", "stopped"]);

/**
 * Owns the EventSource for a live run. Events are validated by lib/sources/live.ts, deduped by seq,
 * and applied through the one reducer. Also keeps the playback clock moving between events
 * (countdown and elapsed time).
 */
export function useLiveRun(runId: string | null): void {
  useEffect(() => {
    if (!runId) return;
    const store = useVerityStore.getState();
    const known = store.source === "live" && store.runId === runId && store.snapshot.run.runId === runId;
    if (!known) store.adoptLiveRun(runId);
    if (!isLiveConfigured) {
      useVerityStore.getState().setConnection("error", "Live runs are offline right now.");
      return;
    }

    let failures: number[] = [];
    let clockBaseT = useVerityStore.getState().snapshot.run.tMs;
    let clockBaseAt = performance.now();
    let finished = false;

    const close = openEventStream(runId, {
      onOpen() {
        failures = [];
        useVerityStore.getState().setConnection("open", null);
      },
      onEvent(e) {
        const st = useVerityStore.getState();
        if (e.seq <= st.snapshot.run.lastSeq) return; // duplicate after a reconnect
        clockBaseT = e.tMs;
        clockBaseAt = performance.now();
        st.ingestLive(e);
        if (e.t === "run" && TERMINAL.has(e.phase)) {
          finished = true;
          // Trailing events at the same instant (a closing caption) may still be in flight; close shortly after.
          window.setTimeout(close, TRAILING_EVENTS_MS);
          const after = useVerityStore.getState();
          after.setConnection("closed");
          after.setStatus("ended");
          after.setClock(e.tMs);
        }
      },
      onError(closed) {
        if (finished) return;
        const now = Date.now();
        failures = failures.filter((t) => now - t < RECONNECT_WINDOW_MS).concat(now);
        if (closed || failures.length >= MAX_FAILED_RECONNECTS) {
          close();
          useVerityStore.getState().setConnection("error", "Lost connection to the live run.");
        } else {
          useVerityStore.getState().setConnection("retrying");
        }
      },
    });

    const clock = window.setInterval(() => {
      const st = useVerityStore.getState();
      if (st.source !== "live" || finished) return;
      if (st.snapshot.run.phase === "running" || st.snapshot.run.phase === "starting") {
        st.setClock(clockBaseT + (performance.now() - clockBaseAt));
      }
    }, CLOCK_STEP_MS);

    return () => {
      window.clearInterval(clock);
      close();
      const st = useVerityStore.getState();
      if (!finished && st.source === "live" && st.runId === runId) st.setConnection("closed");
    };
  }, [runId]);
}

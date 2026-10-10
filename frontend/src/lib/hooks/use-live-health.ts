"use client";

import { useEffect, useState } from "react";
import { isLiveConfigured } from "@/lib/env";
import { checkHealth } from "@/lib/sources/live";
import type { LiveHealth } from "@/lib/contracts/view-types";

/** GET /health once on mount. "not_configured" when NEXT_PUBLIC_AGENT_URL is unset (no request is made). */
export function useLiveHealth(): LiveHealth {
  const [health, setHealth] = useState<LiveHealth>(() => ({
    status: isLiveConfigured ? "checking" : "not_configured",
    capUsd: null,
  }));

  useEffect(() => {
    if (!isLiveConfigured) return;
    const ac = new AbortController();
    checkHealth(ac.signal).then((h) => {
      if (!ac.signal.aborted) setHealth(h);
    });
    return () => ac.abort();
  }, []);

  return health;
}

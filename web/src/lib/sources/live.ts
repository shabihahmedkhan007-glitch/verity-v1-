"use client";

// The only module allowed to talk to the agent (ARCHITECTURE 8.2, 10). The replay path never imports it.
// Everything here treats the network as untrusted: events are validated with zod before they reach the reducer.

import { AGENT_URL } from "@/lib/env";
import { RunEventSchema } from "@/lib/contracts/schemas";
import type { Priority, RunEvent } from "@/lib/contracts/types";
import type { LiveHealth, SteerRequest } from "@/lib/contracts/view-types";

export function liveUrl(path: string): string | null {
  return AGENT_URL ? `${AGENT_URL}${path}` : null;
}

export type StartFailureReason = "busy" | "budget_exhausted" | "maintenance";
export type PostRunResult = { runId: string; capUsd: number | null } | { error: string; reason?: StartFailureReason };

const HEALTH_TIMEOUT_MS = 3000;

/** GET /health. Never throws: any failure is reported as the "error" availability state. */
export async function checkHealth(signal?: AbortSignal): Promise<LiveHealth> {
  const url = liveUrl("/health");
  if (!url) return { status: "not_configured", capUsd: null };
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), HEALTH_TIMEOUT_MS);
  signal?.addEventListener("abort", () => timeout.abort(), { once: true });
  try {
    const res = await fetch(url, { signal: timeout.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { status: "error", capUsd: null };
    const body = (await res.json()) as { liveEnabled?: boolean; reason?: string; capUsd?: number };
    const capUsd = typeof body.capUsd === "number" ? body.capUsd : null;
    if (body.liveEnabled) return { status: "ready", capUsd };
    if (body.reason === "budget_exhausted") return { status: "budget_exhausted", capUsd };
    if (body.reason === "busy") return { status: "busy", capUsd };
    return { status: "error", capUsd };
  } catch {
    return { status: "error", capUsd: null };
  } finally {
    clearTimeout(timer);
  }
}

/** POST /runs. 201 { runId, capUsd } or 429 { reason }. */
export async function postRun(presetId: string, priority: Priority): Promise<PostRunResult> {
  const url = liveUrl("/runs");
  if (!url) return { error: "Live runs are offline right now." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ presetId, priority }),
    });
    if (res.status === 201) {
      const body = (await res.json()) as { runId?: string; capUsd?: number };
      if (typeof body.runId === "string" && body.runId) {
        return { runId: body.runId, capUsd: typeof body.capUsd === "number" ? body.capUsd : null };
      }
      return { error: "The agent did not respond." };
    }
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      const reason: StartFailureReason | undefined =
        body.reason === "budget_exhausted" || body.reason === "maintenance" || body.reason === "busy" ? body.reason : "busy";
      return { error: reason === "busy" ? "Another live run is in progress." : "Live runs are paused right now.", reason };
    }
    return { error: "The agent did not respond." };
  } catch {
    return { error: "The agent did not respond." };
  }
}

async function postJson(path: string, body?: unknown): Promise<boolean> {
  const url = liveUrl(path);
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** POST /runs/{id}/steer (202). Pending state is cleared only when the server echoes a human event. */
export function postSteer(runId: string, req: SteerRequest): Promise<boolean> {
  return postJson(`/runs/${encodeURIComponent(runId)}/steer`, req);
}

/** POST /runs/{id}/stop (202), then the server emits a run event with phase "stopped". */
export function postStop(runId: string): Promise<boolean> {
  return postJson(`/runs/${encodeURIComponent(runId)}/stop`);
}

export type StreamHandlers = {
  onOpen(): void;
  onEvent(e: RunEvent): void;
  /** `closed` is true when the browser gave up on its own (readyState CLOSED). */
  onError(closed: boolean): void;
};

/**
 * Opens the SSE stream. The server sends `id: <seq>`, so the browser resumes with Last-Event-ID on reconnect.
 * Returns a function that closes the stream.
 */
export function openEventStream(runId: string, h: StreamHandlers): () => void {
  const url = liveUrl(`/runs/${encodeURIComponent(runId)}/events`);
  if (!url) {
    h.onError(true);
    return () => {};
  }
  const source = new EventSource(url);
  source.onopen = () => h.onOpen();
  source.onmessage = (msg: MessageEvent<string>) => {
    let json: unknown;
    try {
      json = JSON.parse(msg.data);
    } catch {
      if (process.env.NODE_ENV !== "production") console.warn("[verity] live event was not JSON", msg.data);
      return;
    }
    const parsed = RunEventSchema.safeParse(json);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") console.warn("[verity] live event rejected by schema", parsed.error.issues);
      return;
    }
    h.onEvent(parsed.data as RunEvent);
  };
  source.onerror = () => h.onError(source.readyState === EventSource.CLOSED);
  return () => source.close();
}

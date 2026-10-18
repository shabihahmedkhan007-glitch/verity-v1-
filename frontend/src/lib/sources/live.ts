"use client";

// The only module allowed to talk to the agent (ARCHITECTURE 8.2, 10). The replay path never imports it.
// Everything here treats the network as untrusted: events are validated with zod before they reach the reducer.

import { AGENT_URL } from "@/lib/env";
import { z } from "zod";
import { RunEventSchema } from "@/lib/contracts/schemas";
import type { KnobValue } from "@/lib/contracts/presets";
import type { Priority, RunEvent } from "@/lib/contracts/types";
import type { LiveHealth, SteerRequest } from "@/lib/contracts/view-types";

export function liveUrl(path: string): string | null {
  return AGENT_URL ? `${AGENT_URL}${path}` : null;
}

export type StartFailureReason = "busy" | "budget_exhausted" | "maintenance" | "rate_limited" | "unauthorized";
export type PostRunResult =
  | { runId: string; capUsd: number | null; streamToken: string | null }
  | { error: string; reason?: StartFailureReason };
/** "unauthorized" is a 401: the session token is missing, invalid or expired. */
export type SendResult = "ok" | "unauthorized" | "failed";

const HEALTH_TIMEOUT_MS = 3000;

// ---------- session (access code) ----------
// The session token and the per-run stream token live in sessionStorage only: gone when the tab closes, never in the bundle.

const SESSION_KEY = "verity.session";
const STREAM_KEY_PREFIX = "verity.stream.";
const SESSION_EVENT = "verity:session";

type Session = { token: string; expiresAt: string };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The stored session, or null when there is none or it has expired (an expired one is removed). */
export function readSession(): Session | null {
  const store = storage();
  const raw = store?.getItem(SESSION_KEY);
  if (!store || !raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.token === "string" && parsed.token && typeof parsed.expiresAt === "string") {
      const expires = Date.parse(parsed.expiresAt);
      if (Number.isFinite(expires) && expires > Date.now()) return { token: parsed.token, expiresAt: parsed.expiresAt };
    }
  } catch {
    // a malformed value is treated as no session
  }
  store.removeItem(SESSION_KEY);
  return null;
}

export function clearSession(): void {
  storage()?.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** For useSyncExternalStore: tells subscribers when the session was stored or cleared. */
export function subscribeSession(onChange: () => void): () => void {
  window.addEventListener(SESSION_EVENT, onChange);
  return () => window.removeEventListener(SESSION_EVENT, onChange);
}

/** The session token as a primitive (stable for useSyncExternalStore), or null. */
export function sessionToken(): string | null {
  return readSession()?.token ?? null;
}

function authHeaders(): Record<string, string> {
  const session = readSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export type SessionResult = { ok: true } | { ok: false; error: string };

/** POST /auth/session { accessCode }. 200 { token, expiresAt }, 401 for a wrong code, 429 when rate limited. */
export async function createSession(accessCode: string): Promise<SessionResult> {
  const url = liveUrl("/auth/session");
  if (!url) return { ok: false, error: "Live runs are offline right now." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    if (res.status === 401) return { ok: false, error: "That access code was not recognized." };
    if (res.status === 429) return { ok: false, error: "Too many attempts. Wait a minute and try again." };
    if (res.ok) {
      const body = (await res.json()) as { token?: string; expiresAt?: string };
      if (typeof body.token === "string" && body.token && typeof body.expiresAt === "string") {
        storage()?.setItem(SESSION_KEY, JSON.stringify({ token: body.token, expiresAt: body.expiresAt }));
        window.dispatchEvent(new Event(SESSION_EVENT));
        return { ok: true };
      }
    }
    return { ok: false, error: "The agent did not respond." };
  } catch {
    return { ok: false, error: "The agent did not respond." };
  }
}

// ---------- health, runs, steering ----------

/** GET /health (no auth). Never throws: any failure is reported as the "error" availability state. */
export async function checkHealth(signal?: AbortSignal): Promise<LiveHealth> {
  const url = liveUrl("/health");
  if (!url) return { status: "not_configured", capUsd: null };
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), HEALTH_TIMEOUT_MS);
  signal?.addEventListener("abort", () => timeout.abort(), { once: true });
  try {
    const res = await fetch(url, { signal: timeout.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { status: "error", capUsd: null };
    const body = (await res.json()) as {
      liveEnabled?: boolean; reason?: string; capUsd?: number; authRequired?: boolean; features?: unknown;
    };
    const capUsd = typeof body.capUsd === "number" ? body.capUsd : null;
    const authRequired = body.authRequired === true;
    const features = Array.isArray(body.features) ? body.features.filter((f): f is string => typeof f === "string") : [];
    if (body.liveEnabled) return { status: "ready", capUsd, authRequired, features };
    if (body.reason === "budget_exhausted") return { status: "budget_exhausted", capUsd, authRequired, features };
    if (body.reason === "busy") return { status: "busy", capUsd, authRequired, features };
    return { status: "error", capUsd, authRequired, features };
  } catch {
    return { status: "error", capUsd: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /runs. 201 { runId, capUsd, streamToken }, 401 (no or expired session), 422 { error } or 429 { reason }.
 * `params` (bench knobs) is sent only when given. Callers pass it only when /health reports the "params" feature,
 * because an older agent ignores unknown fields and would quietly run the default chip.
 */
export async function postRun(presetId: string, priority: Priority, params?: Record<string, KnobValue>): Promise<PostRunResult> {
  const url = liveUrl("/runs");
  if (!url) return { error: "Live runs are offline right now." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify(params ? { presetId, priority, params } : { presetId, priority }),
    });
    if (res.status === 201) {
      const body = (await res.json()) as { runId?: string; capUsd?: number; streamToken?: string };
      if (typeof body.runId === "string" && body.runId) {
        const streamToken = typeof body.streamToken === "string" && body.streamToken ? body.streamToken : null;
        if (streamToken) storage()?.setItem(STREAM_KEY_PREFIX + body.runId, streamToken);
        return { runId: body.runId, capUsd: typeof body.capUsd === "number" ? body.capUsd : null, streamToken };
      }
      return { error: "The agent did not respond." };
    }
    if (res.status === 401) {
      clearSession();
      return { error: "Enter the access code to start a live run.", reason: "unauthorized" };
    }
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as { reason?: string };
      const reason: StartFailureReason =
        body.reason === "budget_exhausted" || body.reason === "maintenance" || body.reason === "busy" || body.reason === "rate_limited"
          ? body.reason
          : "busy";
      const message =
        reason === "busy"
          ? "Another live run is in progress."
          : reason === "rate_limited"
            ? "This session has used its live runs for now. Wait a while, or watch a recorded run."
            : reason === "budget_exhausted"
              ? "Today's live budget is used up."
              : "Live runs are paused right now.";
      return { error: message, reason };
    }
    if (res.status === 422) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: typeof body.error === "string" && body.error ? body.error : "The agent did not accept this chip." };
    }
    return { error: "The agent did not respond." };
  } catch {
    return { error: "The agent did not respond." };
  }
}

// ---------- plain-English parse (bench, spec 5.2) ----------

const ParseReplySchema = z.discriminatedUnion("result", [
  z.object({ result: z.literal("in_range"), family: z.string(), params: z.record(z.string(), z.unknown()), note: z.string().optional() }),
  z.object({
    result: z.literal("out_of_range"),
    reason: z.string(),
    closest: z.object({ family: z.string(), params: z.record(z.string(), z.unknown()) }).nullable(),
  }),
]);
export type ParseReply = z.infer<typeof ParseReplySchema>;
export type ParseResult =
  | { ok: true; reply: ParseReply }
  | { ok: false; reason: "unavailable" | "unauthorized" | "rate_limited" | "failed"; error: string };

/**
 * POST /parse { text }. The agent (Nemotron) maps one sentence onto a family and knobs, or refuses with the closest
 * buildable chip. The reply is validated here and again against the knob table by the caller; it never bypasses either.
 * 404 or 405 means this agent has no parse endpoint yet.
 */
export async function postParse(text: string): Promise<ParseResult> {
  const url = liveUrl("/parse");
  if (!url) return { ok: false, reason: "unavailable", error: "Live runs are offline right now." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...authHeaders() },
      body: JSON.stringify({ text }),
    });
    if (res.status === 404 || res.status === 405) {
      return { ok: false, reason: "unavailable", error: "Plain-English parse lands with the backend. Use the knobs below for now." };
    }
    if (res.status === 401) {
      clearSession();
      return { ok: false, reason: "unauthorized", error: "Enter the access code first, then ask again." };
    }
    if (res.status === 429) return { ok: false, reason: "rate_limited", error: "Too many requests. Wait a minute and try again." };
    if (!res.ok) return { ok: false, reason: "failed", error: "The agent could not read that request. Use the knobs below." };
    const parsed = ParseReplySchema.safeParse(await res.json());
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") console.warn("[verity] parse reply rejected by schema", parsed.error.issues);
      return { ok: false, reason: "failed", error: "The agent sent an answer the bench could not check. Use the knobs below." };
    }
    return { ok: true, reply: parsed.data };
  } catch {
    return { ok: false, reason: "failed", error: "The agent did not respond." };
  }
}

async function postJson(path: string, body?: unknown): Promise<SendResult> {
  const url = liveUrl(path);
  if (!url) return "failed";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) {
      clearSession();
      return "unauthorized";
    }
    return res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * POST /runs/{id}/steer (202). Pin, toggle and winner_override are echoed as a human event, which clears their pending
 * state. Gate steers and autopilot are not echoed (the result shows up as a gate event) and are never tracked as pending.
 */
export function postSteer(runId: string, req: SteerRequest): Promise<SendResult> {
  return postJson(`/runs/${encodeURIComponent(runId)}/steer`, req);
}

/** POST /runs/{id}/stop (202), then the server emits a run event with phase "stopped". */
export function postStop(runId: string): Promise<SendResult> {
  return postJson(`/runs/${encodeURIComponent(runId)}/stop`);
}

export type StreamHandlers = {
  onOpen(): void;
  onEvent(e: RunEvent): void;
  /** `closed` is true when the browser gave up on its own (readyState CLOSED). */
  onError(closed: boolean): void;
};

/**
 * Opens the SSE stream at /runs/{id}/events?st=<streamToken>. EventSource cannot send headers, so the stream token from
 * POST /runs is kept in sessionStorage (a reload of /studio?run=id can rejoin). The server sends `id: <seq>`, so the
 * browser resumes with Last-Event-ID on reconnect. Returns a function that closes the stream.
 */
export function openEventStream(runId: string, h: StreamHandlers): () => void {
  const base = liveUrl(`/runs/${encodeURIComponent(runId)}/events`);
  const streamToken = storage()?.getItem(STREAM_KEY_PREFIX + runId);
  const url = base && streamToken ? `${base}?st=${encodeURIComponent(streamToken)}` : base;
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

"use client";

import { useId, useState } from "react";
import { familyById, knobError, type KnobValue } from "@/lib/contracts/presets";

const MAX_CHARS = 300;

type Refusal = { reason: string; closest: { familyId: string; knobs: Record<string, KnobValue>; title: string } | null };
type State =
  | { kind: "idle" }
  | { kind: "parsing" }
  | { kind: "parsed"; title: string; note?: string }
  | { kind: "refused"; refusal: Refusal }
  | { kind: "error"; text: string };

/** Family and knobs from an agent reply, only when every knob is in the bench's own table. */
function checked(familyId: string, params: Record<string, unknown>): { familyId: string; knobs: Record<string, KnobValue>; title: string } | null {
  const f = familyById(familyId);
  if (!f) return null;
  const knobs: Record<string, KnobValue> = {};
  for (const k of f.knobs) {
    const v = (params[k.id] ?? k.default) as KnobValue;
    if (knobError(k, v) !== null) return null;
    knobs[k.id] = v;
  }
  return { familyId: f.id, knobs, title: f.describe(knobs) };
}

/**
 * "Describe a small chip": one sentence to POST /parse (Nemotron). In range, it fills the family and knobs below; out of
 * range, it says what is outside and offers the closest buildable chip. Without the parse feature it says so and the
 * knobs stay the way in. Nothing is guessed in the browser.
 */
export function ParseBox({
  available,
  disabled,
  onApply,
}: {
  /** The agent reports the "parse" feature. */
  available: boolean;
  disabled: boolean;
  onApply(familyId: string, knobs: Record<string, KnobValue>): void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const ask = async () => {
    const sentence = text.trim();
    if (!sentence || state.kind === "parsing" || disabled || !available) return;
    setState({ kind: "parsing" });
    const { postParse } = await import("@/lib/sources/live");
    const res = await postParse(sentence);
    if (!res.ok) {
      setState({ kind: "error", text: res.error });
      return;
    }
    const reply = res.reply;
    if (reply.result === "in_range") {
      const ok = checked(reply.family, reply.params);
      if (!ok) {
        setState({ kind: "error", text: "The agent's answer falls outside the bench's ranges, so nothing was changed. Use the knobs below." });
        return;
      }
      onApply(ok.familyId, ok.knobs);
      setState({ kind: "parsed", title: ok.title, note: reply.note });
      return;
    }
    const closest = reply.closest ? checked(reply.closest.family, reply.closest.params) : null;
    setState({ kind: "refused", refusal: { reason: reply.reason, closest } });
  };

  const busy = state.kind === "parsing";

  return (
    <div className="b-parse">
      <label htmlFor={id} className="b-h">
        Describe a small chip
      </label>
      <textarea
        id={id}
        className="b-text"
        rows={3}
        maxLength={MAX_CHARS}
        placeholder="For example: a 6-lane multiply-accumulate, 12-bit inputs, 20 cycles"
        value={text}
        disabled={disabled || busy}
        aria-describedby={`${id}-s`}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void ask();
          }
        }}
      />
      <div className="b-parse-row">
        <button type="button" className="btn ghost xs" disabled={disabled || busy || !available || text.trim() === ""} onClick={() => void ask()}>
          {busy ? "Reading..." : "Check it"}
        </button>
        <span className="b-count m" aria-hidden>
          {text.length}/{MAX_CHARS}
        </span>
      </div>
      <div id={`${id}-s`} aria-live="polite">
        {!available ? (
          <p className="b-note">Plain-English parse lands with the backend. Use the knobs below for now.</p>
        ) : state.kind === "parsed" ? (
          <p className="b-note">
            <span className="rkq pass" aria-hidden /> Parsed as <b>{state.title}</b>. Adjust the knobs if you like.
            {state.note ? ` ${state.note}` : null}
          </p>
        ) : state.kind === "error" ? (
          <p className="b-note">
            <span className="rkq fail" aria-hidden /> {state.text}
          </p>
        ) : state.kind === "refused" ? (
          <div className="b-refuse" role="status">
            <p className="b-refuse-h">
              <span className="rkq fail" aria-hidden /> Out of range
            </p>
            <p className="b-note">{state.refusal.reason}</p>
            {state.refusal.closest ? (
              <>
                <p className="b-note">
                  Closest Verity can build: <b>{state.refusal.closest.title}</b>.
                </p>
                <button
                  type="button"
                  className="btn ghost xs"
                  disabled={disabled}
                  onClick={() => {
                    const c = state.refusal.closest;
                    if (!c) return;
                    onApply(c.familyId, c.knobs);
                    setState({ kind: "parsed", title: c.title });
                  }}
                >
                  Use closest
                </button>
              </>
            ) : (
              <p className="b-note">Nothing on the bench comes close. Pick a family below.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

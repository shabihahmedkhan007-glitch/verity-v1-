"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MIN_GAP_MS = 2000;

export type NarrationStatus = { tone: "fail" | "warn" | "plain"; word: string; text: string; actions?: ReactNode };

/**
 * The narration line under the timeline. The visible text updates at once; a polite live region mirrors it at most
 * once every 2 s so a screen reader is not flooded. A status message (lost connection, stopped, cap) replaces the
 * caption when one applies.
 */
export function Narration({
  text,
  chapter,
  strong = false,
  status,
}: {
  text: string | null;
  chapter?: string;
  /** The end-of-run winner line reads heavier than a running caption. */
  strong?: boolean;
  status?: NarrationStatus | null;
}) {
  const [spoken, setSpoken] = useState("");
  const lastSpoken = useRef(0);
  const say = status ? status.text : (text ?? "");

  useEffect(() => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastSpoken.current));
    const id = setTimeout(() => {
      lastSpoken.current = Date.now();
      setSpoken(say);
    }, wait);
    return () => clearTimeout(id);
  }, [say]);

  return (
    <div className="tlb-say">
      <div role="status" aria-live="polite" className="sr">
        {spoken}
      </div>
      {status ? (
        <>
          <span className={`mk ${status.tone}`} aria-hidden>
            {status.word}
          </span>
          <p aria-hidden title={status.text}>
            {status.text}
          </p>
          {status.actions ? <div className="tlb-say-acts">{status.actions}</div> : null}
        </>
      ) : (
        <>
          {chapter ? (
            <span className="ch" aria-hidden>
              {chapter}
            </span>
          ) : null}
          <p aria-hidden title={text ?? undefined} data-strong={strong ? "" : undefined}>
            {text ?? ""}
          </p>
        </>
      )}
    </div>
  );
}

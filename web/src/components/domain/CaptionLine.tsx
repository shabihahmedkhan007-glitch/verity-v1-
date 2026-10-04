"use client";

import { useEffect, useRef, useState } from "react";

export type CaptionLineProps = { text: string | null; chapter?: string; announce?: boolean };

const MIN_GAP_MS = 2000;

/**
 * The narration line. Crossfades on change (150 ms) and, when announce is true, mirrors the text into a polite
 * live region at most once every 2 s so a screen reader is not flooded.
 */
export function CaptionLine({ text, chapter, announce = false }: CaptionLineProps) {
  const [spoken, setSpoken] = useState("");
  const lastSpoken = useRef(0);

  useEffect(() => {
    if (!announce) return;
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastSpoken.current));
    const id = setTimeout(() => {
      lastSpoken.current = Date.now();
      setSpoken(text ?? "");
    }, wait);
    return () => clearTimeout(id);
  }, [text, announce]);

  return (
    <div>
      {announce ? (
        <div role="status" aria-live="polite" className="sr-only">
          {spoken}
        </div>
      ) : null}
      {text ? (
        <p
          key={text}
          aria-hidden={announce ? true : undefined}
          className="flex flex-col gap-0.5 text-base text-foreground duration-150 animate-in fade-in"
        >
          {chapter ? <span className="text-xs text-fg-subtle">{chapter}</span> : null}
          <span>{text}</span>
        </p>
      ) : null}
    </div>
  );
}

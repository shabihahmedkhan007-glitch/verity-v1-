"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type AccessCodePromptProps = {
  /** Submits the code. Resolves to an error message, or null when the code was accepted. */
  onSubmit(code: string): Promise<string | null>;
  /** Shown above the field when a stored session was rejected (401). */
  notice?: string | null;
};

/** Replaces the Start button when the agent asks for an access code. Not a form: it sits inside the composer form. */
export function AccessCodePrompt({ onSubmit, notice }: AccessCodePromptProps) {
  const id = useId();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(trimmed);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-foreground">Enter the access code</h2>
        <p className="mt-1 max-w-[65ch] text-sm text-fg-muted">
          {notice ?? "Live runs need an access code, so every run stays on budget. The recorded run needs none."}
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          Access code
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={id}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={code}
            disabled={busy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-fg-subtle focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-fail"
          />
          <Button type="button" className="h-10 px-5 text-base" disabled={busy || code.trim() === ""} onClick={() => void submit()}>
            {busy ? "Checking..." : "Continue"}
          </Button>
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-fail">
            {error}
          </p>
        ) : null}
      </div>
      <span className="block text-sm text-fg-muted">
        or{" "}
        <Link prefetch={false} href="/studio?run=golden" className="text-foreground underline underline-offset-4 hover:text-primary">
          Watch the recorded run (free)
        </Link>
      </span>
    </section>
  );
}

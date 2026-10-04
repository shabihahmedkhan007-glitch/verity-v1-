"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { highlightCode } from "@/lib/verilog/highlight";

export type CodeViewProps = {
  code: string;
  language: "verilog" | "python" | "text";
  filename?: string;
  highlightLines?: number[];
  maxHeight?: string;
  copyable?: boolean;
};

/** Read-only code with line numbers and Verilog highlighting. No HTML strings: highlighting returns React nodes. */
export function CodeView({ code, language, filename, highlightLines, maxHeight, copyable = true }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const lines = useMemo(
    () => highlightCode(code.endsWith("\n") ? code.slice(0, -1) : code, language),
    [code, language],
  );
  const marked = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const empty = code.length === 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code-bg">
      {filename || copyable ? (
        <div className="flex h-9 items-center justify-between gap-2 border-b border-border bg-surface px-3">
          <span className="truncate font-mono text-xs text-fg-muted">{filename ?? ""}</span>
          {copyable && !empty ? (
            <Button type="button" variant="ghost" size="xs" onClick={copy} aria-label={copied ? "Copied" : "Copy code"}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </Button>
          ) : null}
        </div>
      ) : null}
      {empty ? (
        <p className="px-3 py-4 text-sm text-fg-subtle">No code yet.</p>
      ) : (
        <div
          role="region"
          tabIndex={0}
          aria-label={filename ? `Code: ${filename}` : "Code"}
          className="overflow-auto py-2"
          style={maxHeight ? { maxHeight } : undefined}
        >
          <pre className="min-w-max font-mono text-[13px] leading-5">
            <code>
              {lines.map((nodes, i) => (
                <div key={i} className={cn("flex min-h-5", marked.has(i + 1) && "bg-surface-2")}>
                  <span aria-hidden className="w-10 shrink-0 pr-3 text-right text-fg-subtle select-none">
                    {i + 1}
                  </span>
                  <span className="pr-4 whitespace-pre text-syn-plain">{nodes}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
      {empty ? null : (
        <div className="border-t border-border px-3 py-1.5 text-xs text-fg-subtle">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </div>
      )}
    </div>
  );
}

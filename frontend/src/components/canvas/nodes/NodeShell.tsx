"use client";

import { useState, type ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useVerityStore } from "@/lib/store";

export type HandleSpec = { id: string; type: "source" | "target"; position: Position };

export const HANDLES = {
  top: { id: "in-top", type: "target", position: Position.Top },
  bottom: { id: "out-bottom", type: "source", position: Position.Bottom },
  left: { id: "in-left", type: "target", position: Position.Left },
  rightIn: { id: "in-right", type: "target", position: Position.Right },
  rightOut: { id: "out-right", type: "source", position: Position.Right },
} as const satisfies Record<string, HandleSpec>;

/** Quiet handles: small, token colored, never connectable. The edges are drawn by the reducer, not the user. */
const HANDLE_STYLE = { width: 6, height: 6, minWidth: 0, minHeight: 0, borderRadius: 2, opacity: 0.7 } as const;

/**
 * Shared wrapper for every content node: fills the fixed node box, plays the enter animation once per mount
 * (suppressed when the mount comes from a seek), renders the quiet handles and a visually hidden summary.
 */
export function NodeShell({
  handles,
  summary,
  selected = false,
  children,
}: {
  handles: HandleSpec[];
  summary: string;
  /** Outline for nodes whose card has no selected state of its own (everything but versions). */
  selected?: boolean;
  children: ReactNode;
}) {
  // Read once at mount: flipping `instant` back off must not start the animation late.
  const [animate] = useState(() => !useVerityStore.getState().instant);
  return (
    <div
      className={cn(
        "h-full w-full",
        animate && "animate-node-enter",
        selected && "rounded-lg outline-2 outline-offset-2 outline-solid outline-foreground",
      )}
    >
      {handles.map((h) => (
        <Handle
          key={h.id}
          id={h.id}
          type={h.type}
          position={h.position}
          isConnectable={false}
          style={HANDLE_STYLE}
        />
      ))}
      <span className="sr-only">{summary}</span>
      {children}
    </div>
  );
}

/**
 * The diff outline on a changed or new block should play when the agent changes it, not when a seek rebuilds
 * the board. Returns the node's diff only if it did not already exist (at the same time stamp) when this
 * node mounted during an instant seek.
 */
export function useFreshDiff(diff: "new" | "changed" | undefined, diffAtMs: number | undefined) {
  const [suppressedAt] = useState<number | undefined>(() =>
    useVerityStore.getState().instant && diff ? diffAtMs : undefined,
  );
  if (!diff) return undefined;
  if (suppressedAt !== undefined && suppressedAt === diffAtMs) return undefined;
  return diff;
}

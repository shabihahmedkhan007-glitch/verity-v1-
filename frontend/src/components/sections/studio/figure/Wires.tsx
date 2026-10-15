"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type Wire =
  | { kind: "lineage"; id: string; from: string; to: string }
  | { kind: "checks"; id: string; from: string; to: string }
  | { kind: "proof"; id: string; from: string; to: string; result: "proven" | "open"; label: string };

type Drawn = { id: string; kind: Wire["kind"]; d: string; result?: "proven" | "open"; label?: string; lx?: number; ly?: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Box rectangle relative to the grid, which is the SVG's positioning box (so scrolling never moves the wires). */
function rel(el: HTMLElement, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top, w: r.width };
}

/**
 * Measures the boxes after layout and draws the wires under them: lineage (parent to child), the golden model's
 * "checks" line to v1, and the proof line from the winner back to v1. Pure presentation; geometry comes from the DOM.
 */
export function Wires({
  gridRef,
  boxes,
  wires,
  layoutKey,
}: {
  gridRef: RefObject<HTMLElement | null>;
  boxes: RefObject<Map<string, HTMLElement>>;
  wires: Wire[];
  layoutKey: string;
}) {
  const [drawn, setDrawn] = useState<Drawn[]>([]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const origin = grid.getBoundingClientRect();
      const map = boxes.current;
      let lane = 0;
      for (const el of map.values()) lane = Math.max(lane, el.getBoundingClientRect().bottom - origin.top);
      lane += 24;

      const next: Drawn[] = [];
      for (const w of wires) {
        const a = map.get(w.from);
        const b = map.get(w.to);
        if (!a || !b) continue;
        const pa = rel(a, origin);
        const pb = rel(b, origin);
        if (w.kind === "proof") {
          const x1 = r1(pa.l + pa.w / 2);
          const x2 = r1(pb.l + pb.w / 2);
          next.push({
            id: w.id,
            kind: w.kind,
            d: `M${x1} ${r1(pa.b)}V${r1(lane)}H${x2}V${r1(pb.b)}`,
            result: w.result,
            label: w.label,
            lx: r1((x1 + x2) / 2),
            ly: r1(lane + 4),
          });
          continue;
        }
        // Lineage and checks leave the right edge at the label row and enter the child's left edge at the same row.
        const y1 = r1(w.kind === "checks" ? pa.t + (pa.b - pa.t) / 2 : pa.t + 17);
        const y2 = r1(pb.t + 17);
        const x1 = r1(pa.r);
        const x2 = r1(pb.l);
        const xm = r1(x2 - 10);
        next.push({ id: w.id, kind: w.kind, d: `M${x1} ${y1}H${xm}V${y2}H${x2}` });
      }
      setDrawn((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    for (const el of boxes.current.values()) ro.observe(el);
    return () => ro.disconnect();
  }, [gridRef, boxes, wires, layoutKey]);

  return (
    <svg className="fig1-wires" aria-hidden focusable="false">
      {drawn.map((w) =>
        w.kind === "proof" ? (
          <g key={w.id}>
            <path className="w-prf" data-r={w.result} d={w.d} />
            <text className="w-lbl" data-r={w.result} x={w.lx} y={w.ly} textAnchor="middle" dominantBaseline="hanging">
              {w.label}
            </text>
          </g>
        ) : (
          <path key={w.id} className={w.kind === "checks" ? "w-chk" : "w-lin"} d={w.d} />
        ),
      )}
    </svg>
  );
}

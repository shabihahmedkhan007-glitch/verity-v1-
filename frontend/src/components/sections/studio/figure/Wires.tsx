"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type Wire =
  | { kind: "lineage"; id: string; from: string; to: string }
  | { kind: "checks"; id: string; from: string; to: string }
  | { kind: "proof"; id: string; from: string; to: string; result: "proven" | "open"; label: string };

type Drawn = { id: string; kind: Wire["kind"]; d: string; result?: "proven" | "open"; label?: string; lx?: number; ly?: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Box rectangle relative to the grid, which is the SVG's positioning box (so scrolling never moves the wires). */
function rel(el: HTMLElement, origin: DOMRect) {
  const r = el.getBoundingClientRect();
  return { l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top, w: r.width, h: r.height };
}

function draw(grid: HTMLElement, map: Map<string, HTMLElement>, wires: Wire[]): Drawn[] {
  const origin = grid.getBoundingClientRect();
  let lane = 0;
  for (const el of map.values()) lane = Math.max(lane, el.getBoundingClientRect().bottom - origin.top);
  lane += 24;

  // Each parent gets its own bend inside the gap before the child column, so two parents feeding two children
  // never share a vertical line (which would read as both parents feeding both children).
  const bends = new Map<string, number>();
  const byColumn = new Map<number, { parent: string; y: number }[]>();
  for (const w of wires) {
    if (w.kind !== "lineage") continue;
    const a = map.get(w.from);
    const b = map.get(w.to);
    if (!a || !b) continue;
    const x2 = Math.round(rel(b, origin).l);
    const list = byColumn.get(x2) ?? [];
    if (!list.some((p) => p.parent === w.from)) list.push({ parent: w.from, y: rel(a, origin).t });
    byColumn.set(x2, list);
  }
  for (const [x2, parents] of byColumn) {
    parents.sort((p, q) => p.y - q.y);
    const step = parents.length > 1 ? Math.min(5, 10 / (parents.length - 1)) : 0;
    parents.forEach((p, i) => bends.set(`${p.parent}@${x2}`, x2 - 13 + i * step));
  }

  const out: Drawn[] = [];
  for (const w of wires) {
    const a = map.get(w.from);
    const b = map.get(w.to);
    if (!a || !b) continue;
    const pa = rel(a, origin);
    const pb = rel(b, origin);
    if (w.kind === "proof") {
      const x1 = r1(pa.l + pa.w / 2);
      const x2 = r1(pb.l + pb.w / 2);
      out.push({ id: w.id, kind: w.kind, d: `M${x1} ${r1(pa.b)}V${r1(lane)}H${x2}V${r1(pb.b)}`, result: w.result, label: w.label, lx: r1((x1 + x2) / 2), ly: r1(lane + 4) });
      continue;
    }
    // Lineage and checks leave the parent's right edge and enter the child's left edge at its label row.
    const y1 = r1(w.kind === "checks" ? pa.t + pa.h / 2 : pa.t + 17);
    const y2 = r1(pb.t + 17);
    const x1 = r1(pa.r);
    const x2 = r1(pb.l);
    const xm = r1(w.kind === "lineage" ? (bends.get(`${w.from}@${Math.round(pb.l)}`) ?? x2 - 10) : x2 - 10);
    out.push({ id: w.id, kind: w.kind, d: `M${x1} ${y1}H${xm}V${y2}H${x2}` });
  }
  return out;
}

/**
 * Measures the boxes after layout and draws the wires under them: lineage (parent to child), the golden model's
 * "checks" line to v1, and the proof line from the winner back to v1. Rendered after the boxes, so their refs are
 * attached when it measures; the resize observer is created once and reads the latest wires through a ref.
 */
export function Wires({ gridRef, boxes, wires }: { gridRef: RefObject<HTMLElement | null>; boxes: RefObject<Map<string, HTMLElement>>; wires: Wire[] }) {
  const [drawn, setDrawn] = useState<Drawn[]>([]);

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const next = draw(grid, boxes.current, wires);
    setDrawn((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [gridRef, boxes, wires]);

  const latest = useRef(measure);
  useLayoutEffect(() => {
    latest.current = measure;
    measure();
  }, [measure]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const ro = new ResizeObserver(() => latest.current());
    ro.observe(grid);
    return () => ro.disconnect();
  }, [gridRef]);

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

"use client";

import { useRef, useState, type KeyboardEvent } from "react";

type Pin = {
  n: number;
  name: string;
  dir: "In" | "Out";
  width: string;
  /** Plain label under a bus name in the figure. */
  sub?: string;
  /** Label used by assistive tech. */
  aria: string;
  /** Y of the lead rectangle. */
  y: number;
  doc: string;
};

const PINS: Pin[] = [
  { n: 1, name: "clk", dir: "In", width: "1", aria: "Pin 1, clk, input, 1 bit", y: 77, doc: "Clock. The unit moves one step on every tick." },
  { n: 2, name: "rst_n", dir: "In", width: "1", aria: "Pin 2, rst_n, input, 1 bit", y: 127, doc: "Reset, active low. Clears the running sum." },
  { n: 3, name: "start", dir: "In", width: "1", aria: "Pin 3, start, input, 1 bit", y: 177, doc: "Pulse it to begin a 16-cycle run." },
  { n: 4, name: "a", dir: "In", width: "8 x 4", sub: "4 x 8 bits", aria: "Pin 4, a, input, 8 bits times 4 lanes", y: 227, doc: "Four unsigned 8-bit numbers, one per lane." },
  { n: 5, name: "b", dir: "In", width: "8 x 4", sub: "4 x 8 bits", aria: "Pin 5, b, input, 8 bits times 4 lanes", y: 277, doc: "Four more, each multiplied with its partner in a." },
  { n: 6, name: "acc", dir: "Out", width: "22", sub: "22 bits", aria: "Pin 6, acc, output, 22 bits", y: 227, doc: "The running sum. The final result is held until reset." },
  { n: 7, name: "done", dir: "Out", width: "1", aria: "Pin 7, done, output, 1 bit", y: 127, doc: "Goes high after 16 cycles to say the result is ready." },
];

/** Section 4: pinout figure and pin table. Hovering or focusing a pin lights its table row, and the reverse. */
export function PinSection() {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const on = (n: number) => () => setActive(n);
  const off = () => setActive(null);

  // Arrow keys step through the pins in order, so the figure is usable without a mouse.
  const onKey = (e: KeyboardEvent<SVGGElement>, n: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = PINS[(n - 1 + step + PINS.length) % PINS.length].n;
    svgRef.current?.querySelector<SVGGElement>(`[data-pin="${next}"]`)?.focus();
  };

  return (
    <section className="page" id="pins" aria-labelledby="pins-h">
      <div className="wrap">
        <h2 className="page-h" id="pins-h">
          <span className="n">4</span>Pin Configuration and Functions
        </h2>
        <p className="lede">
          Every chip has ports: the wires that go in and out. These are the seven ports of the sample MAC4 unit, the one the agent
          builds in the recorded run. <b>Hover or focus a pin</b> to find its row in the table. Arrow keys move between pins.
        </p>

        <div className="pinout">
          <figure className="fig">
            <div className="fig-frame scroll-x">
              <svg ref={svgRef} className="pinsvg wide" viewBox="0 0 520 340" role="group" aria-label="VRT-MAC4 pinout, 7 ports, top view">
                <text className="lbl f-subtle" x="112" y="26" textAnchor="end" fontSize="12" letterSpacing="1">INPUTS</text>
                <text className="lbl f-subtle" x="408" y="26" fontSize="12" letterSpacing="1">OUTPUTS</text>
                <rect className="f-bg s-fg" x="160" y="40" width="200" height="270" strokeWidth="2" />
                <path className="f-surface s-fg" d="M240 40a20 20 0 0 0 40 0" strokeWidth="2" />
                <text className="lbl f-fg" x="260" y="168" textAnchor="middle" fontSize="22">VRT-MAC4</text>
                <text className="f-subtle" x="260" y="188" textAnchor="middle" fontSize="10.5">top view</text>
                <text className="f-subtle" x="260" y="203" textAnchor="middle" fontSize="10.5">7 ports</text>

                {PINS.map((p) => {
                  const left = p.dir === "In";
                  const bus = p.sub !== undefined;
                  const x = left ? 120 : 360;
                  return (
                    <g
                      key={p.n}
                      className={`pin${active === p.n ? " hl" : ""}`}
                      data-pin={p.n}
                      tabIndex={0}
                      role="img"
                      aria-label={p.aria}
                      onMouseEnter={on(p.n)}
                      onMouseLeave={off}
                      onFocus={on(p.n)}
                      onBlur={off}
                      onKeyDown={(e) => onKey(e, p.n)}
                    >
                      <rect className={`lead${bus ? " bus" : ""}`} x={x} y={p.y} width="40" height="16" />
                      {bus ? <path className="f-none s-muted" d={`M${x + 16} ${p.y + 20}l8-24`} strokeWidth="1.5" /> : null}
                      <text x={left ? 112 : 408} y={p.y + 12} textAnchor={left ? "end" : "start"}>
                        {p.name}
                      </text>
                      {bus ? (
                        <text className="sub" x={left ? 112 : 408} y={p.y + 24} textAnchor={left ? "end" : "start"}>
                          {p.sub}
                        </text>
                      ) : null}
                      <text className="no" x={left ? 168 : 352} y={p.y + 12} textAnchor={left ? "start" : "end"}>
                        {p.n}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <figcaption className="fig-cap">
              <b>Figure 4-1.</b> VRT-MAC4 ports, top view. Thick leads are buses (several wires).
            </figcaption>
          </figure>

          <div>
            <p className="cap-above">
              <span>Table 4-1.</span> Pin functions
            </p>
            <div className="tbl-wrap">
              <table className="dtbl" id="pintable">
                <thead>
                  <tr>
                    <th className="c">No.</th>
                    <th>Name</th>
                    <th className="c">I/O</th>
                    <th>Width</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  {PINS.map((p) => (
                    <tr key={p.n} data-pin={p.n} className={active === p.n ? "hl" : undefined} onMouseEnter={on(p.n)} onMouseLeave={off}>
                      <td className="c mono">{p.n}</td>
                      <td>
                        <code>{p.name}</code>
                      </td>
                      <td className="c">{p.dir}</td>
                      <td className="mono">{p.width}</td>
                      <td>{p.doc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pin-note">Spec priority for this part: smallest area. Max 300 lines, 16 tests.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";
import { Ears } from "./Ears";

const MINUS = "−";

type Bar = { v: string; pct: number; kind: "base" | "better" | "plain"; label: string };
const BARS: Bar[] = [
  { v: "v1", pct: (1840 / 2000) * 100, kind: "base", label: "1,840 base" },
  { v: "v2", pct: (1690 / 2000) * 100, kind: "better", label: `1,690 ${MINUS}8.2%` },
  { v: "v3", pct: (1610 / 2000) * 100, kind: "better", label: `1,610 ${MINUS}12.5%` },
  { v: "v4", pct: (1950 / 2000) * 100, kind: "plain", label: "1,950 +6.0%" },
  { v: "v5", pct: (1520 / 2000) * 100, kind: "better", label: `1,520 ${MINUS}17.4%` },
];

function KnobTicks() {
  const out = [];
  for (let a = -60; a <= 60; a += 12) {
    const r = (a * Math.PI) / 180;
    const major = a === -60 || a === 0 || a === 60;
    const r1 = major ? 36 : 38;
    const r2 = 44;
    out.push(
      <line
        key={a}
        x1={(75 + Math.sin(r) * r1).toFixed(1)}
        y1={(72 - Math.cos(r) * r1).toFixed(1)}
        x2={(75 + Math.sin(r) * r2).toFixed(1)}
        y2={(72 - Math.cos(r) * r2).toFixed(1)}
        {...(major ? { stroke: "var(--rk-ink)", strokeWidth: 1.5 } : {})}
      />,
    );
  }
  return <g stroke="var(--rk-ink-3)" strokeWidth="1">{out}</g>;
}

/** MOD 3: the measured result, the priority knob, area bars per version and the equivalence lamp. */
export function ModResult() {
  return (
    <section className="mod" aria-label="Module 3, result">
      <Ears />
      <div className="mh">
        <span className="eng">MOD 3 · RESULT</span>
        <span className="mh-r">
          <span className="word dim">Sample data</span>
        </span>
      </div>
      <div className="res">
        <div>
          <div className="big">{MINUS}17.4%</div>
          <div className="sub">Area vs v1 · v5 · sample</div>
          <div className="sub dim" style={{ marginTop: 8 }}>
            1,840 to 1,520 <span className="unit">µm²</span>
          </div>
        </div>
        <div className="knob">
          <svg viewBox="0 0 150 116" role="img" aria-label="Priority knob pointing at area. Weights: area 0.6, timing 0.25, power 0.15">
            <path d="M21 90 A56 56 0 0 1 129 90" stroke="var(--rk-rule-2)" strokeWidth="1" fill="none" />
            <KnobTicks />
            <g transform="translate(75 72)">
              <circle r="30" fill="var(--rk-panel-2)" stroke="var(--rk-ink-3)" strokeWidth="1.5" />
              <circle r="23" fill="var(--rk-inset)" stroke="var(--rk-rule-2)" strokeWidth="1" />
              <g transform="rotate(-60)">
                <path d="M0 -26 V-6" stroke="var(--rk-a)" strokeWidth="3" />
              </g>
              <circle r="2.5" fill="var(--rk-ink-3)" />
            </g>
            <g className="svgm" fontSize="8" letterSpacing=".8" textAnchor="middle">
              <text x="26" y="34" fill="var(--rk-a)">
                AREA
              </text>
              <text x="75" y="11" fill="var(--rk-ink-2)">
                TIMING
              </text>
              <text x="126" y="34" fill="var(--rk-ink-2)">
                POWER
              </text>
            </g>
            <text x="75" y="113" textAnchor="middle" className="svgm" fontSize="8" letterSpacing="1.2" fill="var(--rk-ink-3)">
              PRIORITY
            </text>
          </svg>
          <div className="wts">0.6 / 0.25 / 0.15</div>
        </div>
        <div className="bars">
          <div className="lab bars-h">
            <span>Area by version, <span className="unit">µm²</span></span>
            <span>vs v1</span>
          </div>
          {BARS.map((b, i) => (
            <div className="brow" key={b.v}>
              <span>{b.v}</span>
              <span className="t">
                <span
                  className={`f ${b.kind === "plain" ? "" : b.kind}`}
                  style={{ width: `${b.pct}%`, "--bd": `${0.9 + i * 0.1}s` } as CSSProperties}
                />
              </span>
              <span className="v">{b.label}</span>
            </div>
          ))}
          <div className="brow nm">
            <span>v6</span>
            <span className="t clear">
              <span className="f rej" />
            </span>
            <span className="v">rejected, not measured</span>
          </div>
        </div>
      </div>
      <div className="lamp">
        <span className="sq" />
        <span className="word">EQY PROVEN EQUAL</span>
        <span className="lab" style={{ marginLeft: "auto" }}>
          v5 vs v1
        </span>
      </div>
    </section>
  );
}

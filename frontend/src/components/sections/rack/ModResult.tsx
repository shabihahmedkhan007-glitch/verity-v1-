import type { CSSProperties } from "react";
import { Ears } from "./Ears";
import { num, REAL } from "./real-run";

type Bar = { v: string; pct: number; kind: "base" | "better" | "plain" | "rej"; label: string };
const BARS: Bar[] = REAL.areaRows.map((r) => ({
  v: r.label,
  pct: r.area !== null ? (r.area / REAL.areaMax) * 100 : 0,
  kind: r.rejected ? "rej" : r.isBaseline ? "base" : r.isWinner ? "better" : "plain",
  label: r.rejected ? "rejected, not measured" : r.isBaseline ? `${num(r.area ?? 0)} base` : `${num(r.area ?? 0)} ${r.delta}`,
}));

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

const W = { area: REAL.weights.area.toFixed(2), timing: REAL.weights.timing.toFixed(2) };

/** MOD 3: the measured result, the priority knob, area bars per version and the equivalence lamp. */
export function ModResult() {
  return (
    <section className="mod" aria-label="Module 3, result">
      <Ears />
      <div className="mh">
        <span className="eng">MOD 3 · RESULT</span>
        <span className="mh-r">
          <span className="word dim">Real run</span>
        </span>
      </div>
      <div className="res">
        <div>
          <div className="big">{REAL.winner.areaDelta}</div>
          <div className="sub">Area vs {REAL.v1.label} · {REAL.winner.label} · real run</div>
          <div className="sub dim" style={{ marginTop: 8 }}>
            {num(REAL.v1.area ?? 0)} to {num(REAL.winner.area ?? 0)} <span className="unit">µm²</span>
          </div>
          <div className="sub dim" style={{ marginTop: 4 }}>
            Clock {REAL.winner.clockDelta} vs {REAL.v1.label} · power not measured
          </div>
        </div>
        <div className="knob">
          <svg viewBox="0 0 150 116" role="img" aria-label={`Priority knob pointing at area. Weights: area ${W.area}, timing ${W.timing}, power not measured`}>
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
          <div className="wts">{W.area} / {W.timing} / n/a</div>
        </div>
        <div className="bars">
          <div className="lab bars-h">
            <span>Area by version, <span className="unit">µm²</span></span>
            <span>vs v1</span>
          </div>
          {BARS.map((b, i) => (
            <div className={b.kind === "rej" ? "brow nm" : "brow"} key={b.v}>
              <span>{b.v}</span>
              <span className={b.kind === "rej" ? "t clear" : "t"}>
                <span
                  className={`f ${b.kind === "plain" ? "" : b.kind}`}
                  style={{ ...(b.kind === "rej" ? {} : { width: `${b.pct}%` }), "--bd": `${0.9 + i * 0.1}s` } as CSSProperties}
                />
              </span>
              <span className="v">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lamp">
        <span className="sq" />
        <span className="word">{REAL.winner.eqy === "proven" ? "EQY PROVEN EQUAL" : "EQY NOT PROVEN"}</span>
        <span className="lab" style={{ marginLeft: "auto" }}>
          {REAL.winner.label} vs {REAL.v1.label}
        </span>
      </div>
    </section>
  );
}

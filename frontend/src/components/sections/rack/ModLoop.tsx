import type { CSSProperties } from "react";
import { Ears } from "./Ears";

const STAGES = ["PLAN", "LOCK", "BUILD", "TEST", "EVOLVE", "PROVE"];
const FIXES: [string, string][] = [
  ["F1", "v1"],
  ["F2", "v3"],
  ["F3", "v6 rejected"],
];
const SEG_H = 19;
const SEG_GAP = 3;
// The three fail markers sit beside the TEST column at these segment rows (0 = bottom).
const MARK_ROWS = [3, 5, 7];

/** MOD 2: six LED stage columns that light stage by stage on load, the three fails, and the round dial. */
export function ModLoop() {
  return (
    <section className="mod" id="loop" aria-label="Module 2, loop">
      <Ears />
      <div className="mh">
        <span className="eng">MOD 2 · LOOP</span>
        <span className="mh-r">
          <span className="sq pass" />
          <span className="word">Complete</span>
        </span>
      </div>
      <div className="leds" role="img" aria-label="Six stages all complete: plan, lock, build, test, evolve, prove">
        {STAGES.map((name, i) => (
          <div className="col" key={name}>
            <div className="segs">
              {Array.from({ length: 10 }, (_, j) => (
                <span className="seg on" key={j} style={{ "--d": `${(i * 0.22 + j * 0.03).toFixed(2)}s` } as CSSProperties} />
              ))}
            </div>
            <div className="cn">{name}</div>
            <div className="cs">
              <span className="sq pass" />
              <span>DONE</span>
            </div>
            {name === "TEST"
              ? MARK_ROWS.map((row, k) => (
                  <i className="mk" key={k} style={{ bottom: `${row * (SEG_H + SEG_GAP) + (SEG_H - 11) / 2 + 38}px` }}>
                    <span>{FIXES[k][0]}</span>
                  </i>
                ))
              : null}
          </div>
        ))}
      </div>
      <div className="fixes">
        <span className="lab" style={{ marginRight: 2 }}>
          3 versions failed
        </span>
        {FIXES.map(([id, v]) => (
          <i key={id}>
            <span className="sq" />
            {id} {v}
          </i>
        ))}
      </div>
      <div className="round">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="var(--rk-inset)" stroke="var(--rk-rule-2)" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="29" fill="none" stroke="var(--rk-a)" strokeWidth="3" transform="rotate(-90 32 32)" />
          <text x="32" y="36" textAnchor="middle" className="svgm" fontSize="13" fill="var(--rk-ink)">
            2/2
          </text>
        </svg>
        <p>
          <span className="lab strong">ROUND 2 / 2</span>
          Six versions built, two fixes kept, one rejected. Human inputs: 2.
        </p>
      </div>
    </section>
  );
}

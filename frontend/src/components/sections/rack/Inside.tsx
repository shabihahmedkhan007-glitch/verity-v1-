import { Ears } from "./Ears";

const MINUS = "−";

function DialTicks() {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const r = ((i * 22.5 - 22.5) * Math.PI) / 180;
    out.push(
      <line
        key={i}
        x1={(85 + Math.sin(r) * 60).toFixed(1)}
        y1={(85 - Math.cos(r) * 60).toFixed(1)}
        x2={(85 + Math.sin(r) * 72).toFixed(1)}
        y2={(85 - Math.cos(r) * 72).toFixed(1)}
        {...(i === 0 ? { stroke: "var(--rk-ink)" } : {})}
      />,
    );
  }
  return <g stroke="var(--rk-ink-3)" strokeWidth="1.5">{out}</g>;
}

/** "Inside each module": four checkable readouts from the sample run. */
export function Inside() {
  return (
    <section className="sec" id="inside" aria-labelledby="inside-h">
      <div className="sec-h">
        <h2 id="inside-h">Inside each module</h2>
        <p>Four things you can check without trusting the agent. Each is a readout from the sample run, labelled against v1.</p>
      </div>
      <div className="slots">
        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 1 · ANSWER KEY</span>
          </div>
          <div className="dial">
            <svg viewBox="0 0 170 170" role="img" aria-label="Lock dial with 16 tick marks, one per test, locked">
              <circle cx="85" cy="85" r="78" fill="var(--rk-inset)" stroke="var(--rk-rule-2)" strokeWidth="1.5" />
              <DialTicks />
              <circle cx="85" cy="85" r="46" fill="var(--rk-panel-2)" stroke="var(--rk-ink-3)" strokeWidth="1.5" />
              <g transform="translate(85 85) rotate(-22.5)">
                <path d="M0 -44 V-24" stroke="var(--rk-ink)" strokeWidth="3" />
              </g>
              <g transform="translate(73 70)" fill="none" stroke="var(--rk-ink)" strokeWidth="1.5" strokeLinecap="square">
                <rect x="1" y="12" width="20" height="16" />
                <path d="M5 12V8a6 6 0 0 1 12 0v4" />
                <path d="M11 18v5" />
              </g>
              <text x="85" y="116" textAnchor="middle" className="svgm" fontSize="9" letterSpacing="1.4" fill="var(--rk-ink)">
                LOCKED
              </text>
            </svg>
          </div>
          <h3>The answer key is locked</h3>
          <p className="d">16 tests come from the golden model before any Verilog exists. The agent can read them and cannot edit them.</p>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Tests</td>
                <td>16</td>
              </tr>
              <tr>
                <td>Source</td>
                <td>golden model</td>
              </tr>
              <tr>
                <td>Locked at</td>
                <td>0:22 of 1:30</td>
              </tr>
              <tr>
                <td>Agent can edit</td>
                <td>no</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 2 · SELF FIX</span>
          </div>
          <h3>It reads its own failures</h3>
          <p className="d">v1 failed 3 of 16 tests. The agent read the mismatch, named the cause, and changed one line.</p>
          <div className="code" role="group" aria-label="v1 attempt 1 diff">
            <div className="hd">3 of 16 tests failed</div>
            <div>acc_16_cycles_max</div>
            <div>expected 0x3F8040</div>
            <div>got 0x008040</div>
            <div className="rm">- reg [15:0] acc;</div>
            <div className="ad">+ reg [21:0] acc;</div>
          </div>
          <div className="fl">
            <span className="sq fail" />
            <span className="word">FAIL 13/16</span>
            <span className="lab">then</span>
            <span className="sq pass" />
            <span className="word">PASS 16/16</span>
          </div>
          <p className="d tight">The accumulator is 16 bits and wraps. Widening it to 22 bits.</p>
          <table className="kv push">
            <tbody>
              <tr>
                <td>First attempt</td>
                <td>13/16</td>
              </tr>
              <tr>
                <td>After one fix</td>
                <td>16/16</td>
              </tr>
              <tr>
                <td>Label</td>
                <td>Sample data</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 3 · MEASURED</span>
          </div>
          <h3>Measured, not guessed</h3>
          <p className="d">Yosys and OpenROAD (Nangate45) measure every version. Compared with v1, the first version.</p>
          <div className="ovx">
            <table className="tbl" aria-label="v1 against v5">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="num">v1</th>
                  <th className="num">v5</th>
                  <th className="num">vs v1</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Area µm²</td>
                  <td className="num">1,840</td>
                  <td className="num">1,520</td>
                  <td className="num a">{MINUS}17.4%</td>
                </tr>
                <tr>
                  <td>Clock ns</td>
                  <td className="num">3.20</td>
                  <td className="num">3.38</td>
                  <td className="num">+5.6%</td>
                </tr>
                <tr>
                  <td>Power mW</td>
                  <td className="num">1.92</td>
                  <td className="num">1.66</td>
                  <td className="num a">{MINUS}13.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="d" style={{ marginTop: 14 }}>
            The clock period got longer, which is slower. It is shown, not hidden.
          </p>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Fitness weights</td>
                <td>area 0.6, timing 0.25, power 0.15</td>
              </tr>
              <tr>
                <td>v6</td>
                <td>rejected, not measured</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 4 · EQUIVALENCE</span>
          </div>
          <div className="eqy">
            <svg viewBox="0 0 220 120" role="img" aria-label="v1 and v5 feed a comparison, result proven equal">
              <g fill="var(--rk-inset)" stroke="var(--rk-ink-3)" strokeWidth="1.5">
                <rect x="8" y="14" width="64" height="30" />
                <rect x="8" y="76" width="64" height="30" />
                <rect x="140" y="38" width="36" height="44" />
              </g>
              <path d="M72 29H106V50H140M72 91H106V70H140" fill="none" stroke="var(--rk-ink-3)" strokeWidth="1.5" />
              <g className="svgm" fontSize="10" fill="var(--rk-ink)" textAnchor="middle">
                <text x="40" y="33">
                  v1
                </text>
                <text x="40" y="95">
                  v5
                </text>
                <text x="158" y="63">
                  =
                </text>
              </g>
              <path d="M176 60H196" stroke="var(--rk-a)" strokeWidth="1.5" fill="none" />
              <rect x="196" y="53" width="14" height="14" fill="var(--rk-a)" />
            </svg>
          </div>
          <h3>Proven equal, not just similar</h3>
          <p className="d">Passing tests can miss a case. Yosys EQY checks that v5 behaves exactly like v1 for every input.</p>
          <div className="lamp" style={{ marginTop: 4 }}>
            <span className="sq" />
            <span className="word">PROVEN EQUAL</span>
          </div>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Engine</td>
                <td>Yosys EQY</td>
              </tr>
              <tr>
                <td>Reference</td>
                <td>v1</td>
              </tr>
              <tr>
                <td>Candidate</td>
                <td>v5, the winner</td>
              </tr>
              <tr>
                <td>Result</td>
                <td className="a">PROVEN EQUAL</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}

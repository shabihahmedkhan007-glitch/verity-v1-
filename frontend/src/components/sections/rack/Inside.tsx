import { Ears } from "./Ears";
import { num, REAL } from "./real-run";

const W = REAL.winner;
const V1 = REAL.v1;
const ft = REAL.failingTest;

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
        <p>Four things you can check without trusting the agent. Each is a readout from one real run, labelled against v1.</p>
      </div>
      <div className="slots">
        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 1 · ANSWER KEY</span>
          </div>
          <div className="dial">
            <svg viewBox="0 0 170 170" role="img" aria-label={`Lock dial with ${REAL.testCount} tick marks, one per test, locked`}>
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
          <p className="d">{REAL.testCount} tests come from the golden model before any Verilog exists. The agent can read them and cannot edit them.</p>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Tests</td>
                <td>{REAL.testCount}</td>
              </tr>
              <tr>
                <td>Source</td>
                <td>golden model</td>
              </tr>
              <tr>
                <td>Locked at</td>
                <td>{REAL.stages.lockAt} of {REAL.stages.of}</td>
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
          <p className="d">
            {REAL.failed.length} versions failed a check. {REAL.fixes} were repaired and re-checked; the last one failed again and was
            rejected, so it never competed.
          </p>
          {ft && ft.test ? (
            <div className="code" role="group" aria-label={`${ft.label} failing test`}>
              <div className="hd">
                {ft.label}: {ft.passed} of {ft.total} tests passed
              </div>
              <div>{ft.test.name}</div>
              <div>expected {ft.test.expected}</div>
              <div>got {ft.test.got}</div>
            </div>
          ) : null}
          <div className="fl">
            <span className="sq fail" />
            <span className="word">FAIL {ft ? `${ft.passed}/${ft.total}` : ""}</span>
            <span className="lab">then</span>
            <span className="sq fail" />
            <span className="word">REJECTED</span>
          </div>
          <p className="d tight">The other failures were rule checks before simulation, fixed on the next attempt.</p>
          <table className="kv push">
            <tbody>
              {REAL.failed.map((f) => (
                <tr key={f.label}>
                  <td>{f.label}</td>
                  <td>
                    {f.kind === "lint" ? "failed lint" : "failed tests"}, {f.rejected ? "rejected" : "fixed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="mod slot">
          <Ears />
          <div className="mh">
            <span className="eng">SLOT 3 · MEASURED</span>
          </div>
          <h3>Measured, not guessed</h3>
          <p className="d">{REAL.tools} ({REAL.pdk}) measure every version. Compared with v1, the first version.</p>
          <div className="ovx">
            <table className="tbl" aria-label={`${V1.label} against ${W.label}`}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th className="num">{V1.label}</th>
                  <th className="num">{W.label}</th>
                  <th className="num">vs v1</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Area µm²</td>
                  <td className="num">{num(V1.area ?? 0)}</td>
                  <td className="num">{num(W.area ?? 0)}</td>
                  <td className="num a">{W.areaDelta}</td>
                </tr>
                <tr>
                  <td>Clock ns</td>
                  <td className="num">{(V1.clock ?? 0).toFixed(3)}</td>
                  <td className="num">{(W.clock ?? 0).toFixed(3)}</td>
                  <td className="num a">{W.clockDelta}</td>
                </tr>
                <tr>
                  <td>Power mW</td>
                  <td className="num" colSpan={3}>
                    not measured
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="d" style={{ marginTop: 14 }}>
            A shorter clock period is faster. Power was not measured in this run, so no power figure is shown.
          </p>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Fitness weights</td>
                <td>area {REAL.weights.area.toFixed(2)}, timing {REAL.weights.timing.toFixed(2)}, power not measured</td>
              </tr>
              <tr>
                <td>Rejected</td>
                <td>{REAL.areaRows.filter((r) => r.rejected).map((r) => r.label).join(", ")}, not measured</td>
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
            <svg viewBox="0 0 220 120" role="img" aria-label={`${V1.label} and ${W.label} feed a comparison, result ${W.eqy === "proven" ? "proven equal" : "not proven"}`}>
              <g fill="var(--rk-inset)" stroke="var(--rk-ink-3)" strokeWidth="1.5">
                <rect x="8" y="14" width="64" height="30" />
                <rect x="8" y="76" width="64" height="30" />
                <rect x="140" y="38" width="36" height="44" />
              </g>
              <path d="M72 29H106V50H140M72 91H106V70H140" fill="none" stroke="var(--rk-ink-3)" strokeWidth="1.5" />
              <g className="svgm" fontSize="10" fill="var(--rk-ink)" textAnchor="middle">
                <text x="40" y="33">
                  {V1.label}
                </text>
                <text x="40" y="95">
                  {W.label}
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
          <p className="d">Passing tests can miss a case. Yosys EQY checks that {W.label} behaves exactly like {V1.label} for every input.</p>
          <div className="lamp" style={{ marginTop: 4 }}>
            <span className="sq" />
            <span className="word">{W.eqy === "proven" ? "PROVEN EQUAL" : "NOT PROVEN"}</span>
          </div>
          <table className="kv push">
            <tbody>
              <tr>
                <td>Engine</td>
                <td>Yosys EQY</td>
              </tr>
              <tr>
                <td>Reference</td>
                <td>{V1.label}</td>
              </tr>
              <tr>
                <td>Candidate</td>
                <td>{W.label}, the winner</td>
              </tr>
              <tr>
                <td>Result</td>
                <td className="a">{W.eqy === "proven" ? "PROVEN EQUAL" : "NOT PROVEN"}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </section>
  );
}

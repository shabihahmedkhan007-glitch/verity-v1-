/** Section 8: the spec that went in, and what came back, from the recorded run. */
export function ApplicationSection() {
  return (
    <section className="page" id="application" aria-labelledby="app-h">
      <div className="wrap">
        <h2 className="page-h" id="app-h">
          <span className="n">8</span>Typical Application
        </h2>
        <p className="lede">
          Plain English in, checked hardware out. On the left, the spec given to Verity in the recorded run. On the right, what comes
          back. <span className="sd">Sample data.</span>
        </p>
        <div className="app">
          <div className="app-col">
            <h3>Before: a spec in plain English</h3>
            <div className="specbox">
              <div className="box-h">
                <span className="mono">spec: 4-lane MAC array, 8-bit</span>
                <span>priority: area</span>
              </div>
              <blockquote>
                A 4-lane multiply-accumulate unit. Each cycle it multiplies four pairs of unsigned 8-bit inputs and adds the four products
                to a running sum. After 16 cycles it raises done and holds the 22-bit result until reset. Smallest area matters most.
              </blockquote>
            </div>
          </div>
          <div className="arrow" aria-hidden="true">
            <b>88 s</b>
            <small>recorded run, sample data</small>
          </div>
          <div className="app-col">
            <h3>After: verified RTL, v5</h3>
            <ol className="objlist">
              <li>
                <span className="i">01</span>Locked tests passed<span className="mk pass">16 of 16</span>
              </li>
              <li>
                <span className="i">02</span>Equal to v1 (Yosys EQY)<span className="mk pass">Proven</span>
              </li>
              <li>
                <span className="i">03</span>Area vs v1<code>-17.4%</code>
              </li>
              <li>
                <span className="i">04</span>Power vs v1<code>-13.5%</code>
              </li>
              <li>
                <span className="i">05</span>Clock vs v1<span className="mk warn">+5.6% slower</span>
              </li>
            </ol>
            <p className="pin-note">The agent gives up some speed for area because the spec said smallest area matters most.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

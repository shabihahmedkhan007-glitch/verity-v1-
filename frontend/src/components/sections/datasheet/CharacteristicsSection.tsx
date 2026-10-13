/** Section 6: v1 versus best versus the winner, and Figure 6-1 (area per version). Sample data, relative to v1. */
export function CharacteristicsSection() {
  return (
    <section className="page" id="characteristics" aria-labelledby="char-h">
      <div className="wrap">
        <div id="trust">
          <h2 className="page-h" id="char-h">
            <span className="n">6</span>Typical Characteristics
          </h2>
          <p className="lede">
            What changed, and what did not. Every number below is measured by open-source tools and compared with Verity&apos;s own first
            draft, v1. The winning version is smaller and cooler, and it is slower. We show that too. <span className="sd">Sample data.</span>
          </p>
        </div>
        <div className="chars">
          <div>
            <p className="cap-above">
              <span>Table 6-1.</span> v1 compared with the best version and the winner, v5
            </p>
            <div className="tbl-wrap">
              <table className="dtbl">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Unit</th>
                    <th className="num">v1</th>
                    <th className="num">Best</th>
                    <th className="num">v5</th>
                    <th>Change, v5 vs v1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Area</td>
                    <td>um2</td>
                    <td className="num">1840</td>
                    <td className="num">1520<small>v5</small></td>
                    <td className="num">1520</td>
                    <td><span className="chg">-17.4% smaller</span></td>
                  </tr>
                  <tr>
                    <td>Clock period</td>
                    <td>ns</td>
                    <td className="num">3.20</td>
                    <td className="num">2.70<small>v4</small></td>
                    <td className="num">3.38</td>
                    <td><span className="chg w">+5.6% slower</span></td>
                  </tr>
                  <tr>
                    <td>Power</td>
                    <td>mW</td>
                    <td className="num">1.92</td>
                    <td className="num">1.66<small>v5</small></td>
                    <td className="num">1.66</td>
                    <td><span className="chg">-13.5% lower</span></td>
                  </tr>
                  <tr>
                    <td>Cells</td>
                    <td>count</td>
                    <td className="num">412</td>
                    <td className="num">334<small>v5</small></td>
                    <td className="num">334</td>
                    <td><span className="chg">-18.9% fewer</span></td>
                  </tr>
                  <tr>
                    <td>Fitness score</td>
                    <td>score</td>
                    <td className="num">0</td>
                    <td className="num">11.06<small>v5</small></td>
                    <td className="num">11.06</td>
                    <td><span className="chg">+11.06 better</span></td>
                  </tr>
                  <tr>
                    <td>Locked tests</td>
                    <td>passed</td>
                    <td className="num">16/16</td>
                    <td className="num">16/16</td>
                    <td className="num">16/16</td>
                    <td><span className="chg p">same</span></td>
                  </tr>
                  <tr>
                    <td>Equal to v1</td>
                    <td>Yosys EQY</td>
                    <td className="num">baseline</td>
                    <td className="num">v5</td>
                    <td className="num">proven</td>
                    <td><span className="mk pass">Proven equal</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="foot-note">
              Best = best value any version reached. v4 was the fastest (2.70 ns) but larger than v1. Numbers come from Yosys and OpenROAD
              on Nangate45: good estimates, not signoff.
            </p>
          </div>

          <figure className="fig">
            <div className="fig-frame scroll-x">
              <svg className="g1 wide" viewBox="0 0 560 350" role="img" aria-labelledby="g1t g1d">
                <title id="g1t">Area per version, in square micrometres</title>
                <desc id="g1d">
                  v1 is 1840. v2 is 1690. v3 is 1610. v4 is 1950, larger than v1. v5 is 1520, the proven winner, 17.4 percent smaller than
                  v1. v6 was rejected and has no area figure.
                </desc>
                <g className="gl">
                  <path d="M60 270H540M60 212.5H540M60 155H540M60 97.5H540M60 40H540" />
                </g>
                <path className="axis" d="M60 40V270H540" fill="none" />
                <g className="tk" textAnchor="end">
                  <text x="52" y="274">0</text>
                  <text x="52" y="216.5">500</text>
                  <text x="52" y="159">1000</text>
                  <text x="52" y="101.5">1500</text>
                  <text x="52" y="44">2000</text>
                </g>
                <text className="tk" x="60" y="26">area, um2 (lower is better)</text>
                {/* bars: slot 80, bar width 48, scale 0.115 px per um2 */}
                <rect className="cb" x="76" y="58.4" width="48" height="211.6" />
                <rect className="cb" x="156" y="75.6" width="48" height="194.4" />
                <rect className="cb" x="236" y="84.8" width="48" height="185.2" />
                <rect className="cb w" x="316" y="45.7" width="48" height="224.3" />
                <rect className="cb win" x="396" y="95.2" width="48" height="174.8" />
                <rect className="cb rej" x="476" y="240" width="48" height="30" />
                <path className="base-line" d="M60 58.4H540" />
                <g className="vl" textAnchor="middle">
                  <text x="100" y="52">1840</text>
                  <text x="180" y="69.6">1690</text>
                  <text x="260" y="78.8">1610</text>
                  <text x="340" y="39.7">1950</text>
                  <text x="420" y="89.2">1520</text>
                </g>
                <text className="tk nonum" x="500" y="232" textAnchor="middle">no number</text>
                <text className="tk" x="538" y="53" textAnchor="end">v1 level</text>
                <g className="tk" textAnchor="middle">
                  <text x="100" y="288">v1</text>
                  <text x="180" y="288">v2</text>
                  <text x="260" y="288">v3</text>
                  <text x="340" y="288">v4</text>
                  <text x="420" y="288">v5</text>
                  <text x="500" y="288">v6</text>
                  <text x="100" y="302">first draft</text>
                  <text x="180" y="302">SIMPLIFY</text>
                  <text x="260" y="302">OPTIMIZE</text>
                  <text x="340" y="302">EXPLORE</text>
                  <text x="420" y="302">OPTIMIZE</text>
                  <text x="500" y="302">SIMPLIFY</text>
                </g>
                <g textAnchor="middle">
                  <text className="st base" x="100" y="320">BASE</text>
                  <text className="st pass" x="180" y="320">PASS</text>
                  <text className="st pass" x="260" y="320">PASS</text>
                  <text className="st warn" x="340" y="320">LARGER</text>
                  <text className="st pass" x="420" y="320">PROVEN</text>
                  <text className="st fail" x="500" y="320">REJECTED</text>
                </g>
                <text className="tk" x="60" y="342">Sample data. Yosys + OpenROAD, Nangate45.</text>
              </svg>
            </div>
            <figcaption className="fig-cap">
              <b>Figure 6-1.</b> Area per version. The dashed line is v1. The green bar is the proven winner.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

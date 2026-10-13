/** Figure 1: the Verity loop as a functional block diagram. Colours come from CSS classes (tokens), never inline. */
export function BlockDiagram() {
  return (
    <svg className="schem wide" viewBox="0 0 640 500" role="img" aria-labelledby="schem-t schem-d">
      <title id="schem-t">Functional block diagram of the Verity loop</title>
      <desc id="schem-d">
        A plain-English spec goes in. Verity plans four blocks, locks a golden model and 16 tests, then builds and tests the design.
        A failing test returns to build for a fix. A passing design becomes v1, which is evolved into a small population of versions
        v2 to v6, and the best is proven equal to v1 with Yosys EQY, giving verified RTL out.
      </desc>
      <defs>
        <pattern id="vrt-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path className="grid-line" d="M20 0H0V20" />
        </pattern>
        <marker id="vrt-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="f-muted" d="M0 0 10 5 0 10z" />
        </marker>
        <marker id="vrt-arr-f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="f-fail" d="M0 0 10 5 0 10z" />
        </marker>
        <marker id="vrt-arr-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path className="f-pass" d="M0 0 10 5 0 10z" />
        </marker>
      </defs>
      <rect width="640" height="500" fill="url(#vrt-grid)" />

      {/* row 1: spec, plan, lock */}
      <text className="lbl t1" x="10" y="74" fontSize="15">SPEC</text>
      <text className="t2" x="10" y="90">plain English</text>
      <path className="ln" d="M98 78H118" markerEnd="url(#vrt-arr)" />

      <rect className="bx" x="118" y="44" width="120" height="68" />
      <text className="lbl t1" x="178" y="70" textAnchor="middle" fontSize="15">PLAN</text>
      <text className="t2" x="178" y="88" textAnchor="middle">4 blocks</text>
      <text className="t2" x="178" y="102" textAnchor="middle">human can steer</text>
      <path className="ln" d="M238 78H272" markerEnd="url(#vrt-arr)" />

      <rect className="bx" x="272" y="44" width="170" height="68" style={{ strokeWidth: 2.5 }} />
      <path className="f-none s-fg" d="M290 74v-6a6 6 0 0 1 12 0v6" strokeWidth="2.5" />
      <rect className="f-fg" x="286" y="74" width="20" height="16" />
      <rect className="f-bg" x="294" y="79" width="4" height="6" />
      <text className="lbl t1" x="320" y="68" fontSize="15">LOCK</text>
      <text className="t2" x="320" y="85">golden model</text>
      <text className="t2" x="320" y="99">+ 16 tests</text>
      <text className="t2" x="456" y="72">Read-only to the</text>
      <text className="t2" x="456" y="86">agent: it cannot</text>
      <text className="t2" x="456" y="100">edit the key.</text>

      <path className="ln" d="M357 112V150H193V184" markerEnd="url(#vrt-arr)" />

      {/* row 2: build / fix loop */}
      <rect className="bx" x="118" y="186" width="150" height="64" />
      <text className="lbl t1" x="193" y="212" textAnchor="middle" fontSize="15">BUILD</text>
      <text className="t2" x="193" y="228" textAnchor="middle">write Verilog</text>
      <text className="t2" x="193" y="242" textAnchor="middle">+ lint</text>
      <path className="ln" d="M268 218H328" markerEnd="url(#vrt-arr)" />

      <rect className="bx" x="330" y="186" width="150" height="64" />
      <text className="lbl t1" x="405" y="212" textAnchor="middle" fontSize="15">TEST</text>
      <text className="t2" x="405" y="228" textAnchor="middle">simulate the</text>
      <text className="t2" x="405" y="242" textAnchor="middle">16 locked tests</text>

      <path className="lnf" d="M405 252V288H193V256" markerEnd="url(#vrt-arr-f)" />
      <rect className="f-fail" x="204" y="296" width="8" height="8" />
      <text className="f-fail" x="218" y="304" fontSize="11" fontWeight="700">FAIL: read the log, fix, retry</text>

      <path className="lng" d="M480 218H600V332H145V354" markerEnd="url(#vrt-arr-g)" />
      <rect className="f-pass" x="494" y="198" width="8" height="8" />
      <text className="f-pass" x="508" y="206" fontSize="11" fontWeight="700">PASS</text>
      <text className="t2" x="494" y="238">= v1, first draft</text>

      {/* row 3: evolve, prove, out */}
      <rect className="bx" x="10" y="356" width="270" height="100" />
      <text className="lbl t1" x="22" y="380" fontSize="15">EVOLVE</text>
      <text className="t2" x="22" y="396">tiny population, scored vs v1</text>
      <g className="f-fg" fontSize="11" textAnchor="middle">
        <rect className="f-none s-muted" x="22" y="406" width="42" height="26" strokeWidth="1.5" />
        <text x="43" y="423">v2</text>
        <rect className="f-none s-muted" x="72" y="406" width="42" height="26" strokeWidth="1.5" />
        <text x="93" y="423">v3</text>
        <rect className="f-none s-muted" x="122" y="406" width="42" height="26" strokeWidth="1.5" />
        <text x="143" y="423">v4</text>
        <rect className="f-none s-fg" x="172" y="406" width="42" height="26" strokeWidth="2.5" />
        <text x="193" y="423" fontWeight="700">v5</text>
        <rect className="f-none s-fail" x="222" y="406" width="42" height="26" strokeWidth="1.5" strokeDasharray="4 3" />
        <text className="f-fail" x="243" y="423">v6</text>
      </g>
      <text className="t2" x="22" y="449">keep the best 1 to 2, drop the rest</text>
      <path className="ln" d="M280 406H310" markerEnd="url(#vrt-arr)" />

      <rect className="bx" x="312" y="356" width="118" height="100" />
      <text className="lbl t1" x="371" y="392" textAnchor="middle" fontSize="15">PROVE</text>
      <text className="t2" x="371" y="410" textAnchor="middle">Yosys EQY</text>
      <text className="t2" x="371" y="426" textAnchor="middle">same as v1?</text>
      <path className="lng" d="M430 406H468" markerEnd="url(#vrt-arr-g)" />

      <rect className="f-bg s-pass" x="470" y="372" width="160" height="68" strokeWidth="2" />
      <rect className="f-pass" x="482" y="386" width="10" height="10" />
      <text className="lbl f-fg" x="500" y="396" fontSize="15">VERIFIED RTL</text>
      <text className="f-pass" x="482" y="422" fontSize="10.5" fontWeight="700">PROVEN EQUAL TO v1</text>

      <text className="t2" x="10" y="486">Sample run shown (VRT-MAC4). Sample data.</text>
    </svg>
  );
}

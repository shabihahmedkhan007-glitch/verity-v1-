import Link from "next/link";

/** Section 9: the three presets and where each one leads. */
export function OrderingSection() {
  return (
    <section className="page order-wrap" id="ordering" aria-labelledby="ord-h">
      <div className="wrap">
        <h2 className="page-h" id="ord-h">
          <span className="n">9</span>Ordering Information
        </h2>
        <p className="lede">Pick a starting chip, or write your own spec. These are the three presets.</p>
        <p className="cap-above">
          <span>Table 9-1.</span> Presets
        </p>
        <div className="tbl-wrap">
          <table className="dtbl">
            <thead>
              <tr>
                <th>Preset</th>
                <th>Chip</th>
                <th>What you get</th>
                <th>Run</th>
                <th>Get it</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>mac4</code>
                </td>
                <td>4-lane MAC array, 8-bit</td>
                <td>The same chip as the recorded run on this page</td>
                <td>
                  <span className="mk info">Recorded</span>
                </td>
                <td>
                  <Link prefetch={false} href="/studio?run=golden">
                    Watch the full run
                  </Link>
                </td>
              </tr>
              <tr>
                <td>
                  <code>matmul4</code>
                </td>
                <td>4x4 matrix multiply, 8-bit</td>
                <td>Sixteen results from two small matrices</td>
                <td>
                  <span className="mk plain">Live</span>
                </td>
                <td>
                  <Link prefetch={false} href="/try">
                    Try it live
                  </Link>
                </td>
              </tr>
              <tr>
                <td>
                  <code>alu8</code>
                </td>
                <td>8-bit ALU</td>
                <td>The smallest design and the quickest run</td>
                <td>
                  <span className="mk plain">Live</span>
                </td>
                <td>
                  <Link prefetch={false} href="/try">
                    Try it live
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

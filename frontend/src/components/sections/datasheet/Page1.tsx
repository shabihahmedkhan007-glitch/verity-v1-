import Link from "next/link";
import { BlockDiagram } from "./BlockDiagram";
import { ArrowIcon } from "./icons";

/** Page 1: headline, lead, features, CTAs, Figure 1, then applications, description and device information. */
export function Page1() {
  return (
    <div className="wrap">
      <div className="p1">
        <div>
          <h1>
            Describe a chip in <em>plain English.</em>
          </h1>
          <p className="lead">
            Verity is an AI hardware engineer. You say what the chip should do. It writes the Verilog (the code that describes a chip),
            checks it against an answer key it cannot edit, fixes its own bugs, then evolves versions that are smaller, faster or lower
            power, and proves the winner does the same job.
          </p>
          <h2 className="sec-h">
            <span className="n">1</span>Features
          </h2>
          <ul className="features">
            <li>
              <b>Locked answer key:</b> a golden model and 16 tests the agent can run but never edit
            </li>
            <li>
              <b>Self-fixing:</b> when a test fails, it reads the failure, repairs its own code and runs again
            </li>
            <li>
              <b>Measured, not guessed:</b> area, clock and power come from open-source tools, compared with its own first draft
            </li>
            <li>
              <b>Proven equal:</b> the winning version is checked against the first draft with formal equivalence
            </li>
          </ul>
          <div className="ctas">
            <Link prefetch={false} href="/studio?run=golden" className="btn">
              Watch the full run
              <ArrowIcon />
            </Link>
            <Link prefetch={false} href="/try" className="btn ghost">
              Try it live
            </Link>
          </div>
        </div>

        <figure className="fig">
          <div className="fig-frame scroll-x">
            <BlockDiagram />
          </div>
          <figcaption className="fig-cap">
            <b>Figure 1.</b> Functional block diagram: a spec goes in, verified RTL comes out, and every failure on the way is kept
          </figcaption>
        </figure>
      </div>

      <div className="p1-lower">
        <div>
          <h2 className="sec-h">
            <span className="n">2</span>Applications
          </h2>
          <ul className="apps">
            <li>Multiply-accumulate units</li>
            <li>Matrix multiply blocks</li>
            <li>Small ALUs</li>
            <li>Adder trees</li>
            <li>Pipelined datapaths</li>
            <li>Small state machines</li>
          </ul>
        </div>
        <div>
          <h2 className="sec-h">
            <span className="n">3</span>Description
          </h2>
          <p>
            Verity turns a plain-English spec into checked hardware. An agent (NVIDIA Nemotron on Nebius Token Factory) writes the
            Verilog, runs it against a golden model and tests it cannot edit, and fixes whatever fails.
          </p>
          <p>
            It then grows a tiny population of versions, measures each against its own first draft, and proves the winner behaves the
            same. Every step is recorded, so you can replay the whole run.
          </p>
        </div>
        <div>
          <p className="cap-above">
            <span>Table 1.</span> Device information
          </p>
          <div className="tbl-wrap">
            <table className="dtbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Part</td>
                  <td>
                    <b>VRT-MAC4</b>
                  </td>
                </tr>
                <tr>
                  <td>Chip</td>
                  <td>4-lane MAC array, 8-bit</td>
                </tr>
                <tr>
                  <td>Agent</td>
                  <td>NVIDIA Nemotron</td>
                </tr>
                <tr>
                  <td>Locked tests</td>
                  <td className="num">16</td>
                </tr>
                <tr>
                  <td>Size limit</td>
                  <td>about 300 lines</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

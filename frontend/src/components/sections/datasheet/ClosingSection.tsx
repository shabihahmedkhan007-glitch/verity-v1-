import Link from "next/link";
import { ArrowIcon } from "./icons";

const GLANCE: [string, string][] = [
  ["Time, spec to proof", "88 s"],
  ["Versions built", "6"],
  ["Bugs fixed by the agent", "2"],
  ["Versions rejected", "1"],
  ["Human inputs", "2"],
];

/** Closing call to action with the recorded run at a glance. The one primary action of the view. */
export function ClosingSection() {
  return (
    <section className="close" aria-labelledby="close-h">
      <div className="wrap">
        <div>
          <h2 id="close-h">
            Describe a chip. <em>See the proof</em> before you trust it.
          </h2>
          <p>
            The whole run is recorded: the spec, the plan, every failed test, every fix and the equivalence proof. Replay it in 88
            seconds, or start your own.
          </p>
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
        <div>
          <p className="cap-above">
            <span>Table 9-2.</span> The recorded run, at a glance <span className="sd">(sample data)</span>
          </p>
          <div className="tbl-wrap">
            <table className="dtbl">
              <tbody>
                {GLANCE.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className="num">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

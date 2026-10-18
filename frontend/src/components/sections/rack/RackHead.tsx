import Link from "next/link";
import { ArrowIcon } from "./icons";

/** Headline, lead and the two calls to action. */
export function RackHead() {
  return (
    <div className="head">
      <h1>
        <span className="l1">Say what the chip does.</span>
        <span className="l2">
          It writes, <span className="hollow">breaks</span>, fixes and <span className="pf">proves</span> the Verilog.
        </span>
      </h1>
      <div className="lead-box">
        <p className="lead">
          Describe a chip in plain English. Verity writes the Verilog, tests it against an <b>answer key it cannot edit</b>, fixes its own
          bugs, then grows smaller versions and <b>proves the winner equal</b> to its first one.
        </p>
        <nav className="choose" aria-label="Two ways in">
          <Link prefetch={false} href="/bench" className="way live">
            <span className="way-t">
              <span className="sq pass" aria-hidden />
              Build one live
            </span>
            <span className="way-d">Describe a small chip and watch Nemotron write, test and prove it now.</span>
            <span className="way-m">
              Real Nemotron run · a few minutes
              <ArrowIcon />
            </span>
          </Link>
          <Link prefetch={false} href="/studio?run=mac4-real" className="way rec">
            <span className="way-t">
              <span className="sq wait" aria-hidden />
              Watch a recorded run
            </span>
            <span className="way-d">The whole loop from a real Nebius run, start to proof, no waiting.</span>
            <span className="way-m">
              Real run · 1:10 replay · free
              <ArrowIcon />
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

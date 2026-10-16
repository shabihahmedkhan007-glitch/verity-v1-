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
        <div className="ctas">
          <Link prefetch={false} href="/studio?run=golden" className="btn p">
            Watch the full run <ArrowIcon />
          </Link>
          <Link prefetch={false} href="/try" className="btn s">
            Try it live
          </Link>
        </div>
      </div>
    </div>
  );
}

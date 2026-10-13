import type { ReactNode } from "react";

type Step = { n: string; title: string; body: string; cli: ReactNode };

const STEPS: Step[] = [
  {
    n: "7.1",
    title: "Plan",
    body: "The agent splits your spec into blocks and shows the plan. You can steer it. In the recorded run a human pinned a 2-stage multiplier pipeline.",
    cli: (
      <>
        <span className="pr">$ </span>plan{"\n"}
        <span className="f">1</span> Input registers{"\n"}
        <span className="f">2</span> Multiplier array (2-stage){"\n"}
        <span className="f">3</span> Adder tree{"\n"}
        <span className="f">4</span> Accumulator and control
      </>
    ),
  },
  {
    n: "7.2",
    title: "Lock",
    body: "Before any design exists, the golden model and the 16 tests are written and locked. The agent can run them. It cannot change them, so it cannot mark its own homework.",
    cli: (
      <>
        <span className="pr">$ </span>lock{"\n"}
        golden model   <span className="f">locked</span>
        {"\n"}16 tests       <span className="f">locked</span>
        {"\n"}agent access   <span className="f">read-only</span>
      </>
    ),
  },
  {
    n: "7.3",
    title: "Build",
    body: "The agent writes Verilog, the code that describes a chip, then lints it for mistakes and simulates it against the locked tests.",
    cli: (
      <>
        <span className="pr">$ </span>build v1{"\n"}rtl    write Verilog{"\n"}lint   Verilator{"\n"}sim    iverilog + cocotb
      </>
    ),
  },
  {
    n: "7.4",
    title: "Fix",
    body: "A failing test is not the end. The agent reads the failure, repairs its own code and runs again. The failure stays in the record.",
    cli: (
      <>
        sim   13/16  <span className="r">FAIL</span>
        {"\n"}why   accumulator is 16 bits{"\n"}      and wraps{"\n"}fix   widen it to 22 bits{"\n"}sim   16/16  <span className="g">PASS</span>
      </>
    ),
  },
  {
    n: "7.5",
    title: "Evolve",
    body: "A tiny population of versions, each one small change: simplify, optimize or explore. Each is scored against v1. The best one or two are kept.",
    cli: (
      <>
        v2 SIMPLIFY  from v1  <span className="g">PASS</span>
        {"\n"}v3 OPTIMIZE  from v1  <span className="r">FAIL</span>, fixed
        {"\n"}v4 EXPLORE   from v1  <span className="w">larger</span>
        {"\n"}v5 OPTIMIZE  from v3  <span className="f">best</span>
        {"\n"}v6 SIMPLIFY  from v2  <span className="r">REJECTED</span>
      </>
    ),
  },
  {
    n: "7.6",
    title: "Prove",
    body: "The winner is checked against v1 with formal equivalence. If the proof passes, the smaller, faster or lower-power version behaves exactly like v1.",
    cli: (
      <>
        <span className="pr">$ </span>prove v5 = v1{"\n"}tool    Yosys EQY{"\n"}result  EQUIVALENT  <span className="g">PASS</span>
      </>
    ),
  },
];

const TOOLS: [string, string][] = [
  ["Writing and fixing", "NVIDIA Nemotron on Nebius Token Factory"],
  ["Simulation", "iverilog 12 + cocotb"],
  ["Lint", "Verilator"],
  ["Area, timing, power", "Yosys + OpenROAD on Nangate45"],
  ["Equivalence proof", "Yosys EQY"],
];

/** Section 7: the six steps of the loop, each with a condensed terminal view, plus the tools table. */
export function DetailSection() {
  return (
    <section className="page" aria-labelledby="detail-h">
      <div className="wrap">
        <div id="detail">
          <h2 className="page-h" id="detail-h">
            <span className="n">7</span>Detailed Description
          </h2>
          <p className="lede">Six steps, one loop. Each step leaves a record you can replay, including the ones that went wrong.</p>
        </div>
        <div className="fd">
          {STEPS.map((s) => (
            <div key={s.n}>
              <h3>
                <span className="n">{s.n}</span>
                {s.title}
              </h3>
              <p>{s.body}</p>
              <pre className="cli">{s.cli}</pre>
            </div>
          ))}
        </div>
        <p className="foot-note">
          Output shown is a condensed view of the recorded run. <span className="sd">Sample data.</span>
        </p>

        <div className="tools">
          <p className="cap-above">
            <span>Table 7-1.</span> Tools behind each step
          </p>
          <div className="tbl-wrap">
            <table className="dtbl">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Tool</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map(([step, tool]) => (
                  <tr key={step}>
                    <td>{step}</td>
                    <td>{tool}</td>
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

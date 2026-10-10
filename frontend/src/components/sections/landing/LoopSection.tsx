"use client";

import { StatusSquare } from "@/components/domain/StatusSquare";

const STATIONS: { name: string; body: string }[] = [
  { name: "Plan", body: "Nemotron turns your sentence into a block plan. Steer it, or let the countdown run." },
  { name: "Lock", body: "A golden model and its tests are locked away from the agent. That is the answer key." },
  { name: "Build and fix", body: "The agent writes Verilog, simulates it, reads the failures and fixes its own code." },
  {
    name: "Evolve",
    body: "Small rounds of new versions compete. Failing ones get fixed, passing ones get measured, the best two carry on.",
  },
  { name: "Prove", body: "The winner is checked against v1 with an equivalence prover before you download it." },
];

export function LoopSection() {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="scroll-mt-4 border-t py-[clamp(4rem,3rem+4vw,8rem)]"
    >
      <div className="mx-auto max-w-[80rem] px-6 md:px-12">
        <h2 id="how-heading" className="text-headline text-foreground">
          One loop, start to finish
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-5 md:gap-6">
          {STATIONS.map((s, i) => {
            const last = i === STATIONS.length - 1;
            return (
              <li key={s.name}>
                <div className="flex items-center gap-3" aria-hidden>
                  <StatusSquare status={last ? "pass" : "idle"} size="md" />
                  {last ? null : <span className="hidden h-px flex-1 bg-border-strong md:block" />}
                </div>
                <h3 className="mt-4 text-xl font-bold text-foreground">{s.name}</h3>
                <p className="mt-2 max-w-[34ch] text-base text-fg-muted">{s.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

"use client";

import { EqyBadge } from "@/components/domain/EqyBadge";
import { GoldenModelCard } from "@/components/domain/GoldenModelCard";
import { HonestyNote } from "@/components/domain/HonestyNote";
import { MetricDelta } from "@/components/domain/MetricDelta";
import { SampleDataBadge } from "@/components/domain/SampleDataBadge";

// Sample numbers shown as evidence. They mirror the recorded sample run (public/runs/golden.json, v1 and v5)
// and carry the Sample data badge. Replace them when the real run is recorded.
const V1 = { areaUm2: 1840, clockPeriodNs: 3.2, powerMw: 1.92 };
const V5 = { areaUm2: 1520, clockPeriodNs: 3.38, powerMw: 1.66 };

const CLAIMS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "The answer key is locked.",
    body: "AI agents have been caught editing tests to make them pass. Verity's golden model and tests live where the agent cannot write.",
  },
  {
    n: "02",
    title: "Better is measured, never guessed.",
    body: "Every score comes from Yosys and OpenROAD reports, relative to our own v1. We never ask the model whether a design is better.",
  },
  {
    n: "03",
    title: "Faster versions are proven equal.",
    body: "Before a winner ships, Yosys EQY checks that it behaves exactly like v1.",
  },
];

export function TrustSection() {
  return (
    <section
      id="trust"
      aria-labelledby="trust-heading"
      className="scroll-mt-4 border-t py-[clamp(4rem,3rem+4vw,8rem)]"
    >
      <div className="mx-auto max-w-[80rem] px-6 md:px-12">
        <h2 id="trust-heading" className="text-headline text-foreground">
          Why the numbers hold up
        </h2>
        <ol className="mt-10 border-t">
          {CLAIMS.map((c, i) => (
            <li
              key={c.n}
              className="grid gap-6 border-b py-8 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,22rem)] md:items-start md:gap-8"
            >
              <span className="font-mono text-sm text-fg-subtle">{c.n}</span>
              <div>
                <h3 className="text-xl font-bold text-foreground">{c.title}</h3>
                <p className="mt-2 max-w-[65ch] text-base text-fg-muted">{c.body}</p>
              </div>
              <div className="min-w-0">
                {i === 0 ? (
                  <GoldenModelCard
                    variant="mini"
                    status="locked"
                    testCount={16}
                    files={["tests/golden_model.py", "tests/test_mac4.py"]}
                  />
                ) : null}
                {i === 1 ? (
                  <div className="flex flex-col gap-2">
                    <MetricDelta metric="area" value={V5.areaUm2} baseline={V1.areaUm2} showValue />
                    <MetricDelta
                      metric="clockPeriod"
                      value={V5.clockPeriodNs}
                      baseline={V1.clockPeriodNs}
                      showValue
                    />
                    <MetricDelta metric="power" value={V5.powerMw} baseline={V1.powerMw} showValue />
                  </div>
                ) : null}
                {i === 2 ? (
                  <EqyBadge
                    againstLabel="v1"
                    eqy={{ status: "proven", againstId: "c1", tool: "yosys-eqy" }}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SampleDataBadge />
          <HonestyNote variant="inline" />
        </div>
      </div>
    </section>
  );
}

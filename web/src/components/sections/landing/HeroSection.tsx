"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroReplay } from "./HeroReplay";

/** First-paint stagger: 60ms per element, under 500ms in total (UI_UX_SPEC 11). */
function stagger(i: number) {
  return { animationDelay: `${i * 60}ms` };
}

export function HeroSection() {
  return (
    <section className="relative overflow-x-clip">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-6 py-10 md:px-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-14 xl:grid-cols-[5fr_7fr] xl:min-h-[min(calc(100svh-4rem),860px)]">
        <div className="min-w-0">
          <p
            className="animate-node-enter text-sm font-medium tracking-[0.08em] text-fg-muted"
            style={stagger(0)}
          >
            DESCRIBE | GENERATE | SIMULATE | <span className="text-pass">VERIFY</span>
          </p>
          <h1
            className="animate-node-enter mt-5 text-display text-foreground"
            style={stagger(1)}
          >
            Describe a chip in plain English.
          </h1>
          <p
            className="animate-node-enter mt-6 max-w-[46ch] text-lead text-fg-muted"
            style={stagger(2)}
          >
            Verity writes the Verilog, tests it against an answer key it cannot edit, fixes its own
            bugs, then redesigns it to be smaller and faster.
          </p>
          <div className="animate-node-enter mt-8 flex flex-wrap items-center gap-3" style={stagger(3)}>
            <Button asChild size="lg" className="h-10 px-5 text-base">
              <Link prefetch={false} href="/studio?run=golden">Watch the full run</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-10 px-5 text-base">
              <Link prefetch={false} href="/try">Try it live</Link>
            </Button>
          </div>
          <p className="animate-node-enter mt-5 max-w-[46ch] text-sm text-fg-muted" style={stagger(4)}>
            This run is a recording. Replays are free. Built on NVIDIA Nemotron and Nebius Token
            Factory.
          </p>
        </div>
        <div className="min-w-0 xl:-mr-[calc(3rem+max(0px,(100vw-80rem)/2))]">
          <HeroReplay />
        </div>
      </div>
    </section>
  );
}

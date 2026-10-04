"use client";

export function LimitsSection() {
  return (
    <section aria-labelledby="limits-heading" className="border-t py-[clamp(4rem,3rem+4vw,8rem)]">
      <div className="mx-auto max-w-[80rem] px-6 md:px-12">
        <h2 id="limits-heading" className="text-headline text-foreground">
          What Verity will not do
        </h2>
        <div className="mt-8 max-w-[65ch] space-y-5 text-base text-fg-muted">
          <p>
            It will not design a GPU. AI-written hardware stops being reliable on large designs, so
            Verity works on small blocks of up to about 300 lines and shows the loop making them
            better.
          </p>
          <p>
            Its numbers come from open-source tools and are relative to our own v1. They are good
            estimates, not signoff.
          </p>
        </div>
      </div>
    </section>
  );
}

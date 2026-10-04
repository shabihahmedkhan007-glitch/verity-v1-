"use client";

import { PoweredBy } from "@/components/brand/PoweredBy";
import { Wordmark } from "@/components/brand/Wordmark";
import { DEMO_VIDEO_URL, DEVPOST_URL, GITHUB_URL } from "./links";

const LINKS: { label: string; href: string | null }[] = [
  { label: "GitHub", href: GITHUB_URL },
  { label: "Devpost", href: DEVPOST_URL },
  { label: "Demo video", href: DEMO_VIDEO_URL },
];

export function SiteFooter() {
  const links = LINKS.filter((l): l is { label: string; href: string } => l.href !== null);
  return (
    <footer className="border-t bg-surface py-12">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-8 px-6 md:flex-row md:items-start md:justify-between md:px-12">
        <div className="max-w-[65ch] space-y-3">
          <Wordmark size="md" />
          <p className="text-sm text-fg-muted">
            Verity: AI Hardware Engineer. Built for the Nebius x NVIDIA Global AI Hackathon, 2026.
          </p>
          <p className="text-sm text-fg-subtle">
            The evolution loop follows principles from REvolution (Min et al., ASP-DAC 2026).
            Verity&apos;s results are its own.
          </p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          {links.length > 0 ? (
            <nav aria-label="Project links" className="flex gap-5 text-sm">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center text-fg-muted hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          ) : null}
          <PoweredBy layout="stacked" />
        </div>
      </div>
    </footer>
  );
}

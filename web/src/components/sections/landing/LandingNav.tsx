"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { GITHUB_URL } from "./links";

const linkClass =
  "hidden h-8 items-center rounded-md px-2 text-sm font-medium text-fg-muted transition-colors hover:text-foreground sm:inline-flex";

export function LandingNav() {
  return (
    <header className="h-16 border-b bg-background">
      <nav
        aria-label="Main"
        className="mx-auto flex h-full max-w-[80rem] items-center gap-2 px-6 md:px-12"
      >
        <Link prefetch={false} href="/" className="flex h-8 items-center rounded-sm pr-2">
          <Wordmark size="md" />
        </Link>
        <div className="flex-1" />
        <a href="#how" className={linkClass}>
          How it works
        </a>
        <a href="#trust" className={linkClass}>
          Why trust it
        </a>
        {GITHUB_URL ? (
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={linkClass}>
            GitHub
          </a>
        ) : null}
        <Button asChild variant="outline" className="ml-2 h-9 px-3">
          <Link prefetch={false} href="/try">Try it live</Link>
        </Button>
      </nav>
    </header>
  );
}

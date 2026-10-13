import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

/** Sticky top band: wordmark, two in-page links, the secondary "Try it live" action. */
export function Band() {
  return (
    <header className="band">
      <div className="wrap">
        <Link prefetch={false} href="/" className="logo" aria-label="Verity home">
          <Wordmark size="md" />
        </Link>
        <nav aria-label="Primary">
          <a href="#detail">How it works</a>
          <a href="#trust">Why trust it</a>
        </nav>
        <div className="right">
          <Link prefetch={false} href="/try" className="btn ghost sm">
            Try it live
          </Link>
        </div>
      </div>
    </header>
  );
}

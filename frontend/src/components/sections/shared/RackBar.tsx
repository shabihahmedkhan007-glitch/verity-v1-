import type { ReactNode } from "react";
import Link from "next/link";
import "./rack-bar.css";

export type RackPage = "home" | "studio" | "bench" | "results" | "other";

export type RackBarProps = {
  /** The page this bar sits on, so its link is marked current. */
  current?: RackPage;
  /** Optional run context (title, badges), shown after the links. */
  context?: ReactNode;
  /** Right-hand slot: the page's badge and its one action. */
  actions?: ReactNode;
};

const LINKS: { href: string; label: string; page?: RackPage }[] = [
  { href: "/#loop", label: "How it works" },
  { href: "/#inside", label: "Why trust it" },
  { href: "/studio?run=mac4-real", label: "Studio", page: "studio" },
  { href: "/bench", label: "Live bench", page: "bench" },
];

/** The rack top bar shared by every page (D12): brand, the four page links, a context slot and an actions slot. */
export function RackBar({ current = "other", context, actions }: RackBarProps) {
  return (
    <header className="rkbar">
      <Link prefetch={false} href="/" className="rkbar-brand" aria-label="Verity home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2.75" y="2.75" width="18.5" height="18.5" />
          <path d="M7 12.5l3.5 3.5L17 8.5" />
        </svg>
        VERITY
      </Link>
      <nav aria-label="Primary" className="rkbar-nav">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link prefetch={false} href={l.href} aria-current={l.page === current ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {context ? <div className="rkbar-ctx">{context}</div> : null}
      {actions ? <div className="rkbar-r">{actions}</div> : null}
    </header>
  );
}

/** The dashed stamp from the landing bar: the figures come from one real recorded run. */
export function RackRealBadge({ part, date }: { part: string; date: string }) {
  return (
    <div className="rkbar-badge" role="note">
      <b>REAL RUN · {part}</b>
      <br />
      NEBIUS · {date}
    </div>
  );
}

/** A bar action in the rack button style: "p" is the page's one primary action, "s" a secondary one. */
export function RackBarLink({ href, kind = "s", children }: { href: string; kind?: "p" | "s"; children: ReactNode }) {
  return (
    <Link prefetch={false} href={href} className={`rkbar-btn ${kind}`}>
      {children}
      {kind === "p" ? (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 8h11M9 4l4 4-4 4" />
        </svg>
      ) : null}
    </Link>
  );
}

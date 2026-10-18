import { REAL } from "./real-run";
import Link from "next/link";
import { DEMO_VIDEO_URL, DEVPOST_URL, GITHUB_URL } from "../landing/links";

const PROJECT_LINKS: { label: string; href: string | null }[] = [
  { label: "GitHub", href: GITHUB_URL },
  { label: "Devpost", href: DEVPOST_URL },
  { label: "Demo video", href: DEMO_VIDEO_URL },
];

/** Compact footer: the limits notice, links and credits. Project links render only when their URL is set. */
export function RackFooter() {
  const project = PROJECT_LINKS.filter((l): l is { label: string; href: string } => l.href !== null);
  return (
    <footer className="foot" id="notice">
      <div className="foot-grid">
        <div>
          <div className="lab strong">Important notice</div>
          <ol>
            <li>
              <b>Verity will not design a GPU.</b> It is built for small blocks, up to about 300 lines of Verilog.
            </li>
            <li>
              <b>Numbers are good estimates, not signoff.</b> They come from open-source tools (Yosys, OpenSTA on Nangate45) and are
              always relative to Verity&apos;s own first draft, v1.
            </li>
            <li>
              <b>All figures on this page come from one real recorded run</b> of the 4-lane MAC array on Nebius, {REAL.date}. Power was not measured in it.
            </li>
            <li>
              <b>The proof says the winner matches v1.</b> It does not say v1 matches your intent. The locked tests check that, so read
              them.
            </li>
          </ol>
        </div>
        <nav aria-label="Footer" className="foot-links">
          <Link prefetch={false} href="/studio?run=mac4-real">
            Watch the full run
          </Link>
          <Link prefetch={false} href="/bench">
            Try it live
          </Link>
          {project.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="foot-legal">
        <span>Built for the Nebius x NVIDIA Global AI Hackathon, 2026</span>
        <span>NVIDIA Nemotron on Nebius Token Factory</span>
        <span>Evolution principles credited to REvolution (Min et al., ASP-DAC 2026)</span>
      </div>
    </footer>
  );
}

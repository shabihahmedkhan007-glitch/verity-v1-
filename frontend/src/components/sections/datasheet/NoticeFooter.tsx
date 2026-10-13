import Link from "next/link";
import { DEMO_VIDEO_URL, DEVPOST_URL, GITHUB_URL } from "../landing/links";

const PROJECT_LINKS: { label: string; href: string | null }[] = [
  { label: "GitHub", href: GITHUB_URL },
  { label: "Devpost", href: DEVPOST_URL },
  { label: "Demo video", href: DEMO_VIDEO_URL },
];

/** IMPORTANT NOTICE (the limits), footer links and credits. Project links render only when their URL is set. */
export function NoticeFooter() {
  const project = PROJECT_LINKS.filter((l): l is { label: string; href: string } => l.href !== null);
  return (
    <footer className="notice" id="notice">
      <div className="wrap">
        <div>
          <h2>IMPORTANT NOTICE</h2>
          <ol>
            <li>
              <b>Verity will not design a GPU.</b> It is built for small blocks, up to about 300 lines of Verilog.
            </li>
            <li>
              <b>Numbers are good estimates, not signoff.</b> They come from open-source tools (Yosys, OpenROAD on Nangate45) and are
              always relative to Verity&apos;s own first draft, v1.
            </li>
            <li>
              <b>All numbers on this page are sample data</b> from one recorded run of the 4-lane MAC array.
            </li>
            <li>
              <b>The proof says the winner matches v1.</b> It does not say v1 matches your intent. The locked tests check that, so read
              them.
            </li>
          </ol>
        </div>
        <div className="flinks">
          <div>
            <h3>Page</h3>
            <a href="#detail">How it works</a>
            <a href="#trust">Why trust it</a>
            <Link prefetch={false} href="/try">
              Try it live
            </Link>
          </div>
          <div>
            <h3>Datasheet</h3>
            <Link prefetch={false} href="/studio?run=golden">
              Watch the full run
            </Link>
            <a href="#pins">Read the pinout</a>
            <a href="#ordering">Ordering information</a>
          </div>
          {project.length > 0 ? (
            <div>
              <h3>Project</h3>
              {project.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="legal">
        <div className="wrap">
          <span>Built for the Nebius x NVIDIA Global AI Hackathon, 2026</span>
          <span>Evolution principles credited to REvolution (Min et al., ASP-DAC 2026)</span>
        </div>
      </div>
    </footer>
  );
}

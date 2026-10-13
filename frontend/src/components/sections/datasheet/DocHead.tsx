import Link from "next/link";
import { DocIcon, PinIcon, PlayIcon, WarnIcon } from "./icons";

/** Document header (part number, stamp, revision) and the action strip under it. */
export function DocHead() {
  return (
    <>
      <div className="dochead">
        <div className="wrap">
          <div className="docmeta">
            <span className="stamp">SAMPLE DATA</span>
            <span className="mono">VRT-DS-0001</span>
            <span className="mono">Rev E</span>
            <time className="mono" dateTime="2026-10-13">
              2026-10-13
            </time>
          </div>
          <div className="partno" aria-label="Part number VRT-MAC4">
            VRT-MAC4<small>AI hardware engineer, 4-lane MAC sample</small>
          </div>
        </div>
      </div>

      <nav className="actions" aria-label="On this page">
        <div className="wrap">
          <ul>
            <li>
              <Link prefetch={false} href="/studio?run=golden">
                <PlayIcon />
                Watch the full run
              </Link>
            </li>
            <li>
              <a href="#pins">
                <PinIcon />
                Read the pinout
              </a>
            </li>
            <li>
              <a href="#ordering">
                <DocIcon />
                Ordering information
              </a>
            </li>
            <li>
              <a href="#notice">
                <WarnIcon />
                Important notice
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

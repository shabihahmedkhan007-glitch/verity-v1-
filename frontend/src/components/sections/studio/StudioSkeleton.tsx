"use client";

import { RackBar } from "@/components/sections/shared/RackBar";
import { VignetteGrid } from "@/components/sections/shared/VignetteGrid";
import { Mod } from "./chrome/Mod";
import { STUDIO_ROOT } from "./studio-root";

const STAGES = ["PLAN", "LOCK", "BUILD", "TEST", "EVOLVE", "PROVE"];

/** Static first paint for /studio (the Suspense fallback): the same rack with every LED dark. Reads no store or URL. */
export function StudioSkeleton() {
  return (
    <div className={`${STUDIO_ROOT} studio`} role="status" aria-label="Loading the recorded run.">
      <VignetteGrid />
      <RackBar current="studio" />
      <div className="s-main" aria-hidden>
        <Mod label="Transport" className="transport">
          <div className="tr">
            <div className="runid">
              <span className="m">&nbsp;</span>
              <h1>Loading</h1>
            </div>
          </div>
        </Mod>
        <div className="mid">
          <Mod label="Loop" right={<span className="word">STANDBY</span>}>
            <div className="lm-body">
              <ol className="leds">
                {STAGES.map((s) => (
                  <li key={s} className="col" data-state="wait">
                    <div className="segs">
                      {Array.from({ length: 10 }, (_, j) => (
                        <span key={j} className="seg" />
                      ))}
                    </div>
                    <div className="cn">{s}</div>
                    <div className="cs">
                      <span className="rkq wait" />
                      <span>WAIT</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Mod>
          <Mod label="Monitor">
            <div className="mon">
              <div className="tlb-say">
                <p className="cap">Loading the recorded run.</p>
              </div>
            </div>
          </Mod>
          <Mod label="Versions">
            <div className="t1" />
          </Mod>
        </div>
      </div>
    </div>
  );
}

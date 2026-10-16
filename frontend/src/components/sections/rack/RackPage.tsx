import { RACK_FACES } from "../shared/rack-fonts";
import { Inside } from "./Inside";
import { ModLoop } from "./ModLoop";
import { ModResult } from "./ModResult";
import { ModSpec } from "./ModSpec";
import { RackFooter } from "./RackFooter";
import { RackHead } from "./RackHead";
import { RackNav } from "./RackNav";
import "./rack.css";

/** The landing page, dressed as a rack of instrument modules (the V3 Rack design, amber accent). Scoped under .rk. */
export function RackPage() {
  return (
    <div className={`rk ${RACK_FACES}`} id="top">
      <RackNav />
      <main>
        <section className="first" aria-label="Verity landing">
          <RackHead />
          <div className="rack">
            <ModSpec />
            <ModLoop />
            <ModResult />
          </div>
        </section>
        <Inside />
      </main>
      <RackFooter />
    </div>
  );
}

import { REAL } from "./real-run";
import { RackBar, RackBarLink, RackRealBadge } from "@/components/sections/shared/RackBar";

/** Top bar of the landing: the shared rack bar with the real-run badge and the primary action (the live bench; the recorded run is the hero's second way in). */
export function RackNav() {
  return (
    <RackBar
      current="home"
      actions={
        <>
          <RackRealBadge part={REAL.part} date={REAL.date} />
          <RackBarLink href="/bench" kind="p">
            Build one live
          </RackBarLink>
        </>
      }
    />
  );
}

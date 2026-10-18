import { REAL } from "./real-run";
import { RackBar, RackBarLink, RackRealBadge } from "@/components/sections/shared/RackBar";

/** Top bar of the landing: the shared rack bar with the real-run badge and the primary action. */
export function RackNav() {
  return (
    <RackBar
      current="home"
      actions={
        <>
          <RackRealBadge part={REAL.part} date={REAL.date} />
          <RackBarLink href="/studio?run=mac4-real" kind="p">
            Watch the full run
          </RackBarLink>
        </>
      }
    />
  );
}

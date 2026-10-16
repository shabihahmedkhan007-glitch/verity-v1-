import { RackBar, RackBarLink, RackSampleBadge } from "@/components/sections/shared/RackBar";

/** Top bar of the landing: the shared rack bar with the sample-data badge and the primary action. */
export function RackNav() {
  return (
    <RackBar
      current="home"
      actions={
        <>
          <RackSampleBadge />
          <RackBarLink href="/studio?run=golden" kind="p">
            Watch the full run
          </RackBarLink>
        </>
      }
    />
  );
}

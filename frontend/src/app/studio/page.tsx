import { Suspense } from "react";
import type { Metadata } from "next";
import { StudioSkeleton } from "@/components/sections/studio/StudioSkeleton";
import { StudioView } from "@/components/sections/studio/StudioView";

export const metadata: Metadata = { title: "Studio: 4-lane MAC array, 8-bit" };

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <StudioView />
    </Suspense>
  );
}

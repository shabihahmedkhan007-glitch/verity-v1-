"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunCanvasProps } from "./RunCanvas";

function CanvasSkeleton() {
  return <Skeleton className="h-full w-full rounded-none" aria-label="Loading canvas" />;
}

/** Sections always use this wrapper, never RunCanvas directly (ARCHITECTURE 3). */
const RunCanvasDynamic = dynamic(() => import("./RunCanvas").then((m) => m.RunCanvas), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

export function RunCanvasLazy(props: RunCanvasProps) {
  return <RunCanvasDynamic {...props} />;
}

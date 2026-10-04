"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/sections/shared/AppHeader";

/** Placeholder content for the canvas area while a run loads: the spec card and two versions (UI_UX_SPEC 3.5). */
export function CanvasPlaceholder({ caption }: { caption: string }) {
  return (
    <div className="relative flex h-full flex-col" role="status" aria-label={caption}>
      <div className="grid flex-1 grid-cols-[minmax(0,18rem)_minmax(0,1fr)] gap-10 p-8">
        <div className="space-y-4" aria-hidden>
          <Skeleton className="h-28 w-60" />
          <Skeleton className="h-[4.5rem] w-60" />
          <Skeleton className="h-[4.5rem] w-60" />
        </div>
        <div className="flex flex-col items-center gap-14 pt-4" aria-hidden>
          <Skeleton className="h-[6.5rem] w-48" />
          <div className="flex gap-6">
            <Skeleton className="h-[6.5rem] w-48" />
            <Skeleton className="h-[6.5rem] w-48" />
          </div>
        </div>
      </div>
      <p className="px-6 pb-4 text-base text-fg-muted">{caption}</p>
    </div>
  );
}

/** Static first paint for /studio (the Suspense fallback). Nothing here reads the store or the URL. */
export function StudioSkeleton() {
  return (
    <div className="grid h-dvh grid-cols-1 grid-rows-[var(--topbar-h)_var(--rail-h)_minmax(0,1fr)_var(--bottombar-h)] overflow-hidden xl:grid-cols-[minmax(0,1fr)_var(--inspector-w)]">
      <div className="col-span-full">
        <AppHeader />
      </div>
      <div className="col-span-full flex items-center gap-3 overflow-hidden border-b px-4" aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2.5 rounded-[2px] bg-border-strong" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="min-h-0 min-w-0 bg-background">
        <CanvasPlaceholder caption="Loading the recorded run." />
      </div>
      <div className="hidden min-h-0 space-y-4 border-l bg-surface p-4 xl:block" aria-hidden>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="col-span-full border-t bg-surface" aria-hidden />
    </div>
  );
}

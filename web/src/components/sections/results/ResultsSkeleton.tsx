"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/sections/shared/AppHeader";

/** Static first paint for /results and the loading state of the view. */
export function ResultsSkeleton() {
  return (
    <div className="flex min-h-svh flex-col" role="status" aria-label="Loading results">
      <AppHeader />
      <main className="mx-auto w-full max-w-[80rem] px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Results</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]" aria-hidden>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}

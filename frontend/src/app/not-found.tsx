import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/sections/shared/AppHeader";
import { EmptyState } from "@/components/domain/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <EmptyState
          title="This page does not exist."
          body="The recorded run is a good place to start."
          action={
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button asChild className="h-10 px-4">
                <Link prefetch={false} href="/studio?run=golden">Watch the recorded run</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link prefetch={false} href="/">Go to the home page</Link>
              </Button>
            </div>
          }
        />
      </main>
    </div>
  );
}

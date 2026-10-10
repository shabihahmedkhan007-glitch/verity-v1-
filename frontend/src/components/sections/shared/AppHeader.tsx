"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

export type AppHeaderProps = { context?: ReactNode; actions?: ReactNode };

/** 56px bar shared by Studio, Try, Results and the 404: wordmark, a context slot and an actions slot. */
export function AppHeader({ context, actions }: AppHeaderProps) {
  return (
    <header className="flex h-[var(--topbar-h)] shrink-0 items-center gap-3 border-b bg-background px-4 md:px-6">
      <Link prefetch={false}
        href="/"
        className="flex h-8 shrink-0 items-center rounded-sm px-1 outline-offset-4"
      >
        <Wordmark size="sm" />
      </Link>
      {context ? (
        <>
          <span aria-hidden className="text-fg-subtle">/</span>
          <div className="flex min-w-0 flex-1 items-center gap-3">{context}</div>
        </>
      ) : (
        <div className="flex-1" />
      )}
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import { isAccountsConfigured } from "@/lib/env";
import { currentAccount, onAccountChange } from "@/lib/sources/live";

/** `unknown` until the browser's saved session has been read (and refreshed). A build without accounts is `signed_out` from the start. */
export type Account = { status: "unknown" | "signed_in" | "signed_out"; email: string | null };

const OUT: Account = { status: "signed_out", email: null };
const UNKNOWN: Account = { status: "unknown", email: null };

/**
 * Who is signed in with an account (Supabase). The Supabase client loads on the first call, never on the replay path,
 * and is not touched at all when the site is built without accounts.
 */
export function useAccount(): Account {
  const [email, setEmail] = useState<string | null | undefined>(isAccountsConfigured ? undefined : null);

  useEffect(() => {
    if (!isAccountsConfigured) return;
    let live = true;
    void currentAccount().then((e) => {
      if (live) setEmail(e);
    });
    const off = onAccountChange((e) => {
      if (live) setEmail(e);
    });
    return () => {
      live = false;
      off();
    };
  }, []);

  if (email === undefined) return UNKNOWN;
  return email === null ? OUT : { status: "signed_in", email };
}

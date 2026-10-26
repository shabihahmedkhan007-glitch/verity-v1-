"use client";

import { useState, type RefObject } from "react";
import Link from "next/link";
import { CirclePlay, House, PanelLeftClose, Plus, UserPlus, X } from "lucide-react";
import type { LiveHealth } from "@/lib/contracts/view-types";
import { useAccount } from "@/lib/hooks/use-account";
import { useAccountLists } from "@/lib/hooks/use-account-lists";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { clearRecentRuns, type RecentRun, type RunEnd } from "@/lib/hooks/use-recent-runs";
import { setSidebarShut } from "@/lib/hooks/use-sidebar";
import { clearThreads } from "@/lib/hooks/use-threads";
import { signOut } from "@/lib/sources/live";
import { Logo } from "../shared/Logo";
import { AdminUserModal } from "./AdminUserModal";
import { healthLine } from "./chat";

/** How a run ended, as one plain word beside its time. */
const END_WORD: Record<RunEnd, string> = { done: "Done", stopped: "Stopped", failed: "Failed" };

/** How a run the server lists ended (or that it is going), as one plain word. A status this bench does not know has no word. */
const SERVER_END_WORD: Record<string, string> = {
  done: "Done",
  stopped: "Stopped",
  cap_reached: "Spend limit",
  error: "Failed",
  timed_out: "Failed",
  queued: "Queued",
  running: "Running",
};

function startedAt(ms: number): string {
  const d = new Date(ms);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** An ISO time from the server as the same short label, or nothing when it does not read. */
function isoLabel(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? startedAt(ms) : "";
}

/**
 * The bench's left side in place of the marketing bar: New chip, Home (the workspace page), Watch a run, the runs started
 * in this browser, and whether live runs are open. Its close button folds it away from 900px (the top bar brings it back)
 * and closes the drawer below that. Signed in with an account, the server's lists replace the browser's: "Chats" from
 * GET /threads and "Your runs" from GET /runs/mine, so they follow the account to another device; the foot then shows the
 * account and Sign out.
 */
export function Sidebar({
  runs,
  currentRun,
  currentThread = null,
  health,
  home = false,
  open,
  firstRef,
  onNewChip,
  onNavigate,
}: {
  runs: RecentRun[];
  currentRun: string | null;
  /** The chat in view (the bench only), marked in the Chats list. */
  currentThread?: string | null;
  health: LiveHealth;
  /** The workspace page is the one in view, so Home is the current page. */
  home?: boolean;
  /** The drawer is open (narrow screens only). */
  open: boolean;
  firstRef: RefObject<HTMLButtonElement | null>;
  onNewChip(): void;
  /** Closes the drawer: a link was followed, or its close button pressed. */
  onNavigate(): void;
}) {
  const wide = useMediaQuery("(min-width: 900px)");
  const account = useAccount();
  const signedIn = account.status === "signed_in";
  const lists = useAccountLists(signedIn);
  const [showAdminModal, setShowAdminModal] = useState(false);
  // The chats and runs kept in this browser are the account's cache: they go with the sign-out, so the next person here does not find them.
  const leave = async () => {
    await signOut();
    clearThreads();
    clearRecentRuns();
    onNewChip(); // the account's open chat leaves the screen too (a code session in this tab starts a fresh thread)
  };
  return (
    <nav className="b-side" id="bench-side" aria-label="Workspace" data-open={open ? "" : undefined}>
      <div className="b-side-top">
        <Link prefetch={false} href="/" className="b-brand" aria-label="Verity home" onClick={onNavigate}>
          <Logo />
        </Link>
        <button
          type="button"
          className="b-ib"
          aria-label="Close the sidebar"
          onClick={() => {
            if (!wide) return onNavigate();
            setSidebarShut(true);
            requestAnimationFrame(() => document.getElementById("bench-menu")?.focus());
          }}
        >
          <X aria-hidden className="b-ico-n" />
          <PanelLeftClose aria-hidden className="b-ico-w" />
        </button>
      </div>
      <ul className="b-nav">
        <li>
          <button type="button" ref={firstRef} onClick={onNewChip}>
            <Plus aria-hidden />
            New chip
          </button>
        </li>
        <li>
          <Link prefetch={false} href="/workspace" aria-current={home ? "page" : undefined} onClick={onNavigate}>
            <House aria-hidden />
            Home
          </Link>
        </li>
        <li>
          <Link prefetch={false} href="/studio?run=mac4-real" onClick={onNavigate}>
            <CirclePlay aria-hidden />
            Watch a run
          </Link>
        </li>
      </ul>
      {signedIn ? (
        <>
          <h2 className="b-side-h">Chats</h2>
          {lists.threads.length > 0 ? (
            <ul className="b-runs">
              {lists.threads.map((t) => (
                <li key={t.id}>
                  <Link
                    prefetch={false}
                    href={`/bench?thread=${encodeURIComponent(t.id)}`}
                    aria-current={t.id === currentThread ? "page" : undefined}
                    title={t.title}
                    onClick={onNavigate}
                  >
                    <span className="b-runs-t">{t.title || "Untitled chat"}</span>
                    <span className="b-runs-d">{isoLabel(t.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="b-side-empty">{lists.threadsFailed ? "Your chats could not be loaded right now." : "Your chats appear here, on any device you sign in on."}</p>
          )}
        </>
      ) : null}
      <h2 className="b-side-h">Your runs</h2>
      {signedIn ? (
        lists.runs.length > 0 ? (
          <ul className="b-runs">
            {lists.runs.map((r) => (
              <li key={r.id}>
                <Link
                  prefetch={false}
                  href={`/bench?run=${encodeURIComponent(r.id)}`}
                  aria-current={r.id === currentRun ? "page" : undefined}
                  title={r.title}
                  onClick={onNavigate}
                >
                  <span className="b-runs-t">{r.title || "Untitled run"}</span>
                  <span className="b-runs-d">{[SERVER_END_WORD[r.status ?? ""], isoLabel(r.createdAt)].filter(Boolean).join(", ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="b-side-empty">{lists.runsFailed ? "Your runs could not be loaded right now." : "Runs you start appear here, on any device you sign in on."}</p>
        )
      ) : runs.length > 0 ? (
        <ul className="b-runs">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                prefetch={false}
                href={`/bench?run=${encodeURIComponent(r.id)}`}
                aria-current={r.id === currentRun ? "page" : undefined}
                title={r.title}
                onClick={onNavigate}
              >
                <span className="b-runs-t">{r.title}</span>
                <span className="b-runs-d">
                  {r.ended ? `${END_WORD[r.ended]}, ` : ""}
                  {startedAt(r.startedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="b-side-empty">Runs you start in this browser appear here.</p>
      )}
      <div className="b-health">
        <p role="status">{healthLine(health)}</p>
        {signedIn ? (
          <div className="b-acct" style={{ flexDirection: "column", alignItems: "stretch", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <p title={account.email ?? undefined} style={{ minWidth: 0, flex: 1 }}>{account.email}</p>
              {account.credits !== null ? (
                <span
                  title={`${account.credits} runs left`}
                  style={{
                    fontFamily: "var(--font-data)",
                    fontSize: "11px",
                    color: "var(--rk-a)",
                    background: "var(--rk-panel-2)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    border: "1px solid var(--rk-rule)",
                    whiteSpace: "nowrap",
                    flex: "none",
                  }}
                >
                  {account.credits} {account.credits === 1 ? "credit" : "credits"}
                </span>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              {account.isAdmin ? (
                <button
                  type="button"
                  className="b-link"
                  onClick={() => setShowAdminModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--rk-a)" }}
                >
                  <UserPlus style={{ width: "12px", height: "12px" }} />
                  Add user
                </button>
              ) : <span />}
              <button type="button" className="b-link" onClick={() => void leave()}>
                Sign out
              </button>
            </div>
            <AdminUserModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} />
          </div>
        ) : null}
      </div>
    </nav>
  );
}

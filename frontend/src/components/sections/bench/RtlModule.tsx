"use client";

import type { Candidate } from "@/lib/contracts/types";
import { CodeView } from "@/components/domain/CodeView";
import { Mod } from "../studio/chrome/Mod";
import { Sq } from "../studio/loop/LoopModule";

const RUNNING = new Set<Candidate["status"]>(["drafting", "linting", "simulating", "fixing", "synthesizing"]);

function stateOf(c: Candidate): { kind: "pass" | "fail" | "run" | "wait"; word: string } {
  if (c.status === "fail") return { kind: "fail", word: "Fail" };
  if (c.status === "rejected") return { kind: "fail", word: "Rejected" };
  if (RUNNING.has(c.status)) return { kind: "run", word: c.status };
  if (c.status === "pass" || c.status === "measured") return { kind: "pass", word: c.status === "pass" ? "Pass" : "Measured" };
  return { kind: "wait", word: c.status };
}

/** LIVE RTL: the Verilog of the version the run is on (or the one you pinned), as the agent writes it. */
export function RtlModule({ candidate, pinned }: { candidate: Candidate | null; pinned: boolean }) {
  const st = candidate ? stateOf(candidate) : null;
  const attempt = candidate?.attempts.length ?? 0;
  return (
    <Mod
      label="Live RTL"
      className="b-rtl"
      right={
        candidate && st ? (
          <span className="st word">
            <Sq kind={st.kind} />
            {candidate.label} · {pinned ? "pinned" : "following"} · {st.word}
          </span>
        ) : null
      }
    >
      <div className="b-rtl-body" tabIndex={0} aria-label="Verilog of the current version, scrollable">
        {candidate?.rtl ? (
          <>
            <p className="b-rtl-why">
              <b>{candidate.label}</b>
              {attempt > 1 ? `, attempt ${attempt} (fixed by the agent)` : null}: {candidate.reason}
            </p>
            <CodeView code={candidate.rtl} language="verilog" filename={`${candidate.label}.v`} />
          </>
        ) : (
          <p className="b-empty">
            {candidate ? `${candidate.label} is being drafted. Its Verilog appears here as soon as the agent writes it.` : "The Verilog of each version appears here as the agent writes it."}
          </p>
        )}
      </div>
    </Mod>
  );
}

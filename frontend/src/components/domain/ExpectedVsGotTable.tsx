import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Verification } from "@/lib/contracts/types";
import { Callout } from "./Callout";
import { StatusBadge } from "./StatusBadge";

export type ExpectedVsGotTableProps = { verification: Verification; attemptLabel?: string };

/** Renders text with the characters that differ from `other` in bold (extra characters count as different). */
function Mismatch({ text, other, className }: { text: string; other: string; className?: string }) {
  return (
    <span className={cn("font-mono", className)}>
      {Array.from(text).map((ch, i) => (
        <span key={i} className={ch !== other[i] ? "font-bold underline decoration-1 underline-offset-2" : undefined}>
          {ch}
        </span>
      ))}
    </span>
  );
}

const CELL = "px-1.5 py-1.5 align-top text-xs whitespace-normal [overflow-wrap:anywhere]";
const NOWRAP = "px-1.5 py-1.5 align-top text-xs whitespace-nowrap";

/** One simulation attempt: summary, failing cases (expected vs got), the agent's diagnosis and the lint result. */
export function ExpectedVsGotTable({ verification, attemptLabel }: ExpectedVsGotTableProps) {
  const { lint, lintLog, passed, total, failures, diagnosis } = verification;
  const lintFailed = lint === "fail";
  const allPassed = !lintFailed && failures.length === 0 && passed === total;
  const heading = lintFailed
    ? `${attemptLabel ?? "Attempt"}: lint failed`
    : `${attemptLabel ?? "Result"}: ${passed} of ${total} passed`;

  return (
    <section className="flex flex-col gap-3" aria-label={attemptLabel ?? "Test result"}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">{heading}</h3>
        {lintFailed ? (
          <StatusBadge status="fail" size="sm" />
        ) : (
          <StatusBadge status={allPassed ? "pass" : "fail"} size="sm" tests={{ passed, total }} />
        )}
      </div>

      {lintFailed ? (
        <Callout
          tone="fail"
          title="Lint failed. Simulation did not run."
          body={lintLog ? <span className="font-mono text-xs break-words">{lintLog}</span> : undefined}
        />
      ) : allPassed ? (
        <p className="text-sm text-fg-muted">{`All ${total} tests passed.`}</p>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 px-1.5 text-xs text-fg-muted">Test</TableHead>
                <TableHead className="h-8 px-1.5 text-xs text-fg-muted">Inputs</TableHead>
                <TableHead className="h-8 px-1.5 text-xs text-fg-muted">Expected</TableHead>
                <TableHead className="h-8 px-1.5 text-xs text-fg-muted">Got</TableHead>
                <TableHead className="h-8 px-1.5 text-right text-xs text-fg-muted">Cycle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.map((c) => (
                <TableRow key={c.name} className="hover:bg-transparent">
                  <TableCell className={cn(CELL, "font-mono text-foreground")}>{c.name}</TableCell>
                  <TableCell className={cn(CELL, "font-mono text-fg-muted")}>{c.inputs}</TableCell>
                  <TableCell className={NOWRAP}>
                    <Mismatch text={c.expected} other={c.got} className="text-foreground" />
                  </TableCell>
                  <TableCell className={NOWRAP}>
                    <Mismatch text={c.got} other={c.expected} className="text-fail" />
                  </TableCell>
                  <TableCell className={cn(NOWRAP, "text-right font-mono text-fg-muted")}>{c.cycle ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {diagnosis ? (
        <p className="text-sm text-fg-muted">
          <span className="font-medium text-foreground">Agent&apos;s diagnosis:</span> {diagnosis}
        </p>
      ) : null}
      <p className="text-xs text-fg-subtle">{`Lint: ${lint} (Verilator)`}</p>
    </section>
  );
}

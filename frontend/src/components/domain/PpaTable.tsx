import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CandidateStatus, PPA } from "@/lib/contracts/types";
import { formatArea, formatMhz, formatMw, formatNs } from "@/lib/format";
import { MetricDelta, type MetricDeltaProps } from "./MetricDelta";
import { SampleDataBadge } from "./SampleDataBadge";

export type PpaTableProps = {
  ppa: PPA | null;
  baseline: PPA | null;
  status: CandidateStatus;
  isBaseline: boolean;
  sample: boolean;
};

type Row = { label: string; metric: MetricDeltaProps["metric"]; value: number | null; base: number | null; text: string | null };

function fmax(period: number | null): number | null {
  return period && period > 0 ? 1000 / period : null;
}

function buildRows(ppa: PPA | null, baseline: PPA | null): Row[] {
  const p = ppa;
  const b = baseline;
  const fm = fmax(p?.clockPeriodNs ?? null);
  const bfm = fmax(b?.clockPeriodNs ?? null);
  return [
    { label: "Area", metric: "area", value: p?.areaUm2 ?? null, base: b?.areaUm2 ?? null, text: p?.areaUm2 != null ? formatArea(p.areaUm2) : null },
    { label: "Cells", metric: "cells", value: p?.cellCount ?? null, base: b?.cellCount ?? null, text: p?.cellCount != null ? p.cellCount.toLocaleString("en-US") : null },
    { label: "Clock period", metric: "clockPeriod", value: p?.clockPeriodNs ?? null, base: b?.clockPeriodNs ?? null, text: p?.clockPeriodNs != null ? formatNs(p.clockPeriodNs) : null },
    { label: "Fmax", metric: "fmax", value: fm, base: bfm, text: fm !== null ? formatMhz(fm) : null },
    { label: "Power", metric: "power", value: p?.powerMw ?? null, base: b?.powerMw ?? null, text: p?.powerMw != null ? formatMw(p.powerMw) : null },
  ];
}

function emptyMessage(status: CandidateStatus): string {
  if (status === "fail" || status === "fixing" || status === "rejected") {
    return "Not measured. Versions that fail the locked tests are never synthesized.";
  }
  return "Not measured yet. Synthesis runs after a version passes the locked tests.";
}

/** Area, cells, clock period, Fmax and power for one version, each with its change against v1. */
export function PpaTable({ ppa, baseline, status, isBaseline, sample }: PpaTableProps) {
  if (!ppa) {
    return <p className="rounded-lg border border-border bg-surface p-3 text-sm text-fg-muted">{emptyMessage(status)}</p>;
  }
  const rows = buildRows(ppa, baseline);
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs text-fg-muted">Metric</TableHead>
              <TableHead className="text-right text-xs text-fg-muted">Value</TableHead>
              <TableHead className="text-right text-xs text-fg-muted">Versus v1</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className="hover:bg-transparent">
                <TableCell className="text-fg-muted">{row.label}</TableCell>
                <TableCell className="text-right font-mono text-foreground">
                  {row.text ?? <span className="font-sans text-fg-subtle">not measured</span>}
                </TableCell>
                <TableCell className="text-right">
                  {isBaseline ? (
                    <span className="text-fg-muted">baseline</span>
                  ) : baseline === null ? (
                    <span className="text-fg-subtle">no baseline yet</span>
                  ) : (
                    <MetricDelta metric={row.metric} value={row.value} baseline={row.base} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sample ? (
        <div>
          <SampleDataBadge />
        </div>
      ) : null}
    </div>
  );
}

import { User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Port, Priority, Spec } from "@/lib/contracts/types";

export type SpecCardProps = { spec: Spec; variant: "node" | "full" };

const GOAL: Record<Priority, string> = { area: "Smallest area", speed: "Fastest clock", power: "Lowest power" };

function portText(p: Port): string {
  return `${p.name}[${p.width - 1}:0]${p.count && p.count > 1 ? ` x${p.count}` : ""}`;
}

/** "a[7:0] x4, b[7:0] x4 -> acc[21:0]": data ports only, single-bit control ports left out. */
function portsSummary(ports: Port[]): [string, string] {
  const data = ports.filter((p) => p.width > 1 || (p.count ?? 1) > 1);
  const use = data.length > 0 ? data : ports;
  const ins = use.filter((p) => p.dir === "in").map(portText).join(", ");
  const outs = use.filter((p) => p.dir === "out").map(portText).join(", ");
  return ins && outs ? [ins, `-> ${outs}`] : [ins || outs, ""];
}

/** The spec the run starts from. Node variant is 240x112; full variant is the inspector body. */
export function SpecCard({ spec, variant }: SpecCardProps) {
  const ports = portsSummary(spec.ports);
  if (variant === "node") {
    return (
      <div className="box-border flex h-[112px] w-[240px] flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface p-2.5">
        <div className="flex h-5 items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">Spec</span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-fg-muted">
            <User aria-hidden className="size-3" />
            Human input
          </span>
        </div>
        <p className="truncate text-sm text-foreground">{spec.title}</p>
        <p className="line-clamp-2 font-mono text-xs leading-4 text-fg-muted">
          {ports[0]} <span className="whitespace-nowrap">{ports[1]}</span>
        </p>
        <p className="text-xs text-fg-muted">{GOAL[spec.priority]}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-border bg-surface p-4")}>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold text-foreground">{spec.title}</h3>
        <p className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <User aria-hidden className="size-3" />
          Human input 1: the spec
        </p>
      </div>
      <p className="max-w-[65ch] text-base text-fg-muted">{spec.text}</p>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 text-xs text-fg-muted">Port</TableHead>
              <TableHead className="h-8 text-xs text-fg-muted">Direction</TableHead>
              <TableHead className="h-8 text-right text-xs text-fg-muted">Width</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {spec.ports.map((p) => (
              <TableRow key={p.name} className="hover:bg-transparent">
                <TableCell className="py-1.5 font-mono text-xs text-foreground">
                  {p.name}
                  {p.count && p.count > 1 ? ` x${p.count}` : ""}
                </TableCell>
                <TableCell className="py-1.5 text-xs text-fg-muted">{p.dir === "in" ? "Input" : "Output"}</TableCell>
                <TableCell className="py-1.5 text-right font-mono text-xs text-fg-muted">{p.width}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-fg-muted">Goal</dt>
        <dd className="text-foreground">{GOAL[spec.priority]}</dd>
        <dt className="text-fg-muted">Tests</dt>
        <dd className="font-mono text-foreground">{spec.testCount}</dd>
        <dt className="text-fg-muted">Size limit</dt>
        <dd className="text-foreground">{`About ${spec.maxLines} lines`}</dd>
      </dl>
    </div>
  );
}

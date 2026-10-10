import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StageId, StageStatus } from "@/lib/contracts/types";
import type { StageView } from "@/lib/contracts/view-types";
import { StatusSquare } from "./StatusSquare";
import { statusMeta } from "./status-meta";

export type StageRailProps = {
  stages: StageView[];
  onSelect?: (id: StageId) => void;
  orientation?: "horizontal" | "vertical";
  density?: "full" | "compact";
};

const LABEL_TONE: Record<StageStatus, string> = {
  pending: "text-fg-subtle",
  active: "font-medium text-foreground",
  done: "text-fg-muted",
  failed: "font-medium text-fail",
  skipped: "text-fg-subtle line-through",
};

function StageContent({
  stage,
  compact,
  showHint,
  collapsePending,
}: {
  stage: StageView;
  compact: boolean;
  showHint: boolean;
  collapsePending: boolean;
}) {
  const meta = statusMeta(stage.status);
  const quiet = stage.status === "pending" || stage.status === "skipped";
  return (
    <>
      <StatusSquare status={meta.visual} size={compact ? "sm" : "md"} />
      <span className={cn("flex min-w-0 flex-col text-left")}>
        <span className="flex items-baseline gap-1.5">
          <span className={cn(compact ? "text-xs" : "text-sm", LABEL_TONE[stage.status], collapsePending && quiet && "max-xl:sr-only")}>
            {stage.label}
          </span>
          {stage.detail && !compact ? <span className="font-mono text-xs text-fg-muted">{stage.detail}</span> : null}
          <span className="sr-only">{meta.word}</span>
        </span>
        {showHint ? <span className="text-xs text-fg-muted">{stage.hint}</span> : null}
      </span>
    </>
  );
}

/** The pipeline status rail: Spec, Plan, Lock, RTL, Lint, Sim, Fix, Synth, Evolve, Prove. */
export function StageRail({ stages, onSelect, orientation = "horizontal", density = "full" }: StageRailProps) {
  const compact = density === "compact";
  const vertical = orientation === "vertical";

  function wrap(stage: StageView, content: ReactNode): ReactNode {
    const base = cn(
      "flex items-center gap-2 rounded-md",
      vertical ? "w-full min-h-9 px-2 py-1.5" : compact ? "h-7 px-1.5" : "h-9 px-2.5",
      stage.status === "active" && "bg-surface-2",
    );
    if (!onSelect) return <div className={base}>{content}</div>;
    const button = (
      <button
        type="button"
        onClick={() => onSelect(stage.id)}
        aria-current={stage.status === "active" ? "step" : undefined}
        className={cn(base, "cursor-pointer hover:bg-surface-2")}
      >
        {content}
      </button>
    );
    if (vertical || compact) return button;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{stage.hint}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <ol
      aria-label="Pipeline stages"
      className={cn(
        vertical ? "flex flex-col" : "flex items-center gap-0.5 overflow-x-auto",
      )}
    >
      {stages.map((stage, i) => (
        <li
          key={stage.id}
          className={cn("relative flex items-center", vertical ? "flex-col items-stretch" : "shrink-0 gap-0.5")}
        >
          {!vertical && i > 0 ? <span aria-hidden className="h-px w-2 bg-border" /> : null}
          {vertical && i > 0 ? <span aria-hidden className="ml-[1.0625rem] h-2 w-px bg-border" /> : null}
          {wrap(
            stage,
            <StageContent stage={stage} compact={compact} showHint={vertical} collapsePending={!vertical && !compact} />,
          )}
        </li>
      ))}
    </ol>
  );
}

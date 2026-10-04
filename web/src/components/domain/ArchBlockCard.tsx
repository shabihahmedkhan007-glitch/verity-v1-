import { Hand, Pin, SlidersHorizontal, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PlanBlock } from "@/lib/contracts/types";
import { StatusSquare } from "./StatusSquare";

export type ArchBlockCardProps = {
  block: PlanBlock;
  status: "drafting" | "drafted" | "replanning" | "approved" | "built";
  diff?: "new" | "changed";
  movedByUser?: boolean;
  readOnly?: boolean;
  onSteer?: () => void;
};

/** One plan block (240x72 on the canvas). Changed and new blocks get a green outline that fades over 4 s. */
export function ArchBlockCard({ block, status, diff, movedByUser, readOnly, onSteer }: ArchBlockCardProps) {
  // Show only the choices that differ from the default (first) option, e.g. "2-stage".
  const variantText = block.variants.filter((v) => v.value !== v.options[0]).map((v) => v.value).join(", ");
  return (
    <div
      className={cn(
        "group relative box-border flex h-[72px] w-[240px] flex-col justify-between overflow-hidden rounded-lg border border-border bg-surface p-2 transition-colors duration-200",
        diff && "overflow-visible outline-2 outline-offset-2 outline-solid animate-diff-outline",
      )}
    >
      <div className="flex h-5 items-center gap-1.5">
        {status === "built" ? (
          <StatusSquare status="pass" size="sm" label="Built" />
        ) : null}
        <span className="truncate text-sm font-medium text-foreground">{block.name}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {movedByUser ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex size-6 items-center justify-center rounded-md text-fg-muted">
                  <Hand aria-hidden className="size-3.5" />
                  <span className="sr-only">Moved by you</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Moved by you. The agent will not move it again.</TooltipContent>
            </Tooltip>
          ) : null}
          {onSteer ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onSteer}
              aria-label={`${readOnly ? "View" : "Steer"} ${block.name}`}
              className="-my-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <SlidersHorizontal aria-hidden />
            </Button>
          ) : null}
        </span>
      </div>

      {status === "drafting" ? (
        <div className="flex flex-col gap-1" aria-hidden>
          <Skeleton className="h-1.5 w-full rounded-[2px]" />
          <Skeleton className="h-1.5 w-1/2 rounded-[2px]" />
        </div>
      ) : (
        <p className="truncate text-xs text-fg-muted">{block.reason}</p>
      )}

      <div className="flex h-4 items-center gap-2 text-xs leading-4 text-fg-muted">
        {diff ? (
          <span className="rounded-sm bg-pass-muted px-1.5 font-medium text-pass">
            {diff === "new" ? "New" : "Changed"}
          </span>
        ) : null}
        {status === "replanning" ? (
          <span className="inline-flex items-center gap-1.5 text-info">
            <StatusSquare status="running" size="sm" />
            Replanning
          </span>
        ) : null}
        {status === "drafting" ? (
          <span className="inline-flex items-center gap-1.5 text-info">
            <StatusSquare status="running" size="sm" />
            Drafting
          </span>
        ) : null}
        {status === "approved" ? <span>Approved</span> : null}
        <span className="inline-flex items-center gap-0.5">
          <Pin aria-hidden className="size-3" />
          {block.pins.length}
          <span className="sr-only">{block.pins.length === 1 ? "pin" : "pins"}</span>
        </span>
        {variantText ? (
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <ToggleLeft aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{variantText}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

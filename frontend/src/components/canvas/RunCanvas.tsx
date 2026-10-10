"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type AriaLabelConfig,
  type FitViewOptions,
} from "@xyflow/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useCanvas, useVerityStore } from "@/lib/store";
import { ZONE_IDS } from "@/lib/canvas/zones";
import { edgeTypes, nodeTypes } from "./node-types";

export type RunCanvasProps = {
  variant: "studio" | "theater";
  interactive: boolean;
  overlay?: ReactNode;
  /** Shown top-right, over the (empty) tree zone, for short-lived notices such as the plan countdown. */
  topOverlay?: ReactNode;
  /** Theater only: called when the canvas is clicked. */
  onOpen?: () => void;
};

/** After the user zooms or pans, automatic re-fitting waits this long (UI_UX_SPEC 11.6). */
const USER_VIEW_GRACE_MS = 10_000;
const FIT_DURATION_MS = 320;
/** Space kept free under the world for the bottom overlay (caption), so it never covers a card. */
const OVERLAY_RESERVE_PX = 84;

const ARIA_LABELS: Partial<AriaLabelConfig> = {
  "node.a11yDescription.default": "Press Enter to open this item in the inspector.",
  "node.a11yDescription.keyboardDisabled": "Keyboard moves are off for this item.",
  "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) =>
    `Moved ${direction}. Position ${Math.round(x)}, ${Math.round(y)}.`,
  "edge.a11yDescription.default": "A connection between two items.",
  "controls.ariaLabel": "Canvas controls",
  "controls.zoomIn.ariaLabel": "Zoom in",
  "controls.zoomOut.ariaLabel": "Zoom out",
  "controls.fitView.ariaLabel": "Fit the whole run in view",
  "controls.interactive.ariaLabel": "Lock or unlock the canvas",
  "handle.ariaLabel": "Connection point",
};

function Canvas({ variant, interactive, overlay, topOverlay }: Omit<RunCanvasProps, "onOpen">) {
  const { nodes: storeNodes, edges, onNodesChange, onEdgesChange, onNodeDragStop, onNodeClick } = useCanvas();
  const reduced = useReducedMotion();
  const instant = useVerityStore((s) => s.instant);
  const rf = useReactFlow();
  const lastUserView = useRef(0);
  const readOnly = variant === "theater" || !interactive;
  // Per-node flags beat the ReactFlow props, so a read-only canvas must switch them off on the nodes themselves.
  const nodes = useMemo(
    () => (readOnly ? storeNodes.map((n) => ({ ...n, draggable: false, selectable: false, focusable: false })) : storeNodes),
    [readOnly, storeNodes],
  );

  // The world only grows when a zone frame grows; fit again then (unless the user is looking around).
  const worldKey = useMemo(() => {
    const plan = nodes.find((n) => n.id === ZONE_IDS.plan);
    const tree = nodes.find((n) => n.id === ZONE_IDS.tree);
    return `${plan?.height ?? 0}:${tree?.width ?? 0}:${tree?.height ?? 0}`;
  }, [nodes]);

  // The pane can settle after the first fit (font load, entrance motion, the hero frame bleeding past the
  // viewport), so a size change counts as a world change for re-fitting.
  const paneW = useStore((s) => s.width);
  const paneH = useStore((s) => s.height);

  const hasOverlay = Boolean(overlay);
  const fitOptions: FitViewOptions = useMemo(
    () => ({
      padding: hasOverlay
        ? { top: "16px", left: "16px", right: "16px", bottom: `${OVERLAY_RESERVE_PX}px` }
        : 0.06,
      maxZoom: 1,
      duration: reduced ? 0 : FIT_DURATION_MS,
    }),
    [reduced, hasOverlay],
  );

  const firstFit = useRef(true);
  useEffect(() => {
    if (firstFit.current) {
      firstFit.current = false;
      return;
    }
    if (Date.now() - lastUserView.current < USER_VIEW_GRACE_MS) return;
    const raf = requestAnimationFrame(() => {
      rf.fitView({ ...fitOptions, duration: instant ? 0 : fitOptions.duration });
    });
    return () => cancelAnimationFrame(raf);
    // instant is read at the time the world changes; it must not trigger a fit by itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldKey, paneW, paneH, rf, fitOptions]);

  return (
    <ReactFlow
      className="verity-flow"
      colorMode="dark"
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={readOnly ? undefined : onNodeClick}
      onMoveStart={(event) => {
        // `event` is null when the move comes from fitView, not from the user.
        if (event) lastUserView.current = Date.now();
      }}
      nodesFocusable={!readOnly}
      edgesFocusable={false}
      deleteKeyCode={null}
      nodesConnectable={false}
      nodesDraggable={!readOnly}
      elementsSelectable={!readOnly}
      panOnDrag={!readOnly}
      zoomOnScroll={!readOnly}
      zoomOnPinch={!readOnly}
      zoomOnDoubleClick={!readOnly}
      panOnScroll={false}
      preventScrolling={!readOnly}
      fitView
      fitViewOptions={fitOptions}
      minZoom={0.2}
      maxZoom={1.5}
      ariaLabelConfig={ARIA_LABELS}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      {variant === "studio" ? <Controls showInteractive={false} position="bottom-right" fitViewOptions={fitOptions} /> : null}
      {topOverlay ? (
        <Panel position="top-right" className="!m-3">
          {topOverlay}
        </Panel>
      ) : null}
      {overlay ? (
        <Panel position="bottom-left" className="!m-3 max-w-[calc(100%-6rem)]">
          {overlay}
        </Panel>
      ) : null}
    </ReactFlow>
  );
}

/**
 * The React Flow wrapper. Sections use RunCanvasLazy, never this file directly (it is browser-only).
 * "theater" is the read-only hero variant: no pan, zoom, drag or selection; a click calls onOpen.
 */
export function RunCanvas({ variant, interactive, overlay, topOverlay, onOpen }: RunCanvasProps) {
  const body = (
    <div
      className={cn(
        "h-full w-full",
        variant === "theater" && onOpen && "cursor-pointer outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 hover:outline-border-strong",
      )}
      onClick={variant === "theater" && onOpen ? onOpen : undefined}
    >
      <ReactFlowProvider>
        <Canvas variant={variant} interactive={interactive} overlay={overlay} topOverlay={topOverlay} />
      </ReactFlowProvider>
    </div>
  );
  if (variant === "theater" && onOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{body}</TooltipTrigger>
        <TooltipContent>Open in Studio</TooltipContent>
      </Tooltip>
    );
  }
  return body;
}

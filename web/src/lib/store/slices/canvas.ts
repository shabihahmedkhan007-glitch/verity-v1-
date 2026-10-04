import { applyNodeChanges, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";
import type { StateCreator } from "zustand";
import type { VerityEdge, VerityNode } from "@/lib/canvas/zones";
import type { Store } from "../types";

export type CanvasSlice = {
  onNodesChange: OnNodesChange<VerityNode>;
  onEdgesChange: OnEdgesChange<VerityEdge>;
  markUserMoved(id: string): void;
};

export const createCanvasSlice: StateCreator<Store, [], [], CanvasSlice> = (set, get) => ({
  // Only position and selection changes are honored. Dimensions are fixed, add/remove come from the reducer.
  onNodesChange(changes) {
    const { snapshot } = get();
    const positional = changes.filter((c) => c.type === "position");
    let nodes = snapshot.nodes;
    if (positional.length > 0) nodes = applyNodeChanges(positional, nodes);

    for (const c of changes) {
      if (c.type !== "select") continue;
      const node = snapshot.nodes.find((n) => n.id === c.id);
      if (!node || node.data.kind === "zone") continue;
      if (c.selected) {
        get().select({ kind: node.data.kind, id: node.data.refId });
      } else {
        // Read the live selection: an earlier change in this batch may already have replaced it.
        const cur = get().selection;
        if (cur && cur.id === node.data.refId && cur.kind === node.data.kind) get().select(null);
      }
    }
    if (nodes !== snapshot.nodes) set({ snapshot: { ...get().snapshot, nodes } });
    // A finished move (mouse drag end or arrow keys) makes the node the user's: the AI never repositions it.
    for (const c of positional) {
      if (c.type === 'position' && c.dragging === false) get().markUserMoved(c.id);
    }
  },

  // Edges are never selectable or removable.
  onEdgesChange() {},

  markUserMoved(id) {
    const { snapshot, userMoved } = get();
    const node = snapshot.nodes.find((n) => n.id === id);
    if (!node || node.data.kind === "zone") return;
    set({
      userMoved: { ...userMoved, [id]: { x: node.position.x, y: node.position.y } },
      snapshot: {
        ...snapshot,
        nodes: snapshot.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, origin: "user" as const } } : n)),
      },
    });
  },
});

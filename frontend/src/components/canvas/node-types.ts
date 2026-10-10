import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { SpecNode } from "./nodes/SpecNode";
import { ArchBlockNode } from "./nodes/ArchBlockNode";
import { GoldenModelNode } from "./nodes/GoldenModelNode";
import { CandidateNode } from "./nodes/CandidateNode";
import { ZoneNode } from "./nodes/ZoneNode";
import { ProofEdge } from "./edges/ProofEdge";

/** Module-level constants: re-creating nodeTypes or edgeTypes each render would re-render the whole flow (ARCHITECTURE 9). */
export const nodeTypes = {
  spec: SpecNode,
  block: ArchBlockNode,
  golden: GoldenModelNode,
  candidate: CandidateNode,
  zone: ZoneNode,
} satisfies NodeTypes;

export const edgeTypes = {
  proof: ProofEdge,
} satisfies EdgeTypes;

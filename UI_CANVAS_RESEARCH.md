# Verity: Canvas UI Research

Research for the AI co-planning canvas idea (users and the in-app AI move boxes together). Compiled 2026-10-04 by three parallel research agents. The interactive journey map built from it is `.archify/workflow-verity-journey-20261004-011950/verity-journey.html`.

**Caveats:** claims marked unconfirmed or "press release only" below were not verified hands-on. Nemotron structured JSON output on Nebius is unconfirmed; tool calling is documented.

---

## Verity canvas journeys

### 1. Personas

| # | Persona | Context | Needs | Priority |
|---|---|---|---|---|
| P1 | Hackathon judge | Has a URL and about 3 minutes, and may not know hardware | Wants to see the agent plan, fail, fix, improve and prove its work, with no waiting and no Verilog reading | **The demo serves this persona first** |
| P2 | HW engineer / startup founder | Has real specs and PPA targets, and is skeptical | Wants constraints, honest numbers and exportable verified RTL | Second (the impact story) |
| P3 | Student | Curious, with little vocabulary | Wants plain-English "what is this block" tooltips | Third (tooltips only) |

### 2. Three canvas concepts

**A. Architecture canvas**
- Pitch: "Sketch the chip with the AI, and it builds every block."
- User moves: module blocks (PE array, controller FSM, accumulators, I/O regs). The user can also pin constraints and toggle variants (PE count, pipelined or not).
- AI does: drafts the block diagram from the spec, explains each block, writes RTL for each block and wires the top module.
- Judge sees in 30 s: a readable chip diagram whose blocks turn green as their RTL passes.
- Effort: M if it is view and approve. L if canvas edits really change the RTL.
- Risk: if an edit does not change the output, it is theater, and judges will spot it. Multi-module RTL also raises the failure rate.
- Minimal-input fit: Medium. To keep it autonomous, the AI drafts and the plan auto-continues.

**B. Pipeline canvas**
- Pitch: "Mission control for the agent loop."
- User moves: stage nodes (spec, plan, RTL, lint, sim, fix, synth, optimize, prove). The user sets caps per stage (retries, budget, target metric).
- AI does: runs each stage and lights it up. The sim/fix edges loop visibly.
- Judge sees: nodes pulse, a failing edge loops back, then everything goes green.
- Effort: S.
- Risk: it looks like every n8n clone. Reordering stages means nothing (you cannot simulate before the RTL exists), so the "freedom" is fake.
- Minimal-input fit: High, but there is almost no co-planning.

**C. Evolution canvas**
- Pitch: "Watch designs evolve, and steer the search."
- User moves: version cards. The user can pin a card, mark "explore here" with a note, drag one card onto another to fuse them (the REvolution Fusion operator), or pick an operator (Simplify, Improve, Refactor).
- AI does: grows the population, fixes red cards, optimizes green ones, keeps the elites, and proves the winner equal to v1 with EQY.
- Judge sees: the tree goes from red to green to better. The best card gets a crown and the label "area -X% vs v1, proven equal".
- Effort: M.
- Risk: it depends on the open loop decision. A single refine loop gives a chain, which still works but is less dramatic. A run with only a few versions looks sparse.
- Minimal-input fit: High. Autopilot grows the tree, and steering is optional.

#### Recommended: hybrid "Plan Board + Evolution Tree" (A-lite + C, with B as a status rail)
- **Layout:** one canvas with two zones. On the left is the AI-drafted architecture, where the user can view and drag blocks, add constraint pins and approve. On the right, the version tree grows live. The pipeline (B) is a thin stage rail on top, not a canvas.
- **Autonomy:**
  - Autopilot is on by default.
  - Every human touchpoint has a default that proceeds on its own.
  - Steering hints go into a queue for the next generation and never block the run.
  - The summary shows **"Human inputs: 1 (the spec)"** to prove autonomy.
- **Tech check:** I checked the React Flow (`@xyflow/react`) docs through Context7. It supports custom nodes, `updateNodeData` for streamed status, tree layout with dagre or elkjs, and shadcn-based node components. Both zones render from the same event JSON as the golden run.

### 3. Journey (hybrid)

**Modes:**
- **Replay** plays the recorded golden run automatically, with captions and a scrubber, and costs $0.
- **Live** runs only on preset specs, with a per-run credit cap and Autopilot on by default.

#### 1. Land and Choose
- User: opens the URL.
- Agent: does nothing yet. The replay is preloaded.
- Screen: a one-line pitch, the canvas already moving behind the hero, and two buttons: Watch run and Try live.
- Feel: "What is this?" The page has to hook the judge within 10 s.
- Choices:
  - Entry: [a] auto-play replay (rec), [b] pick replay or live, [c] spec box first.

#### 2. Describe Chip
- User: picks a preset or types something like "4x4 matrix multiply, 8-bit, smallest area".
- Agent: Nemotron Super turns the text into a spec card (ports, widths, goal weights).
- Screen: the spec card node lands on the canvas, with a priority control for area, speed or power.
- Feel: unsure what to type. Presets remove the blank-page fear.
- Choices:
  - Input: [a] presets only in live mode (rec), [b] free text, [c] editable presets.
  - Goal control: [a] priority radio (rec), [b] three sliders.

#### 3. Plan Together
- User: optionally drags blocks, pins a constraint ("pipeline the MACs") or toggles a variant. Otherwise just clicks Build.
- Agent: Nemotron Ultra drafts the blocks (PE array, controller FSM, accumulators, I/O regs) with a one-line reason each. It replans if a pin changes.
- Screen: the Plan Board zone, block tooltips, and a countdown: "Building in 10 s".
- Feel: ownership, since this is the co-planning moment. It feels fake if edits change nothing.
- Choices:
  - Edit power: [a] view and approve, [b] pins and variant toggles (rec), [c] full add and rewire.
  - Gate: [a] auto-continue countdown (rec), [b] required click, [c] no gate.

#### 4. Lock Answer Key
- User: can optionally look at the tests.
- Agent: loads the golden model (Python) and the tests, then locks them outside its own write access.
- Screen: a lock node showing the test count, an "AI cannot edit" badge, and the tooltip "the answer key".
- Feel: trust. Judges who know about AI test-cheating will notice this.
- Choices:
  - Source: [a] hand-written for each preset (rec for MVP), [b] AI-drafted, user approves, then locked, [c] AI-drafted and locked automatically.

#### 5. Build and Fix
- User: watches, and can open any block to see its code.
- Agent: writes the RTL, lints it with Verilator and simulates with iverilog and cocotb. When a test fails, it reads the error, fixes the code and passes.
- Screen: blocks light up stage by stage and the rail shows the lint/sim/fix loop. The v1 card appears red and turns green. A drawer shows expected vs got and the code diff.
- Feel: tension, then the "it fixed itself" moment.
- Choices:
  - Failure view: [a] expected vs got table (rec), [b] waveform viewer, [c] log only.
  - Replay pacing: [a] compressed with highlights (rec), [b] free scrubber, [c] real time.

#### 6. Evolve Versions
- User: optionally pins a card, marks "explore here" with a note, or drags one card onto another to fuse them. Or leaves Autopilot on.
- Agent: spawns variants (Improve, Simplify, Fusion), fixes the failing ones, synthesizes with Yosys and keeps the elites. Each version runs in its own sandbox branch.
- Screen: the Evolution Tree zone, with pass/fail and area and Fmax changes vs v1 on each card, plus a credits meter.
- Feel: excitement as the numbers drop. Too many cards can overwhelm.
- Choices:
  - Loop: [a] single refine chain, [b] small population tree (rec if the Oct 18 gate passes).
  - Steering: [a] pin and note (rec), [b] operator menu, [c] drag to fuse.
  - Steering in replay: [a] read-only (rec), [b] pre-recorded branches, [c] fork a live run from a card (capped).

#### 7. Prove and Pick
- User: confirms or overrides the winner.
- Agent: ranks versions by fitness, then runs Yosys EQY to prove best == v1.
- Screen: a crown on the best card, a "proven equal" EQY edge back to v1, and a v1-to-best chart labeled "relative to our own v1, open-source tools".
- Feel: confidence. Numbers that look too good invite skepticism.
- Choices:
  - Winner: [a] AI picks (rec), [b] user picks from the Pareto front, [c] AI picks and the user can override.

#### 8. Export Design
- User: downloads or shares the result.
- Agent: packages the RTL, testbench, golden model, synthesis and EQY reports, and the run log.
- Screen: a summary card showing tests passed, area -X%, the proof, "Human inputs: 1", credits spent, and Nemotron and Nebius badges.
- Feel: "I could use this."
- Choices:
  - Output: [a] zip (rec), [b] share replay link, [c] GitHub PR.

### 4. MVP cut

**Ships by feature freeze (2026-10-25)**
- Landing page that auto-plays the replay from the golden-run JSON, plus the stage rail.
- One React Flow canvas containing:
  - the Plan Board: AI-drafted, draggable, approved by countdown, with a priority radio.
  - the Evolution Tree: auto layout, with status from SSE or the replay.
- A side drawer with the code, expected vs got and the PPA numbers. Also a v1-to-best chart and an EQY badge.
- Hand-written, locked golden models for 2 to 3 presets.
- Live mode on presets only, with a per-run credit cap and Autopilot only.
- Export zip and the "Human inputs" counter.
- "Pin + explore note" steering, but only if the Oct 18 PPA gate passes.

**Stretch**
- Constraint pins and variant toggles that really replan the RTL.
- Operator menu and drag to fuse.
- Forking a live run from a replay card.
- Waveform viewer (Surfer), layout image (OpenROAD), student explain mode, free-text specs.

**Build order:** build the canvas in week 2 against the fake LLM and a hand-made event JSON, so the UI work does not wait for the agent.

Sources read: `D:\Verity\MEETING.md`, `D:\Verity\AI_Hardware_Engineer_Project.md`, `D:\Verity\REPORT.md`, `D:\Verity\Nebius_Hackathon_Game_Plan.html`.

---

## UX prior art: human + AI co-planning on a canvas (for Verity)

### (a) Interaction patterns

1. **Prompt to graph.** One sentence produces an editable node graph, streamed in one node at a time and auto-laid-out. Who does it: tldraw computer, n8n Assistant, Whimsical, Flora (Fauna agent), Overture. Fit: strong. "4x4 MAC array" should turn into input buffers, PE grid, accumulator, control FSM and golden model within seconds. Use Dagre/ELK auto-layout so the result never looks messy.
2. **Plan approval gate.** The plan is drawn before any code is written, and nothing runs until the user approves. Who does it: Overture. Miro Sidekicks reportedly do this too, but only a search snippet says so. Fit: strong and cheap, just one "Approve and build" button. In replay mode, approve automatically after about 2 seconds so judges never get stuck.
3. **Selection scopes the prompt.** The selected shapes and the current viewport are sent to the agent as context. Who does it: tldraw agent starter kit, Whimsical Agent. Fit: strong. The user selects the PE block, types "pipeline this", and only that module changes. This is co-planning, not just watching.
4. **Proposals, not mutations.** The tool suggests a change and the human applies it. Who does it: Vivado IP Integrator "Designer Assistance" (Run Connection Automation), Chipmind RTL Canvas staging sandbox. Fit: good. AI-suggested blocks would appear dashed, with Accept and Reject buttons. I did not find a literal "ghost node" feature in any product, so this part is our own synthesis.
5. **Visual diff with evidence.** Added parts show in green, removed in red, unchanged parts are ghosted. Each change lists its evidence and "what was left unverified". Who does it: Chipmind RTL Canvas (press release only). Fit: very strong for the self-fix and evolution steps, and it matches our honesty story.
6. **Run status on nodes.** The running node is outlined, each node shows success or error, and cached nodes are skipped. Who does it: ComfyUI, Flowise, Overture. Fit: essential. SSE events light up Lint, Sim, Fix and Synth in order. A Sim node that goes red and then green is the visible proof of autonomy.
7. **Branch and compare.** You can branch from any node without losing history, and the branches meet at a compare node where the human picks a winner. Who does it: Flora, Figma Weave. Fit: ideal for the evolution population. Show a version tree with PPA badges, and let the user pin a winner so human taste can override the AI's score.
8. **Locked source of truth.** A grounded spec that agents must reference and cannot rewrite. Who does it: Cadence ChipStack "Mental Model" (described as a concept; I saw no UI). Fit: our strongest differentiator. Show the golden model as a padlocked node with dotted "checked against" edges to every version. No product I found has a per-node AI lock, so this would be new.
9. **Simple mode over the graph.** The graph is hidden behind a simple form and the full editor is one click away. Who does it: ComfyUI App Mode, Figma Weave App Mode. Fit: good for judges. Make "Watch run" the default view and the full canvas a toggle.
10. **Hierarchy zoom.** Blocks collapse into subgraphs that you can zoom into. Who does it: Chipmind, ComfyUI subgraphs, Vivado hierarchical IP, Intel Platform Designer hierarchy tab. Fit: limit it to 2 levels (chip, then module). Double-clicking a block opens its Verilog and tests.
11. **Diagram linked to code.** Diagram-as-code that can be edited by hand or by prompt. Who does it: Eraser. Fit: a read-only Verilog panel per block is enough. Two-way sync costs too much before the 10-25 freeze.
12. **Values on wires.** Who does it: Logisim colors each wire by its value (0, 1, unknown, error). DigitalJS simulates Yosys netlists in the browser, and netlistsvg draws schematics from them. Fit: optional extra. A netlistsvg schematic of the winning design is cheap credibility. Live wire values are not worth the time.

### (b) Anti-patterns for a 3-minute judge demo

- **A blank canvas on load.** Judges won't know what to do. Open straight into a replaying golden run.
- **Spaghetti.** ComfyUI beginners complain of "too many nodes" and unclear settings. Keep it to about 12 visible nodes or fewer, and collapse the rest.
- **Silent AI changes.** If boxes change without a diff, judges can't follow what the agent did.
- **Setup before value.** API keys, credentials and model pickers (n8n's builder asks for credentials). Judges should need zero setup.
- **Live LLM calls on the critical path.** They add delay and can fail. Demo guides say the core demo should not depend on outside APIs.
- **Dragging as a requirement.** A judge on a trackpad must be able to finish the story by clicking alone.
- **Dense EDA chrome.** Port lists, Tcl consoles and terminals put judges off. Demo guides say not to show editors or terminals.
- **Layout freedom that means nothing.** If moving a box changes nothing, either say so or give placement meaning (for example, dragging a block into a "keep" lane). This one is my own judgment, not from a source.

### (c) The "wow" in the first 30 seconds

Demo guides say a judge should understand the product in under 30 seconds and see the wow inside the first minute. For Verity, in this order:

1. One sentence goes in and a block diagram builds itself on screen.
2. Nodes light up on their own. Sim fails red, the agent patches its own bug, and the node turns green with a visual diff.
3. A version tree grows with area and timing numbers, the winner is highlighted, and a "Proven equivalent" seal appears next to the padlocked golden model.
4. One human touch: select a block, ask for a change, and watch the agent respect the lock. That shows co-planning in a single gesture.

### What I could not verify

- **ChipAgents:** IDE, CLI and a project dashboard. I found no screenshots and no canvas.
- **Synopsys AgentEngineer:** in beta, with a prototype shown at DAC 2025. I found no public UI.
- **"chip-harness" hackathon dashboard:** nothing found.
- **Chipmind RTL Canvas:** everything above comes from its 2026-07-14 press release. I have not used it.
- **Miro Sidekick plan approval:** only a search snippet mentions it, and the pages I fetched did not confirm it.
- **Overture, Krea, Eraser, Whimsical, tldraw Make Real:** I relied on secondary or listing pages and did not run any of them.

### Sources

- [tldraw agent kit](https://tldraw.dev/starter-kits/agent)
- [tldraw computer](https://the-decoder.com/tldraw-unveils-experimental-natural-language-computer-powered-by-gemini-2-0/)
- [Make Real](https://gitnation.com/contents/make-real-tldraws-ai-adventure)
- [n8n Assistant](https://www.createwith.com/tool/n8n/updates/n8n-assistant-builds-editable-workflows-from-plain-english)
- [Whimsical AI](https://whimsical.com/learn/ai/whimsical-ai)
- [Flora](https://www.founded.com/how-floras-42m-raise-is-shaping-the-future-of-ai-powered-creative-workflows/)
- [Figma Weave](https://www.creativeainews.com/articles/figma-weave-node-graph-ai-design-analysis/)
- [Krea Nodes](https://docs.krea.ai/user-guide/features/nodes)
- [Overture](https://mcpservers.org/servers/sixhq/overture)
- [Miro canvas](https://miro.com/canvas/)
- [Chipmind RTL Canvas](https://www.globenewswire.com/news-release/2026/07/14/3326587/0/en/Chipmind-Introduces-Generative-UI-for-Chip-Design-Agents.html)
- [Cadence ChipStack](https://www.hpcwire.com/aiwire/2026/02/10/cadence-introduces-agentic-ai-system-for-chip-design-and-verification/)
- [Vivado Designer Assistance](https://docs.amd.com/r/en-US/ug994-vivado-ip-subsystems/Using-the-Designer-Assistance-Feature)
- [Intel Platform Designer](https://www.intel.com/content/www/us/en/docs/programmable/683609/22-1/previewing-the-system-interconnect.html)
- [ComfyUI App Mode](https://gigazine.net/gsc_news/en/20260312-comfyui-app-mode)
- [ComfyUI execution](https://www.earngenix.com/glossary/queue-prompt)
- [Flowise](https://www.mintlify.com/FlowiseAI/Flowise/workflows/creating-chatflows)
- [Eraser AI](https://eraser.io/ai)
- [Logisim wire colors](https://cburch.com/logisim/docs/2.7/en/html/guide/bundles/colors.html)
- [DigitalJS](https://hackaday.io/project/160966-digitaljs)
- [netlistsvg](https://github.com/shuckc/netlistsvg)
- [ChipAgents](https://apis.io/providers/chipagents/)
- [Synopsys AgentEngineer](https://news.synopsys.com/2025-09-03-Synopsys-Announces-Expanding-AI-Capabilities-for-its-Leading-EDA-Solutions)
- [Demo tips](https://blogs.reskilll.com/hackathon-demo-presentation-tips-pitch-3-minutes-win-2026/)
- [AngelHack tips](https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/)

---

## Canvas research for Verity (as of 2026-10-04)

### 1. Library comparison

| | React Flow (`@xyflow/react`) | tldraw | Excalidraw (`@excalidraw/excalidraw`) |
|---|---|---|---|
| Version | 12.12.0 (npm) | 5.5.2 (npm) | 0.18.1 (npm) |
| License | MIT, no key, no watermark requirement | Custom license, not OSS | MIT |
| Public host OK? | Yes | Production needs a key. Free "hobby" key is discretionary (by request) and keeps the watermark. | Yes |
| Custom React nodes | First class (`nodeTypes`, `NodeProps`, `Handle`) | Custom shapes, more work | Weak: freehand whiteboard model, no typed nodes |
| Edges and ports | Built in (handles, connect, animated) | Arrows and bindings | Arrows only |
| Programmatic API | `addNodes`, `updateNodeData`, `fitView`, `getIntersectingNodes` | Strong editor API, plus an Agent starter kit | `updateScene` |
| Auto-layout | Documented ELK example; dagre works too | Manual | Manual |

- **React Flow attribution:** it shows an attribution badge by default. Removal is officially a Pro feature (from $169/month), but the docs say MIT permits removing it. Treat removal as a gray area and keep the badge to be safe.
- **tldraw blocks the plan:** its docs say open-source projects cannot relicense the SDK, and "you and your downstream users will require their own" license. That conflicts with a public MIT/Apache repo hosted at a public URL. It is a poor fit despite the strong agent kit.
- **Excalidraw:** the license is fine, but it cannot render a code snippet, PPA badge, or pass/fail status as a first-class node.
- **elkjs:** 0.12.0 is licensed EPL-2.0 OR GPL-3.0-or-later. It is fine as an npm dependency but is not MIT. `@dagrejs/dagre` 3.1.1 is MIT.
- **Performance and bundle size:** React Flow has a performance guide (memoize nodes, simplify CSS, `hidden` for collapsing). At about 15 to 30 nodes this is a non-issue. Bundle size is not measured.
- **Effort:** React Flow is roughly 3 to 4 days for the MVP canvas for one frontend dev.

### 2. In-app LLM manipulating the canvas

**Tool calling on Nebius.** The `tools` plus `tool_choice` request shape is documented for Token Factory (OpenAI-compatible). The docs example uses Llama, not Nemotron.
- **Super:** Nebius's launch post says it is built for "tool calling and high-accuracy instruction following". Model ID is `nvidia/nemotron-3-super-120b-a12b`. Context is 1M tokens.
- **Ultra:** a pricing page lists tool calling for ID `nvidia/Nemotron-3-Ultra-550b-a55b` ($1 in / $3 out per 1M tokens). It does not list structured output.
- **Structured output:** sources conflict. One aggregator says Ultra supports JSON schema and Super does not. Nebius's own JSON docs name no Nemotron model. Treat `response_format: json_schema` as unconfirmed.
- **Self-hosted vLLM:** Nemotron 3 Super reportedly needs `--tool-call-parser qwen3_coder`. That only matters if you serve the model yourself.
- **Action:** make one real tool-call request against Nebius in week 1. This fits the existing Oct 4 gate.

**Op design.** Use a small closed set of tools with JSON Schema parameters, validated with zod on the server:
- `add_node{id,type,label,data,near?}`
- `connect{source,target}`
- `move_node{id,x,y}`
- `update_status{id,status,metrics?}`
- `remove{id}`

The model never sees pixel coordinates. It says `near: "rtl"` and the client places the node. Authorization and validation stay in code, since LLM output is untrusted.

**SSE application.** FastAPI streams events such as `{"t":"op","seq":12,"op":{...}}`. The client reduces each op into canvas state. Do not stream partial tool-call arguments: buffer them server-side and emit one complete op per tool call.

**Conflict handling.** I found no library feature for this, so this is design:
- Keep `userLocked` and `dragging` flags on nodes. While a node is being dragged (`onNodeDragStart` to `onNodeDragStop`), queue AI `move_node` ops for it.
- AI-created nodes get `origin:"ai"` and auto-layout. Once a user moves a node it becomes `origin:"user"` and the AI may only update its data, never its position.

**Undo.** React Flow's undo/redo example is a Pro example, so it is not in the free tier. Build a small snapshot stack in Zustand: push the state before each user action and each AI batch. Group each AI turn as one undo step.

### 3. Persistence and replay

Store one JSON document:

`{version, nodes:[{id,type,position,data:{...}}], edges:[...], viewport}`

Keep two things separate:
- **Snapshots:** save and load the whole state.
- **Op log:** an append-only list of `{seq, tMs, op}`.

Golden-run replay is then the op log fed through the same reducer as live SSE, with timers from `tMs`. It spends no credits, and judges see identical behavior. Live and replay share one code path.

### 4. Recommendation

**Use React Flow (`@xyflow/react`) with Zustand. Use dagre for layout, or hand-place the fixed pipeline nodes and run layout only for AI-added nodes.**

Rationale:
- It is the only candidate that is MIT, needs no key or required watermark, and has typed React nodes.
- The pipeline (spec, plan, RTL, lint, sim, fix, synth, evolve, EQY) is a graph, so nodes, edges, and handles fit the product directly.
- Custom nodes are the visible "agent works" moment: a status ring, a Verilog snippet, a PPA badge, and a "locked golden model" padlock node the AI cannot edit.

**Install**
```
npm i @xyflow/react zustand zod @dagrejs/dagre
```
Add `import '@xyflow/react/dist/style.css'` and mark canvas files `'use client'`. The `'use client'` requirement is my inference; the SSR docs do not state it.

**Skeleton**
- `components/canvas/Canvas.tsx`: `<ReactFlowProvider><ReactFlow nodeTypes edges onNodesChange onNodeDragStart onNodeDragStop><MiniMap/><Controls/><Background/>`
- `components/canvas/nodes/`: `StageNode`, `CodeNode`, `PpaNode`, `GoldenNode`, `DesignVersionNode`
- `lib/canvasStore.ts` (Zustand): `nodes`, `edges`, `applyOp(op)`, `undo()`, `redo()`, `snapshot()`, and a drag-lock map
- `lib/ops.ts`: zod schemas for the op set
- `hooks/useAgentStream.ts`: `EventSource` that calls `applyOp`. A sibling `useReplay.ts` reads the op log.
- `lib/layout.ts`: dagre or ELK wrapper

Update node status through `updateNodeData`, which is documented. Mind two gotchas: nodes need dimensions or `initialWidth`/`initialHeight` to render server-side, and `nodeTypes` must be defined outside the component.

**Fallback:** if Nemotron tool calls misbehave, ask for a JSON array of ops in plain text and validate it with zod. The canvas works either way.

### Sources
- Context7 `/websites/reactflow_dev` (custom nodes, `addNodes`, `updateNodeData`, ELK example, performance, drag callbacks)
- Context7 `/tldraw/tldraw` (resolved only, not queried)
- npm registry (versions and licenses, queried via curl)
- https://tldraw.dev/sdk-features/license-key
- https://tldraw.dev/community/license
- https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md
- https://tldraw.dev/starter-kits/agent
- https://raw.githubusercontent.com/excalidraw/excalidraw/master/LICENSE
- https://reactflow.dev/learn/troubleshooting/remove-attribution
- https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration
- https://reactflow.dev/examples/interaction/undo-redo
- https://docs.tokenfactory.nebius.com/ai-models-inference/function-calling.md
- https://docs.tokenfactory.nebius.com/ai-models-inference/json.md
- https://nebius.com/blog/posts/nemotron3-super-now-available
- https://custom.typingmind.com/tools/estimate-llm-usage-costs/nebius/nemotron-3-ultra-550b-a55b
- https://modelcompare.dev/models/nvidia/nemotron-3-super-120b-a12b (third party, low confidence)
- https://cookbook.sglang.io/autoregressive/NVIDIA/Nemotron3-Super

Repo context was read from `D:\Verity\MEETING.md` and `D:\Verity\REPORT.md`.

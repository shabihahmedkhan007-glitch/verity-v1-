# Verity UI and UX spec

Design brief and page specs for the Verity web app, produced with impeccable's shape process on 2026-10-04. Inputs: `PRODUCT.md`, `brand.md`, `ARCHITECTURE.md`, the approved journey map (`.archify/workflow-verity-journey-20261004-011950/candidate.json`), `UI_CANVAS_RESEARCH.md` and the locked decisions of 2026-10-04. Where shape asks to confirm with the user, the locked decisions answer; anything still unresolved is in section 14.

Copy in quotes is exact UI text. Component names refer to the inventory in section 5. "Owner" letters refer to the build plan tasks: A domain components, B canvas and state, C pages and sections, S scaffold.

---

## 0. Design brief (shape summary)

**Feature summary.** A two-register web app. The landing page (brand) hooks a hackathon judge in 10 seconds with a self-playing recording of the agent's real loop. The Studio (product) shows that loop on one canvas: a Plan Board of AI-drafted blocks on the left and an Evolution Tree of competing versions on the right, with a stage rail on top and an inspector on the right. Try live and Results complete the story.

**Primary user action.** Watch the agent fail, fix itself and improve, then believe the numbers. Everything else is optional.

**Design direction.**

| | Landing (brand register) | Studio, Try, Results (product register) |
|---|---|---|
| Color strategy | Restrained with an earned signal: green appears only as the replay passes tests, plus the one primary button | Restrained: tinted navy neutrals, Verity Green as the only signal |
| Scene sentence | A judge on a 14-inch laptop late in a judging session, arriving from the dark navy Devpost thumbnail, deciding in 10 seconds whether this entry is worth three minutes | The same judge, or a hardware engineer, watching a 90-second run on a 1440px laptop, reading status and numbers, occasionally opening code |
| Anchor references | Keysight and Rigol oscilloscope front panels (one meaning per signal color, plain labels); a TI chip datasheet (numbered, factual, tables over adjectives); Linear's product pages (the product UI is the hero image) | Figma (canvas plus right inspector); GitHub pull request diff (code changes); Vercel deployment view (build step rail with live status); Linear (density and restraint) |
| Anti-goal | Hacker-terminal costume, neon glow, generic AI SaaS hero | n8n-style pipeline canvas where moving boxes means nothing |

**Scope.** Production-ready, shipped quality, desktop first (1440 x 900 design target), all four pages plus 404, MVP by feature freeze 2026-10-25.

**Visual direction probes.** Skipped: this harness has no native image generation. The brand thumbnail (`Verity_AI_Hardware_Verification.png`) was used as the visual anchor instead.

**Recommended impeccable references during build:** `spatial-design.md` (Studio grid), `interaction-design.md` (canvas, inspector, countdown), `motion-design.md` (status transitions), `ux-writing.md` (copy), `harden.md` (live error states), `audit.md` before freeze.

---

## 1. Information architecture

### 1.1 Route map

| Route | Page | Register | Primary user | Reached from |
|---|---|---|---|---|
| `/` | Landing | brand | Judge (cold arrival) | Devpost link, video, README |
| `/studio?run=golden` | Studio: recorded run | product | Judge | Landing CTA or hero click, Results "Back to the run" |
| `/studio?run=<id>` | Studio: live run | product | Judge, engineer | Try live after Start |
| `/try` | Try live | product | Judge, engineer | Landing nav, Studio top bar |
| `/results?run=golden` or `?run=<id>` | Results and export | product | Judge, engineer | Studio when done, replay bar "Skip to results" |
| any other | 404 | product | anyone | broken link |

`run` defaults to `golden` when missing. No other pages: an About page is not justified because the landing carries how it works, trust and limits in four short sections.

### 1.2 Flow

```
 Devpost / video
       |
       v
  [ /  Landing ]--hero replay auto-plays ($0)--+
       |  "Watch the full run" or click hero    |  "Try it live"
       v                                        v
  [ /studio?run=golden ]               [ /try ]--Start live run--> [ /studio?run=<id> ]
       |  replay ends: "See results"            |  live unavailable: "Watch the recorded run"
       v                                        v                         |  done / cap / stop
  [ /results?run=golden ] <-------------------------------------------------+
       |  "Download design (.zip)"
       v
     zip file
```

Clicks alone finish the story: Landing, "Watch the full run", (replay plays itself), "See results", "Download design (.zip)". Four clicks, zero drags, zero typing.

### 1.3 Shared shell

- One persistent `AppHeader` (56px) on Studio, Try and Results: `Wordmark` (links to `/`), a page context slot, a right-side action slot. The landing has its own `LandingNav` (64px).
- No sidebar navigation: there are only four pages.
- Page `<title>`: "Verity: AI Hardware Engineer" on `/`; "Studio: 4-lane MAC array, 8-bit | Verity" (run title inserted); "Try live | Verity"; "Results: <run title> | Verity"; "Not found | Verity".
- Description meta (all pages): "Describe a chip in plain English. Verity writes the Verilog, tests it, fixes its own bugs, then redesigns it to run faster and smaller. Built on NVIDIA Nemotron and Nebius." OG image `/og.png`.

---

## 2. Landing `/`

**Purpose.** Hook the judge in 10 seconds, show the loop working within 30, and send them to the Studio or Try live. **Primary user:** judge. **Primary action:** "Watch the full run".

### 2.1 Layout at 1440 x 900

12-column grid inside `max-w-[80rem]`, 48px gutters; the hero canvas bleeds to the right viewport edge.

```
+------------------------------------------------------------------------------------------------+
| [Verity]                                    How it works   Why trust it   GitHub   [Try it live]| 64  LandingNav
+--------------------------------------------+---------------------------------------------------+
| DESCRIBE | GENERATE | SIMULATE | VERIFY    | +-----------------------------------------------+ |
|                                            | | Spec  Plan  Lock  RTL  Lint  Sim  Fix  ... Prove| |  StageRail compact
| Describe a chip                            | +-----------------------------------------------+ |
| in plain English.                          | |  PLAN BOARD          EVOLUTION TREE           | |
|                                            | |  [Spec      ]            [ v1 ]               | |
| Verity writes the Verilog, tests it        | |  [Input regs]     [ v2 ] [ v3 ] [ v4 ]        | |  RunCanvas
| against an answer key it cannot edit,      | |  [Multiplier]         [ v5 ] [ v6 ]           | |  variant "theater"
| fixes its own bugs, then redesigns it to   | |  [Adder tree]                                 | |  read-only
| be smaller and faster.                     | |  [Acc + FSM ]                                 | |
|                                            | |  [Golden lock]                                | |
| [Watch the full run]  [Try it live]        | +-----------------------------------------------+ |
|                                            | | "v1 failed 3 of 16 tests. Reading..."  [||] 0:31 | CaptionLine + pause
| This run is a recording. Replays are free. | +-----------------------------------------------+ |
| Built on NVIDIA Nemotron and Nebius.       |   [Sample data]                       (bleeds) ---->
+--------------------------------------------+---------------------------------------------------+
|  One loop, start to finish                                                         LoopSection  |
|  Plan --------- Lock --------- Build and fix --------- Evolve --------- Prove                   |
|  (one sentence under each station; the line is neutral; only "Prove" carries a green square)   |
+------------------------------------------------------------------------------------------------+
|  Why the numbers hold up                                                          TrustSection  |
|  01  The answer key is locked.            body                       [GoldenModelCard mini]     |
|  -----------------------------------------------------------------------------------------      |
|  02  Better is measured, never guessed.   body                       [MetricDelta x3]           |
|  -----------------------------------------------------------------------------------------      |
|  03  Faster versions are proven equal.    body                       [EqyBadge]                 |
+------------------------------------------------------------------------------------------------+
|  What Verity will not do                                                          LimitsSection |
|  two short paragraphs, max 65ch                                                                 |
+------------------------------------------------------------------------------------------------+
|  [Verity]  credits line, REvolution credit, links                                   SiteFooter  |
+------------------------------------------------------------------------------------------------+
```

Hero: left column spans 5 columns, right 7 columns plus bleed. Hero height `min(100svh - 64px, 860px)`. The canvas frame is `rounded-xl`, `bg-surface`, 1px `border`, with no shadow.

### 2.2 Components

`LandingNav`, `HeroSection` (contains `HeroReplay` = `StageRail` compact + `RunCanvas` theater + `CaptionLine` + pause `Button` + `SampleDataBadge`), `LoopSection`, `TrustSection` (uses `GoldenModelCard`, `MetricDelta`, `EqyBadge`, `HonestyNote`), `LimitsSection`, `SiteFooter` (uses `Wordmark`, `PoweredBy`). Drivers: `useReplayDriver({ src: "/runs/golden.json", autoplay: true, loop: true })`.

### 2.3 States

| State | What shows |
|---|---|
| Loading (fixture fetching) | Hero canvas frame with `Skeleton` blocks in both zones and the caption "Loading the recorded run." Text column is fully rendered (static HTML), so the page is never blank. |
| Playing | Replay advances; caption updates; stage rail lights up. |
| Paused (user) | Pause button becomes "Play"; caption shows the current line. |
| Ended | Final frame (winner crowned, EQY edge) holds 6 s, then restarts from 0. A "Replay" icon button appears during the hold. |
| Reduced motion | Starts paused on the final frame; caption "The recorded run, finished. Press play to watch it from the start."; pause button reads "Play the run". |
| Fixture error | Canvas frame shows `EmptyState`: title "The recorded run did not load.", body "The rest of Verity still works.", action "Try again". CTAs stay active. |
| Sample data | `SampleDataBadge` under the canvas while `meta.sample` is true. |
| Narrow (< 768px) | See section 7: `StageRail` vertical + `CaptionLine` + current `CandidateCard` instead of the canvas. |

### 2.4 Interactions

- Hero canvas is read-only (`interactive: false`): no pan, zoom, drag or selection. Clicking anywhere on it navigates to `/studio?run=golden` and the playback continues from the same moment (module-level store). Hover shows a 1px `--border-strong` outline and the tooltip "Open in Studio".
- "Watch the full run" goes to `/studio?run=golden` (same continuation). "Try it live" goes to `/try`.
- Nav links scroll to `#how` and `#trust` (smooth scroll disabled under reduced motion). "GitHub" opens the repo in a new tab (URL is open question 6).
- Keyboard: the pause button is the first focusable element after the CTAs.

### 2.5 Copy

- Kicker (static; mirrors the thumbnail): "DESCRIBE | GENERATE | SIMULATE | VERIFY", with "VERIFY" in Verity Green. This is the only uppercase kicker on the page.
- H1 (`text-display`): "Describe a chip in plain English."
- Lead (`text-lead`, max 46ch): "Verity writes the Verilog, tests it against an answer key it cannot edit, fixes its own bugs, then redesigns it to be smaller and faster."
- Primary CTA: "Watch the full run". Secondary CTA (outline): "Try it live".
- Under CTAs (`text-sm text-fg-muted`): "This run is a recording. Replays are free. Built on NVIDIA Nemotron and Nebius Token Factory."
- LoopSection H2 (`text-headline`, id `how`): "One loop, start to finish". Stations:
  - "Plan": "Nemotron turns your sentence into a block plan. Steer it, or let the countdown run."
  - "Lock": "A golden model and its tests are locked away from the agent. That is the answer key."
  - "Build and fix": "The agent writes Verilog, simulates it, reads the failures and fixes its own code."
  - "Evolve": "Small rounds of new versions compete. Failing ones get fixed, passing ones get measured, the best two carry on."
  - "Prove": "The winner is checked against v1 with an equivalence prover before you download it."
- TrustSection H2 (id `trust`): "Why the numbers hold up".
  - "The answer key is locked." / "AI agents have been caught editing tests to make them pass. Verity's golden model and tests live where the agent cannot write."
  - "Better is measured, never guessed." / "Every score comes from Yosys and OpenROAD reports, relative to our own v1. We never ask the model whether a design is better."
  - "Faster versions are proven equal." / "Before a winner ships, Yosys EQY checks that it behaves exactly like v1."
- LimitsSection H2: "What Verity will not do".
  - "It will not design a GPU. AI-written hardware stops being reliable on large designs, so Verity works on small blocks of up to about 300 lines and shows the loop making them better."
  - "Its numbers come from open-source tools and are relative to our own v1. They are good estimates, not signoff."
- Footer: "Verity: AI Hardware Engineer. Built for the Nebius x NVIDIA Global AI Hackathon, 2026." / "The evolution loop follows principles from REvolution (Min et al., ASP-DAC 2026). Verity's results are its own." / links "GitHub", "Devpost", "Demo video" / `PoweredBy`.

---

## 3. Studio `/studio`

**Purpose.** The run view: watch (replay) or run (live) the whole loop on one canvas, inspect any block or version. **Primary user:** judge, then engineer. **Primary action:** keep watching; secondary: open a version to see expected vs got and the fix diff.

### 3.1 Layout at 1440 x 900 (replay, mid-run)

```
+--------------------------------------------------------------------------------------------------------+
| [Verity] / 4-lane MAC array, 8-bit  [Replay] [Sample data]   [User] Human inputs: 2   [Coins] $0.00 replay   Autopilot [on]   [Try live] | 56 AppHeader + StudioTopBar
+--------------------------------------------------------------------------------------------------------+
| [#] Spec - [#] Plan - [#] Lock - [#] RTL - [#] Lint - [#] Sim - [#] Fix x1 - [#] Synth - [#] Evolve R1 of 2 - [ ] Prove | 52 StageRail
+-------------------------------------------------------------------+------------------------------------+
| PLAN BOARD                     EVOLUTION TREE                     | InspectorPanel (400px)             |
| AI-drafted blocks. Drag to     Versions compete. Green passed     | v3  [PASS 16/16] [OPTIMIZE] [Elite]|
| arrange; pins and toggles      the locked tests.                  | from v1. "Merged the lane adders   |
| steer the plan.                                                   |  into one balanced adder tree."    |
| +-----------------+                    +--------+                 | Fixed once. [Make winner]          |
| | Spec            |                    |  v1    | baseline        |------------------------------------|
| +-----------------+                    +--------+                 | [RTL] [Diff] [Tests] [PPA]         |
| | Input registers |          +--------+ +--------+ +--------+     | +--------------------------------+ |
| | Multiplier  *ch |          |  v2  * | |  v3  * | |  v4    |     | | v3.v                    [Copy] | |
| | Adder tree      |          +--------+ +--------+ +--------+     | |  1 module mac4 (               | |
| | Acc + control   |                     +--------+ +--------+     | |  2   input  logic clk,         | |
| +-----------------+                     |  v5    | |  v6    |     | |  ...                           | |
| | Golden model [L]|- - checks - - ->    +--------+ +--------+     | +--------------------------------+ |
| +-----------------+                                               |                                    |
| "Kept the two best: v3 and v2. v4 was faster but larger."  [+-][fit]                                   |
+-------------------------------------------------------------------+------------------------------------+
| [Pause] [Restart] |-Spec-Plan-Lock-Build-R1-R2-Prove-Done-|  0:59 / 1:30   [1x][2x]   [Skip to results] | 56 ReplayBar
+--------------------------------------------------------------------------------------------------------+
```

Grid: `grid-rows-[var(--topbar-h)_var(--rail-h)_1fr_var(--bottombar-h)]`, `grid-cols-[1fr_var(--inspector-w)]`, full viewport height, no page scroll. Canvas world (section 4.1) fits at about 0.94 zoom.

### 3.2 Live variant differences

```
| [Verity] / 4-lane MAC array, 8-bit  [Live]   Human inputs: 1   [Coins] $0.18 of $0.50   Autopilot [on]   [Stop run] |
...
| PLAN BOARD ...                                                                                          |
| +--------------------------------------------+                                                         |
| | [Timer] Building in 8 s   [Build now] [Hold] |  CountdownGate, in a React Flow Panel, bottom-left    |
| | Steer by pinning a block or toggling a variant. Every change restarts the countdown.                 |
| +--------------------------------------------+                                                         |
...
| [*] Live  2:14   Credits $0.18 of $0.50 [=====-----]   Round 1 of 2            [Stop run]              | LiveBar
```

### 3.3 Components

`AppHeader`, `StudioTopBar` (`ModeBadge`, `SampleDataBadge`, `HumanInputsCounter`, `CreditsMeter`, `AutopilotSwitch`, `Button`), `StageRail`, `RunCanvas` (variant `studio`), `CountdownGate` (overlay), `CaptionLine` (overlay), `InspectorPanel` (bodies: `SpecCard`, `BlockSteerPanel`, `GoldenModelCard`, `CandidateCard` hero header; tabs: `CodeView`, `CodeDiff`, `ExpectedVsGotTable`, `PpaTable`, `FitnessBreakdown`, `EqyBadge`, `HonestyNote`; default body: `CandidateList` + legend), `ReplayBar` or `LiveBar` or `RunCompleteBar`, `RunBanner` (`Callout`), `RunStoryMobile` (narrow screens).

### 3.4 Canvas content

- **Plan Board zone** (left column): `SpecNode`, four `ArchBlockNode`s, `GoldenModelNode`. Plan edges chain spec to blocks in datapath order.
- **Evolution Tree zone** (right): `CandidateNode`s laid out top to bottom by round (dagre TB). Lineage edges parent to child. One dotted `checks` edge from the golden model to v1 labeled "checks every version". One dashed green `proof` edge from the winner to v1 labeled "Proven equal (EQY)".
- **Chain fallback:** if the agent runs a single refine loop (population loop slipped), each round has one version and the same layout renders a straight vertical chain v1, v2, v3. No code path differs.
- Zone headers are part of `ZoneNode` frames: "Plan Board" with "AI-drafted blocks. Drag to arrange; pins and toggles steer the plan." and "Evolution Tree" with "Versions compete. Green passed the locked tests." When the visibility budget hides nodes, the tree header adds "+N hidden versions (see the list)".

### 3.5 States

| State | Trigger | What shows |
|---|---|---|
| Loading | Fixture fetch or live connect | Rail all pending squares; canvas skeleton: `SpecCard` placeholder in Plan Board and two skeleton candidate cards; inspector skeleton; bottom bar disabled. Caption "Loading the recorded run." or "Connecting to the live run." |
| Empty (live, before plan) | Live run started, no plan yet | Never blank: the preset's `SpecNode` is placed client-side immediately; four skeleton blocks pulse in the Plan Board with "Drafting the plan." Tree zone shows its header and "Versions appear here after the first build." |
| Replay playing / paused | Default for `?run=golden` | `ModeBadge` "Replay"; `ReplayBar`; steering controls visible but read-only with tooltip "This is a recording. Try live to steer." |
| Live running | `?run=<id>`, stream open | `ModeBadge` "Live" with info square; `LiveBar`; steering enabled. |
| Plan gate open | `gate` event `open` | `CountdownGate` counting down from `autoContinueMs`. Autopilot off: state `waiting`, copy "Waiting for you." with "Build" button. |
| Steering queued | User pinned or toggled (live) | Block shows "Replanning" with info square; caption "Your change is queued. The agent is replanning."; counter increments when the server echoes the `human` event. |
| Version failing | candidate `fail` / `fixing` | Node red with "FAIL 13/16"; rail Sim square red; then Fix square blinks; caption from the event. Inspector Tests tab (if that node is selected) shows the failing rows. |
| Version passing | candidate `pass` / `measured` | Node green "PASS 16/16", metrics appear; rail Sim and Synth done. |
| Rejected | candidate `rejected` | Node dims to 60% opacity, square becomes `rejected` (hollow red), tag "Rejected after 2 attempts". |
| Winner | `winner` event | Crown + `CandidateTag` "Winner", one-time glow, `proof` edge after EQY. |
| Done | `run` `done` | Bottom bar becomes `RunCompleteBar`: "Run complete. Winner: v5." with "See results" (primary) and "Download design (.zip)". Replay also offers "Watch again". |
| Error: stream lost | 3 failed reconnects | `RunBanner` (fail tone) under the rail: title "Lost connection to the live run." body "The run may still finish on the server." actions "Reconnect", "Watch the recorded run". |
| Error: agent error | `run` `error` | `RunBanner` fail: "The run stopped: {message}" body "Everything finished so far is kept." actions "See results so far", "Start another". |
| Credit cap reached | `run` `cap_reached` | `RunBanner` warn: "Credit cap reached ($0.50)." body "The agent stopped after round {n} and kept the best version so far." actions "See results so far". `CreditsMeter` full and warn-colored. |
| Stopped by user | `run` `stopped` | `RunBanner` info: "You stopped the run." actions "See results so far", "Start another". Counter +1 (stop counts). |
| Fixture invalid | zod failure | Canvas area `EmptyState` "The recorded run could not be read." action "Try again"; dev console logs the zod issues. |
| Unknown live run | Bad or expired `run` id | `EmptyState`: "This live run is not available anymore." actions "Watch the recorded run", "Try live". |

### 3.6 Interactions

- **Selecting:** click a node, press Enter on a focused node, or click a rail item (Spec selects the spec node, Plan the first changed or first block, Lock the golden model, RTL/Lint/Sim/Fix/Synth the version currently in that stage, Evolve the newest version, Prove the winner). Selection opens the matching inspector body. Escape clears selection.
- **Inspector default (nothing selected):** title "Run overview", the current caption, `CandidateList` (every version, including hidden ones, keyboard friendly), and a legend of status squares.
- **Inspector for a version:** header `CandidateCard` (hero variant) with status, operator, parent, reason, tags, "Fixed once" or "Fixed twice", and "Make winner" (pass versions that are not the winner). Tabs: "RTL", "Diff", "Tests", "PPA" (4.4). Opening a version that has an unseen diff clears its diff dot.
- **Inspector for a block:** `BlockSteerPanel`: name, reason, "Constraint pins" (checkbox chips from `pinOptions`), "Variants" (`ToggleGroup` per variant), and "Apply and replan" (live only). Note under it: "Moving a block on the board does not change the design. Pins and toggles do."
- **Inspector for the spec:** `SpecCard` full: English text, ports table, goal, test count, "Human input 1: the spec".
- **Inspector for the golden model:** `GoldenModelCard` full: "16 tests, locked", "The agent cannot edit these files.", file list, read-only `CodeView` (language `python`) of `tests/golden_model.py` from artifacts.
- **Dragging:** only Plan Board blocks are draggable. On drag stop the block's origin becomes `user` and shows a small `Hand` icon with tooltip "Moved by you. The agent will not move it again." Dragging is never required.
- **Make winner (override):** inline confirm inside the inspector header (no modal): "Make v3 the winner? Its fitness is 6.8; v5 has 11.1." with "Confirm" and "Cancel". Live: sends `winner_override`. Replay: applied locally as a `human` + `winner` event pair through the reducer, marked local; tag reads "Winner (your pick)" and a note "Local to this replay. Restarting the replay resets it." If the new winner has no EQY result: `EqyBadge` shows "Not checked in this recording".
- **Countdown gate:** "Build now" closes the gate (not a human input). "Hold" pauses the countdown (WCAG timing adjustable) and changes to "Resume". Autopilot off turns the gate into an explicit "Build" click. The countdown never blocks with Autopilot on.
- **Replay controls:** Space play/pause (when focus is not in a text field), Left/Right arrows jump to previous/next chapter, `1` and `2` set speed, Home restarts. "Skip to results" seeks to the end and navigates to `/results?run=golden`.
- **Canvas controls:** zoom in, zoom out, fit view (bottom-right, `Controls`). Pan with drag on empty canvas or scroll. After the tree grows, the view re-fits automatically unless the user has zoomed or panned in the last 10 s.
- **Stop run (live):** inline confirm in the top bar: "Stop this run? You keep everything finished so far." "Stop" / "Keep running".

### 3.7 Copy (key elements)

- Top bar: run title from the spec; `ModeBadge` "Replay" or "Live"; counter "Human inputs: 2" with tooltip listing each input, e.g. "1. The spec (4-lane MAC array, smallest area)" and "2. Multiplier pipeline set to 2-stage"; credits "$0.00 replay" (tooltip "Replays cost nothing. The original run cost $0.42.") or "$0.18 of $0.50"; Autopilot tooltip "On: nothing waits for you. Every step continues on its own." Replay: switch shown on and disabled, tooltip "The recording ran on Autopilot."
- Stage rail labels and tooltips: "Spec" (Your description, read by Nemotron.), "Plan" (Blocks drafted by the agent.), "Lock" (Golden model and tests locked.), "RTL" (Verilog written.), "Lint" (Verilator checks the code.), "Sim" (iverilog and cocotb run the locked tests.), "Fix" (The agent repairs failing versions.), "Synth" (Yosys and OpenROAD measure area, timing, power.), "Evolve" (New versions compete in small rounds.), "Prove" (Yosys EQY checks the winner equals v1.). Detail text: "x1" fixes count, "R1 of 2".
- Countdown: "Building in 8 s", buttons "Build now", "Hold", "Resume"; helper "Steer by pinning a block or toggling a variant. Every change restarts the countdown."; Autopilot off: "Waiting for you." button "Build".
- Bottom bar end: "Run complete. Winner: v5." / partial: "Run stopped early. Best so far: v3." / no winner: "No version passed the locked tests."
- Empty tree: "Versions appear here after the first build."

---

## 4. Canvas and inspector detail

### 4.1 World layout (canvas units)

| Region | Position | Size |
|---|---|---|
| Plan Board zone frame | x 0, y 0 | 288 wide (240 nodes + 24 padding each side), header 28 |
| Plan nodes | column at x 24 | spec 240x112, block 240x72, golden 240x88, 20 gap |
| Evolution Tree zone frame | x 336 | grows with dagre output + 24 padding |
| Candidate nodes | dagre TB, nodesep 24, ranksep 56 | 192x104 |

The golden run's 12 content nodes fit in about 984 x 640 units, so `fitView` (padding 0.06) gives about 0.94 zoom in the 1040 x 736 Studio canvas at 1440 x 900.

### 4.2 Node types (B wraps A's cards)

| Node | Wraps | Visual (all `bg-surface`, 1px `border`, `rounded-lg`, no shadow) | States |
|---|---|---|---|
| `SpecNode` | `SpecCard` compact | Title "Spec", chip name, ports summary in mono ("a[7:0] x4, b[7:0] x4 -> acc[21:0]"), goal "Smallest area", `User` icon tag "Human input" | placed, selected |
| `ArchBlockNode` | `ArchBlockCard` | Block name (`text-sm` 500), one-line reason (`text-xs text-fg-muted`, 1 line, truncated), pin count chip (`Pin` + n), variant summary ("2-stage"), `Hand` icon if moved by user, "Steer" icon button on hover/focus (selects the node) | drafted (skeleton while drafting), replanning (info square blinking + "Replanning"), changed (2px green outline fading over 4 s + "Changed" chip), new (same outline + "New" chip), approved (gate closed), built (after v1 passes: small green square) |
| `GoldenModelNode` | `GoldenModelCard` | `Lock` icon, "Golden model", "16 tests, locked", badge "AI cannot edit"; double border (1px border + 1px inner ring in `--border-strong`) | pending (dashed border, "Locking"), locked |
| `CandidateNode` | `CandidateCard` node variant | Row 1: `StatusSquare`, label "v3" (`text-sm` 700), `OperatorBadge`, right-aligned tag icons (`Star` elite, `Crown` winner). Row 2: reason, 1 line. Row 3 (mono, `text-xs`): tests "16/16", priority metric delta "Area -12.5%", fitness "F 6.8". Diff dot (6px green square, top-right) while a diff is unseen. | drafting (dashed border, skeleton rows, "Writing RTL"), linting/simulating (info square blinking, "Simulating 16 tests"), fail ("FAIL 13/16", fail border), fixing ("Fix attempt 2", fail square + `Wrench`), pass ("PASS 16/16", "Measuring" while synthesizing), measured (metrics row), baseline (tag "Baseline"), elite (`Star` + "Elite"), winner (`Crown`, 2px green border, glow once), rejected (60% opacity, "Rejected after 2 attempts"), selected (2px `--foreground` outline, 2px offset) |
| `ZoneNode` | none | Frame: `bg-[--background]` with 1px dashed `--border`, header label `text-xs` 500 uppercase-free, description `text-xs text-fg-subtle` | static |

Status always reads as square + icon or word + color; never color alone.

### 4.3 Edges

| Kind | Style | Label |
|---|---|---|
| plan | smoothstep, 1px `--edge` | none |
| lineage | smoothstep, 1px `--edge`; animated dashes while the child is drafting or simulating (static under reduced motion) | none |
| checks | 1px dotted `--edge` | "checks every version" |
| proof | 1.5px dashed `--edge-proof` | "Proven equal (EQY)" |

### 4.4 Inspector tabs (version selected)

| Tab | Content | Empty or N/A state |
|---|---|---|
| "RTL" | `CodeView` language verilog, filename "v3.v", line numbers, "Copy" button, footer "38 lines" | "v6 has no RTL yet. The agent is writing it." |
| "Diff" | Compare selector (`ToggleGroup`): "From parent (v1 to v3)" and, if fixed, "Fix (attempt 1 to 2)". `CodeDiff` with +/- gutter symbols, line counts "+6 -2". Heading: the attempt's reason. | v1: "v1 is the first version. Its fix is under Fix (attempt 1 to 2)." |
| "Tests" | Summary per attempt: "Attempt 1: 13 of 16 passed" (FAIL badge) then "Attempt 2: 16 of 16 passed" (PASS badge); `ExpectedVsGotTable` columns "Test", "Inputs", "Expected", "Got", "Cycle" (mono values, mismatching characters bold); "Agent's diagnosis:" paragraph; lint row "Lint: pass (Verilator)"; footer "Checked against the locked golden model (16 tests)." | Simulating: skeleton rows + "Running 16 tests." |
| "PPA" | `PpaTable` rows Area, Cells, Clock period, Fmax, Power with value and delta vs v1; `FitnessBreakdown` ("Fitness 6.8 = 0.60 x area +12.5 + 0.25 x timing -7.8 + 0.15 x power +8.3"); `EqyBadge` if run; `HonestyNote` "Relative to our own v1, open-source tools (Yosys, OpenROAD, Nangate45). Not signoff."; `SampleDataBadge` if sample | FAIL/rejected: "Not measured. Versions that fail the locked tests are never synthesized." Baseline: deltas show "baseline". |

---

## 5. Reusable component inventory

Layer key: **P** primitive (shadcn), **D** domain (presentational), **N** canvas node or canvas, **S** section. All props are TypeScript-ish; types come from `ARCHITECTURE.md` section 5. Domain components take data and callbacks only (no store, no fetch, no router).

### 5.1 Primitives (P, generated by S with `npx shadcn@latest add ...`)

| Name | Variants used | Pages |
|---|---|---|
| `Button` | `default` (Verity Green, navy text; one per screen), `secondary` (surface-2), `outline`, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`, `icon` | all |
| `Badge` | `default`, `secondary`, `outline` (status badges are domain components built on it) | all |
| `Tabs` | inspector tabs, diff compare | Studio |
| `Tooltip` | every icon-only control, rail items, counters | all |
| `Separator`, `ScrollArea`, `Skeleton` | layout, inspector scrolling, loading | all |
| `ToggleGroup`, `Toggle` | priority radio, variant toggles, speed 1x/2x, diff compare | Studio, Try |
| `Switch` | Autopilot | Studio |
| `Slider` | replay scrubber | Studio |
| `Table` | expected vs got, PPA, ranking | Studio, Results |
| `RadioGroup` | preset picker | Try |
| `Progress` | credits meter, countdown ring fallback | Studio |
| `Sheet` | inspector on narrow screens | Studio |

### 5.2 Brand and domain components (owner A unless noted)

| Name | Layer | Purpose | Props | Variants | States | Used on |
|---|---|---|---|---|---|---|
| `Wordmark` | D | "Verity" with green square tittle | `{ size?: "sm" \| "md" \| "lg" \| "display"; className?: string }` | 4 sizes | static | all |
| `PoweredBy` | D | "NVIDIA Nemotron on Nebius Token Factory" text credit | `{ layout?: "inline" \| "stacked" }` | inline, stacked | static | Landing, Results |
| `StatusSquare` | D | The square status indicator | `{ status: VisualStatus; size?: "sm" \| "md"; animate?: boolean; label?: string }` where `VisualStatus = "idle" \| "queued" \| "running" \| "pass" \| "fail" \| "warn" \| "rejected" \| "locked" \| "done"` | sm 8px, md 10px | blink (running), pop (on change), static under reduced motion | all |
| `StatusBadge` | D | Square + icon + word (+ tests) | `{ status: CandidateStatus \| StageStatus \| "locked"; tests?: { passed: number; total: number }; size?: "sm" \| "md" }` | sm, md | every CandidateStatus | Studio, Results |
| `OperatorBadge` | D | Creating operator or FIX | `{ by: CreatedBy \| "FIX"; size?: "sm" \| "md" }` | INIT ("First draft", `FileCode`), SIMPLIFY (`Minimize2`), OPTIMIZE (`Gauge`), EXPLORE (`Compass`), FIX (`Wrench`) | static | Studio, Results |
| `CandidateTag` | D | Role tags | `{ tag: "baseline" \| "elite" \| "winner" \| "rejected" \| "fixed"; count?: number; by?: "ai" \| "user"; local?: boolean }` | per tag | winner (ai), winner (your pick) | Studio, Results |
| `MetricDelta` | D | Value and % vs v1 with direction | `{ metric: "area" \| "clockPeriod" \| "power" \| "fmax"; value: number \| null; baseline: number \| null; showValue?: boolean; size?: "sm" \| "md" }` | sm, md | better (pass + `ArrowDown`), worse (warn + `ArrowUp`, "(slower)" for period), neutral (< 0.5%), baseline, not measured | Studio, Results, Landing |
| `PpaTable` | D | Metric table for one version | `{ ppa: PPA \| null; baseline: PPA \| null; status: CandidateStatus; isBaseline: boolean; sample: boolean }` | | measured, baseline, not measured | Studio |
| `PpaDeltaChart` | D | v1 vs winner bars (plain SVG, v1 = 100) | `{ baseline: PPA; candidate: PPA; baselineLabel: string; candidateLabel: string; sample: boolean }` | | missing metric row shows "not measured" | Results |
| `FitnessBreakdown` | D | Shows the formula with numbers | `{ fitness: Fitness \| null; status: CandidateStatus }` | | scored, baseline, unranked | Studio, Results |
| `CodeView` | D | Read-only code with line numbers, Verilog highlighting via `lib/verilog/highlight.ts` | `{ code: string; language: "verilog" \| "python" \| "text"; filename?: string; highlightLines?: number[]; maxHeight?: string; copyable?: boolean }` | | empty, copied ("Copied" for 2 s) | Studio |
| `CodeDiff` | D | Unified line diff (jsdiff `diffLines`) | `{ before: string; after: string; beforeLabel: string; afterLabel: string; language?: "verilog" \| "text" }` | | no changes ("No changes"), added/removed rows with + and - symbols and `--diff-add` / `--diff-del` fills | Studio |
| `ExpectedVsGotTable` | D | Failing cases table + diagnosis | `{ verification: Verification; attemptLabel?: string }` | | all passed ("All 16 tests passed."), failures, lint fail ("Lint failed. Simulation did not run.") | Studio, Landing (1 row mini) |
| `EqyBadge` | D | Equivalence result | `{ eqy?: Equivalence; againstLabel: string; size?: "sm" \| "md" }` | sm, md | proven ("Proven equal to v1"), not_equivalent ("Not equal to v1"), inconclusive ("Proof inconclusive"), not_run / undefined ("Not checked in this recording" or "Not checked yet") | Studio, Results, Landing |
| `HumanInputsCounter` | D | "Human inputs: N" with tooltip list | `{ items: { label: string; local?: boolean }[] }` | | 1, many, includes local | Studio, Results |
| `CreditsMeter` | D | Spend vs cap | `{ mode: RunMode; usedUsd: number; capUsd: number \| null; recordedUsd?: number }` | replay text, live meter | normal, above 80% (warn), cap reached (warn, full) | Studio, Results |
| `ModeBadge` | D | Replay or Live | `{ mode: RunMode; connection?: "connecting" \| "open" \| "retrying" \| "closed" \| "error" }` | replay, live | live connecting/retrying (blinking info), error (fail) | Studio, Results |
| `SampleDataBadge` | D | Marks placeholder numbers | `{}` (tooltip: "Placeholder numbers until the real run is recorded. Not results.") | | static | Landing, Studio, Results |
| `HonestyNote` | D | The baseline and tools label | `{ variant?: "inline" \| "block"; tools?: string[] }` default text "Relative to our own v1, open-source tools." | inline, block | static | Studio, Results, Landing |
| `AutopilotSwitch` | D | Autopilot toggle | `{ on: boolean; onChange?: (on: boolean) => void; readOnly?: boolean }` | | on, off, read-only (replay) | Studio |
| `CountdownGate` | D | Plan approval countdown | `{ state: "counting" \| "held" \| "waiting" \| "closed"; remainingMs: number; totalMs: number; readOnly?: boolean; onBuildNow?: () => void; onHold?: () => void; onResume?: () => void }` | | counting, held, waiting (autopilot off), read-only (replay) | Studio |
| `CaptionLine` | D | Narration line, mirrored to a polite live region | `{ text: string \| null; chapter?: string; announce?: boolean }` | overlay, inline | empty (renders nothing), crossfade on change | Landing, Studio |
| `StageRail` | D | Pipeline status rail | `{ stages: StageView[]; onSelect?: (id: StageId) => void; orientation?: "horizontal" \| "vertical"; density?: "full" \| "compact" }`, `StageView = { id: StageId; label: string; status: StageStatus; detail?: string; hint: string }` | horizontal full (Studio), horizontal compact (Landing), vertical (narrow) | pending, active (blink), done, failed, skipped | Landing, Studio |
| `ReplayBar` | D | Replay transport | `{ status: "loading" \| "ready" \| "playing" \| "paused" \| "ended" \| "error"; tMs: number; durationMs: number; chapters: Chapter[]; speed: 1 \| 2; onPlay(): void; onPause(): void; onSeek(tMs: number): void; onRestart(): void; onSpeed(s: 1 \| 2): void; onSkipToEnd(): void }` | | loading (disabled), playing, paused, ended ("Watch again") | Studio |
| `LiveBar` | D | Live transport | `{ connection: string; elapsedMs: number; usedUsd: number; capUsd: number \| null; round: number; totalRounds: number \| null; onStop(): void; stopping?: boolean }` | | connecting, open, retrying, stopping | Studio |
| `RunCompleteBar` | D | End-of-run bar | `{ outcome: "complete" \| "partial" \| "no_winner"; winnerLabel: string \| null; onSeeResults(): void; onDownload(): void; onReplay?: () => void }` | | per outcome | Studio |
| `CandidateCard` | D | One version's visual (reused by node, rows, hero) | `{ candidate: Candidate; baseline: PPA \| null; priority: Priority; variant: "node" \| "row" \| "hero"; isWinner: boolean; winnerBy?: "ai" \| "user"; selected?: boolean; diffUnseen?: boolean; actions?: ReactNode }` | node (192x104), row (Results mobile, lists), hero (inspector header, Results winner) | every CandidateStatus plus baseline, elite, winner, selected | Studio, Results, Landing (narrow) |
| `ArchBlockCard` | D | One plan block's visual | `{ block: PlanBlock; status: "drafting" \| "drafted" \| "replanning" \| "approved" \| "built"; diff?: "new" \| "changed"; movedByUser?: boolean; readOnly?: boolean; onSteer?: () => void }` | | per status, diff outline | Studio, Landing (canvas) |
| `SpecCard` | D | Spec summary | `{ spec: Spec; variant: "node" \| "full" }` | node, full | static | Studio, Try (`SpecPreview`) |
| `GoldenModelCard` | D | Locked answer key | `{ testCount: number; files: string[]; status: "pending" \| "locked"; variant: "node" \| "full" \| "mini" }` | node, full, mini (Landing trust row) | pending, locked | Studio, Landing |
| `CandidateList` | D | Accessible list of all versions | `{ items: { id: string; label: string; status: CandidateStatus; createdBy: CreatedBy; fitness: number \| null; tags: string[]; hidden?: boolean }[]; selectedId: string \| null; onSelect(id: string): void }` | | empty ("No versions yet."), selected | Studio |
| `BlockSteerPanel` | D | Pins and variant toggles for a block | `{ block: PlanBlock; readOnly: boolean; pending?: boolean; onApply(change: { pins: string[]; variants: Record<string, string> }): void }` | | read-only (replay, shows recorded values + "Recorded human input"), editable, pending ("Replanning") | Studio |
| `PresetOption` | D | One preset as a radio card | `{ preset: Preset; value: string; recommended?: boolean }` (rendered inside `RadioGroup`) | | default, checked, focus | Try |
| `PriorityRadio` | D | Goal choice | `{ value: Priority; onChange(p: Priority): void; disabled?: boolean }` labels "Smallest area", "Fastest clock", "Lowest power" | | selected, disabled | Try, Studio (spec body, read-only) |
| `Callout` | D | Banner for state messages (full border + tinted fill, no side stripe) | `{ tone: "info" \| "warn" \| "fail" \| "pass"; title: string; body?: ReactNode; actions?: ReactNode }` | 4 tones | static | Studio, Try, Results |
| `EmptyState` | D | Teaching empty or error block | `{ title: string; body?: string; action?: ReactNode }` | | static | all |
| `RunLedger` | D | Definition-list summary (not a hero metric grid) | `{ rows: { label: string; value: ReactNode; hint?: string }[] }` | | static | Results |

`Preset` type (S, `lib/contracts/presets.ts`): `{ id: string; title: string; oneLine: string; spec: Spec; approxMinutes: number; recommended?: boolean }`.

### 5.3 Canvas (owner B)

| Name | Layer | Purpose | Props | Variants | States | Used on |
|---|---|---|---|---|---|---|
| `RunCanvasLazy` | N | Client wrapper that loads `RunCanvas` with `next/dynamic` and `ssr: false`; sections use this one | same props as `RunCanvas` | | skeleton while loading | Landing, Studio |
| `RunCanvas` | N | React Flow wrapper reading `useCanvas()` | `{ variant: "studio" \| "theater"; interactive: boolean; overlay?: ReactNode; onOpen?: () => void }` (`onOpen` = click handler in theater mode) | studio (controls, selection, drag), theater (read-only, no controls) | loading skeleton (dynamic import fallback), ready | Landing, Studio |
| `SpecNode` | N | Wraps `SpecCard` node + source handle | `NodeProps<VerityNode>` | | see 4.2 | Studio, Landing |
| `ArchBlockNode` | N | Wraps `ArchBlockCard` + handles | `NodeProps<VerityNode>` | | see 4.2 | Studio, Landing |
| `GoldenModelNode` | N | Wraps `GoldenModelCard` + source handle | `NodeProps<VerityNode>` | | see 4.2 | Studio, Landing |
| `CandidateNode` | N | Wraps `CandidateCard` node + target/source handles | `NodeProps<VerityNode>` | | see 4.2 | Studio, Landing |
| `ZoneNode` | N | Zone frame with header | `NodeProps<VerityNode>` | plan, tree | hidden-count header | Studio, Landing |
| `nodeTypes` | N | Module-level map `{ spec, block, golden, candidate, zone }` | | | | |

### 5.4 Sections (owner C)

| Name | Purpose | Composes | Used on |
|---|---|---|---|
| `AppHeader` | 56px bar: wordmark, context slot, actions slot | `Wordmark`, `Separator` | Studio, Try, Results |
| `LandingNav` | Landing top nav | `Wordmark`, `Button` | Landing |
| `HeroSection` | Copy column + `HeroReplay` | `Button`, `StageRail`, `RunCanvas`, `CaptionLine`, `SampleDataBadge`, `useReplayDriver` | Landing |
| `LoopSection` | Five-station loop line | `StatusSquare` (Prove only, pass) | Landing |
| `TrustSection` | Three numbered claims with evidence | `GoldenModelCard` mini, `MetricDelta`, `EqyBadge`, `HonestyNote` | Landing |
| `LimitsSection` | What Verity will not do | text | Landing |
| `SiteFooter` | Credits and links | `Wordmark`, `PoweredBy` | Landing |
| `StudioView` | Client root: reads `?run`, picks replay or live driver | `useReplayDriver` or `useLiveRun`, children below | Studio |
| `StudioTopBar` | Run context and controls in `AppHeader` | `ModeBadge`, `SampleDataBadge`, `HumanInputsCounter`, `CreditsMeter`, `AutopilotSwitch`, `Button` | Studio |
| `StudioWorkspace` | The 4-row grid | `StageRail`, `RunCanvas`, `CountdownGate`, `CaptionLine`, `InspectorPanel`, `ReplayBar` / `LiveBar` / `RunCompleteBar`, `RunBanner` | Studio |
| `InspectorPanel` | Selection to body + tabs | `CandidateCard`, `BlockSteerPanel`, `SpecCard`, `GoldenModelCard`, `CandidateList`, `Tabs`, `CodeView`, `CodeDiff`, `ExpectedVsGotTable`, `PpaTable`, `FitnessBreakdown`, `EqyBadge`, `HonestyNote` | Studio |
| `RunBanner` | Cap, error, stopped messages | `Callout`, `Button` | Studio |
| `RunStoryMobile` | Narrow-screen run story | `StageRail` vertical, `CaptionLine`, `CandidateCard` row, `ReplayBar` | Studio, Landing (narrow hero) |
| `TryView` | Try page body | `ComposerForm`, `SpecPreview`, `LiveUnavailable` | Try |
| `ComposerForm` | Preset + goal + start | `RadioGroup`, `PresetOption`, `PriorityRadio`, `Button`, `Callout` | Try |
| `SpecPreview` | What the agent receives | `SpecCard` full, `GoldenModelCard` mini | Try |
| `LiveUnavailable` | Offline or budget state | `Callout`, `Button` | Try |
| `ResultsView` | Results page body | below | Results |
| `WinnerPanel` | Winner card, deltas, proof | `CandidateCard` hero, `MetricDelta`, `EqyBadge`, `HonestyNote`, `SampleDataBadge`, `PpaDeltaChart` | Results |
| `RankingTable` | Every version ranked, override | `Table`, `StatusBadge`, `OperatorBadge`, `MetricDelta`, `CandidateTag`, `Button` | Results |
| `RunSummaryPanel` | Ledger of the run | `RunLedger`, `HumanInputsCounter`, `CreditsMeter`, `PoweredBy` | Results |
| `ExportPanel` | Zip download | `Button`, `lib/export/zip.ts` (B) | Results, Studio (`RunCompleteBar` action) |

### 5.5 Pages (owner C)

`app/page.tsx` (Landing sections), `app/studio/page.tsx` (`<Suspense fallback={<StudioSkeleton/>}><StudioView/></Suspense>`), `app/try/page.tsx`, `app/results/page.tsx`, `app/not-found.tsx`. Pages contain no logic beyond composition and metadata.

---

## 6. Try live `/try`

**Purpose.** Start a capped live run from a preset. **Primary user:** judge who wants proof it is real; engineer. **Primary action:** "Start live run".

### 6.1 Layout at 1440 x 900

```
+--------------------------------------------------------------------------------------------+
| [Verity]                                                         [Watch the recorded run]   | 56 AppHeader
+--------------------------------------------------------------------------------------------+
|        Run Verity live                                                                      |
|        Pick a chip and a goal. Live runs use presets and a credit cap, so every run         |
|        finishes on budget. Autopilot is on: watch, or steer if you like.                    |
|                                                                                             |
|        1  Choose a chip                              |  What the agent receives             |
|        (o) 4-lane MAC array, 8-bit                   |  SpecCard full: English text, ports, |
|            Same chip as the recorded run.            |  goal                                |
|        ( ) 4x4 matrix multiply, 8-bit                |  GoldenModelCard mini: "16 tests,   |
|        ( ) 8-bit ALU                                 |  locked. The agent cannot edit them."|
|            Smallest design, quickest run.            |  "Up to 300 lines of Verilog."       |
|                                                      |                                      |
|        2  Choose a goal                              |                                      |
|        [ Smallest area ][ Fastest clock ][ Lowest power ]                                   |
|                                                      |                                      |
|        Credit cap for this run: $0.50. About 6 minutes. You can stop at any time.            |
|        [Start live run]    or  Watch the recorded run (free)                                 |
+--------------------------------------------------------------------------------------------+
```

Two columns inside `max-w-[64rem]`: form 7 columns, preview 5 columns (sticky). Numbered step labels are plain digits in `text-fg-subtle`, not badges.

### 6.2 States

| State | What shows |
|---|---|
| Checking | On mount, `GET /health`. Form renders immediately; "Start live run" shows "Checking live availability" and is disabled for up to 3 s. |
| Ready | Form enabled; MAC array preselected; priority "Smallest area". |
| Not configured | `NEXT_PUBLIC_AGENT_URL` unset: `LiveUnavailable` replaces the form button area: `Callout` info "Live runs are offline right now." body "The recorded run shows the same loop and costs nothing." action "Watch the recorded run" (primary). Presets stay visible for reading. |
| Budget exhausted | health `reason: "budget_exhausted"`: `Callout` warn "Today's live budget is used up." body "Live runs open again tomorrow. The recorded run shows the same loop." action "Watch the recorded run". |
| Busy | `429` or `reason: "busy"`: `Callout` info "Another live run is in progress." body "Live runs are limited so every run stays on budget. Try again in a few minutes." actions "Try again", "Watch the recorded run". |
| Starting | Button "Starting..." disabled; on `201` navigate to `/studio?run=<runId>`. |
| Start error | `Callout` fail "Could not start the run." body "{reason or 'The agent did not respond.'}" actions "Try again", "Watch the recorded run". |

### 6.3 Interactions and copy

- Presets are a `RadioGroup` (arrow keys move, Space selects). Selecting updates `SpecPreview`.
- `PriorityRadio` is a single-select `ToggleGroup`. Labels: "Smallest area", "Fastest clock", "Lowest power".
- Start sends `POST /runs { presetId, priority }`. This is human input 1 ("the spec").
- Free-text specs are not offered in the MVP (stretch). No disabled text box is shown.
- H1 (`text-2xl` 700): "Run Verity live". Intro as in the wireframe. Cap line: "Credit cap for this run: ${capUsd}. About {approxMinutes} minutes. You can stop at any time." (cap from `/health`, default text "$0.50" only if health omits it). Secondary: "Watch the recorded run (free)".

---

## 7. Results `/results`

**Purpose.** The end card: what won, by how much, how we know, and the download. **Primary user:** judge (end of story), engineer (export). **Primary action:** "Download design (.zip)".

### 7.1 Layout at 1440 x 900

```
+--------------------------------------------------------------------------------------------------+
| [Verity] / 4-lane MAC array, 8-bit   [Replay] [Sample data]                    [Back to the run] | 56
+--------------------------------------------------------------------------------------------------+
| Results                                                                                          |
| +------------------------------------------------------------+ +-------------------------------+ |
| | [Crown] Winner: v5                   Picked by fitness      | | Run summary                   | |
| | OPTIMIZE from v3. "Trimmed pipeline registers to the widths | | Winner tests   16 of 16 pass  | |
| |  the math needs."                                           | | Versions tried 6 (1 rejected) | |
| | [ShieldCheck] Proven equal to v1 (Yosys EQY)                | | Rounds         2              | |
| | Area          1,520 um2    -17.4%                           | | Fixes applied  2              | |
| | Clock period  3.38 ns      +5.6% (slower)                   | | Human inputs   2              | |
| | Power         1.66 mW      -13.5%                           | | Cost           $0.00 replay   | |
| | Relative to our own v1, open-source tools. Not signoff.     | |  (recorded run: $0.42)        | |
| | PpaDeltaChart: v1 = 100 bars vs v5, three rows              | | Model   NVIDIA Nemotron on   | |
| +------------------------------------------------------------+ |         Nebius Token Factory  | |
| | All versions                                               | | Tools   iverilog, cocotb,     | |
| | #  Version  Made by   From  Tests  Area   Period Power Fit  | |         Yosys, OpenROAD, EQY  | |
| | 1  v5 [W]   OPTIMIZE  v3    16/16  -17.4% +5.6% -13.5% 11.1| +-------------------------------+ |
| | 2  v3 [E]   OPTIMIZE  v1    16/16  -12.5% +7.8% -8.3%  6.8 | | Download                      | |
| | 3  v2 [E]   SIMPLIFY  v1    16/16  -8.2%  -0.6% -4.2%  5.7 | | [Download design (.zip)]      | |
| | 4  v1 [B]   First     none  16/16  base   base  base   0   | | Contains: v5.v (winner), v1.v | |
| | 5  v4       EXPLORE   v1    16/16  +6.0%  -15.6% +6.8% -0.7| | (baseline), testbench, golden | |
| | -  v6       SIMPLIFY  v2    15/16  rejected                 | | model, synthesis and EQY      | |
| +------------------------------------------------------------+ | reports, run log (JSON)       | |
|                                                                 +-------------------------------+ |
+--------------------------------------------------------------------------------------------------+
```

Main column 8 of 12, side column 4. Page scrolls if needed (unlike Studio). Ranking rows show a "Make winner" ghost button on hover/focus for measured, non-winner rows.

### 7.2 States

| State | What shows |
|---|---|
| Loading | Skeletons for winner card, table rows, ledger. |
| Replay (golden) | Data from the replay store if already loaded, otherwise loads and fast-applies the whole fixture (`instant`). `SampleDataBadge` while sample. |
| Live complete | Data from the live store (same session). |
| Partial (cap, stopped, error) | `Callout` warn or info at top: "Partial run: stopped during round 1." Winner card titled "Best so far: v3". |
| No winner | `Callout` fail "No version passed the locked tests." body "The run log and every attempt are still in the download." Winner card and chart hidden; table shows all versions with FAIL. Zip still offered (logs, RTL attempts). |
| Override applied | Winner card tag "Winner (your pick)"; "AI pick: v5 (fitness 11.1)" line; EQY badge per availability. |
| Live run gone | Fresh page load on a live id with no store data and agent unreachable: `EmptyState` "This live run is not available anymore." actions "Watch the recorded run", "Try live". |
| Export in progress / done / failed | Button "Preparing zip..." then browser download; failure `Callout` fail "Could not build the zip." action "Try again". |

### 7.3 Copy

- H1 (`text-2xl` 700): "Results". Winner title (`text-3xl` 700): "Winner: v5". Picker line: "Picked by fitness" or "Picked by you (AI pick: v5)".
- Metric labels: "Area", "Clock period", "Power", "Cells", "Fmax". Regression suffix: "(slower)", "(larger)", "(more power)".
- Ledger labels as in the wireframe. Cost tooltip: "Replays cost nothing. This shows what the original recorded run spent."
- Export button: "Download design (.zip)". File name: `verity-<runId>.zip`. Contents line as in the wireframe. Zip includes a `README.txt` with the honesty note and, while sample, "SAMPLE DATA: placeholder files for UI development."
- Override confirm (inline row): "Make v3 the winner? Its fitness is 6.8; v5 has 11.1." "Confirm" / "Cancel".

---

## 8. Not found

`AppHeader` + `EmptyState`: title "This page does not exist.", body "The recorded run is a good place to start.", action "Watch the recorded run" (primary) and link "Go to the home page".

---

## 9. Accessibility (WCAG 2.2 AA)

- **Contrast:** use only token pairs from `brand.md` 1.4 (all pass). `--fg-disabled` only for disabled controls.
- **Not color alone:** every status = `StatusSquare` + icon or word; deltas = arrow icon + sign + color; diff rows = `+`/`-` gutter symbols + fill; edges = labels where meaning matters (checks, proof).
- **Keyboard:**
  - Tab order Studio: header controls, stage rail items (buttons), canvas (React Flow `nodesFocusable`; Tab/Shift+Tab moves between nodes, Enter selects), inspector, bottom bar.
  - Shortcuts (Studio, only when focus is not in a text field): Space play/pause, Left/Right previous/next chapter, `1`/`2` speed, Escape clears selection. Listed in a "Keyboard shortcuts" tooltip on the replay bar.
  - `deleteKeyCode={null}` so Backspace never deletes nodes.
  - React Flow removes the outline on focused nodes; `globals.css` restores a 2px Verity Green focus ring (`brand.md` 1.5). Check it by tabbing through the canvas.
  - Every action reachable without dragging. Block steering lives in the inspector.
  - `CandidateList` in the inspector is the non-canvas way to reach every version.
- **Screen readers:** `CaptionLine` mirrors captions into `aria-live="polite"` (only stage changes, pass/fail results and run end, at most one announcement per 2 s). Canvas node components include a visually hidden summary, e.g. "Version v3, OPTIMIZE from v1, passed 16 of 16 tests, area 12.5% smaller than v1, elite." `Wordmark` exposes "Verity". Icon-only buttons have `aria-label`. React Flow's `ariaLabelConfig` gets plain-English strings ("Zoom in", "Fit the whole run in view").
- **Timing:** countdown is adjustable (Hold, Build now, Autopilot off). Auto-playing replay has a pause control on both Landing and Studio.
- **Motion:** `prefers-reduced-motion` handled per `brand.md` section 4.
- **Targets:** at least 24 x 24 px for every interactive element; primary buttons 40px tall; rail items 36px tall.
- **Zoom:** layouts hold at 200% browser zoom (Studio switches to the 1024 layout naturally).
- **Language:** `<html lang="en">`.

---

## 10. Responsive rules (desktop first)

| Width | Landing | Studio | Try | Results |
|---|---|---|---|---|
| >= 1280 | As designed: split hero with bleeding canvas | As designed: canvas + 400px inspector | Two columns | Two columns |
| 1024 to 1279 | Hero split 6/6, canvas frame no bleed | Inspector becomes a right `Sheet` (360px) opened on selection; rail shows labels only for done/active items, others as squares with tooltips | Two columns | Two columns, side column narrower |
| 768 to 1023 | Hero stacks: copy, then canvas full width at 16:10 | Canvas full width; inspector `Sheet`; bottom bar hides "Skip to results" text (icon + tooltip) | One column, preview below form | One column: winner, summary, table, download |
| < 768 | Hero: copy, CTAs, then `RunStoryMobile` (vertical `StageRail` + `CaptionLine` + current `CandidateCard` row) instead of the canvas | `RunStoryMobile`: vertical rail, caption, list of versions as `CandidateCard` rows (tap opens a full-screen `Sheet` with the same tabs), `ReplayBar` compact; note "Open on a laptop to see the full canvas." | One column | `RankingTable` becomes stacked `CandidateCard` rows |

Narrow screens get the full story and data, just not the canvas. Live runs may be started on phones.

---

## 11. Motion choreography

Tokens and rules: `brand.md` section 4. Specific moments:

1. **Landing first paint:** H1 lines fade and rise 4px with 60ms stagger (under 500ms total); the replay starts 600ms after first paint.
2. **Node enters:** `animate-node-enter` (220ms). Suppressed when `ui.instant` (seeks).
3. **Status change:** border and fill crossfade 200ms; `StatusSquare` pops once on PASS or FAIL.
4. **Running:** status square blinks; lineage edge into a drafting or simulating node animates (React Flow `animated`).
5. **Agent change:** changed or new block gets a 2px Verity Green outline that fades over 4 s (`animate-diff-outline`, element has `outline-2 outline-offset-2 outline-solid`).
6. **Tree growth:** `fitView` with 320ms duration, unless the user zoomed or panned in the last 10 s.
7. **Winner:** `animate-winner-glow` once, then the static `--glow-pass` ring stays on the winner only.
8. **Caption:** crossfade 150ms between lines.
9. **Inspector:** tab switch has no animation; `Sheet` slides 320ms ease-out-expo on narrow screens.

Nothing else moves.

---

## 12. Demo guardrails (MVP acceptance rules)

| Guardrail | How the UI guarantees it | Check |
|---|---|---|
| Never a blank canvas | Replay: first event at 0 ms places the spec node; loading shows skeleton nodes. Live: preset spec node placed client-side before the first server event; skeleton blocks while drafting. Fixture error shows an `EmptyState`, not an empty grid. | Load `/` and `/studio` with throttled network: something meaningful is visible in the canvas frame at every moment. |
| About 12 visible nodes at most | Visibility budget in `lib/canvas/visibility.ts` (hide rejected, then old non-elite); `CandidateList` still lists all. Golden run is exactly 12. | Count content nodes in the final frame: 12. |
| Every AI change shows a diff | RTL changes: Diff tab entry + diff dot on the node. Plan changes: changed/new outline + chip, `plan.lastDiff` listed in the block inspector ("Changed in replan 2: pipeline none to 2-stage"). Captions announce each change. | Step through the replay: every red-to-green and every replan has a visible diff. |
| Clicks alone finish the story | No action requires drag or typing; block steering in the inspector; "Skip to results" and "See results" buttons; keyboard path tested. | Complete Landing to zip download using only clicks (and separately only keyboard). |
| No live LLM call on the replay path | Replay reads only `/runs/golden.json`; `replay.ts` and `use-replay-driver.ts` never import `live.ts` or read `AGENT_URL`. | Grep check (`ARCHITECTURE.md` section 13); DevTools network shows no requests after the fixture. |
| Honest numbers | Every metric surface includes `HonestyNote`; `SampleDataBadge` whenever `sample`; no paper numbers anywhere. | Visual check of Landing trust row, Studio PPA tab, Results. |
| Nothing blocks | Autopilot default on; gate auto-continues; winner auto-picked; steering never pauses the run. | Watch the replay without touching anything: it reaches "Run complete". |

---

## 13. MVP vs stretch

| Page | MVP (by 2026-10-25) | Stretch |
|---|---|---|
| Landing | Hero with auto-playing replay, pause, CTAs, loop, trust, limits, footer, narrow-screen story | Scroll-linked chapter highlights, short muted demo video fallback |
| Studio | Stage rail; Plan Board + Evolution Tree canvas (tree and chain); all node states; inspector with RTL, Diff, Tests (expected vs got), PPA; replay bar; live bar with credits; countdown gate with Build now / Hold / Autopilot; pins and variant toggles UI (sends steer; replan depends on the agent); winner override; Human inputs counter; banners for cap, error, stop; narrow story mode | Waveform viewer (Surfer); netlist or layout image; "pin + explore note" on tree cards; operator menu; drag-to-fuse; fork a live run from a replay card; free-text steering on a selected block |
| Try live | Preset radio (2 to 3 presets), priority, cap line, start, all availability states | Free-text spec; editable presets |
| Results | Winner card, deltas, EQY badge, v1-to-winner chart, ranking with override, ledger, zip export, partial and no-winner states | Share replay link (`?run=&at=`); GitHub PR export; Pareto view |
| 404 | Static page | none |

---

## 14. Open questions

1. **Showcase chip.** 4x4 matrix multiply or the small MAC array (`REPORT.md` open decision). The sample data uses a 4-lane MAC; the UI is chip-agnostic, but presets and the recorded run depend on it.
2. **Real replanning.** Pins and variant toggles are built in the MVP UI per the locked decision, but whether the agent truly regenerates the plan and RTL from them depends on the backend reaching that point by the 2026-10-18 gate. If not, steer events are accepted and shown as "Queued for the next round" rather than triggering a replan. Needs an owner decision.
3. **Live credit cap and daily budget.** The spec assumes $0.50 per run (from `/health`) and a daily budget that can run out. Real numbers are a team decision.
4. **EQY eligibility.** Versions that change pipeline latency may not prove equal to v1. Decide whether such versions can win, or whether the winner must be EQY-proven (the UI supports both).
5. **Hosting.** Nebius or Vercel (`REPORT.md`). The static export works on both; the agent URL and CORS depend on it.
6. **Links.** GitHub repo URL, Devpost page URL and demo video URL for the footer and nav.
7. **Partner marks.** Text credits only until NVIDIA and Nebius logo usage is checked.
8. **Golden run human input.** The sample fixture records one variant toggle (Human inputs: 2) so the replan and plan-diff code paths get built and tested, and so the replay shows co-planning. The v2 journey map (`.archify/workflow-verity-journey-v2-20261004-014852`) shows "Human inputs: 1" on the summary, which favors a zero-touch recording that proves autonomy more strongly. The UI handles both; the team should pick one before recording the real golden run.
9. **Fonts.** Atkinson Hyperlegible Next and Mono were chosen without user review (rationale in `brand.md` 2.1).

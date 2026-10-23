# Verity: Glossary

The canonical words, one meaning each, no synonyms. Use these in the app, the docs and the code. Plain hardware words are explained in `docs/MEETING.md` section 12 (a history doc whose glossary is still current); this file is for terms Verity itself uses. Requirements: `docs/PRD.md`.

## The product

| Term | Meaning |
|---|---|
| Design partner | What Verity is (D28): it checks a request, runs the engineer's loop, then talks the result through and proposes the next run. It never replaces a step of the loop. |
| Fact check | The reply to a thread's first chip request (`POST /parse`, run inside `POST /threads/{id}/messages`): one verdict set by code, plus research for a hardware request. |
| Class | What code decided the first message is, one of seven: not a chip, question, not digital, too big, in a family, near a family, unsure. The verdict follows from the class; a question gets an answer and no verdict (D41). |
| Research | Up to three web, Scholar and Patents searches built from code templates, ranked by code, summarised by one GLM call that has no tools. |
| Knowledge store | Verity's own database of past research and run outcomes (migration 3). Only technique ids and code-written numbers from it reach Nemotron. |

## Verdicts (the first reply to a description)

A verdict is set by code from the checked class, never by a model alone. Each is a shape plus a word, in ink: a verdict is a read on a request, not a result, so it is never amber.

| Word | Shape | Meaning |
|---|---|---|
| Buildable now | filled square | The request is a chip one of our families can build at these settings. |
| Buildable with changes | square with a dot | Close; Verity proposes different settings. |
| Not buildable here | half-filled square | A real chip, but outside what our families and ranges cover. |
| Not a chip | hollow square | The request is not about hardware. No search runs. |
| Could not check | dashed square | The fact check or research failed. Try again is offered. |

A question about chips or about Verity gets an answer and no verdict (D41). A sixth verdict, Custom block, is planned with custom blocks (D45).

## Sources (research)

| Term | Meaning |
|---|---|
| Source tier | How much a source counts, by its host. The server uses letters: A papers, standards and preprints; B vendor, project and university pages; C open-edit pages such as Wikipedia and GitHub (never enough alone); P Google Patents, from the patents search only. The bench shows words, never letters: paper or standard, vendor, project or university, open source or wiki, patent. A host not on the allowlist is dropped. |
| Citation | An S-number (S1 to S8) that points at one source. Code drops any citation it cannot trace. |
| Technique id | One entry from the fixed per-family list of design ideas (`backend/verity/research/techniques.py`, our own labels and one-line text), for example `carry_lookahead`. A research summary may name one only when a cited source mentions it. Only technique ids reach Nemotron, never web text. |

## Models and roles

| Term | Meaning |
|---|---|
| Planner, writer, fixer | Nemotron 3 Ultra. Plans the design, writes the Verilog, repairs it. |
| Optimizer | Nemotron 3 Super. Proposes smaller or faster versions. |
| Router | Nemotron 3.5 Lightning, thinking off. Sorts a chat message on the ask path after a run when the free keyword rules do not decide. The agent path does not use it. |
| Parser, chat, research summary, memory | GLM 5.3. Reads the first sentence (and turns a change request into knobs), runs the agent loop and words chat answers, summarises search results, writes the thread summary. Never writes Verilog. The summary call has no tools. |
| Token Factory | Nebius's model service that serves all of the above. |

## The run

| Term | Meaning |
|---|---|
| Chip family | A knob family (MAC array, adder, counter, sequence detector) that renders a fresh locked pack for any in-range setting. |
| Knob | One setting of a family (width, lanes, enable and so on) with a server-checked range. |
| Pack | A task pack: the spec, the locked golden model, the locked tests, the human reference design and a hash manifest. |
| Golden model | The human-written answer key the tests compare against. The agent cannot see or edit it. |
| Locked | Hashed and re-checked before every tool call. Nothing in a run can change it. |
| v1 | The first version that passes every test. Every number is stated against it. |
| Version | One design the run wrote or evolved (v1, v2, ...). A version has a label (v4) and an id (c4); the label is display only. |
| Dropped | A version that did not pass, repeated an earlier one, or was proven different from v1. The reason is always given. |
| Winner, kept version | The version with the best measured fitness against v1. v1 can win; then v1 is the kept version. |
| Fitness | The weighted gain in area, clock period and power against v1, from tool output. Higher is better. |
| Human reference | The pack's hand-written design at the same settings, measured with the same tools. The one comparison not stated against v1. |
| Proven equal | Yosys EQY proved the version matches another from reset. Nothing weaker is called proven. |
| Not proven | EQY ran and could not prove it in time. The version still passed every test. |
| Fast and full | Fast stops after v1. Full improves, picks a winner and proves it. |
| Cap | A server-enforced limit (per run, per day, or time). Reaching one ends the run as `cap_reached`. |

## Sign-off

| Term | Meaning |
|---|---|
| Sign-off | The checks every run (fast and full) does on the winner after the result shows (D22). It never delays the result and a stopped run has none. |
| Sign-off sheet | What the sign-off reports (`signoff/<id>.json`): tests on more seeds, lint by tag and latches, proofs against v1 and the human design, test strength. The winner's waveform comes with it. |
| Test strength | How many planted bugs the locked tests catch, for example "caught 19 of 20 planted bugs; 1 proven harmless". Planted bugs that pass the tests are checked with EQY: proven equal is harmless, proven different is a miss, anything else is undecided. |
| Seed | A random start for the testbench. The same locked tests run on 9 seeds (the pack's own plus 8 more). |
| Lint tag | The Verilator warning name (for example WIDTHEXPAND). Warnings never fail a design and are never hidden. |
| Latch | A memory element made by accident. The sheet counts them. |
| Planted bug | A deliberate change to the winner made by a fixed text rule (no model). Caught means the locked tests fail on it. |
| Harmless | A bug that passes the tests and that EQY proves equal to the winner. |
| Undecided | A bug that passes the tests and could not be settled either way. |
| Waveform | One test case cycle by cycle: what the golden model expects next to what the Verilog gave. A mismatch is outlined and named. |

## The bench

| Term | Meaning |
|---|---|
| Bench | The `/bench` chat workspace: chat in the middle, a panel on the right. |
| Chip card | The compact card after the first reply: the knobs, the goal and Run. |
| Version chip | The removable chip in the composer (for example "v4") that makes the next question about that version. |
| Version tab | The right-panel tab about one version, opened by selecting it. |
| Architecture tab | The right-panel tab with the engineer's steps (the rail) and the circuit of the version in view. Expand opens it big. |
| Walkthrough | A code-built tour of the nine steps, moved with Next and Back. It never calls a model. |
| Step | One of spec, plan, RTL, lint, simulate, synthesize, improve, equivalence, sign-off. Assertions and coverage are listed as not run by Verity yet. |
| Proposal | A chat answer to a change request. It starts a run only after Confirm. |

## The chat agent (D41 to D43)

| Term | Meaning |
|---|---|
| Thread | One conversation in the bench, with an id made by the browser. It is kept on the server and in the browser. Its first chip request gets the fact check; after that the thread is never fact-checked again. |
| Agent | The chat after a thread's first chip request: GLM 5.3 acting like a senior RTL and ASIC engineer. It picks tools (`list_blocks`, `research`, `run_facts`, `walkthrough`, `propose_run`, `open_tab`) and shows its steps. It starts no run and writes no Verilog. |
| Tool step | One line of an agent reply that says what a tool did, for example "Looked up the timing of v4". The label is a fixed code phrase; the model's words never reach it. A refused step says why. |
| Facts record | What a thread knows for sure, written only by code: whether it is checked, the verdict, the block and its settings, the research id, the run ids and the proposal that waits for Run. Every agent call gets it. |
| Thread summary | 20 to 40 words about the turns older than the last 10 (a turn is one user message and Verity's reply), made by one call on the `memory` route. The agent reads it as data to save tokens; its numbers never count in an answer. |

## Custom blocks (planned, D45)

| Term | Meaning |
|---|---|
| Custom block | A small block outside the four families that Verity builds inside fixed limits: one module; combinational, or one clock with a synchronous reset; latency 0 to 8; at most 8 ports of 1 to 64 bits; no handshake, memory or second clock. It runs only after the user approves its golden model. |
| Drafted golden model | The golden model of a custom block: Python that GLM 5.3 writes from a spec and worked examples, the sandbox self-checks, and the user locks with Approve. Labelled "Golden model drafted by Verity, approved by you". It is the one golden model that is not human-written. |

## Tools (only what runs)

Yosys (synthesis and interface check), OpenSTA (timing), Verilator (lint), Icarus Verilog with cocotb (simulation), Yosys EQY (equivalence). OpenROAD is not run.

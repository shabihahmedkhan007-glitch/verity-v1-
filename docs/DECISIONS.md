# Verity: Decision log

Append-only. One entry per decision: what was decided, why, what was rejected, and what follows from it. A decision that
changes an earlier one gets a new entry that says which it supersedes; old entries are never rewritten.

D1 to D15 were made before this file existed. They are copied here unchanged from `REPORT.md` section 4 (the table below),
which keeps its own copy as history. Every new decision goes here only, from D16 on. The date is the day it was made.

Precedence when documents disagree (D33): `docs/PRD.md`, then this file, then `backend/CONTRACTS.md` for interfaces, then
the `ARCHITECTURE.md` files, then `docs/UI_UX_SPEC.md`, `docs/brand.md` and `docs/PRODUCT.md`, then `HANDOFF.md` and
`REPORT.md`, then history docs. A conflict is flagged, never reconciled silently.

Entries are numbered in the order they were written, so a later number can carry an earlier date. D3 and D13 are
superseded in part by D31.

## D1 to D15 (copied from REPORT.md, unchanged)

| # | Date | Decision | Why | Alternatives rejected |
|---|---|---|---|---|
| D1 | 2026-09-28 | Enter the Coding & Agentic Engineering track | Track text is "agents that write, run, and test code in Token Factory Sandboxes", an exact fit | Personal AI, Physical AI (no fit) |
| D2 | 2026-09-28 | Product = agent inside a website with a live dashboard | Judges get a URL and a few minutes; past winners were mostly web apps | CLI only, editor plugin / MCP server |
| D3 | 2026-09-28 | Nemotron runs every agent role | 25% of score is use of Nebius + NVIDIA models | Non-NVIDIA model as main brain |
| D4 | 2026-10-01 | Project name: **Verity** (Verilog + verify + "truth") | Original, calm, modern; no chip/hardware tool with that name found in a web search (no trademark search done) | ChipSmith, Siliconsmith, Dieform, Etch, Spec2Silicon, Tapeout Agent, Gatewise, Siliq; Anneal (existing hardware-software company), Reticle (existing AI coding-agent tool), Litho (clashes with NVIDIA cuLitho) |
| D5 | 2026-10-01 | Elevator pitch opens with "Describe a chip in plain English" and says "tests it", not "proves it" | Card preview shows only the first line, so it must add information beyond the title; avoid claiming more than the demo shows | "An autonomous AI hardware engineer: ..." (repeated the title) |
| D6 | 2026-10-04 | UI = one React Flow canvas: Plan Board (AI-drafted blocks, user can drag, pin constraints, toggle variants) + Evolution Tree (candidates with PPA), pipeline as a thin status rail | Gives real co-planning while the agent stays autonomous (Autopilot default, steering never blocks) | Architecture-only canvas (edits may change nothing), pipeline canvas (fake freedom), evolution-only canvas |
| D7 | 2026-10-04 | Opening the URL auto-plays the recorded golden run; live runs are presets only with a credit cap; failures shown as expected vs got; AI picks the winner, user can override; zip export | Zero cost and no blank screen for judges; clicks alone finish the story | Choose-mode landing, spec box first, waveform-first failure view |
| D8 | 2026-10-04 | REvolution-lite: 2 to 4 candidates per round, FAIL vs PASS pools, fitness from measured PPA relative to our own v1, keep best 1 to 2, operators FIX/SIMPLIFY/OPTIMIZE/EXPLORE chosen by heuristic | Keeps the paper's principle within our credit and time budget | Paper-scale population (about 200 evaluations), UCB/softmax operator bandit, reproducing its benchmarks |
| D9 | 2026-10-04 | Brand colors: background #050A12, surface #0B1220, accent Verity Green #39FF88; fonts Atkinson Hyperlegible Next and Mono | Colors chosen by the user; fonts chosen by the planner for legibility of Verilog values (unreviewed by the user) | (none recorded) |
| D10 | 2026-10-04 | Frontend: Next.js 16 static export in `web/` with Tailwind v4, shadcn/ui, @xyflow/react, Zustand, dagre, zod; routes `/`, `/studio`, `/try`, `/results` with `?run=` | Free static hosting, replay path has no server to fail | tldraw (license key), dynamic route segments (not supported by static export) |
| D11 | 2026-10-15 | /studio adopts the landing's datasheet world: AMOLED black, white ink, tiered Verity Green, Archivo and JetBrains Mono, no red (fail is a white hollow square, a dashed line and the word FAIL). This overrides brand.md 1.1's navy studio palette for /studio. The pan and zoom canvas is replaced by a fixed figure ("Figure 1, live"); plan block dragging and replay-mode steering controls are removed (steering stays in live runs) | One visual world from the landing click-through into the run; the self-fix and the numbers must read without panning or clicking | Keep the navy studio palette, restyle React Flow in place, hybrid canvas |
| D12 | 2026-10-16 | Rack world with an amber accent replaces D11 (datasheet theme) and Verity Green. Source: user choice among six mockups in .impeccable/mocks/slipstream (V3 Rack, amber accent). Accent is earned (pass, proven, primary action, focus); running uses pale amber; fail stays a hollow white square plus the word; no red. Known risk: amber reads as warning on instruments, mitigated by shape plus word | One palette and type system across landing, studio, /try and /results | Keep D11 green datasheet; the other five mockups |
| D13 | 2026-10-18 | Amends D7: live runs are chip families with server-checked knob ranges (mac4, add8, cnt8, fsm_seq) instead of fixed presets. Plain English is input only: Nemotron maps a sentence onto a family and knobs via `POST /parse`, the server validates it against the same knob tables, and it never becomes a reference or a test (O9 stays). Shipped ranges are the ones the real-model probe proved (`backend/evals/probe-2026-10-18.md`) | Judges can ask for many chips, every PASS is still checked against a human-written golden model | Free-form chips with AI-drafted references (weak trust story), fixed presets only |
| D14 | 2026-10-18 | A second comparison, "Verity vs human reference", next to the vs-v1 figures: the pack's hand-written `reference.v` at the same knobs, measured with the same tools, plus EQY of the winner against it (`human_ref` event). Labelled separately, shown even when the human design wins; all other numbers stay relative to our own v1 | A memorable, honest headline for judges | Only vs-v1 numbers |
| D15 | 2026-10-18 | Live runs move to `/bench` (judge dashboard); `/try` forwards there. The studio keeps playing finished live runs until a public run-log endpoint exists, then becomes recordings only | One judge-facing page for live runs | Keep live runs inside the studio |

## D16 onward

### D16 (2026-10-22): Each model role has its own route; GLM never writes Verilog

- **Decision:** The planner, the RTL writer and the fixer run on Nemotron 3 Ultra. The optimizer runs on Nemotron 3 Super. The router that sorts each chat message runs on Nemotron 3.5 Lightning with thinking off. The parser (reading the first sentence), the chat answers and the research summary run on GLM 5.3 (`zai-org/GLM-5.3`) with low reasoning effort. All of them are served by Nebius Token Factory.
- **Context:** D3 said Nemotron runs every agent role. The chat after the first message is a different job from engineering, and a capped probe ($0.0016, `backend/scripts/probe_models.py`) chose these routes.
- **Consequences:** Nemotron writes the plan and every line of Verilog; GLM never writes Verilog and has no tools. D3 stands for the engineering loop and is narrowed for the chat roles. The README names which model does what. Routes live in `backend/config.toml`.

### D17 (2026-10-22): A fact check comes before any run, and the verdict is set by code

- **Decision:** `POST /parse` classifies the first message into six classes and a verdict (not a chip, not buildable here, buildable now, buildable with changes, could not check). Code sets the verdict, never the model alone. Every class except "not a chip" runs research.
- **Context:** A judge can type anything. Showing a plain verdict first keeps the demo honest and keeps money off requests that cannot become a chip.
- **Consequences:** Web text reaches only the GLM summary call, which has no tools; code drops unknown citations, URLs, ungrounded numbers and off-list techniques. Only technique ids from a fixed list per family ever reach Nemotron. A verdict is shown as a shape plus a word (`docs/brand.md`). With a real provider and no search key, research is off; it is never faked.

### D18 (2026-10-22): Chat answers take every number from code; a change request needs Confirm

- **Decision:** After a run ends the chat answers questions about it (`POST /runs/{id}/ask`). Selection, drop reasons, timing and cost come from code templates. GLM answers get a facts block, and a number validator checks every figure (one retry, then a code fallback). Verilog is stripped from chat replies. A change request becomes a proposal and starts a run only after the user presses Confirm.
- **Consequences:** A chat answer can be worded by a model but can never invent a number. The walkthrough of a run (D21) is built by code with no model call.

### D19 (2026-10-23): Tavily for general web search, Serper for Google Scholar and Patents

- **Decision:** Research uses Tavily (tavily.com) for general web search and Serper for Google Scholar and Patents. With one key, that service serves all three. With no key, research is off. Both keys (`TAVILY_API_KEY`, `SERPER_API_KEY`) live only in `backend/.env`.
- **Context:** The hackathon has a $3,000 "Best Use of Tavily" bonus that needs a functional runtime call to the Tavily API.
- **Consequences:** The Tavily adapter (`backend/verity/research/tavily.py`) is built and tested against mocked HTTP only. No key was set when this was written, so the real response shape, domain filtering and credit counting are unconfirmed until one real `POST /parse` runs with a key. The research cost line counts Tavily and Serper searches together.

### D20 (2026-10-23): Selecting a version attaches it to the chat and opens a tab about it

- **Decision:** Selecting a version (v1, v4 and so on) puts a removable chip such as "v4" in the composer and opens a right-side panel tab about that version. It does not post a card into the chat. Ask sends the label as `focusVersion`.
- **Context:** The user's comment on the plan: "it opens a tab right side.. can be about it or something". This replaces the plan's version-card message.
- **Consequences:** The chip is its own state, apart from the panel selection, so removing the chip leaves the panel alone. All numbers on the version tab come from run data and are stated against our own v1.

### D21 (2026-10-23): The step view is a right-panel tab with Expand for a big view

- **Decision:** The Architecture tab shows the engineer's steps (spec, plan, RTL, lint, simulate, synthesize, improve, equivalence, sign-off) and the real circuit of the version in view. Expand moves it into the main area with the composer still under it. "Walk me through it" in the chat returns a code-built walkthrough with no model call, and its highlight is separate from the reader's own picks.
- **Context:** The user chose the right-panel tab over a main-area mode that swaps with the chat, so the chat stays visible.
- **Consequences:** Plan blocks are an ordered list, not wires, and the view says so until the plan declares real connections. Assertions and coverage are shown as "not run by Verity yet".

### D22 (2026-10-23): The sign-off runs on every run, after the result shows

- **Decision:** After the winner is final, every run (fast and full) runs a sign-off: the locked tests on 8 more seeds, lint by tag, the proofs against v1 and against the human design, and a test-strength check. It starts after `run done` and the Done caption, and its sheet (`signoff/<id>.json`) arrives after them.
- **Context:** The user chose "on every run, after the result shows" over full mode only or on request. A first version started the sign-off beside the human reference proof, which gates `run done`; the check pass saw that proof take longer, so the sign-off now starts after the result is out.
- **Consequences:** The result never waits for the sheet. The live stream outlives the terminal `run` event, so the browser reconnects with `Last-Event-ID` until the server answers 204. A stopped run has no sheet. It costs about 20 to 90 s of extra sandbox time per run and holds the run slot until it ends.

### D23 (2026-10-23): Test strength comes from bugs planted by fixed rules, not a model

- **Decision:** The sheet reports how many planted bugs the locked tests catch. The bugs are made by fixed text rules in `backend/verity/core/mutants.py` (seven rules, including `flip_operator`), all simulated in one sandbox call. Up to three bugs that pass the tests are checked with the reset-aware EQY against the winner: proven equal is harmless, proven different is a miss, anything else is undecided.
- **Context:** `flip_operator` exists because a datapath written as one expression (a + b + cin) has no place for the other rules. No model is involved, so the number cannot be argued with.
- **Consequences:** The pack files, `test_dut.py` and `reference.v` are unchanged, so pack hashes do not move. The check is capped by the run's time limit and reports "skipped" or "failed" plainly rather than guessing.

### D24 (2026-10-23): Failures and improvements get cycle-level evidence

- **Decision:** A Verity-owned sandbox script (`/verity/bin/wave`) writes a small waveform for one test case: the first failing case of a version, or the first directed case of a passing winner (`waves/<id>.json`). The fixer gets a cycle table around the first mismatch, and the optimizer sees cell types and the critical path, not only totals.
- **Context:** The ban on `$dump` in model RTL stays, because the dump module is Verity's, not the design's.
- **Consequences:** This changed the sandbox image (new scripts `wave`, `seeds`, `strength`), so the image was rebuilt and the pack self-test run again. The previous image keeps the tag `verity-tools:0.1-prev` for rollback.

### D25 (2026-10-23): All five claims of the Verilog-strength plan ship before the freeze

- **Decision:** All five claims of `.planning/verity-verilog-strength.html` ship before the 2026-10-25 freeze: the version chip and tab, the architecture view, the sign-off sheet, the waveform evidence, and the repo docs.
- **Context:** The plan's default was claims 1, 2, 3 and 5, with claim 4 only if the waveform landed by 10-24. The user chose all five.
- **Consequences:** The risk is carried by the checks: a checker pass and a fixer pass ran before this was called done.

### D26 (2026-10-23): This file holds every decision

- **Decision:** D1 to D15 are copied here and new decisions are added here only. `REPORT.md` keeps its original table as history and points here.
- **Context:** The user chose "copy them into DECISIONS.md, then D16 onward" over starting at D16.
- **Consequences:** One place to look. `docs/PRD.md` and the `ARCHITECTURE.md` files point at this log instead of repeating it.

### D27 (2026-10-23): Tool names say only what runs

- **Decision:** The app and the docs name only the tools Verity runs: Yosys, OpenSTA, Verilator, Icarus, cocotb and Yosys EQY. OpenROAD is not run (layout is after the hackathon), so it is not named as a measuring tool. The sample run `frontend/public/runs/golden.json` was changed to list OpenSTA.
- **Context:** The original plan named OpenROAD, and the sample fixture still did. Every number must be traceable to a tool that ran.
- **Consequences:** Anything that shows a tool list reads it from run data. The REPORT.md "Planned stack" line is history and is not changed.

### D28 (2026-10-22): Verity is a design partner, not a one-shot generator

- **Decision:** The bench works with the engineer instead of planning, building and stopping. The first message gets a fact check with one verdict (D17). After a run ends, the chat answers questions about it from the run's own data, explains each version, walks through the steps, and turns a change request into a proposal for a new run (D18). The engineering loop still runs on its own (D2, D8): the chat starts and steers runs, it never replaces a step or decides what passes.
- **Context:** On 2026-10-22 the user asked for an agent that helps the engineer design a chip and work through it, not one that plans, builds and is done, with a fact check only on the first message. Plan `.planning/verity-design-partner.html`, approved the same day; `.planning/` is gitignored, so `docs/PRD.md` section 5.2 carries its claims.
- **Consequences:** The chat is the control surface and the run data is the proof surface (`docs/PRODUCT.md`). Nemotron stays the visible engineer: it writes the plan and the logic of every design (D16). Built before the freeze: plan claims 1, 2, 3 and 5. After the freeze: claim 4 (more overlap, D30), saved server-side threads and runs from a chosen version.

### D29 (2026-10-22): Verity keeps its own knowledge store; only technique ids reach Nemotron

- **Decision:** Research and run results go into Verity's own SQLite database. Migration 3 adds `research`, `source`, `research_source`, `research_grant`, `run_outcome`, `strategy_outcome`, `runs.research_id` and `daily_spend.serper_credits`; migration 4 adds the Tavily credit columns. Every run writes one outcome row when it ends. A new run reads research by its `researchId`, then by the exact family-and-knobs key, then by the nearest knobs (distance 0.25 or less), and reads past outcomes only from runs with the same pack hash and tool image. Web research expires after 30 days.
- **Context:** The user asked that research and results be kept so a later run can use them as a reference.
- **Consequences:** What reaches a Nemotron role from the store is only technique ids from the fixed per-family list (`backend/verity/research/techniques.py`, with our own one-line text) and numbers written by code: the planner's "Known approaches" and past-outcome lines, and the EXPLORE child's one technique its parent does not use. No web text, summary text or user text reaches Nemotron. The shared store keeps the sha256 of the user's sentence, never the sentence. Outcome ratios are against each run's own v1.

### D30 (2026-10-22): D8 stands: every new version comes from a passing version

- **Decision:** v2 and later versions are still built only from a passing v1 or a passing elite, as D8 says. The option to start v2 from a research idea beside v1 was rejected. More overlap that keeps this rule (each v1 draft tested as soon as it is ready, EQY on the round 1 best while round 2 runs) is planned, not built.
- **Context:** The user chose "keep v2 built from a passing v1; overlap tests and proof" in the design-partner plan. It keeps "proven equal to v1" true.
- **Consequences:** Today the three v1 drafts are scored after all of them return (`backend/verity/orchestrator/build.py`), and EQY runs after the winner is chosen (`evolve.py`). The overlap is design-partner claim 4, after the freeze.

### D31 (2026-10-23): D3 and D13 are superseded in part

- **Decision:** D3 ("Nemotron runs every agent role") now holds for the engineering roles and the chat router only: planner, RTL writer, fixer, optimizer and router run on Nemotron. The parser, chat and research summary routes run on GLM 5.3 (D16). In D13, "Nemotron maps a sentence onto a family and knobs via `POST /parse`" is superseded: the parser route (GLM 5.3) reads the sentence, and `POST /parse` also returns a verdict, research and `statedKnobs` (D17). The rest of D13 stands: live runs are chip families with server-checked knob ranges, the server validates every answer against the knob tables, and plain English never becomes a reference or a test.
- **Context:** D16 changed the routes on 2026-10-22 without marking D3 and D13 as superseded.
- **Consequences:** `REPORT.md` section 4 and the table above keep D3 and D13 as written, as history. Any text that says Nemotron reads the first sentence is out of date.

### D32 (2026-10-23): Golden models stay locked and unchanged

- **Decision:** `golden.py`, `test_dut.py` and `reference.v` in `backend/tasks/` are not edited for the design-partner or Verilog-strength work. New checks (more seeds, planted bugs, waveforms) reuse the locked tests through Verity's own sandbox scripts, so pack hashes do not move. A golden model is not edited without the edit checklist in `docs/GOLDEN_MODELS.html`; after any pack edit, `backend/tasks/make_manifest.py` rewrites the manifest and the pack self-test runs again.
- **Context:** Both approved plans list the locked packs, the four live families and EQY as not changing. `docs/GOLDEN_MODELS.html` (2026-10-22) records known gaps in the packs without changing them.
- **Consequences:** The gaps listed in `docs/GOLDEN_MODELS.html` stay until a deliberate pack change. Every PASS still means a simulation against a human-written golden model the agent cannot see or edit.

### D33 (2026-10-23): Document order

- **Decision:** When documents disagree: `docs/PRD.md`, then this file, then `backend/CONTRACTS.md` for interfaces, then the `ARCHITECTURE.md` files (root, `backend/`, `frontend/`), then `docs/UI_UX_SPEC.md`, `docs/brand.md` and `docs/PRODUCT.md`, then `HANDOFF.md` and `REPORT.md`, then history (`docs/MEETING.md`, `docs/AGENT_RESEARCH.md`, `docs/UI_CANVAS_RESEARCH.md`, `docs/hackathon/`, `docs/superpowers/`, `BACKEND_CHECKLIST.md`). A conflict is flagged, never reconciled silently.
- **Context:** Claim 5 of the Verilog-strength plan. The old order put `docs/MEETING.md` and the `REPORT.md` decisions first.
- **Consequences:** The approved plans live in `.planning/` (gitignored), so `docs/PRD.md` carries their content. The history docs carry a banner that points to `docs/PRD.md`. `REPORT.md` section 4 points here.

### D34 (2026-10-23): The global daily limit is $10.00

- **Decision:** `[limits] daily_usd` in `backend/config.toml` is $10.00 per UTC day for the whole server (it was $5.00). It is the existing mechanism: persisted in SQLite, reserved before a run, a parse or an ask turn, settled with the real cost.
- **Context:** The user raised the daily limit on 2026-10-23 after the Workspace Home plan was approved.
- **Consequences:** `GET /health` reports `budget_exhausted` when the day is used up. The per-run cap stays $0.50. `docs/PRD.md` section 5.1 row C5 and `backend/ARCHITECTURE.md` section 12.2 carry the figure; the code default in `backend/verity/config.py` matches.

### D35 (2026-10-23): One session gets $3.00 per UTC day

- **Decision:** `[limits] session_usd = 3.00`: one session (later one signed-in user) may spend $3.00 of estimated cost per UTC day. It uses the same reserve-then-settle pattern as the daily limit, at `POST /runs`, `POST /parse` and `POST /runs/{id}/ask` when they need a model call, and is kept in SQLite (`session_spend`, migration 5) so a restart does not reset it. A refusal is 429 `session_budget_exhausted`, after the global check.
- **Context:** One visitor should not be able to use the whole day's budget. The user set the figure and asked that the session id become a user id later with one change.
- **Consequences:** `core.budget.spend_owner(session_id)` is the one place that decides the key; Supabase sign-in changes only that. Until sign-in, a new session (another access-code login, or another IP while `auth.required` is false) has its own $3.00, a known gap. The health check ignores the session limit. See `backend/CONTRACTS.md` section 9.

### D36 (2026-10-23): No limit figure appears in the UI

- **Decision:** The web shows only what a run or a set of runs actually spent. It never shows the per-run cap, the daily limit or the session limit as a number: no "of $0.50", no "Cap $0.50", no "costs at most", no ratio bar against a limit. A run that stopped at its limit may say it reached the spend limit, without the number. `capUsd` stays in the API and the contracts because the backend still enforces it.
- **Context:** The Workspace Home plan mocked "spent today of $5.00" and "each run is capped at $0.50"; the user rejected both and changed the limits.
- **Consequences:** The 429 sentence for the session limit has no figure either. `frontend/src` has no cap text (checked by grep). Replaces the open question about showing the live cap in `docs/UI_UX_SPEC.md` section 14.

### D37 (2026-10-23): Home shows the runs started in this browser

- **Decision:** The sidebar's Home opens `/workspace`, which lists the runs in this browser's recent list (`localStorage` key `verity.recentRuns`), newest first, joined by id to `GET /runs`. It does not list every run on the server. Combine blocks is a preview diagram marked Coming soon with a disabled button; Verity builds one block at a time today. The VERITY logo still opens the landing page.
- **Context:** The plan offered "runs started in this browser" or "all runs on this server" (which would show judges' and teammates' runs); the user chose this browser's runs, which matches the sidebar list and stays private.
- **Consequences:** `GET /runs` stays public and gains an optional `outcome` per item. A run this browser listed but the server did not return still gets a card ("Not in the server's latest runs"). Cross-device history needs sign-in and is after the freeze.

### D38 (2026-10-23): Trace V symbol with Register cut wordmark

- **Decision:** Use Trace V (logo concept 24) as the selected symbol and Register cut (concept 12) as the selected wordmark. Keep the D12 palette and type system. Circuit moth (13), Lithography bloom (16), Bond weaver (17) and Silicon strata (18) remain website artwork.
- **Context:** The user chose Register cut, then chose Trace V after reviewing compact logo symbols. The detailed engraved studies were retained as website illustration rather than the logo.
- **Consequences:** Canonical selected PNGs and the identity manifest are saved in `frontend/public/brand/`. `docs/brand.md` records the pairing, and `docs/logo-explorations.html` pins it. The selected files are opaque raster images; vector and transparent production masters and application logo placement remain future implementation work.

### D39 (2026-10-23): The logo is amber

- **Decision:** The Trace V symbol and the Register cut wordmark are drawn in amber `#FFB000` (`--rk-a`) on the warm black, everywhere the logo appears (rack bar, bench and workspace sidebar, favicon, the SVG masters).
- **Context:** The logo first went onto the pages in ivory, as D38's brand note said. After seeing it, the user asked for the other colour, amber.
- **Consequences:** The logo is the one standing exception to "amber is earned" (passed or verified, the one primary action, focus); `CLAUDE.md` and `docs/brand.md` say so. Nothing else becomes amber because of it. D38's other points stand.

### D40 (2026-10-23): Only the V is amber (replaces D39)

- **Decision:** The Trace V symbol is amber `#FFB000` (`--rk-a`); the Register cut wordmark is ivory (`--rk-ink`). This replaces D39, which made both amber.
- **Context:** After seeing the all-amber logo, the user asked for only the V in amber.
- **Consequences:** The logo's V is the one standing exception to "amber is earned"; `CLAUDE.md` and `docs/brand.md` say so. The favicon is the V alone, so it stays amber. The symbol master SVG is amber and the wordmark master ivory.

### D41 (2026-10-23): After the first chip request, the chat is an agent that picks tools (narrows D28)

- **Decision:** After a thread's first chip request, every message goes to one agent on the `chat` route (GLM 5.3). It acts like a senior RTL and ASIC engineer and picks its own tools: `list_blocks`, `research`, `run_facts`, `walkthrough`, `propose_run` and `open_tab`. Every reply shows the steps it took. The fact check (D17) runs on each message until the thread's first chip request and then never again in that thread. A first message that is a question gets an answer and no verdict, through a new parser class `question`; "Not a chip" leaves the thread unchecked, so the next message is checked again. The endpoint is `POST /threads/{id}/messages`, with `GET /threads` and `GET /threads/{id}` to read threads back.
- **Context:** On 2026-10-23 the user asked for the chat after the first message to be a discussion with a senior chip engineer: an agent that reads its rules, picks tools and shows what it did, as the Claude and GPT platforms do, built for chip engineers and not limited to four similar chips. Plan `.planning/verity-chip-engineer-agent.html`, approved the same day. The loop runs on GLM 5.3 (the chat route of D16), not on Nemotron 3 Super.
- **Consequences:** Narrows D28, whose "fact check on the first message" now reads "until the first chip request". The new path does not use the Lightning router; the old `POST /runs/{id}/ask` path keeps it (D18). The agent starts no run: `propose_run` returns a chip card and a run starts only after the user presses Run or Confirm (D18). Nemotron still writes the plan and every line of Verilog (D16). Built in phase A: plan claims 1, 2, 4 and 5 (`backend/ARCHITECTURE.md` section 17.4, `backend/CONTRACTS.md` section 9). Claim 3 is D45.

### D42 (2026-10-23): Thread memory is a facts record, the last 10 turns and a short summary

- **Decision:** Each agent call gets three parts that code owns. (1) A facts record written only by code: whether the thread is checked, the verdict, the block and its settings, the research id, the run ids and the proposal that waits for Run. (2) The last 10 turns, verbatim. (3) A summary of older turns, 20 to 40 words, made by one call on the `memory` route (GLM 5.3) and folded in batches of 4 turns. Threads are stored on the server (SQLite migration 6, behind a `ThreadStore` protocol) and in the browser (`verity.threads`), so a reload or a server restart keeps the thread.
- **Context:** The user's words: "make a context limit like last 10 turns and after that a small summary will be created of 20-40 words which the agent will read to save tokens and have context". The plan offered the facts record with the last 10 turns, the same with a summary of older turns (one more model call every 4 turns), or the old last 3 turns. The user chose the summary.
- **Consequences:** Closes DP3.3 (saved threads) for the server and this browser; the same threads on another device wait for Supabase (D47). The summary is data: its numbers never count in an answer (D43). The old ask path keeps its last 3 turns in memory. As built in phase A the fold runs as soon as more than 10 turns are not in the summary, which is every message past the tenth; folding in batches of 4 is not built.

### D43 (2026-10-23): The agent sees only checked research; numbers and step labels come from code

- **Decision:** The agent sees research only as the summary's code-checked sentences and the source titles and domains, never snippets or raw web text. Web text still reaches only the research summary call, which has no tools. At most one new research runs per message. Every number in a reply must come from the facts record, a tool result, the fact check of that message or the user's own message, never from the model, the thread summary or an earlier turn. One retry names the bad numbers, then code writes the reply. Step labels are fixed code phrases (for example "Looked up the timing of v4"); the model's words never reach a label. Verilog is stripped from replies, and the model cannot start a run or lock a golden model.
- **Context:** Plan claim 5 extends D17 and D18 to the agent path. Text in a tool result, an earlier turn or the summary is untrusted data, so a sentence in it that says "start a run" must change nothing.
- **Consequences:** Code acts on model text only through the tool table, and each tool validates its arguments and refuses a bad one as a step with a plain reason. The hold on the daily and session budgets covers 5 chat calls, one research and one summary call per message (D34, D35). `CLAUDE.md` carries the two new guardrail lines.

### D44 (2026-10-23): No fine-tuning

- **Decision:** Verity does not fine-tune a model. The agent gets its engineering skill from a senior-engineer prompt, code-supplied facts, tools and the test loop of a run.
- **Context:** The user described the agent as a fine-tuned assistant that knows chips. Nebius Token Factory fine-tunes neither GLM nor Nemotron, and NVIDIA's ChipNeMo needed about 20,500 GPU hours (`.planning/verity-chip-engineer-agent.html`, scope).
- **Consequences:** No page, README line or video line may call Verity or its models fine-tuned. Knowledge comes from the prompt (`backend/verity/ask/prompt.py`), the facts block, research and run data. Correctness comes from locked tests and formal proofs, not from the model.

### D45 (2026-10-23): Custom blocks, with the golden model approved by the user (planned)

- **Decision:** Verity will build any small block inside fixed limits: one module; combinational, or one clock with a synchronous reset; latency 0 to 8 cycles; at most 8 ports of 1 to 64 bits; no handshake, memory or second clock. GLM 5.3 drafts the spec, the worked examples and the Python golden model, following a fixed guide (the user called it a "skill"). Nemotron writes all the Verilog. The sandbox runs the drafted golden model on the worked examples as a self-check. Only the user's Approve locks the pack. The label is "Golden model drafted by Verity, approved by you". Gate: 4 of 5 sample blocks (CRC-8, priority encoder, popcount, saturating adder, LFSR) must pass end to end by 2026-10-26, or the "custom" switch stays off for the demo.
- **Context:** The user wanted the agent to work for any chip, not four similar ones, since Verity has research and golden models. Plan claim 3 in `.planning/verity-chip-engineer-agent.html`, approved the same day. The user chose "chat first, then custom blocks" with the freeze moved (D46), and GLM 5.3 as the drafter so that two model families are involved and one mistake is less likely in both. Hosting must start in parallel.
- **Consequences:** Built after phase A and the Supabase step (D47). A custom block becomes a pack with the same files as `add8` but no `reference.v`, tested by one generic testbench; the drafted golden model runs only in the sandbox, with no network. A planned sixth verdict, "Custom block", joins the five (`docs/PRD.md` section 3). The four built-in golden models stay locked and a custom pack never edits them (D32). For a custom block a PASS is a simulation against a golden model that Verity drafted and the user approved, not a human-written one, and there is no human-reference comparison (D14); the UI says so. The plan adds a seventh agent tool and an approve endpoint; their shapes go to `backend/CONTRACTS.md` when built. If the gate fails, the switch stays off and the chat offers the nearest family.

### D46 (2026-10-23): The feature freeze moves to 2026-10-26 (narrows D25)

- **Decision:** The feature freeze moves from 2026-10-25 to 2026-10-26. The internal submit date 2026-10-29 and the deadline 2026-10-30 10:00 am Pacific stay.
- **Context:** The user chose "chat first, then custom blocks" in the chip-engineer-agent plan, which needs one more day (D45).
- **Consequences:** D25 says "before the 2026-10-25 freeze"; that date is now 2026-10-26. `docs/PRD.md` and `CLAUDE.md` carry the new date. The freeze-to-submit window is 2026-10-26 to 2026-10-29. Documents lower in the order that still say 2026-10-25 (`HANDOFF.md`, `REPORT.md`, `backend/ARCHITECTURE.md`, `docs/UI_UX_SPEC.md`) lose to this entry (D33).

### D47 (2026-10-23): Supabase for chats and sign-in (approved, not built)

- **Decision:** Chats and each user's list of runs move to Supabase Postgres. Run files, events and spend ledgers stay in Verity's own database and on its disk. Local work and tests keep the SQLite store, with no network. Sign-in is email and password only, with no sign-up form: the team creates every account in the Supabase dashboard (sign-ups are off) and gives the accounts to judges. "Try it live" opens a sign-in page. The live bench needs an account or the judge access code; the recorded run stays public. The browser signs in with Supabase and the backend checks each token with the project's JWKS. `SUPABASE_SECRET_KEY` lives only in `backend/.env`. The browser gets `NEXT_PUBLIC_SUPABASE_URL` and the publishable key, which Supabase designs to be public. The tables have row level security with no policies, so only the server's secret key reads them. The Supabase CLI's linked project is not used.
- **Context:** The user's words: "also the chats needs to get saved not only runs so I will add supabase set it up", "just email and pass nothing fancy also dont use the supabase we have in cli" and "try it live should open the sign in page and no sign ups we will give the judges sign ins". Plan `.planning/verity-supabase-chats.html`, approved the same day. The user chose to keep the run list in Supabase too, and to let anyone with an account or the judge code start live runs.
- **Consequences:** A Supabase store implements the `ThreadStore` protocol of D42 beside `SqliteStore`. A sign-in swaps the session id for a user id in `core.budget.spend_owner` and claims the threads of its session (`ThreadStore.claim`), which also makes the session limit per user (D35). Narrows D37: the sidebar's run list can show on any device once this is built. The user creates a new Supabase project and pastes one SQL file that the build provides; no Supabase CLI is run. A switch can make the live bench code-only. This step starts after the phase A check and before custom blocks (D45). `CLAUDE.md` allows the publishable key under `NEXT_PUBLIC_*` and lists `SUPABASE_SECRET_KEY` with the backend-only keys.

### D48 (2026-10-23): The Supabase step is built; claiming a session's threads on sign-in is dropped (completes D47)

- **Decision:** D47 is built as decided, with one change: signing in does not move the chats a reader made before signing in into the account. `ThreadStore.claim` stays in the protocol and is implemented, but nothing calls it, so D47's "claims the threads of its session" no longer holds. A signed-in user's session id is `u:<user id>`, so rate limits, the per-day session spend, run ownership, chats and the run list follow the account to any device. The live bench takes a Supabase access token or the judge access code on the same `Authorization: Bearer` header (the Verity token is tried first). Supabase tokens from anonymous sign-ins are refused.
- **Context:** The plan `.planning/verity-supabase-chats.html` decisions of 2026-10-23: moving earlier chats into the account was dropped, there is no sign-up form anywhere, "Try it live" opens `/signin`, and the Supabase CLI and any linked project are never used.
- **Consequences:** New routes `GET /runs/mine` and `POST /runs/{id}/stream-token` (a stream token lives in the tab that started the run, so another device asks the owner-only route for a fresh one); `GET /health` lists `accounts` in `features` when sign-in is configured. Backend env names: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server only) and `SUPABASE_PUBLISHABLE_KEY` (optional, only for a project that still signs with the shared secret). Frontend env names: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; with neither there is no sign-in gate. Project setup is in `backend/README.md`: sign-ups off, anonymous sign-ins off, Confirm email left on, each account added by hand with Auto Confirm User. A Supabase outage turns chat and run-list calls into `502` for every session, access-code sessions included, while starting runs, runs already going and replays keep working.

### D49 (2026-10-23): The final winner is never worse than v1 on the run's goal; a copy never beats its original

- **Decision:** A version can be chosen as the winner only if it is no worse than v1 on the run's priority metric: area for "area", clock period for "speed", power for "power", with zero tolerance (equal is allowed, any increase is not). Among the eligible versions the blended score and the tie rules (smaller area, then older) decide as before. v1 is always eligible. When the goal metric is missing for v1 or for the version, the check is skipped for that version. The rule applies to the final winner only, including the next pick after an EQY demotion; the elites that parent round 2 keep the plain ranking. A version that synthesizes to the same cell count, area and clock period as an earlier measured version (v1 included) is a copy: its reason says "Same result as v3", its status and score stay, the older version wins the tie, and it is skipped as the next pick when the original was demoted by EQY (so it is never proven again).
- **Context:** A real counter run on 2026-10-23 (goal speed) picked v2 with clock 0.350 ns over v1 at 0.344 ns, because its area (-2.6%) and power gains outweighed the slower clock in the blended speed score (weights 0.25 area, 0.60 timing, 0.15 power). Across the 4 real full runs of that day, 5 of 18 new versions were worse than v1 on the goal and 9 of 18 were copies of an earlier version. A user who picks "speed" must not get a slower chip. The plan `.planning/verity-nemotron-quality.html` offered "no worse than v1, 0.5% noise allowed"; the main session chose zero tolerance, because the tools give the same numbers for the same Verilog, so there is no noise to allow for.
- **Consequences:** `core/fitness.py` `pick_winner` (with `worse_on_goal` and `result_key`) and `orchestrator/evolve.py` `_mark_copies`. Some runs now end with v1 as the winner and no proof stage. "Why was this kept?" (`ask/tools.py`) says in code-written words when a higher-scoring version was passed over because it was worse on the goal, with both numbers. No wire shape changes: only a copy's `reason` text. Prompt versions optimize.v4, repair.v4 and rtl_gen.v3 ship with it (`backend/ARCHITECTURE.md`); `backend/evals/quality_report.py` measures the same counts on saved run logs.

### D50 (2026-10-26): Credit system and in-app admin user onboarding

- **Decision:** Each user account is seeded with 3 starting run credits by default (configurable via `initial_credits`, default 3). Every run admission checks that the user has at least 1 credit and deducts 1 credit upon semaphore acquisition. If credits are exhausted (credits <= 0), `POST /runs` rejects admission with HTTP 429 and `reason: "credits_exhausted"` (user text: "You have used all your run credits. Contact an admin to add more."). Public signup remains disabled: onboarding is reserved for designated admins (such as `admin@verity.com`, configured via `admin_emails` or team role). Admins can onboard new users directly from the bench sidebar via `POST /admin/users` (which creates an auto-confirmed account with email and temporary password in Supabase GoTrue Auth) and can adjust credits via `POST /admin/credits`. Users and the UI retrieve their balance and admin status via `GET /auth/me`. When Supabase is unreachable or in local SQLite testing, credit operations fall back gracefully to local SQLite store so runs never halt on external store unavailability.
- **Context:** User requested: "integrating supabase for auth, and giving certain amount of credits (lets say 5 unless specified diffeerntly aroudn) from start to each account. also no signup pubicly - onyl admin can enter people (so on dashboard a setting for that). and fitting into the entire backend docs and architecture... credits for 3 runs, admin email - admin@verity.com (no verification)".
- **Consequences:** Added `user_credits` table to Supabase Postgres and SQLite migration 8. Wire contracts in `backend/CONTRACTS.md` include `AuthMeResponse`, `AdminCreateUserRequest`, `AdminCreateUserResponse`, `AdminSetCreditsRequest`, and `"credits_exhausted"` admission reason. Frontend UI displays remaining run credits in the sidebar footer and provides an "Add user" modal dialog for admins.

### D51 (2026-10-26): Live Supabase project, admin run visibility, checkpoint on network and sandbox failure

- **Decision:** A real Supabase project ("verity") is now wired up and reachable from the backend only (`backend/.env`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`); `backend/supabase/schema.sql` applied. `GET /admin/runs?owner=<owner>|email=<email>` (admin only) lists any one user's runs, same shape as `GET /runs/mine`, so a super admin can see each run a user started, not only the aggregate `runs_count` on `GET /admin/users`. The checkpoint-and-resume path built for `credits_exhausted` (D50's groundwork) now also covers a retryable model-call network error and a sandbox infra error, but only once the evolve stage has started (cands exist to check and resume into); before that point the same failures still end the run as `error`, since nothing expensive has happened yet and a fresh `POST /runs` costs the same as a resume.
- **Context:** User asked to connect Supabase from the backend, confirm supadmin@verity.com (already the `super_admin_emails` default) and normal users log in with no signup page, each gets 3 credits, the super admin can see every run and allocate more credits, and a run should checkpoint and resume rather than being lost on a network or credit failure.
- **Consequences:** New contract `AdminRunsResponse {owner, email?, runs: MyRun[]}`; new `RunManager.list_runs_for_owner(owner, limit)`. `orchestrator/machine.py` gained `_checkpoint_stopped(st, reason, message)`, shared by the `credits_exhausted`, `network_error` and `sandbox_error` branches, all ending the run `stopped` with that `error_reason` so `POST /runs/{id}/resume` can continue it. No change to the checkpoint file format or to `RunState.save_checkpoint`/`load_checkpoint_data`.


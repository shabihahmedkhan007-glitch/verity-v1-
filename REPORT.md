# Verity: Project Record

Running record of everything done, decided, and changed in this project, from the first idea to the final submission.

**How this file works**
- **Status** and **Open decisions** are snapshots: update them in place.
- **Decisions** and **Change log** are append-only: add new entries at the bottom, never rewrite old ones. If a decision is reversed, add a new entry that supersedes the old one.
- Every work session that changes anything (code, docs, Devpost, accounts, hosting) adds a Change log entry: date, what changed, why, how it was verified.

---

## 1. Project at a glance

| Item | Value |
|---|---|
| Name | Verity: AI Hardware Engineer |
| Elevator pitch | Describe a chip in plain English. Verity writes the Verilog, tests it, fixes its own bugs, then redesigns it to run faster and smaller. Built on NVIDIA Nemotron and Nebius. |
| What it is | An agent that turns an English hardware spec into Verilog, tests it against a locked golden model, fixes bugs, then optimizes power, performance and area (PPA) across design versions. A web dashboard lets judges watch it work. |
| Hackathon | Nebius x NVIDIA Global AI Hackathon (Devpost, online) |
| Track | Coding & Agentic Engineering (backup: Best Apps & Agents); also targeting Best Use of Tavily |
| Deadline | 2026-10-30, 10:00 AM Pacific. Internal target: submit 2026-10-29 |
| Planned stack | Python agent loop in FastAPI (SSE stream), Nemotron 3 Ultra + Super on Nebius Token Factory, Token Factory Sandboxes for chip tools (iverilog, Verilator, cocotb, Yosys, OpenROAD), Next.js + Tailwind dashboard, Tavily for datasheet lookup |

## 2. Current status

_Last updated: 2026-10-04_

- **Phase:** UI build started 2026-10-04. Design and architecture docs exist (PRODUCT.md, brand.md, UI_UX_SPEC.md, ARCHITECTURE.md); the `web/` frontend is being built against a sample recorded run. No agent backend yet.
- **Devpost:** draft project created with name, elevator pitch and thumbnail. Remaining submission sections not filled yet.
- **Repo:** private GitHub repo https://github.com/Sahir619/verity (branch `main`), created 2026-10-04. No root README or LICENSE yet; the hackathon requires a public repo with an MIT, Apache 2.0 or MPL 2.0 license and a README before submission.
- **Schedule:** week 1 (setup + spikes, gate 2026-10-04) has not started; about 3 days behind the 32-day plan.

## 3. Open decisions

| Decision | Options | Notes |
|---|---|---|
| Team size and roles | TBD | Someone must be able to read Verilog and synthesis logs |
| Representative | TBD | One person enters the submission for the team (official rules) |
| Hosting | Nebius (~$100-250 est.) or free option (Vercel/Render + FastAPI) | Demo must stay live until judging ends |
| City for City Winner award | TBD | Attending an event is not required |
| Showcase chip | 4x4 matrix multiply or small MAC array (recommended) | Keep under 300 lines |
| Thumbnail final version | Current image is a mockup | Replace mock "PASS" waveform with a real dashboard screenshot once the demo runs |
| Optimization loop size | Direction decided (D8: REvolution-lite, 2 to 4 candidates per round); exact rounds and per-run budget still open | Fall back to a single refine chain if the 2026-10-18 PPA gate fails; the UI renders either |

## 4. Decisions

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

## 5. Change log

### 2026-09-27: Concept brief
- **Added** `AI_Hardware_Engineer_Project.md`: the idea (spec to verified, PPA-optimized RTL), multi-agent roles, hackathon scope, pitch angle.

### 2026-09-28: Research and game plan
- **Added** `AI_Hardware_Engineer_Report.html` (DOC AIHE-01): feasibility datasheet. Four scope levels, prior work (chip-harness, MAGE, VerilogCoder, Spec2RTL-Agent, Verkor, NL2GDS), risks (size collapse, self-grading, test cheating, slow PPA loop, Windows setup), 20-day solo build plan, tool stack.
- **Added** `Nebius_Hackathon_Game_Plan.html` (DOC AIHE-02): rules, scoring, architecture, hard limits, 32-day timeline with weekly gates, video storyboard, open decisions.

### 2026-09-30: Session review and registration research
- **Checked** for GSD planning state: no `.planning/` directory, so nothing to resume.
- **Reviewed** all three project files and summarized status.
- **Researched** hackathon registration (official rules, overview page, Resources page, Devpost help):
  - Confirmed: a team appoints one Representative who enters the submission; the rules set no maximum team size; every member must be of legal age and not in an excluded country.
  - Confirmed: credits are **$25 per person** via the Token Factory form (activation code `NEBIUS-DEVPOST-GLOBAL26`) plus **$25 per person** via the Nebius Builders Program. Each teammate can claim their own.
  - Confirmed: teammates are added by the team leader from the submission form or Edit Project page, by email or invite link.
  - Not confirmed: whether each teammate must click "Join hackathon" separately. Ask janet@devpost.com or the Nebius Discord if it matters.
  - Participants: 14,516 (up from 12,954 on 2026-09-28).
- **Verified by:** WebFetch of the rules, overview and resources pages; WebSearch of the Devpost help center.

### 2026-10-01: Devpost draft project
- **Created** the Devpost draft project (General info page).
- **Set** project name to `Verity: AI Hardware Engineer` (D4).
- **Set** elevator pitch (D5), 172 of 200 characters.
- **Uploaded** thumbnail: dark background, "Verity / AI Hardware Engineer" wordmark, glowing chip with a green checkmark, mock simulation waveform. Image file is not stored in this folder yet.
- **Added** `REPORT.md` (this file) as the project record, and `CLAUDE.md` with the rule to keep it updated.
- **Verified by:** user screenshot of the Devpost General info page; character counts checked with Python.

### 2026-10-01: Research paper review (REvolution)
- **Reviewed** `C:\Users\admin\Downloads\RTL generation with LLMs.pdf`: "REvolution: An Evolutionary Framework for RTL Generation driven by Large Language Models" (Min, Cho, Jang, Kang; POSTECH; ASP-DAC 2026; arXiv 2510.21407). The PDF is not stored in this folder.
- **Key points:**
  - Evolves a population of candidates, each a (Thought, Code, Feedback) tuple, instead of refining one design, to avoid getting stuck in a local optimum.
  - Dual population: Fail group gets bug-fix work, Success group gets PPA optimization; offspring split in proportion to group size.
  - Six prompt operators: Fix (Fail only), Fusion (Success only), Simplify, Explore, Refactor, Improve. Operator chosen by UCB bandit plus softmax, rewarded for producing a passing design or raising fitness.
  - Fitness = weighted relative gain vs a reference design in power, area and clock period; failing designs score minus infinity. Elites kept per PPA metric.
  - Setup: N=10, 10 offspring per generation, 20 generations (about 200 designs per problem); iverilog + Yosys with Nangate45; runtime 785 to 1990 s per problem.
  - Results: pass rate up to +24.0 points over the initial population; DeepSeek-V3 reaches 95.5% on VerilogEval. Beats 200 independent samples at the same call budget (ablation), so the loop matters, not just volume.
- **Caveats noted:** PPA gains are measured against non-optimized benchmark reference designs (authors say so); uniform 0.01 ns clock target; some designs passed simulation but failed after synthesis; relies on benchmark-provided testbenches and reference designs; budget limited by API cost.
- **Relevance to Verity:** direct evidence for the PPA-loop idea; supports keeping a post-synthesis equivalence check (Yosys EQY); operator and population view could become a dashboard panel. Recorded as an open decision (optimization loop design). Code at github.com/kmcho2019/REvolution; license not yet checked.
- **Verified by:** full text extracted with pypdf (7 pages) and read.

### 2026-10-01: Meeting brief for Friday 2026-10-02
- **Added** `MEETING.md`: pitch, why the project matters (problem, industry, research, hackathon fit), differentiators, how it works, risks and mitigations, re-baselined weekly plan (Oct 2 to Oct 29), decisions needed, likely Q&A, sources.
- **Found:** REvolution code repo is public and **MIT licensed**, runs iverilog + Yosys + OpenROAD via Docker, and supports OpenAI-compatible APIs, so Nebius Token Factory should plug in (not yet tested). Reuse must be credited and our own additions must be the bulk of the work ("new work" rule).
- **Verified by:** WebFetch of github.com/kmcho2019/REvolution; date check (2026-10-02 is a Friday); scanned files for em/en dashes.

### 2026-10-01: Research on building without spending Nebius credits
- **Question:** can we build and test without burning the $50 credits, then switch to Nebius at the end?
- **Answer:** yes, if the model endpoint is a config setting (OpenAI-compatible `base_url` + key + model name in `.env`). Free development options found:
  - NVIDIA build.nvidia.com free tier: Nemotron 3 Super available, 40 requests/min per model, free with NVIDIA Developer Program (third-party guides; confirm current terms).
  - Local Nemotron via Ollama (`ollama pull nemotron-3-nano`, about 24 GB disk, 16 GB+ RAM).
  - Recorded LLM responses replayed in tests, and a fake LLM for pipeline and dashboard work (zero calls).
  - Chip tools run locally in Docker/WSL2 for free.
- **Dev machine:** 31 GB RAM, NVIDIA RTX 2070 SUPER (8 GB VRAM). Checked with PowerShell.
- **Caveat:** prompts tuned on a different or smaller model may behave differently on Nemotron 3 Ultra; keep credits for final tuning, and smoke-test the real Nebius endpoint in week 1.
- **Verified by:** WebSearch (build.nvidia.com free tier; Nemotron on Ollama); local hardware query.

### 2026-10-01: Meeting brief expanded
- **Updated** `MEETING.md`: new Section 1 "Start here" (8 crucial questions with answers, 7 ranked problems); new Section 7 "Building without burning credits"; new Section 12 plain-English glossary (chips, Verilog, testing, synthesis, PPA, tools, AI stack, research and hackathon terms); week plan adjusted (free models weeks 1-3, switch to Nebius week 4); decision added for the free dev setup. Sections renumbered 1 to 13.
- **Why:** user is not a hardware engineer and needs to present and answer questions confidently.
- **Verified by:** scanned for em/en dashes.

### 2026-10-04: Canvas UI research and user journey map
- **Idea:** a canvas where the user and the in-app AI move boxes together to plan the chip, instead of only a chat box or a passive dashboard.
- **Researched** (3 parallel agents): canvas libraries and licensing, how an LLM edits a canvas, UX prior art for human + AI canvases and EDA block design tools, and candidate journeys. Saved as `UI_CANVAS_RESEARCH.md`.
- **Key findings:**
  - React Flow (`@xyflow/react`, MIT) is the only candidate that is open source, needs no license key and supports typed React nodes. tldraw needs a production license key (conflicts with a public MIT repo and hosted demo). Excalidraw has no typed nodes.
  - The AI should edit the canvas through a small closed op set (add_node, connect, move_node, update_status, remove), validated server-side. Live SSE and the recorded golden run should feed the same reducer, so replay costs $0 and looks identical.
  - Nebius documents tool calling; Nemotron 3 Super is described as built for it. Structured JSON output for Nemotron on Nebius is **unconfirmed**; test with one real call this week.
  - Three canvas concepts: A Architecture canvas (blocks are hardware modules), B Pipeline canvas (blocks are agent stages), C Evolution canvas (blocks are design versions). Recommended: hybrid "Plan Board + Evolution Tree" with the pipeline as a status rail, Autopilot on by default so the canvas is optional steering and does not hurt the "minimal human input" criterion.
- **Added** `.archify/workflow-verity-journey-20261004-011950/verity-journey.html`: interactive journey map (6 stages x 5 lanes: team decisions, user, UI, AI, sandbox) with the 6 open UI decisions and their recommended options.
- **Verified by:** Archify `finalize` passed all gates (validate, deliver, strict check, browser-check); screenshots at 1440x900 inspected after layout repairs. Research sources are listed in `UI_CANVAS_RESEARCH.md`; several product claims come from press releases or listing pages only (marked there).

### 2026-10-04: Journey v2, design docs, and UI build start
- **Locked UI decisions** with the user (D6 to D10): hybrid canvas, pins + toggles with auto-continue countdown, auto-play replay entry, tiny population tree with chain fallback, expected vs got failure view, AI-picked winner with override, zip export.
- **REvolution scope** set by the user: adopt the principles only (D8). The paper PDF is now in the folder as `v1RTL generation with LLMs.pdf`, for reference.
- **Added** journey map v2 at `.archify/workflow-verity-journey-v2-20261004-014852/verity-journey-v2.html` (decisions shown as locked, FAIL and PASS pools, REvolution-lite card). Archify finalize passed all gates; screenshot inspected.
- **Added** (written by an opus planning agent using the impeccable design skill, reviewed by the orchestrator): `PRODUCT.md` (design context), `brand.md` (fixed colors plus derived tokens, 77 contrast pairs checked against WCAG AA), `UI_UX_SPEC.md` (4 pages plus 404, states, copy, reusable component inventory), `ARCHITECTURE.md` (stack verified via Context7 and npm, `web/` structure, data contracts, one reducer for live and replay, golden-run fixture spec, verification commands).
- **Added** `CLAUDE.md` (lean working rules and doc pointers). It was referenced earlier but did not exist in this folder.
- **Started** the UI build: a workflow of 5 sonnet agents (scaffold, then domain components, canvas and state, and pages in parallel, then integrate). Results are recorded in the next entry.
- **Open questions** from the planner: showcase chip (sample data uses a 4-lane 8-bit MAC), whether pins truly replan by Oct 18, live credit cap ($0.50 per run assumed), whether the winner must pass EQY, hosting, footer links, partner logo rules, Human inputs count in the golden run (sample records 2), font approval.

### 2026-10-04: Web UI built (`web/`)
- **Built** the frontend in `web/` with 5 sonnet agents (scaffold; domain components, canvas and state, and pages in parallel; integrate), following `ARCHITECTURE.md` and `UI_UX_SPEC.md`. Stack as installed: Next.js 16.3.8, React 19.2.8, TypeScript 5.9.3, Tailwind 4.3.3, shadcn 4.21.1, @xyflow/react 12.12.0, Zustand 5.0.15, zod 4.6.5.
- **Pages:** Landing `/` (hero auto-plays the recorded run), Studio `/studio` (stage rail, Plan Board, Evolution Tree, inspector with RTL, diff, expected vs got and PPA tabs, replay bar), Try live `/try` (presets; shows an offline notice until an agent backend exists), Results `/results` (winner with override, ranking, run summary, zip export), 404, and a mobile story mode.
- **Sample data:** `web/public/runs/golden.json` is a hand-made sample run (4-lane 8-bit MAC, 2 rounds, 6 versions, 2 fixes, 1 rejected, winner v5 at area -17.4% vs v1). Every number is labeled "Sample data". It must be replaced by a real recorded run before submission.
- **Orchestrator fix after review:** the landing hero canvas fitted itself before its frame settled and rendered at about 0.45 zoom (unreadable). `RunCanvas` now re-fits when its pane size changes; the hero renders at about 0.74 zoom. Studio rechecked, no regression.
- **Verified by (orchestrator, re-run independently):** `npm run typecheck` exit 0; `npm run lint` 0 errors (1 warning, an unused type import copied verbatim from the docs); `npm run validate:fixture` OK (6 versions, winner c5, 12 nodes, fitness checks passed); `npm run build` exit 0 with all 5 static routes. Screenshots at 1440x900 inspected for Landing (start and mid-run), Studio (mid-run and end with v5 crowned and the EQY edge), Results and Try; 390x844 for Studio mobile. The integrate agent additionally reported: click-only and keyboard-only paths from `/` to the zip, no network request after `golden.json` during replay, 12 content nodes in the final frame, reduced-motion final frame, zip contents, and no console errors.
- **Not verified:** live mode UI (countdown actions, steering, stop, credit cap banner, reconnect) because there is no agent backend; a real browser file download (agent-browser cancels downloads, so the zip was checked from the app's blob); 200% zoom; the 1024 to 1279px rail rule; the over-12-node visibility path.
- **Known gaps:** footer and nav links (GitHub, Devpost, demo video) are empty until `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEVPOST_URL` and `NEXT_PUBLIC_DEMO_VIDEO_URL` are set; `next dev` re-adds em dashes to the generated `web/AGENTS.md`; `AI_Hardware_Engineer_Project.md` (pre-existing) contains em dashes, so the dash grep in `ARCHITECTURE.md` section 13 still matches it; a forward Tab through Studio takes many presses because every canvas node is focusable (no skip link yet).

### 2026-10-04: Private GitHub repo
- **Created** private repo https://github.com/Sahir619/verity and pushed the initial commit (165 files) to `main`.
- **Added** root `.gitignore`: dependencies, build output, env files (examples kept), tooling folders, Archify check receipts, and the REvolution paper PDF (third-party; kept local only, because the repo must go public for judging and git history would keep it).
- **Verified by:** `gh repo view` reports visibility PRIVATE; the remote tree has 165 files and none of the excluded paths; a credential pattern scan of the staged files found only JavaScript variable names. `web/.env.example` could not be opened (a local permission rule protects env files); it was written by the scaffold agent with public URL placeholders only.

### 2026-10-05: Backend architecture document
- **Cloned** the repo from github.com/Sahir619/verity and ran the web app locally (`npm ci`, `validate:fixture` OK, `typecheck` clean, `next dev` serves `/` with HTTP 200).
- **Added** `agent/ARCHITECTURE.md`: backend contract for the future `agent/` service. One FastAPI process with a deterministic orchestrator; Nemotron on Nebius Token Factory behind an `LLMProvider` interface; the model gets no tools or shell; chip tools (Verilator lint, Icarus + cocotb, Yosys, OpenSTA, EQY) run through fixed tool functions in Nebius Sandboxes or local Docker; locked, hashed task packs as the golden reference; REvolution-lite search (v1, 3 children, optional round of 2, elites = best 2); per-run budget ledger and rate limits; access-code login with stream tokens for SSE; SQLite + immutable artifacts; evals suites; Celery and Redis deferred. Emits the existing frontend `RunEvent` contract with no new event types.
- **Kept separate** from the frontend `ARCHITECTURE.md` at the user's request. Conflicts with existing docs are listed in section 27 of the new file (no auth in the frontend's proposed API, waveforms vs failing cases in repair, old population size, single `LLM_MODEL`). Open decisions O1 to O12 are in its section 23.
- **Verified by:** WebFetch of the official rules page, the Nebius model catalog and the Sandboxes docs (2026-10-05); scanned the new file for em and en dashes (none). Nothing was implemented; claims tagged [ASSUME] still need the M0 spike.

### 2026-10-05: Backend built (untested)
- **Built** the whole `agent/` backend from `agent/ARCHITECTURE.md` with one workflow (7 agents: an opus architect, 5 sonnet builders on separate folders, 1 sonnet integrator). About 160 files: FastAPI API with access-code auth, stream tokens and SSE; SQLite store and write-once artifacts; run manager, watchdog and budget ledger; deterministic orchestrator (plan, feasibility gate, fix loop, evolve rounds, judge, EQY prove); Nebius, OpenAI-compatible and fake LLM providers; four roles with prompt templates; local Docker and Nebius Sandboxes tool runners with parsers and the circuit graph; sandbox Dockerfile and `/verity/bin` scripts; 7 task packs (live: `mac4`, `alu8`, `matmul4` matching `presets.ts`; eval only: `add8`, `cnt8`, `fsm_seq`, `mm4_int4`); evals CLI; pytest suite; `agent/CONTRACTS.md` and `agent/README.md` with a first-run checklist.
- **Decisions made during the build:** task pack id equals the web `presetId`; `auth.required` defaults to false until the frontend sends tokens, and the production guard refuses to start without auth; fitness records renormalized weights when power is null; canvas `add_node`/`connect` use `by: "ai"` as `golden.json` does (conflicts with backend ARCHITECTURE 9.1, flagged in CONTRACTS.md).
- **Not verified:** nothing was executed by design. No pip install, Docker build, server start, pytest run or Nebius call. Every `# UNVERIFIED` item (Sandboxes API, Yosys/OpenSTA/EQY output parsing, cocotb runner path, Nemotron JSON and reasoning tokens, Docker Desktop mounts with `--user 1000:1000`) is listed in `agent/README.md`. `agent/.env.example` was blocked by a permission rule; the env var names are in the README.
- **Frontend hookup still needed:** `live.ts` must read `streamToken` and append `?st=`; Try page needs an access-code prompt; `validate-fixture.ts` needs a path argument and must accept renormalized fitness weights; gate steers get no `human` echo but `live.ts` clears pending steers only on one.
- **Verified by:** `python -m compileall -q agent` passes (re-run by the orchestrator); the integrator's static import trace found 0 unresolved `verity.*` names; dash scan of `agent/` finds none.

### 2026-10-05: First real backend run (add8)
- **Fixed** `agent/sandbox/Dockerfile`: CUDD build failed (`aclocal-1.14: command not found`); now always runs `autoreconf -fi`. Image `verity-tools:0.1` builds.
- **Added** `agent/env.template` (a permission rule blocks writing `.env` files; the user copied it to `agent/.env` and added the key).
- **Ran** one test: `python -m verity.evals --suite functional --tasks add8 --provider nebius --repeats 1`. Nemotron 3 Ultra on Nebius wrote the plan and RTL (2 calls, 2,014 in / 2,888 out tokens, est. $0.0107); the sandbox verify (lint, interface, sim) passed on the first attempt.
- **Known gaps seen:** the eval row records `runtime_s = 0.0`, empty `stage_times` and `pack_hash_ok = null`, so those metrics are not wired. Not yet run: pytest, the repair loop, synthesis/OpenSTA, EQY, the API/SSE path, and the frontend hookup.

### 2026-10-06: Backend tested end to end and connected to the web app
- **Backend fixes** (2 parallel sonnet agents, backend and web): sandbox scripts had CRLF line endings; OpenSTA rejected `signed` in Yosys netlists; EQY matched internal wire names, timed out on multipliers, and counted "unknown" as a counterexample (now port and register matching, `abc pdr` then `smtbmc yices`, a reset-aware miter first, unknown is `inconclusive`); fitness rounding now half-up to match the web; eval rows now record runtime, stage times and pack hash; Nemotron reasoning tokens truncated answers, so `plan_max_output` is 6000, `rtl_max_output` 12000, run `max_output_tokens` 200000 (the $0.50 dollar cap still binds).
- **Web changes:** `live.ts` reads `streamToken` and opens `/events?st=`; Bearer token on REST when a session exists; access-code prompt on Try, shown only when `/health` reports `authRequired` or a run returns 401; pending pin and toggle steers clear when the gate closes or the run ends; `validate-fixture.ts` takes a path argument and checks effective renormalized fitness weights.
- **Verified by:** `pytest -q` 247 passed (re-run by the orchestrator); packs suite: every reference passes and every mutant is killed on all 7 packs; real tool numbers (mac4 2108.58 um2, 1.594 ns); API: health, run, SSE to `done`, log, stop (`stopped` event) and restart recovery (`server restarted`); one real Nebius full run on mac4 through the API: 12 LLM calls, v1 2681.81 um2 at 2.361 ns, winner v2 2121.62 um2 at 1.526 ns (fitness +25.15), EQY `inconclusive` (saved as `agent/data/nebius-runlog-mac4.json`); web typecheck, lint, validate:fixture and build exit 0. Orchestrator browser check (agent-browser, fake provider): Try page, Start live run on the 8-bit ALU, Studio streamed every stage to "Run complete", 4 versions measured, 1 fix, Download and See results shown.
- **Nebius spend:** about $0.50 across 5 API runs and probes (3 earlier runs exposed the bugs above).
- **Known issues (see also the next entry):** the real Nebius run log fails two sample-only rules in `validate-fixture.ts` (RTL 20 to 40 lines, at most 12 canvas content nodes; the real run has 15), so it cannot become `golden.json` until those rules or the over-12-node UI path are settled; winners structurally different from v1 usually end `inconclusive`; the fake provider cannot produce a winner better than v1; the UI does not send `mode`, so live runs are always full; auth is off by default and must be turned on (plus access codes and signing secret) before hosting.

### 2026-10-06: Live runs from the UI, and research on an engineer-facing agent
- **Observed** in the user's own live runs from the Try page: one run failed because Docker Desktop was not running (sandbox could not reach the engine); the next mac4 run ended "no passing baseline" after 1 draft and 3 repairs, all real Verilator errors (unexpected endgenerate, duplicate declaration of `out`, procedural assignment to a wire), 94 s, $0.07. 2 of the last 3 mac4 runs ended this way. The SSE stream for that run replays all 82 events and returns 204 after the last one, so the backend side of the "Lost connection" message the user saw was not reproduced.
- **Added** `AGENT_RESEARCH.md`: a 6-agent workflow (4 researchers on industry, engineer needs, technical path and agent architecture; 1 skeptic; 1 lead). Recommendation: reframe Verity from a 3-preset demo into an open verify, debug and optimize agent that works on the engineer's own RTL and locked tests (W1 debug a failing test, W2 optimize with EQY vs their own v1, W3 mutation score, W4 spec drafting as first cut), with a chat agent on a closed set of sandboxed tools and the existing orchestrator as one workflow. Reliability fixes R1 to R5 first: the MAC failures come mostly from our own prompt (header renders plain `output` while the rules demand `output reg`) and a plan that asked for 6 hand-built modules.
- **Verified by:** the skeptic checked 66 load-bearing claims against primary sources: 53 confirmed, 13 corrected, 0 refuted; the three Verilator errors and the Yosys concurrent-SVA limit were reproduced in `verity-tools:0.1`. Nothing was built.
- **Added** six Archify diagrams of the plan under `.archify/verity-agent-plan-20261006-215405/` (open `index.html`): proposed architecture, W1 debug sequence, W2 optimize workflow, edit proposal lifecycle, reliability fixes R1 to R5, and the milestone plan to the freeze. All six passed Archify `finalize` (validate, deliver, strict check, browser check); no visual capture review was done.
- **Pending user decisions:** U1 to U11 in `AGENT_RESEARCH.md` section 8.1; the reframe conflicts with D5, D6, D7, O9, O12 and backend ARCHITECTURE 12.3, 12.4 and 13 (section 7). No D-entries added until approved.

### 2026-10-10: Repo sync and codebase map
- **Pulled** 3 commits from origin (`abb996f..a387a47`, fast-forward): the agent backend, the engineer-agent research and plan diagrams, and `agent/.env.example`. The local `web/AGENTS.md` change (dashes re-added by `next dev`) was kept and not committed.
- **Set up** `agent/.venv` (Python 3.13.2) on this machine: `pytest -q` 247 passed. This machine has no Docker, no WSL and no `agent/.env`, so the sandbox tools and Nebius runs cannot run here yet.
- **Added** `.planning/codebase/` (gitignored, local only): `STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`, written by 4 haiku mapper agents through `/gsd-map-codebase`. Not committed.
- **Verified by:** all 7 documents present (1,539 lines); secret pattern and em/en dash scans clean; 1,060 cited paths checked for existence (every miss was a package name, model id, runtime folder or relative path that resolves); versions checked against `web/package.json` and the installed `next`; the listed doc and code conflicts re-checked with grep. A fable-judge pass found 5 false or unsupported statements (`agent/.env.example` "not found", the sandbox image "never built" in two files, a cassettes folder that "holds" answers but does not exist, and a misattributed `agent/ARCHITECTURE.md` claim) plus one gap (remote not named). All were corrected.
- **Doc drift found (not fixed):** root `ARCHITECTURE.md` still says "before any code exists" and "not built", names one web env var (code reads `NEXT_PUBLIC_AGENT_URL`, `_SITE_URL`, `_GITHUB_URL`, `_DEVPOST_URL`, `_DEMO_VIDEO_URL` and `NEXT_DIST_DIR`) and a single `LLM_MODEL`; `agent/README.md` says tests are "not yet run" and that `.env.example` could not be created; `agent/sandbox/Dockerfile` line 15 says nothing was built; `CLAUDE.md` says "Not a git repo yet". Auth is off by default and the production guard only runs when the env is `production`.

### 2026-10-11: Docker on this machine, sandbox image, packs self-test
- **Installed** (by the user) WSL 2 and Docker Desktop 4.94 (per-user install, engine 29.8.2). Docker Desktop had been opened before WSL existed and was stuck on "wsl is not installed"; a restart fixed it. `docker run hello-world` passed. The shell needs `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` on PATH (new terminals get it; old ones fail on `docker-credential-desktop`).
- **Built** `verity-tools:0.1` from `agent/sandbox/Dockerfile` with no changes (exit 0, 2.88 GB).
- **Ran** `python -m verity.evals --suite packs --tasks all --provider fake`: all 7 packs ok, every reference passes, every mutant killed (31 of 31), EQY `proven` on all 7, $0. Slowest step: EQY on the larger packs (up to 181 s). Results: `agent/evals/results/e_20261010T192647Z_4dff1f.jsonl`.
- **Note:** the evals CLI overwrites the committed `agent/evals/report.md`; it was restored with `git restore` so the 2026-10-06 results are kept.

### 2026-10-11: Repo layout reorganized (backend/, frontend/, docs/)
- **Renamed** `agent/` to `backend/` and `web/` to `frontend/`. Moved the root `ARCHITECTURE.md` (frontend only) to `frontend/ARCHITECTURE.md`, next to `backend/ARCHITECTURE.md`. Moved `MEETING.md`, `PRODUCT.md`, `brand.md`, `UI_UX_SPEC.md`, `UI_CANVAS_RESEARCH.md`, `AGENT_RESEARCH.md` to `docs/`, and the original brief material (`AI_Hardware_Engineer_Project.md`, `Nebius_Hackathon_Game_Plan.html`, `Verity_AI_Hardware_Verification.png`) to `docs/hackathon/`. `REPORT.md`, `CLAUDE.md` and `.archify/` stay where they were.
- **Why:** two folders named after their job, all reading material in one place, and a root README (required for judging).
- **Updated** path references in code comments, docs, `CLAUDE.md` (new layout section and doc table) and the one real path in code: `backend/tests/verity_test_support.py` now looks for `frontend/`. Older change log entries above keep their original paths. Python package name `verity`, the image name and identifiers such as `AGENT_ROOT` are unchanged.
- **Added** a root `README.md` (layout and how to run).
- **Verified:** recreated `backend/.venv` (the old one held absolute paths), `pytest -q` 247 passed with no skips (the tests that read `frontend/` found it); in `frontend/`: typecheck clean, lint 0 errors (1 old warning in `view-types.ts`), `validate:fixture` OK, `build` OK. The `next dev` server running from `web/` was stopped for the move.

### 2026-10-13: Landing page critique and fixes
- **Critique** (`/impeccable critique /`, two independent reviewers plus the design detector): 21/32. Top findings: the trust claim "Faster versions are proven equal" and the hero's "smaller and faster" contradicted the sample v5 (clock 5.6% slower); hero canvas text was 9 to 10px at 1440 wide; the failure moment barely showed on the canvas; the page ended on the limits; the mobile hero was a 10-row list. Snapshot in `.impeccable/critique/` (now gitignored).
- **Copy:** hero lead now says "smaller, faster or lower power, measured against its own v1"; trust claim 3 is "The winner is proven equal to v1."; removed the DESCRIBE | GENERATE | SIMULATE | VERIFY kicker (a third name set for the loop) and the 01/02/03 claim numbers; dropped "Drag to arrange" from the Plan Board note; version nodes say "score 6.8" instead of "F 6.8".
- **Hero canvas:** the theater camera now follows the action (the plan while it is drafted, then the versions) instead of fitting the whole world, so cards render at full size. The canvas is `inert`, so its inner buttons and the React Flow link no longer sit in the tab order before Pause; a click still opens the Studio.
- **Failure states:** a fixing version keeps its red FAIL n/16 badge next to "Fixing"; a rejected version reads "Rejected: failed 2 attempts" in red with an X instead of grey text.
- **Ending and mobile:** new `ClosingSection` after Limits (one line, Watch the full run, Try it live). Mobile hero order is now caption, current version, then a one-line stage strip ("Stage 4 of 10: Fix") with a 44px Pause button. Hero buttons are 44px tall; Limits text measure narrowed.
- **Verified:** typecheck clean, lint 0 errors (1 old warning), `validate:fixture` OK, `build` OK, no dashes in `frontend/src`. Screenshots at 1440x900 (plan, v1 FAIL 13/16 while fixing, round 2 rejection, finished run, trust, closing) and 390x844 (hero during fix, closing); no horizontal overflow at 390. Detector on the live page: the eyebrow and line-length findings are gone; remaining hits are the React Flow attribution and canvas nested-cards advisories.
- **Datasheet theme concepts:** five landing concepts that re-theme Verity as a hardware datasheet (after an Impeccable gallery reference) in the current palette: 1 straight datasheet, 2 run as a timing diagram, 3 Verity as a chip pinout, 4 characteristics table first with the brand fonts, 5 revision history and errata. Self-contained HTML in `.impeccable/concepts/` (gitignored, compare via `index.html`); checked at 1440x900 and 390x844, no page-level horizontal scroll. Not built into the app; waiting for a pick.
- **Open:** GitHub, Devpost and demo video links are still unset (`NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEVPOST_URL`, `NEXT_PUBLIC_DEMO_VIDEO_URL`), so the footer shows no project links.

### 2026-10-13: Landing rebuilt as the datasheet (concept 1), two new effects
- **Landing:** `/` is now the approved datasheet concept ("the block diagram hero"), built in `frontend/src/components/sections/datasheet/` with scoped CSS (`.ds`), Archivo (wdth axis) and JetBrains Mono via `next/font/google` applied only inside the landing. Sections: sticky band, document head, page 1 with the Figure 1 block diagram, 4 pinout with hover/focus/arrow-key pin interaction, 5 run timing, 6 characteristics, 7 detailed description, 8 typical application, 9 ordering, closing CTA, IMPORTANT NOTICE footer. GitHub, Devpost and video links render only when set.
- **Palette (user decision, landing only):** AMOLED black, white ink, Verity Green as the only accent; no greys, no red, amber or blue. Tokens are re-declared on `.ds`, so /studio, /try and /results keep the navy theme. Status uses marker shape (filled or hollow square, dashed stems) plus a word instead of colour. The vignette grid lines are faint white (a fade needs partial opacity).
- **Pinned timeline:** section 5 pins while the page scrolls and the track slides sideways (sticky stage, rAF lerp smoothing, no library); each milestone draws its stem and reveals its copy near the centre. Narrow screens (under 768px), short screens (under 640px), reduced motion and no-JS get a vertical list with stems shown.
- **Vignette grid:** fixed click-through 48px grid whose vignette follows the pointer (rAF lerp writing `--mx/--my`, no React state); static in the upper middle on touch and reduced motion.
- **Removed:** the old landing sections (`HeroSection`, `HeroReplay`, `LoopSection`, `TrustSection`, `LimitsSection`, `ClosingSection`, `LandingNav`, `SiteFooter`) and the `hero` variant of `RunStoryMobile`. `links.ts` stays.
- **Verified:** typecheck clean, lint 0 errors (1 old warning), `validate:fixture` OK, `build` OK, no dashes in `frontend/src`, no raw hex in the new code. Browser checks at 1440x900, 900x700 and 390x844: pinned timeline works, no page-level horizontal scroll. Not checked: reduced motion, real touch device, tool-measured contrast.
- **Open:** `app/layout.tsx` meta description still says "run faster and smaller".

### 2026-10-13: Landing palette, more green
- **Changed** the datasheet landing palette (landing only, under `.ds`): still AMOLED black and white ink, now with Verity Green in tiers at the user's request ("looks too black"): dim green rules and hairlines, mint captions, green section numbers and part number, a green mouse-following grid with a faint green wash near the cursor, green scrollbar. Pass, proven and the primary button stay full green; failures stay white hollow squares with dashed lines. Timeline copy no longer says failures show in red.
- **Verified:** typecheck clean, lint 0 errors (1 old warning), build OK, no dashes; screenshots at 1440x900 of the hero, timeline and characteristics.
- **Note:** the build agent committed and pushed the landing rebuild as `bfc631d` to `origin/main` on its own; the palette tweak above is not committed.

## 6. Key facts and links

- Hackathon: https://nebiusglobalaihackathon.devpost.com/
- Rules: https://nebiusglobalaihackathon.devpost.com/rules
- Resources and credits: https://nebiusglobalaihackathon.devpost.com/resources
- Hackathon manager: janet@devpost.com
- Must-pass rules: runs on Nebius Token Factory or AI Cloud; uses at least one NVIDIA open model; free hosted demo URL live until judging ends; public repo with MIT, Apache 2.0 or MPL 2.0 license and a README; public YouTube video under 3 minutes that says Nebius and NVIDIA; feedback on Nebius and NVIDIA tools; new work after 2026-08-26; English; no API keys in the repo.
- Judging: technological implementation, design, potential impact, quality of idea (equal weight).
- Weekly gates: 2026-10-04 tools run in sandbox and Nemotron passes 10 of 20 test problems; 2026-10-11 agent turns 3 English specs into passing RTL unaided; 2026-10-18 measurable PPA gain on showcase chip; 2026-10-25 hosted URL works, feature freeze; 2026-10-29 submitted.

## 7. Files in this project

| File | Purpose |
|---|---|
| `docs/hackathon/AI_Hardware_Engineer_Project.md` | Concept brief |
| `AI_Hardware_Engineer_Report.html` | Feasibility datasheet (AIHE-01) |
| `docs/hackathon/Nebius_Hackathon_Game_Plan.html` | Hackathon game plan (AIHE-02) |
| `REPORT.md` | This project record |
| `docs/MEETING.md` | Brief for the 2026-10-02 project meeting |
| `CLAUDE.md` | Working rules for AI assistants in this project |
| `docs/UI_CANVAS_RESEARCH.md` | Canvas UI research: journeys, UX prior art, canvas tech (2026-10-04) |
| `.archify/workflow-verity-journey-20261004-011950/verity-journey.html` | Interactive user journey map for the canvas UI (v1) |
| `.archify/workflow-verity-journey-v2-20261004-014852/verity-journey-v2.html` | Journey map v2 with locked decisions |
| `docs/PRODUCT.md` | Design context: users, registers, tone |
| `docs/brand.md` | Colors, tokens, type, motion, voice |
| `docs/UI_UX_SPEC.md` | Pages, states, copy, reusable components |
| `frontend/ARCHITECTURE.md` | Frontend stack, structure, data contracts |
| `v1RTL generation with LLMs.pdf` | REvolution paper (reference only) |
| `frontend/` | Next.js frontend (static export; replays a sample run) |
| `backend/` | Python agent backend; `backend/ARCHITECTURE.md` is its architecture |

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
- **Repo:** folder is not a git repository yet. No README, LICENSE or .gitignore.
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

### 2026-10-05: Backend architecture document
- **Cloned** the repo from github.com/Sahir619/verity and ran the web app locally (`npm ci`, `validate:fixture` OK, `typecheck` clean, `next dev` serves `/` with HTTP 200).
- **Added** `agent/ARCHITECTURE.md`: backend contract for the future `agent/` service. One FastAPI process with a deterministic orchestrator; Nemotron on Nebius Token Factory behind an `LLMProvider` interface; the model gets no tools or shell; chip tools (Verilator lint, Icarus + cocotb, Yosys, OpenSTA, EQY) run through fixed tool functions in Nebius Sandboxes or local Docker; locked, hashed task packs as the golden reference; REvolution-lite search (v1, 3 children, optional round of 2, elites = best 2); per-run budget ledger and rate limits; access-code login with stream tokens for SSE; SQLite + immutable artifacts; evals suites; Celery and Redis deferred. Emits the existing frontend `RunEvent` contract with no new event types.
- **Kept separate** from the frontend `ARCHITECTURE.md` at the user's request. Conflicts with existing docs are listed in section 27 of the new file (no auth in the frontend's proposed API, waveforms vs failing cases in repair, old population size, single `LLM_MODEL`). Open decisions O1 to O12 are in its section 23.
- **Verified by:** WebFetch of the official rules page, the Nebius model catalog and the Sandboxes docs (2026-10-05); scanned the new file for em and en dashes (none). Nothing was implemented; claims tagged [ASSUME] still need the M0 spike.

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
| `AI_Hardware_Engineer_Project.md` | Concept brief |
| `AI_Hardware_Engineer_Report.html` | Feasibility datasheet (AIHE-01) |
| `Nebius_Hackathon_Game_Plan.html` | Hackathon game plan (AIHE-02) |
| `REPORT.md` | This project record |
| `MEETING.md` | Brief for the 2026-10-02 project meeting |
| `CLAUDE.md` | Working rules for AI assistants in this project |
| `UI_CANVAS_RESEARCH.md` | Canvas UI research: journeys, UX prior art, canvas tech (2026-10-04) |
| `.archify/workflow-verity-journey-20261004-011950/verity-journey.html` | Interactive user journey map for the canvas UI (v1) |
| `.archify/workflow-verity-journey-v2-20261004-014852/verity-journey-v2.html` | Journey map v2 with locked decisions |
| `PRODUCT.md` | Design context: users, registers, tone |
| `brand.md` | Colors, tokens, type, motion, voice |
| `UI_UX_SPEC.md` | Pages, states, copy, reusable components |
| `ARCHITECTURE.md` | Frontend stack, structure, data contracts |
| `v1RTL generation with LLMs.pdf` | REvolution paper (reference only) |
| `web/` | Next.js frontend (static export; replays a sample run) |
| `agent/ARCHITECTURE.md` | Backend architecture contract (not built) |

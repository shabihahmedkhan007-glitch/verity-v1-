# Verity: Product requirements

The build contract and the top of the document order. What Verity must do, how we know it does it, and what is not built yet. Status as of 2026-10-23. Feature freeze 2026-10-26 (moved from 2026-10-25: D46), internal submit 2026-10-29, deadline 2026-10-30 10:00 am Pacific.

Document order when two documents disagree: this file, then `docs/DECISIONS.md`, then `backend/CONTRACTS.md` for interfaces, then the `ARCHITECTURE.md` files (root, `backend/`, `frontend/`), then `docs/UI_UX_SPEC.md`, `docs/brand.md` and `docs/PRODUCT.md`, then `HANDOFF.md` and `REPORT.md`, then history (`docs/MEETING.md`, `docs/AGENT_RESEARCH.md`, `docs/UI_CANVAS_RESEARCH.md`, `docs/hackathon/`, `docs/superpowers/`, `BACKEND_CHECKLIST.md`). A conflict is flagged, never reconciled silently (D33). Words: `docs/GLOSSARY.md`.

The approved plans this file carries live in `.planning/`, which is gitignored: `verity-design-partner.html` (approved 2026-10-22), `verity-verilog-strength.html` (approved 2026-10-23), `verity-chip-engineer-agent.html` (approved 2026-10-23) and `verity-supabase-chats.html` (approved 2026-10-23). Their claims and acceptance criteria are copied into section 5 so the repo holds them.

## 1. Pitch

Describe a chip in plain English. Verity writes the Verilog, tests it against a locked golden model, fixes its own bugs, then evolves smaller and faster versions. Built on NVIDIA Nemotron and Nebius Token Factory.

Verity is a design partner, not a one-shot generator (D28). The first message gets a fact check with one clear verdict and, for hardware, research from real sources. The run is an engineer's loop that a fixed state machine drives: plan, write, lint, simulate, fix, synthesize, improve, prove equal with Yosys EQY, then a sign-off sheet. After the first chip request the chat is an agent that picks tools and shows its steps (D41). After the run it answers questions from the run's own data, walks through the steps, and turns a change request into a new run that starts only after Confirm. Nemotron is the engineer: it writes the plan and the logic of every design. Locked tests and formal proofs, not a model, decide what passes.

Success for the hackathon: a judge who opens the URL understands the loop within 30 seconds, sees a measured improvement within 90 seconds, can finish the story by clicking, and can build a small chip live without being able to run up our bill. Success beyond it: an engineer trusts the numbers enough to read the Verilog.

## 2. Personas

Five composites from the design-partner plan. No interviews yet (U11 in `docs/AGENT_RESEARCH.md` stays open). Every claim in section 5 must serve at least one of them; the judge comes first in a trade-off.

| Persona | Types | Needs |
|---|---|---|
| Priya, hackathon judge, about 3 minutes per entry | "I want ice cream", then "a 16-bit adder with carry" | The verdict in line one, real sources, visible steps, and where Nemotron works |
| Arjun, RTL designer at a small chip startup | "32-bit adder, smallest area. What architectures are known?" | Tier and date on each source; source, model and measurement kept apart; numbers against v1 |
| Lena, second-year EE student | "a counter that counts to 100, then resets" | "Close, not exact" in plain words, the failing test before the fix, short definitions |
| Sam, curious visitor | "I want ice cream", "make me a robot" | A kind "Not a chip" and one tap to a small chip that is close |
| Noor, founder with a big idea | "a GPU for my edge AI camera" | "Not the whole thing, but this block", a dated list of what exists, her idea kept private |

## 3. Verdict words

The first reply to a chip request carries exactly one verdict. A first message that is a question about chips or about Verity gets an answer and no verdict (parser class `question`, D41). Code sets the verdict from the checked class, never a model alone (D17). Each is a shape plus a word, in ink, never amber: a verdict is a read on a request, not a result.

| Verdict | Shape | When |
|---|---|---|
| Buildable now | filled square | One of the live families builds it at these settings |
| Buildable with changes | square with a dot | Close; Verity offers the closest chip it can build |
| Not buildable here | half-filled square | A real chip, outside the families or their ranges |
| Not a chip | hollow square | Not about hardware. No search runs |
| Could not check | dashed square | The check or its research failed. Try again is offered |

Planned, with phase B (CE3, D45): a sixth verdict, "Custom block", for a small block outside the families that fits the custom limits. Its shape is set in `docs/brand.md` when it is built.

Status words after a run (Passed, Proven, Not proven, Failed, Dropped, Not run by Verity yet) are in `docs/GLOSSARY.md` and `docs/brand.md` 1.2a.

## 4. Scope

**In:** four live chip families with server-checked knob ranges (MAC array `mac4`, adder `add8`, counter `cnt8`, sequence detector `fsm_seq`); a recorded replay on the landing and `/studio`; the live bench `/bench` (chat workspace); everything in section 5 marked built.

**Not changing (both plans):**
- The locked task packs. `golden.py`, `test_dut.py` and `reference.v` in `backend/tasks/` stay unchanged, so pack hashes do not move. More seeds and planted bugs reuse the same locked tests (D32).
- The four live families and Yosys EQY as the only proof. Tools run only in the Docker sandbox, through fixed scripts with fixed arguments (the Verilog-strength build added three: `seeds`, `strength`, `wave`; D24).
- Replay makes no network call after its run file loads.
- The $0.50 per-run cap. (The daily limit moved from $5.00 to $10.00 and a $3.00 per-session limit was added on 2026-10-23: D34, D35. The web shows spend, never a limit: D36.)

**After the hackathon:** assertions, coverage, layout and FPGA. The bench says "Not run by Verity yet" for assertions and coverage rather than hiding the gap.

## 5. Requirements and acceptance

Status words:
- **built**: in the code, covered by tests, and reported working in a `REPORT.md` change log entry. Not every row was re-run when this file was written; run the acceptance check before relying on one.
- **built, not seen live**: in the code and tested against mocks or the fake provider only.
- **planned**: approved but not built.
- **open**: needs a user decision or an action.

### 5.1 Core

| # | Requirement | Acceptance | Status |
|---|---|---|---|
| C1 | Replay: the landing and `/studio` play a recorded real run. | No network call after the run file loads (`frontend/ARCHITECTURE.md` 13 has the grep check). | built |
| C2 | Live bench: describe a chip, see a verdict, confirm the knobs, press Run, follow it, read the result. | The server validates every knob. A refusal offers the closest buildable chip or "Pick it yourself". `?run=` reloads a run, with its first reply. | built |
| C3 | Trust: every PASS is a real simulation against the locked golden model; "Proven" appears only when EQY proves it. | No string says passed or proven without a tool result behind it. Every number comes from run data and is stated against our own v1; the human reference comparison (D14) is the one labelled exception. | built |
| C4 | The engineer loop: spec, plan, lock, v1 (three drafts in parallel, bounded fixes), up to 2 improve rounds (at most 6 versions), winner by measured fitness, EQY against v1, human reference. Fast mode stops after v1. | A full run ends `done` or `cap_reached` with a winner (v1 can win) and a one-sentence outcome. | built |
| C5 | Money and safety: $0.50 per run (server enforced), $10.00 per day for the whole server (D34), $3.00 per session per UTC day (D35), 15-minute wall limit, one run at a time per session, rate limits on runs, parse, ask and access codes, access codes required in production. | A run that hits its cap ends `cap_reached` and says it reached the spend limit. A request past the day's or the session's limit is a 429 (`budget_exhausted`, `session_budget_exhausted`). No key appears in the repo, the frontend or the logs. | built |
| C6 | Honest tool names (D27). | The app and docs name only tools that ran: Yosys, OpenSTA, Verilator, Icarus with cocotb, Yosys EQY. Sample data is labelled "Sample data". Nothing from the REvolution paper is shown as Verity's result. | built |
| C7 | Design: the rack world (D12). | `#0A0806` ground, `#13100C` panel, `#FFB000` amber only for passed or verified results, the one primary action, or focus. Status is a shape plus a word. Plain language on the surface, detail in dropdowns. Tokens only, never raw hex in components. WCAG 2.2 AA target. | built |
| C8 | Hosting: a public URL for the site and the backend that stays up until judging ends. | Both answer from a clean browser; `GET /health` lists the role models and `features`. | **open** (where to host is the user's decision) |

### 5.2 Design-partner plan (approved 2026-10-22)

The user chose: "Not a chip" with no search; v2 still built from a passing v1 (D30); Nemotron Ultra writes the plan with research as input; claims 1, 2, 3 and 5 before the freeze. Tavily was added on 2026-10-23 (D19).

| # | Claim | Acceptance | Status |
|---|---|---|---|
| DP1 | The first message gets a fact check and one clear verdict (D17). | `POST /parse` sorts the sentence into seven classes (the seventh, `question`, gets an answer and no verdict: D41); code sets one of the five verdicts. "Not a chip" runs no search and says so. A model "not a chip" on a sentence with a hardware word becomes "unsure". A failed check on a hardware request reads "Could not check" with Try again. | built |
| DP1.1 | A hardware request gets research from real sources. | At most 3 searches, built from code templates, never raw user text. Only allowlisted hosts count (tiers A, B, C, P); up to 8 sources, at most 2 per domain. Only the GLM summary call reads web text, and it has no tools. Code drops unknown citations, URLs, ungrounded numbers and techniques off the fixed list. With a real provider and no search key, research is off, never faked. | built, not seen live (no search key set; 0 real search credits used so far) |
| DP2 | Research and run results go into Verity's own database (D29). | Migration 3 (`research`, `source`, `research_source`, `research_grant`, `run_outcome`, `strategy_outcome`, `runs.research_id`); migration 4 (Tavily credits). Every run writes one outcome row when it ends, stopped runs included. A new run reads research by its id, then the exact family-and-knobs key, then the nearest knobs. Only technique ids from the fixed list and numbers written by code reach Nemotron. The store keeps a hash of the sentence, never the sentence. | built |
| DP3 | After the first message, the chat works on the design with you (D18). | `POST /runs/{id}/ask`, owner only, ended runs only. Selection, drop, timing and cost answers are code templates. A GLM answer gets a facts block; any number not in the facts triggers one retry, then the code answer. Verilog is stripped from chat replies. A change request returns a proposal that starts a run only after Confirm. | built |
| DP3.3 | The server keeps each thread and the sidebar reopens it. | Thread and message tables, private to the session. | built 2026-10-23 for the server (SQLite migration 6, D42) and the browser store (`verity.threads`); the same threads on another device wait for Supabase (section 5.7) |
| DP4 | Research, plan and versions overlap more and show live: each v1 draft tested as soon as it is ready, EQY on the round 1 best while round 2 runs, a Sources tab. | "Proven equal to v1" stays true (D30). | planned (after the freeze) |
| DP5 | GLM 5.3 writes chat and research; Nemotron writes the plan and all Verilog (D16). | `backend/config.toml` routes, `GET /health` `models` and the README table agree. At least one NVIDIA open model runs every engineering role. | built |
| DP6 | Start a new run from a chosen version. | | planned (after the freeze) |

### 5.3 Verilog-strength plan (approved 2026-10-23; all five claims before the freeze, D25)

The user chose the defaults except one: selecting a version opens a right-panel tab about it and posts no card into the chat (D20).

| # | Claim | Acceptance | Status |
|---|---|---|---|
| VS1 | Selecting a version attaches it to the chat (D20). | Pick v4 (a Versions row, a picker, or a version name in an answer): a removable "v4" chip appears in the composer. A Versions row or an answer link also opens a "v4" tab with badges read from the run (tests, seeds, lint, proofs, area and clock against v1), its reason, its waveform and a diff against its parent. Removing the chip leaves the tab. Ask sends `focusVersion`. No card is posted into the chat. | built |
| VS2 | The Architecture tab shows the engineer's steps and the real circuit, with Expand for a big view (D21). | The step rail reads run data only (spec, plan, RTL, lint, simulate, synthesize, improve, equivalence, sign-off); a step the run never reached says "Not reached"; assertions and coverage say "Not run by Verity yet". The circuit is the version's own `CircuitGraph`. Plan blocks are an ordered list, not wires. The Spec step lists the pack rules (`spec/rules.json`) and "I assumed" chips come from `statedKnobs`. "Walk me through it" returns a code-built walkthrough with no model call; Next and Back call nothing. | built |
| VS3 | Every run ends with a sign-off sheet an engineer can check (D22, D23). | After `run done`, every run (fast and full): the locked tests on 8 more seeds, lint errors and warnings by tag, latches, EQY against v1 and against the human design, and test strength from up to 20 bugs planted by seven fixed rules. The result never waits for it; the sheet reaches an open browser without a reload. A stopped run has no sheet. | built |
| VS4 | Fixes and improvements get real evidence, not only totals (D24). | A version that fails gets `waves/<id>.json` (its first failing case) before its repair, and the repair prompt carries a cycle table around the first mismatch. The optimizer prompt carries the largest cell types and the critical path. The winner's first directed case is shown as a waveform. | built |
| VS5 | The repo docs describe the design partner and the hackathon rules. | This file, `docs/DECISIONS.md` (D1 to D15 copied, then D16 onward), `docs/GLOSSARY.md`, the root `ARCHITECTURE.md`, a lean `CLAUDE.md`, the README with "How Verity uses NVIDIA Nemotron", history banners on the old docs, no em or en dashes. | built (this docs pass, 2026-10-23) |

### 5.5 Workspace Home and spend limits (approved 2026-10-23)

The user chose: Home lists the runs started in this browser; Combine is a preview diagram marked Coming soon; the daily limit is $10.00, one session gets $3.00 a day, and no limit figure appears in the UI (D34 to D37).

| # | Requirement | Acceptance | Status |
|---|---|---|---|
| WH1 | The sidebar's Home opens `/workspace`; the VERITY logo still opens the landing page. | `/workspace` uses the bench's frame and sidebar, builds in the static export, and works at 1440 and 390 px wide. | built |
| WH2 | The page lists the runs in this browser's recent list, newest first, joined by id to `GET /runs` (D37). | A card shows the name (a link that opens `/bench?run=<id>`), a status square (amber only for a run that is done with a winner), the winner, area and clock against that run's own v1 as signed percent, the sign-off seeds when a sheet exists, and the run's spend. A run the server did not return still shows, from local data, saying "Not in the server's latest runs". When `GET /runs` fails the page says so. The empty state is one line and a New chip action. Totals are blocks started, runs that passed their tests, and spend on these runs, all from run data. Family chips filter everything below them. | built |
| WH3 | Two plain-SVG charts read the same runs. | Change against v1 (area and clock per run, a 0% line, the caption says left of it is better) and spend per run. Neutral inks, never amber. Each chart has a table view, a legend where it has two series, and a hover and focus tooltip. | built |
| WH4 | Combine blocks is a preview, not a feature. | A diagram (MAC array, then Requantize, then FIFO, makes an AI accelerator tile), a "Coming soon" tag, a disabled "Combine (not available yet)" button and one sentence that Verity builds one block at a time today. No number, nothing that pretends to work. | built |
| WH5 | `GET /runs` carries each run's outcome. | `outcome?: {areaVsV1, clockVsV1, powerVsV1, versions, usd, signoff?}` from `run_outcome`, ratios against that run's own v1 and null when unknown; `signoff` from the stored sheet when one exists for the winner; the key is left out for a run with no outcome. The route stays public. | built |
| WH6 | A per-session spend limit next to the global one (D35). | `[limits] session_usd = 3.00` per session per UTC day, kept in SQLite (`session_spend`, migration 5) so a restart does not reset it. Same reserve-then-settle as the daily limit, at `POST /runs`, `POST /parse` and `POST /runs/{id}/ask` when they need a model call. Refusal: 429 `session_budget_exhausted` with a sentence that has no dollar figure; the bench shows it. The key is one function (`spend_owner`), so sign-in swaps the session id for a user id in one place. | built |
| WH7 | No limit figure anywhere in the UI (D36). | `capUsd` stays in the API and the contracts; the web shows only what a run actually spent. A grep of `frontend/src` finds no "of $X", "Cap $X" or "costs at most". | built |

### 5.4 Search and hosting

| # | Requirement | Acceptance | Status |
|---|---|---|---|
| S1 | Tavily for general web search, Serper for Google Scholar and Patents (D19); keys server side only. | One real `POST /parse` with `TAVILY_API_KEY` set returns research whose web hits came from Tavily and whose Tavily credits are counted. This is also the "Best Use of Tavily" condition: a functional runtime call to the Tavily API. | **done** 2026-10-23: one real `POST /parse` on `:8000` returned 8 sources with 2 Tavily and 1 Serper credits counted (REPORT 2026-10-23) |
| S2 | Production settings for judging. | `VERITY_ENV=production` starts only with Nebius, a 32+ character signing secret, access code hashes, auth required and CORS set to the site origin. | **open** (follows C8) |

### 5.6 Chip engineer agent plan (approved 2026-10-23)

Source: `.planning/verity-chip-engineer-agent.html`. The user asked for the chat after a thread's first chip request to be a discussion with a senior chip engineer: it reads its rules, picks tools, shows what it did, remembers the thread, and later builds any small block, not only the four families (D41 to D46). The user chose: GLM 5.3 runs the agent loop (the Lightning router is not used on this path); the facts record, the last 10 turns and a short summary as memory; chat first, then custom blocks, with the freeze moved to 2026-10-26; GLM 5.3 drafts a custom golden model and Nemotron writes the Verilog. Phase A (CE1, CE2, CE4, CE5) is built and in review as of 2026-10-23; run an acceptance check before relying on a row. Phase B (CE3) is planned. Detail: `backend/ARCHITECTURE.md` section 17.4 and `backend/CONTRACTS.md` section 9.

| # | Claim | Acceptance | Status |
|---|---|---|---|
| CE1 | After a thread's first chip request, the chat is an agent that talks like a senior RTL and ASIC engineer (D41). | `POST /threads/{id}/messages` serves every message; `GET /threads` and `GET /threads/{id}` read them back. The fact check runs on each message until the thread's first chip request, then never again in that thread. A question gets an answer and no verdict (parser class `question`); "Not a chip" leaves the thread unchecked. The old `POST /runs/{id}/ask` path stays and keeps the Lightning router. | built, in review |
| CE2 | The agent picks its own tools and every reply shows its steps (D41). | Six tools: `list_blocks`, `research`, `run_facts`, `walkthrough`, `propose_run`, `open_tab`. At most 4 tool steps and 5 chat calls per message; code validates every argument and shows a refused step with a plain reason. Each step line is a fixed code phrase. `propose_run` returns a chip card; a run starts only after the user presses Run. | built, in review |
| CE3 | Verity builds any small block after the user approves its golden model (D45). | Fixed limits: one module; combinational, or one clock with a synchronous reset; latency 0 to 8; at most 8 ports of 1 to 64 bits; no handshake, memory or second clock. GLM 5.3 drafts the spec, worked examples and Python golden model; the sandbox self-checks it (one redraft, then dropped); only the user's Approve locks the pack. One generic testbench tests every custom block. The label reads "Golden model drafted by Verity, approved by you", with no human-reference comparison. A custom pack never edits the four locked packs. A sixth verdict, "Custom block" (section 3). Gate: 4 of 5 sample blocks (CRC-8, priority encoder, popcount, saturating adder, LFSR) pass end to end by 2026-10-26, or the "custom" switch stays off. | built 2026-10-27 (D53), freeze date set aside; verified for real on one block (a real Docker sandbox run, $0 via a fake draft and a recorded RTL cassette); the real 4-of-5 gate (distinct blocks, real Nemotron spend) has not been run |
| CE4 | Verity remembers the whole thread, also after a reload or a restart (D42). | A facts record written only by code, the last 10 turns verbatim, and a 20 to 40 word summary of older turns (route `memory`, GLM 5.3, folded in batches of 4 turns). Stored on the server (SQLite migration 6, behind `ThreadStore`) and in the browser (`verity.threads`). `POST /runs` with a `threadId` writes the run id into the facts record. | built, in review (the fold runs on every message past the tenth, not yet in batches of 4) |
| CE5 | The model cannot start a run, invent a number or write Verilog (D43). | Every number is in the facts, a tool result, the fact check of that message or the user's own message; one retry, then the code answer. Verilog is stripped. The agent sees research only as the summary's code-checked sentences and source titles; web text reaches only the summary call, which has no tools. At most one new research per message. Only the user's press starts a run or locks a golden model. | built, in review |

Not changing: the fact check on a thread's first chip request, the four locked packs, the run pipeline and the limits ($0.50 a run, $10.00 a day, $3.00 a session; the UI shows no limit figure: D36). No fine-tuning (D44).

### 5.7 Supabase sign-in and saved chats (approved 2026-10-23, not built)

Source: `.planning/verity-supabase-chats.html`. The user asked for chats to be saved, not only runs, in Supabase, with email and password sign-in and no sign-ups (D47). This step starts after the phase A check and before custom blocks.

| # | Requirement | Acceptance | Status |
|---|---|---|---|
| SB1 | Chats and each user's list of runs are saved in Supabase Postgres. | A Supabase store implements `ThreadStore` beside the SQLite one. Chats survive a Verity server restart or move; the sidebar shows the user's runs on any device. Run files, events and spend ledgers stay in Verity's database and on disk. Tests and local work keep SQLite and make no network call. | planned |
| SB2 | Sign-in is email and password only, with no sign-up form. | The team creates every account in the Supabase dashboard (sign-ups are off) and gives the accounts to judges. "Try it live" opens a sign-in page that says to use the account the Verity team gave you and offers an access code field. | planned |
| SB3 | The live bench needs an account or the judge access code; the recorded run stays public. | Without either, the live bench sends the visitor to the sign-in page. Anyone with an account or the code can start live runs; a switch can make the bench code-only. The session limit follows the user (D35). | planned |
| SB4 | Nobody reads another person's chats and the browser holds no secret. | The backend checks each Supabase token with the project's JWKS. `SUPABASE_SECRET_KEY` lives only in `backend/.env`. The browser gets `NEXT_PUBLIC_SUPABASE_URL` and the publishable key, which Supabase designs to be public. Tables have row level security with no policies, so only the server's secret key reads them. The Supabase CLI's linked project is not used: the user makes a new project and pastes one SQL file. | planned |

## 6. Hackathon must-pass items

From the rules page `nebiusglobalaihackathon.devpost.com/rules`, read 2026-10-22.

**Tracks (pick one):** Coding and Agentic Engineering; Best Apps and Agents; Personal AI; Physical AI. Recommended: Coding and Agentic Engineering (D1 recorded that plan on 2026-09-28). **The user has not confirmed the track for the submission.**

**Submission checklist:**

| Item | Status |
|---|---|
| A hosted demo URL | open (C8) |
| A public repo with an open-source license visible in the repo's About section | open: `LICENSE` is MIT, but its holder ("DOMINIC_WOLF") is unconfirmed, and so is the remote that becomes public (`origin` Sahir619/verity or `v1` shabihahmedkhan007-glitch/verity-v1-) |
| A README with setup steps that highlights NVIDIA Nemotron use, "where Token Factory accelerated your workflow" and any other Nebius tools | drafted (`README.md`); demo URL and video link still to add |
| A public YouTube video under 3 minutes that shows the project working | open |
| The track chosen | open (user) |
| Feedback on Token Factory and NVIDIA tools | open (written at submission) |
| An explanation of significant updates, if the project existed before the submission period | open: confirm whether it applies |

Recorded earlier in `REPORT.md` section 6 (not re-read on 2026-10-22): runs on Nebius Token Factory or AI Cloud; at least one NVIDIA open model; MIT, Apache 2.0 or MPL 2.0 license; the video says Nebius and NVIDIA; new work after 2026-08-26; English; no API keys in the repo.

**Judging (four equal criteria):** Technological Implementation (including how effectively it uses Token Factory and Nemotron), Design (a complete product, not a proof of concept), Potential Impact, Quality of the Idea. Ties go by the first criterion.

**Prizes:** one Overall award, or one Track award plus one Bonus award. The Tavily bonus ("Best Use of Tavily") is $3,000 and needs a functional runtime call to the Tavily API (S1).

## 7. Roadmap

**Before the freeze (to 2026-10-26, D46):**
1. Hosting for the site and the backend (C8), then the production settings (S2). Hosting starts in parallel with custom blocks.
2. Restart the live backend when the user asks (it was stopped on 2026-10-23 when the machine ran low on memory), after a copy of its database: migration 6 runs on start and `/health` then lists `agent`.
3. The 2:4 sparse dot product family only if hosting lands by 2026-10-23. As of this writing hosting has not landed.
4. The phase A check of the chip engineer agent (CE1, CE2, CE4, CE5), then Supabase sign-in and saved chats (section 5.7; the plan sets no finish date).
5. Custom blocks (CE3), after Supabase. Gate: 4 of 5 sample blocks end to end by 2026-10-26, or the "custom" switch stays off.

**Freeze to submit (2026-10-26 to 2026-10-29):** the video, the Devpost write-up, the track choice, Token Factory and NVIDIA feedback, the license holder and the public remote. No new features.

**After the freeze, planned (not built), in order:**
1. FP8 multiplier (E4M3 or E5M2 inputs)
2. int8 requantize unit
3. streaming FIFO
4. round-robin arbiter
5. CRC-32
6. SECDED
7. `alu8` live in the chat

Each new family needs a pack with its own golden model, tests, reference design and self-test, plus the parse, research and frontend wiring, and a capped real-model probe. Research behind this list: `.planning/research/modern-families.md` (local only).

Also after the freeze (design-partner plan): DP4 overlap and the Sources tab, DP6 runs from a chosen version. (DP3.3 saved threads is built; the same threads on another device come with Supabase, section 5.7.) The order between these and the new families is not decided.

**After the hackathon:** assertions, coverage, layout and FPGA.

## 8. Open items

- Track for the submission (user).
- Hosting (user), required by the rules.
- `LICENSE` holder "DOMINIC_WOLF" (user).
- Which remote becomes the public repo: `origin` (Sahir619/verity) or `v1` (shabihahmedkhan007-glitch/verity-v1-) (user).
- A new Supabase project, its SQL file and the judges' accounts (user, D47).
- The live `:8000` backend is stopped (the machine ran low on memory on 2026-10-23); restart it when the user asks, after a copy of its database.
- U9 (Nebius Zero Data Retention for the hosting org) and U11 (talk to 3 to 5 RTL or DV engineers), carried from `docs/AGENT_RESEARCH.md`.

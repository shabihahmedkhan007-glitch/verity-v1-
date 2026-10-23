# Verity

Describe a chip in plain English. Verity writes the Verilog, tests it against a locked golden model, fixes its own bugs, then evolves smaller and faster versions. Built on NVIDIA Nemotron and Nebius Token Factory.

Entry for the Nebius x NVIDIA Global AI Hackathon. **Track: to be confirmed** (recommended: Coding and Agentic Engineering). Also aiming for the Best Use of Tavily bonus: the first real Tavily call was made on 2026-10-23 (see "Other tools"). Demo URL and video: to be added when hosting is decided.

## What Verity is

Verity is a design partner for small digital chips. You describe a chip in plain English. Verity fact-checks the request against real sources and gives one clear verdict. Nemotron then writes the plan and every line of the Verilog. Locked golden-model tests, Yosys and OpenSTA measurements, Yosys EQY proofs and a sign-off sheet decide what passes, never a model. After the run, a chat agent discusses the result like a senior engineer, remembers the whole thread, and turns a change request into a new run only when you press Confirm.

## How it works

Two diagrams show the system. They describe the working tree as built on 2026-10-23.

- [System overview](docs/diagrams/verity-overview.html): chat, run, models and data.
- [One run, step by step](docs/diagrams/verity-run.html): each step of a run and who owns it.

In short:

1. **Fact check.** You type a request. Verity answers with one verdict set by code: Buildable now, Buildable with changes, Not buildable here, Not a chip, or Could not check. A question about chips or about Verity gets an answer and no verdict. For a hardware request it searches real sources and cites only what the search returned.
2. **Build.** A fixed state machine runs the engineer's loop: plan, write v1 (three drafts at once), lint, simulate against a human-written golden model the agent cannot see, fix, synthesize. The model never runs a tool.
3. **Improve and prove.** Up to two rounds of smaller or faster versions (at most six in all). The winner is chosen by measured area, clock and power against our own v1, and it is never worse than v1 on the goal you picked. Yosys EQY then proves it equal to v1 and compares it with a human-written reference design.
4. **Sign off.** After the result shows, every run checks the winner again: the locked tests on 8 more seeds, lint warnings by tag, the proofs, and how many deliberately planted bugs the tests catch.
5. **Talk it through.** After your first chip request, one agent (GLM 5.3) answers like a senior RTL and ASIC engineer. It picks from six tools, shows each step it took, and remembers the thread. Every number in an answer comes from the run's own data, never from the model. Ask why a version won, what limits the clock, or say "walk me through it".

Four chip families are live, with server-checked knob ranges: a multiply-accumulate array, an adder, a counter and a sequence detector.

## Run it locally

Prerequisites:

- Python 3.11 or newer (the project runs on 3.13).
- Node (developed on Node 24; `npm run validate:fixture` relies on Node 24 type stripping).
- Docker Desktop, running. The chip tools and the tool tests run in a Docker image.

### Backend

```
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows; source .venv/bin/activate elsewhere
pip install -e ".[dev]"
docker build -t verity-tools:0.1 -f sandbox/Dockerfile sandbox      # 10 to 20 minutes the first time
python tasks/make_manifest.py --check                               # every pack must print ok
```

The image is built locally from `backend/sandbox/Dockerfile` (the repo names no prebuilt image to pull). After a change to `backend/sandbox/`, rebuild it.

Settings: `backend/config.toml` holds the model routes, prices, limits and the research and Supabase tables. The defaults run as they are. Secrets go in `backend/.env` (gitignored, never committed). `backend/.env.example` lists the names. Process environment wins over `.env`, and `.env` wins over `config.toml`. Any `config.toml` value can be set as `VERITY_<TABLE>__<KEY>`.

Start it:

```
.venv\Scripts\verity-api.exe           # Windows
.venv/bin/verity-api                   # Linux or macOS
python -m verity.main                  # same thing, from an active venv
```

The script is `verity-api`, defined in `backend/pyproject.toml`. It listens on `http://127.0.0.1:8000`, one worker only.

Providers:

- **Fake (the default, `VERITY_PROVIDER=fake`).** No model call is made and the cost is $0. Research uses canned sources. The chip tools still run in the real Docker image, so a fake run is a real simulation of canned Verilog. Use it for the interface, the tests and the first look.
- **Real models (`VERITY_PROVIDER=nebius`).** Needs `LLM_API_KEY`. Add `TAVILY_API_KEY` and `SERPER_API_KEY` for research. With one search key that service serves all three searches. With none, research is off on a real provider. Real calls cost money: the server caps a run at $0.50.

Optional accounts and saved chats: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY`. Setup: [docs/SUPABASE_HANDOFF.md](docs/SUPABASE_HANDOFF.md). Without them nothing changes: chats stay in SQLite and the access code is the only sign-in.

### Frontend

```
cd frontend
npm ci                                 # or npm install
npm run dev                            # http://localhost:3000
```

Put `NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8000` in `frontend/.env.local` for live runs on `/bench`. Without it the site plays the recorded run only. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are optional and public by design; with neither set there is no sign-in gate. `NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing them. The backend's default CORS origin is `http://localhost:3000`.

### Tests

```
cd backend && pytest -q                # Docker Desktop running for the tool tests
cd frontend
npm run typecheck
npm run lint
npm run validate:fixture               # checks the run files in public/runs/
npm run build                          # static export to out/
```

On 2026-10-23 the backend suite passed 1030 tests in 8 min 38 s with Docker running. Under heavy parallel Docker load two `cnt8` width 16 edge tests can time out in a full run; they pass alone.

## Models used and why

Roles are set in `backend/config.toml`. `GET /health` lists the model of each role. The table below matches the config file as read on 2026-10-23.

| Job | Route | Model | Why |
|---|---|---|---|
| Plan the design | `planner` | Nemotron 3 Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) | The engineer: it writes the plan and the logic of every design |
| Write the Verilog | `rtl_gen` | Nemotron 3 Ultra | Three drafts at once; the best passing draft becomes v1 |
| Fix failing Verilog | `repair` | Nemotron 3 Ultra | Gets the lint log or the failing cases, and a cycle table around the first mismatch |
| Make smaller or faster versions | `optimizer` | Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`) | About a third of Ultra's price per token ($0.30 in, $0.90 out per 1M, against $1.00 and $3.00), for the round that tries many ideas |
| Sort a chat message after a run (older ask path, when keyword rules do not decide) | `router` | Nemotron 3.5 Lightning (`nvidia/Nemotron-3_5-Lightning`), thinking off | The cheapest model in use ($0.06 in, $0.24 out per 1M) for a small sorting job |
| Fact check, chat agent, research summaries, thread memory | `parser`, `chat`, `research`, `memory` | GLM 5.3 (`zai-org/GLM-5.3`), also on Token Factory | Chosen in a real bake-off on 2026-10-23: it kept to what Verity can do, where Nemotron 3 Ultra and DeepSeek V4 Pro offered options the tool cannot build |

Fallback for the GLM routes: on a timeout, a connection error or a 5xx, the call goes to DeepSeek V4 Pro (`deepseek-ai/DeepSeek-V4-Pro`), then to Nemotron 3 Ultra with thinking off. A model that failed is skipped for 5 minutes. A 4xx or an unreadable answer never falls back. It was added after GLM 5.3 timed out on Token Factory for a while on 2026-10-23, while Nemotron answered in 0.3 s. DeepSeek's price in `backend/config.toml` is a third-party listing, not confirmed on the Nebius page.

Trust rules that go with this table:

- Nemotron writes the plan and every line of Verilog. GLM and DeepSeek never write Verilog and have no tools.
- Only technique ids from a fixed list (for example `carry_lookahead`) pass from research to Nemotron, never web text.
- A chat answer takes every number from code. A step label is a fixed code phrase. A run starts only after you press Run or Confirm.
- Verity does not fine-tune a model. The agent's skill comes from a senior-engineer prompt, facts supplied by code, tools and the test loop. Correctness comes from locked tests and formal proofs.

## How Verity uses NVIDIA Nemotron

Nemotron is the engineer. It writes the plan and the logic of every design Verity tests, on Nebius Token Factory. Code never writes logic: a deterministic fixer only rewrites declarations (for example `wire` to `logic`), and the planted bugs in the sign-off are fixed text edits of the winner. Locked tests and formal proofs, not a model, decide what passes. `GET /health` on the backend lists the model of every role.

## Where Token Factory accelerated our workflow

- **One endpoint, every role.** All nine model roles use one OpenAI-compatible base URL and one key. Changing the model of a role is one line in `backend/config.toml`, with its own price per million tokens. A fallback chain is a few more lines.
- **Parallel drafts.** Verity asks Nemotron 3 Ultra for three first drafts at once and keeps the best. In the 2026-10-16 gate (10 real runs of the 4-lane MAC array), the first version passed all 16 tests in 10 of 10 runs with no repair needed, at a median of $0.053 per run and 22 to 41 s; 25 of the 30 drafts passed on their own (`backend/evals/gate-2026-10-16.md`).
- **Cheap probes before building.** A 17-run range probe on 2026-10-18 cost $0.69 and set the knob ranges the bench offers (`backend/evals/probe-2026-10-18.md`). A model probe on 2026-10-22 cost $0.0016 and chose the chat routes (`backend/scripts/probe_models.py`). The model bake-off for the chat agent on 2026-10-23 cost about $1.10.
- **Caps the server can enforce.** Per-model prices let the server count every call against a $0.50 per-run cap, a $3.00 per-session daily limit and a $10.00 daily limit for the whole server. The web shows what was spent, never a limit.

Nebius Token Factory is the only Nebius service in use. A Nebius Sandboxes tool runner is written but untested and off; the chip tools run in Docker.

## Other tools

- **Tavily** (tavily.com) for general web search and **Serper** for Google Scholar and Google Patents, in the fact check and the agent's research tool. At most three searches per request, built from code templates, never from your sentence. On 2026-10-23 one real request ("a 16-bit multiply accumulate unit for a small AI accelerator, as small as possible") returned research with 8 sources (2 Tavily and 1 Serper credits, $0.0195 of model calls).
- **Docker sandbox image `verity-tools:0.1`:** Verilator (lint), Icarus Verilog with cocotb (simulation), Yosys on the Nangate45 library (synthesis), OpenSTA (timing and a power estimate), Yosys EQY (equivalence). OpenROAD is not run. Licences: `backend/sandbox/README.md`.
- **Supabase** (optional): Postgres for saved chats and each user's run list, and email and password sign-in. [docs/SUPABASE_HANDOFF.md](docs/SUPABASE_HANDOFF.md).

## Environment variables (names only)

| Name | Where | What |
|---|---|---|
| `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_ULTRA`, `LLM_MODEL_SUPER` | `backend/.env` | Nebius Token Factory key, base URL and the two tier models |
| `TAVILY_API_KEY`, `SERPER_API_KEY` | `backend/.env` | Research. With both keys, Tavily for web and Serper for Scholar and Patents; with one, that service for all three; with none, research is off |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | `backend/.env` | Accounts and saved chats. The secret key is server side only |
| `SUPABASE_PUBLISHABLE_KEY` | `backend/.env` | Optional: only for a project that still signs tokens with the shared secret |
| `SANDBOX_BASE_URL`, `SANDBOX_API_KEY` | `backend/.env` | Nebius Sandboxes (unused) |
| `VERITY_PROVIDER`, `VERITY_ENV`, `VERITY_CORS_ORIGINS`, `VERITY_ACCESS_CODE_HASHES`, `VERITY_SIGNING_SECRET`, `VERITY_DATA_DIR` | `backend/.env` or the shell | Provider (`fake` or `nebius`), production guard, CORS, access codes, token signing, data folder |
| `VERITY_<TABLE>__<KEY>` | `backend/.env` or the shell | Any `config.toml` value, for example `VERITY_AUTH__REQUIRED=true` |
| `NEXT_PUBLIC_AGENT_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_DEVPOST_URL`, `NEXT_PUBLIC_DEMO_VIDEO_URL` | `frontend/.env.local` | Public URLs only, never keys |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env.local` | Optional. Public by design. Neither set: no sign-in gate |

The full list with meanings is in `backend/README.md` and `backend/CONTRACTS.md` section 10. Keys never go in `frontend/`.

## Status and limits

Built and checked (details and dates: `REPORT.md`, state: `HANDOFF.md`):

- The run pipeline, sign-off, fact check, research, the chat agent with thread memory, the Workspace page and spend limits.
- 16 real full runs on 2026-10-23 (four chip families, Nemotron 3 Ultra and Super, Docker tools, sign-off): correctness 16 of 16, every winner proven equal to the human reference. Numbers: `docs/BRIEF.md`.
- Supabase sign-in and saved chats are built and tested against mocks only. The team has not yet connected a real Supabase project. Hand-over steps: [docs/SUPABASE_HANDOFF.md](docs/SUPABASE_HANDOFF.md).

Honest limits:

- Only four chip families run, inside fixed knob ranges. Everything else gets a verdict and the closest buildable chip.
- Yosys EQY cannot prove every structure. A shift-add multiplier against `*` hits the 180 s limit, so such a winner is "Tested, not proven". A winner can also be v1 itself.
- Power is a vectorless estimate on Nangate45 with open-source tools. It is not a sign-off number.
- Test strength is measured with seven fixed bug-planting rules. In the 2026-10-23 runs one planted bug in the sequence detector passed the locked tests (a real gap, left unchanged because fixing it moves the pack hash; planned after the feature freeze). Two more in the MAC array were not decided only because of a proof cap.
- The `fsm_seq` clock is 13 to 16 percent slower than v1 on the area goal after the latest prompt changes. The area gain is 19.3 percent every time. Watch it.
- Not seen on screen on a real run: the `cap_reached` ending, and a non-v1 winner in every new tab. The Nebius Sandboxes runner has never been tried.
- Hosting is not decided, so there is no public demo URL yet. The live backend was stopped on 2026-10-23 and restarts on request.

Next:

- Supabase: the team creates the project and adds the keys (pending).
- Custom blocks: approved, not built. GLM 5.3 drafts a golden model that only your Approve locks. Gate: 4 of 5 sample blocks pass end to end by 2026-10-26, or the switch stays off.
- Architect mode: planned. No design is written in the repo docs yet, so nothing is promised here.
- Hosting, production settings, the video and the Devpost write-up.

## Layout and docs

| Path | What it is |
|---|---|
| `backend/` | The agent (`backend/README.md`) |
| `frontend/` | The web app (`frontend/README.md`) |
| `ARCHITECTURE.md` | One-page map |
| `docs/BRIEF.md` | One-page brief: what, who, how it was built, results, next |
| `docs/SUPABASE_HANDOFF.md` | How to switch Supabase accounts and saved chats on |
| `docs/diagrams/` | The two architecture diagrams |
| `docs/PRD.md` | Requirements and acceptance |
| `docs/DECISIONS.md` | Decision log |
| `docs/GLOSSARY.md` | The words we use |
| `REPORT.md`, `HANDOFF.md` | Change log; current state |

## License

MIT (`LICENSE`). The copyright holder line is still to be confirmed. The chip tools run as separate programs under their own licences (`backend/sandbox/README.md`). The improve loop takes its principles, not its code or numbers, from REvolution (Min, Cho, Jang, Kang, ASP-DAC 2026, arXiv 2510.21407).

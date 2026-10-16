# Verity agent (backend)

The backend of Verity: a plain-English chip spec goes in, an agent writes Verilog, tests it against a locked golden
model in a sandbox, fixes its own bugs, evolves smaller and faster versions, proves the winner equal to v1 with
Yosys EQY, and streams every step to the web app as events. Python 3.11+, FastAPI, pydantic v2, SQLite, one process.

> **Status: first run done (2026-10-06).** `pytest -q` is green (247), the packs self-test passes on all seven packs
> against the real image, the fake pipeline and four real Nebius runs on `mac4` completed through the API, restart
> recovery and Stop were observed. What the first run fixed: CRLF in three sandbox files, `signed` wires that OpenSTA
> rejects (matmul4 and mm4_int4 had no clock period), EQY matching on internal wire names, EQY counterexamples from
> unreachable register states (now a reset-aware miter first), a half-even rounding mismatch with the web fitness, and
> LLM caps that cut Nemotron reasoning answers off (`plan_max_output` 12000, `rtl_max_output` 24000, run
> `max_output_tokens` 200000). Known limits: EQY cannot prove a shift-add multiplier equal to `*` in 180 s, so such a
> winner is reported "Tested, not proven"; the heavy packs (`matmul4`, `mm4_int4`) take about 5 minutes in the packs
> suite because both EQY sanity calls run to their limit. Some `UNVERIFIED` comments below still stand: trust the code
> comments over any claim here.

Specs: `ARCHITECTURE.md` (intent), `CONTRACTS.md` (exact interfaces; wins on interfaces), `sandbox/README.md` (tool
image), `tasks/self_test.md` (pack self-test). Frontend contract: `frontend/src/lib/contracts/` and `frontend/ARCHITECTURE.md`.

## Layout

| Folder | What it holds |
|---|---|
| `verity/contracts/` | pydantic mirror of the web event types (camelCase on the wire) and the API bodies |
| `verity/core/` | `Rtl`, `TaskPack`, sandbox result models, protocols, `RunContext`, fitness, captions, budget, errors |
| `verity/llm/` | providers (`nebius`, `openai_compat`, `fake`), cassette wrapper, per-run gateway `RunLLM` |
| `verity/roles/` | planner, rtl_gen, repair, optimizer roles and `prompts/*.md` |
| `verity/tools/` | `LocalDockerRunner`, `NebiusSandboxRunner`, result parsers, circuit graph builder |
| `verity/orchestrator/` | the deterministic state machine (plan, gate, lock, build, evolve, prove) |
| `verity/runs/` | `RunManager`, event hub (stamps seq, store first, then fan-out), ledger, watchdog, run log |
| `verity/store/` | SQLite store and write-once artifact files under `data/` |
| `verity/api/` | FastAPI app, routes, hand-rolled SSE, auth tokens, rate limits, log redaction |
| `verity/evals/` | evals CLI, harness, bug injectors, report generator |
| `sandbox/` | the `verity-tools:0.1` image: Dockerfile and `/verity/bin/{verify,measure,eqy,bundle}` |
| `tasks/` | task packs: `mac4`, `alu8`, `matmul4` (live presets) and `add8`, `cnt8`, `fsm_seq`, `mm4_int4` (eval only) |
| `tests/` | pytest files (written, not yet run) |
| `evals/` | generated: `results/*.jsonl`, `report.md`, throwaway `work/` (all gitignored) |

## Setup

Needs Python 3.11 or newer, and Docker Desktop for the real sandbox.

```
cd agent
python -m venv .venv
.venv\Scripts\activate                 # Windows;  source .venv/bin/activate on Linux or macOS
pip install -e ".[dev]"
docker build -t verity-tools:0.1 -f sandbox/Dockerfile sandbox      # 10 to 20 minutes the first time
python tasks/make_manifest.py --check                               # every pack must print ok
```

The build downloads tools and the Nangate45 liberty (never committed). See `sandbox/README.md` for pins and licences.

## Run

```
verity-api                              # same as: python -m verity.main
```

Listens on `127.0.0.1:8000` (`[server]` in `config.toml`), one worker only (rate limits, run registry and the SSE fan-out
live in process). With the default `VERITY_PROVIDER=fake` no LLM call is made, the tools still use the real Docker image.

Web side: set `NEXT_PUBLIC_AGENT_URL=http://127.0.0.1:8000` in `frontend/.env.local`. The default CORS origin is
`http://localhost:3000`.

Smoke test with curl (auth is off by default; anonymous sessions are keyed by client IP):

```
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/runs -H "Content-Type: application/json" -d "{\"presetId\":\"mac4\",\"priority\":\"area\",\"mode\":\"fast\"}"
curl -N "http://127.0.0.1:8000/runs/<runId>/events"
```

| Method and path | Auth when `auth.required` | Notes |
|---|---|---|
| `GET /health` | none | `liveEnabled`, `reason` (maintenance, budget_exhausted, busy), `capUsd`, `models`, `authRequired` |
| `POST /auth/session` | none | `{accessCode}` gives `{token, expiresAt}` |
| `POST /runs` | `Authorization: Bearer` | `{presetId, priority, mode?}` gives `{runId, capUsd, streamToken}`; 429 `{error, reason}` |
| `GET /runs/{id}/events` | `?st=<streamToken>` | SSE, `Last-Event-ID` or `?after=` resumes; 204 when a finished run has nothing left |
| `GET /runs/{id}/log` | Bearer, owner | `RunLog` (same format as `golden.json`) |
| `POST /runs/{id}/steer` | Bearer, owner | pin, toggle, gate, autopilot, winner_override; 202 |
| `POST /runs/{id}/stop` | Bearer, owner | 202, then a `run` event with phase `stopped` |

## Environment variables (names only)

`backend/.env.example` could not be created: a permission rule in this environment denies writes to that path. This list
is the replacement. Copy the names into `backend/.env` (gitignored) or set them in the shell. Precedence: process env,
then `backend/.env`, then `config.toml`.

| Name | Meaning |
|---|---|
| `VERITY_ENV` | `development` (default), `production` (enforces the submission guard), `test` |
| `VERITY_PROVIDER` | `fake` (default, $0), `nebius`, `openai_compat` |
| `VERITY_TOOL_BACKEND` | `local_docker` (default) or `nebius_sandbox` |
| `VERITY_CONFIG` | path of another `config.toml` |
| `VERITY_DATA_DIR`, `VERITY_TASKS_DIR` | paths, relative to `backend/` |
| `VERITY_CORS_ORIGINS` | comma separated origins, never `*` in production |
| `VERITY_ACCESS_CODE_HASHES` | `role:sha256hex,role:sha256hex` (sha256 of each access code) |
| `VERITY_SIGNING_SECRET` | 32+ random characters, required in production |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_ULTRA`, `LLM_MODEL_SUPER` | Nebius Token Factory (OpenAI compatible) |
| `SANDBOX_BASE_URL`, `SANDBOX_API_KEY` | Nebius Sandboxes (key falls back to `LLM_API_KEY`) |
| `VERITY_<TABLE>__<KEY>` | any `config.toml` value, for example `VERITY_AUTH__REQUIRED=true`, `VERITY_BUDGET__RUN__MAX_USD=0.3`, `VERITY_TOOLS__DOCKER_USER=` |

`VERITY_ENV=production` refuses to start unless: provider is `nebius`, the base URL host is the Token Factory host,
`LLM_API_KEY` is set, `auth.required` is true, the signing secret is 32+ characters, at least one access code hash is
set, and CORS has no `*`. Never put a key in `frontend/` or in any `NEXT_PUBLIC_*` variable.

## Tests

```
pytest -q                               # from backend/
```

They use the fake provider, a fake tool runner and a stub service, so they need no Docker and no network. Folders:
`contracts` (wire format, golden.json round trip, presets match, node validator), `core` (RTL rules, fitness),
`orchestrator` (plan helpers, feasibility gate), `runs` (ledger, RunManager), `e2e` (full fake orchestrator runs),
`llm`, `roles`, `tools`, `store`, `api` (auth, SSE, routes, main wiring), `packs`, `evals`.
`tests/contracts/test_web_validate_fixture.py` shells out to `node frontend/scripts/validate-fixture.ts <path>` and skips
itself when node, `frontend/node_modules` or the script's path argument is missing.

## Evals

```
python -m verity.evals --suite <packs|functional|repair|optimization|regression|performance|isolation|all> \
    --tasks all --provider fake|nebius --repeats N
python -m verity.evals --report-only
```

Writes `evals/results/<eval_run_id>.jsonl` (one line per task per repeat, fields of ARCHITECTURE 14.4) and regenerates
`evals/report.md`. `--provider fake` costs $0 and tests the pipeline, not the model; `--provider nebius` spends credits
(`--max-total-usd`, default 3). `--skip-sandbox` skips every step that needs the tool image. Exit code 1 when a
self-check suite (packs, isolation, regression) has a failing row.

Per-call records (R3): every model call is logged with `finish_reason` and reasoning tokens in `final/llm-calls.json`
of the run folder, in `meta` of each `attempt-<n>.llm.json`, and in the eval rows (`reasoning_tokens`, `finish_reasons`;
the performance report prints them). `finish_reason` `length` means the call was cut at its output cap.

Nebius facts measured on 2026-10-16 (one tiny prompt per setting, so token counts are indicative only):
`completion_tokens` already includes `reasoning_tokens`. Both models honour `chat_template_kwargs.enable_thinking: false`
(reasoning 0). Super also honours `reasoning_effort` `none` (0) and `low` (150 down to 9) and `low_effort` (150 down to 8).
Ultra's `reasoning_effort: low` changed nothing against its default (49 both), and `medium_effort` reached the template
(prompt tokens +7) but did not lower reasoning on that prompt. None of these is enabled in the config.

| Suite | Needs | What it answers |
|---|---|---|
| `packs` | sandbox | reference passes, every mutant in `tasks/self_test.md` fails, EQY sanity |
| `isolation` | nothing (width lock needs the sandbox) | banned RTL rejected before any sandbox, reference never leaves the pack, no leak into the brief |
| `functional` | LLM, sandbox | pass@1: spec to first RTL, no repair |
| `repair` | LLM, sandbox | injected bugs (wrong width, off by one, missing reset, swapped operands) repaired within N attempts |
| `optimization` | LLM, sandbox | best fitness vs v1, area and clock gain, share improved, winner proven |
| `regression` | after a run | winner vs v1: EQY and the locked tests re-run, pack hash unchanged |
| `performance` | after a run | calls, tokens, estimated dollars, wall time, time per stage |

Gains are relative to our own v1, never to published numbers.

## Tomorrow: first run checklist

Do these in order. Stop at the first red step and fix it before moving on. Each step says what green looks like.

1. **Install and unit tests.** `pip install -e ".[dev]"`, then `pytest -q`. Green: all pass or skip (the node test skips
   until `validate-fixture.ts` takes a path). Likely first reds: an import or typo in a module that was only
   statically checked, pydantic or pydantic-settings behaviour (`Settings` sources in `verity/config.py`), an async
   fixture setting in `pyproject.toml`. Fix and rerun before touching Docker.
2. **Build the image.** `docker build -t verity-tools:0.1 -f sandbox/Dockerfile sandbox`. Expect small fixes (OpenSTA and
   CUDD compile, trimming the OSS CAD Suite). Copy the printed liberty SHA-256 into `NANGATE_SHA256`.
3. **Pack self-test.** `python -m verity.evals --suite packs --tasks all --provider fake`. This is the first time any
   testbench or `reference.v` is simulated. Green: every pack `ok`, every mutant killed. Read `evals/report.md`.
4. **Isolation.** `python -m verity.evals --suite isolation --tasks all --provider fake`. Green: all rows ok, including
   the `mm4_int4` width lock (needs the image).
5. **Fake pipeline on real tools.** Start `verity-api` (provider `fake`), POST a `mac4` run in `fast` mode, follow the SSE.
   Green: `run running` ... `run done`, then the `Done` caption, v1 measured with an area and a clock period.
   Then `full` mode: three children, repairs, elites, a winner, EQY.
6. **Frontend against the fake run.** Set `NEXT_PUBLIC_AGENT_URL`, open the Try page, press Run. Watch the browser
   console for `live event rejected by schema` (a contract mismatch). Auth is off, so the web works unchanged.
7. **Real model.** Set `LLM_BASE_URL`, `LLM_API_KEY`, `VERITY_PROVIDER=nebius`. First `python -m verity.evals --suite
   functional --tasks add8 --provider nebius`, then one `mac4` run with a low cap (`VERITY_BUDGET__RUN__MAX_USD=0.3`).
8. **Submission mode.** Frontend hookup below, then `VERITY_ENV=production` with auth on, and re-run steps 5 to 7.
9. **Record the real run.** `GET /runs/{id}/log` (or `data/runs/<id>/runlog.json`) can be dropped in as the replay fixture
   in `frontend/public/runs/` once `validate-fixture.ts` accepts a path.

### Most likely failures (in order)

1. Docker Desktop on Windows: bind mounts with `--read-only` and `--user 1000:1000`; `/work` may not be writable.
   Try `VERITY_TOOLS__DOCKER_USER=` (empty omits `--user`) and check the temp dir path has no comma.
2. First image build: OpenSTA, CUDD, Yosys layout, iverilog version, cocotb direct `vvp` flow.
3. The testbenches and `reference.v` files have never been simulated. A wrong cycle count in a testbench fails the pack
   self-test; fix the pack, then `python tasks/make_manifest.py <id>`.
4. Nemotron reasoning tokens eat the output cap (`max_tokens` 4,000 for RTL), leaving no code block. Symptom: parse
   retries then `RoleOutputError`. Try `VERITY_BUDGET__CALL__RTL_MAX_OUTPUT=24000` and raise the run output budget.
5. Yosys, OpenSTA and EQY output formats (all parsed from text or JSON never seen): a timing parse miss shows as
   `sta_fail` (area kept, clock period null).
6. pydantic-settings source ordering and the `LLM_*` named variables (check `GET /health` shows the right models).
7. SSE through the browser: reconnect behaviour, 204 on a finished run, the stream token.

### UNVERIFIED items (every one is also marked in the code)

Sandbox and tasks (`sandbox/README.md` has the long list):
- Image build: CUDD and OpenSTA compile on Ubuntu 24.04; trimming the OSS CAD Suite keeps `yosys`, `eqy`, `sby`,
  `yosys-smtbmc` working; Ubuntu iverilog is 12.x; PATH order of Ubuntu tools versus OSS CAD Suite.
- cocotb 1.9.2 direct `vvp -M ... -m libcocotbvpi_icarus` flow (`LIBPYTHON_LOC`, `PYTHONHOME`, `MODULE` names) and the
  version shims in `sandbox/lib/verity_tb.py` (Clock and Timer units, `BinaryValue` versus `LogicArray`).
- Yosys `write_json` key for port signedness; `stat -liberty -json` layout and the text fallback parser; `dfflibmap`
  legalizing synchronous resets onto Nangate45 flops; the written netlist loading in OpenSTA.
- OpenSTA: `all_inputs -no_clocks`, `report_worst_slack` and `report_checks` formats, time unit assumed ns, a design with no
  timing path (combinational against a virtual clock).
- EQY: marker files `PASS`, `FAIL`, `UNKNOWN`, `TIMEOUT`, `ERROR` and exit codes; whether `[strategy sby]` proves by
  induction at the configured depth or only bounds; engines `abc pdr` then `smtbmc yices` (`VERITY_EQY_ENGINE` inside the image).
- Never simulated: all seven `test_dut.py` and `reference.v` files. Verilator `-Wall` warnings on the references unknown.
- Licence rows marked "verify" in `sandbox/README.md` before the repo is published.

LLM layer (`verity/llm/openai_compat.py`):
- Nebius accepts `max_tokens` for Nemotron and whether the cap includes reasoning tokens.
- JSON mode (`response_format: json_object`) on Nebius; on a 400 it retries without it and the planner parser tolerates text.
- `x-request-id` header (else the completion id), reasoning token reporting inside `usage`.
- A long non-streaming reasoning call may be cut by an idle proxy timeout (then switch that call to `stream=True`).
- `with_raw_response.create(...).parse()` is sync in openai 1.x; the code also tolerates an awaitable.

Tools (`verity/tools/`):
- Docker Desktop on Windows bind mounts with `--read-only` and `--user` (see failure 1).
- Nebius Sandboxes API: file upload versus the `bundle` stdin tar, image import (private registries need credentials),
  running as uid 0, memory and CPU limits not settable, how a non-zero exit is reported, cancel support, timeouts above 120 s.
- Yosys `write_json` keys used by `verity/tools/circuit.py` (`ports[].signed`, `cells[].port_directions`, `netnames[].hide_name`).

Runs and orchestrator (`verity/runs/`, `verity/orchestrator/`):
- No gap and no duplicate when a reader joins mid-run (subscribe before the store read).
- `asyncio.shield` plus cancel in `EventHub.emit` against the real store never leaves a seq gap or duplicate.
- A Stop cancels the in-flight sandbox call promptly and no container outlives it (`docker kill`).

API and store (`verity/api/`, `verity/store/`, `verity/main.py`):
- Starlette cancels the response generator on client disconnect and the subscriber is released.
- Browser `EventSource` stops reconnecting on HTTP 204.
- uvicorn applies the handler-level redaction filter (`?st=` must show as `[redacted]` in the access log).
- `executescript` with an explicit `BEGIN`/`COMMIT` plus `PRAGMA user_version` on the installed Python and aiosqlite.
- On Windows uvicorn keeps the default Proactor loop, which `asyncio.create_subprocess_exec` needs (`process.py` falls
  back to a thread if not).

### Frontend hookup still needed (do not do this in `backend/`)

None of this blocks the first fake run (auth is off by default). All of it is needed for the submission build.

1. `frontend/src/lib/sources/live.ts`: `postRun` must return `streamToken` from the 201 body, and `openEventStream` must open
   `/runs/{id}/events?st=<streamToken>` (EventSource cannot send headers). Today it opens the URL with no token.
2. Try page: an access code prompt. `POST /auth/session {accessCode}` gives `{token, expiresAt}`; send
   `Authorization: Bearer <token>` on `POST /runs`, `/steer`, `/stop` and `GET /log`. Show the prompt when
   `GET /health` reports `authRequired: true` or any call answers 401. A 429 with `reason: rate_limited` is shown as busy.
3. `frontend/scripts/validate-fixture.ts`: accept a file path (`process.argv[2]`, default `public/runs/golden.json`) so a
   recorded live run can be checked. Two of its checks do not fit live runs and need relaxing: the stored fitness weights
   must equal the BASE weights, but the backend records the EFFECTIVE (renormalized) weights because power is not measured
   (CONTRACTS S8, so the breakdown rows add up to the score); and the "RTL has 20 to 40 lines" rule is for the sample log.
4. Gate steers (`build_now`, `hold`, `resume`, `autopilot`) have no `human` echo (`HumanInput` has no gate kind), but
   `live.ts` clears its pending state only on a `human` event. Clear pending gate steers on the next `gate` event instead.
5. `postRun` does not send `mode`; the backend defaults to `full` (`limits.default_mode`). Add `mode` to the body if
   the fast path should be reachable from the UI.
6. The live stream stays open until after the final `Done` caption, then closes. A reconnect after that gets 204.
   Confirm `onError(closed)` handles both without showing an error.

## Integration notes (what the integrator changed)

- `verity/api/sse.py`: the stream no longer stops at the terminal `run` event. golden.json and every live run end with a
  `Done` caption after `run done`, and the old code dropped it. It now reads until the service ends the stream, with a
  5 s grace period after the terminal event.
- `verity/store/runlog.py` and `SqliteStore.run_log` were removed: a duplicate of `verity/runs/runlog.build_run_log`, the
  one the manager and the API use.
- `verity/llm/openai_compat.py`: tolerates an awaitable `parse()`.
- `verity/config.py`, `config.toml`, `verity/tools/local_docker.py`: new `tools.docker_user` (default `1000:1000`; empty
  omits `--user`) so Docker Desktop bind mount trouble can be worked around without a code change.
- `verity/evals/`, `tests/`, `README.md` written. `.env.example` was not (permission rule; list above).
- Not done: no entry in the repo `REPORT.md` or `LOG.md` (outside `backend/`), no git commit.

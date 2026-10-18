# Bench backend (judge-ready) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every MISSING item in `BACKEND_CHECKLIST.md` real: knob params on runs for four families, the `human_ref` event, `POST /parse`, and `features` on `/health`, so the live bench works end to end on Nemotron.

**Architecture:** Each of the four packs gains a `family.py` (knob table plus a pure `render(params)` that returns the files that change with knobs). `render_pack()` copies the base pack into a cache folder, writes the rendered files plus `params.json`, writes a fresh manifest and loads it as an ordinary `TaskPack`, so the existing lock, sandbox and isolation code is untouched. `golden.py` and `test_dut.py` read their constants from `params.json`. After the winner is chosen the orchestrator measures the pack's `reference.v` with the same tools and runs EQY winner-vs-reference, and emits `human_ref`. `POST /parse` is one strict-JSON Nemotron call validated against the same knob tables.

**Tech Stack:** Python 3.13, FastAPI, pydantic v2, cocotb + Icarus in the `verity-tools:0.1` Docker image, Yosys/OpenSTA/EQY, pytest.

**Spec:** `docs/superpowers/specs/2026-10-17-bench-envelope-design.md` (sections 4, 5) and `BACKEND_CHECKLIST.md` (exact wire shapes; it wins on shapes).

## Global Constraints

- Knob ids, types, ranges and defaults exactly as `BACKEND_CHECKLIST.md` section 3 (same as `frontend/src/lib/contracts/presets.ts` `FAMILIES`).
- Default knobs must render a pack whose golden/testbench/reference behaviour equals today's pack (same ports, widths, latency, test count).
- Golden models and testbenches stay human-written; no LLM output ever becomes a reference or test (decision O9).
- `reference.v` and `family.py` never reach a role prompt or the sandbox copy (`SANDBOX_EXCLUDE`).
- Wire JSON is camelCase via `WireModel`; optional `None` fields are omitted.
- No em or en dashes anywhere (code, comments, docs, messages).
- `pytest -q` stays green (304 before this plan). Packs self-test: `python -m verity.evals --suite packs --tasks all --provider fake`.
- Never spend real Nebius money in tests; use `--provider fake` / `VERITY_PROVIDER=fake`.
- Windows: set `PYTHONIOENCODING=utf-8`; packs hash with CRLF normalized (existing `write_manifest`).

## Review Focus

- Knob values at the range edges (mac4 lanes=1, width=16, cycles=32; add8 width=32; cnt8 width=32 enable=false; fsm_seq pattern "111", 8 bits, overlap=false): golden and reference must agree in the packs self-test at min, default and max. Owned by Tasks 2 to 4.
- `params` with an unknown key, a wrong type (`"8"` for an int), or a bool for an int: 422 with a readable sentence, run not created. Owned by Task 1.
- Two runs with the same params share one rendered cache folder; a tampered cache folder fails the manifest check and is re-rendered, never used. Owned by Task 1.
- `human_ref` when the reference cannot be measured (tool error) or EQY times out: run still ends `done`, event carries `null` metrics or `inconclusive`, never crashes the run. Owned by Task 5.
- `/parse` model reply that is not JSON, names an unknown family, or puts a knob out of range: answer `in_range` only when every knob validates; otherwise `out_of_range` with `closest` validated or `null`; never 500. Owned by Task 6.

---

### Task 1: Family contract, `render_pack`, params on `POST /runs`, `features` on `/health`; mac4 as the first family

**Files:**
- Create: `backend/verity/core/family.py` (knob model, validation, render cache)
- Create: `backend/verity/features.py`
- Create: `backend/tasks/mac4/family.py`, `backend/tasks/mac4/params.json`
- Modify: `backend/tasks/mac4/golden.py`, `backend/tasks/mac4/test_dut.py` (constants from `params.json`), `backend/tasks/mac4/MANIFEST.sha256` (via `tasks/make_manifest.py`)
- Modify: `backend/verity/core/pack.py` (`SANDBOX_EXCLUDE` adds `family.py`)
- Modify: `backend/verity/contracts/api.py` (`CreateRunRequest.params`, `HealthResponse.features`)
- Modify: `backend/verity/api/routes.py` (`create_run` passes params; `ValueError` from validation becomes 422)
- Modify: `backend/verity/runs/manager.py` (`create_run(..., params)` renders the pack; `health()` fills `features`; run record stores params)
- Test: `backend/tests/core/test_family.py`, `backend/tests/api/test_sse_and_routes.py` (add cases)

**Interfaces:**
- Produces, in `verity/core/family.py`:
  - `Knob` (pydantic, `extra="forbid"`): `id: str`, `kind: Literal["int","bool","bits"]`, `default: int | bool | str`, `min: int | None`, `max: int | None`, `min_len: int | None`, `max_len: int | None`.
  - `class ParamsError(ValueError)`: message is a sentence for the user, e.g. `"lanes must be a whole number from 1 to 8."`.
  - `def validate_params(knobs: list[Knob], raw: Mapping[str, object] | None) -> dict[str, int | bool | str]` (missing keys take defaults; unknown key, wrong type including bool-for-int, out of range raise `ParamsError`).
  - `def family_module(pack: TaskPack) -> ModuleType | None` (imports `pack.root / "family.py"` by path; `None` when absent).
  - `def render_pack(pack: TaskPack, params: Mapping[str, object] | None, cache_dir: Path) -> TaskPack` (returns `pack` itself when the pack has no `family.py` or the validated params equal the defaults; else cache folder `cache_dir / f"{pack.id}-{sha256(canonical json)[:16]}" / pack.id`, re-rendered if missing or `TaskPack.load` fails).
- Each `tasks/<id>/family.py` exports `KNOBS: list[dict]` and `def render(params: dict) -> dict[str, str]` returning full text for `task.toml`, `reference.v`, `params.json` (any subset; `params.json` always).
- Produces, in `verity/features.py`: `FEATURES: tuple[str, ...] = ("params",)` (later tasks append; the controller flips them, not task implementers).
- `HealthResponse.features: list[str]` (always present). `CreateRunRequest.params: dict[str, int | bool | str] | None = opt()`.
- `RunService.create_run(*, session_id, preset_id, priority, mode, params: Mapping[str, object] | None = None) -> RunRecord`.
- `golden.py`/`test_dut.py` pattern: `PARAMS = json.loads((Path(__file__).with_name("params.json")).read_text())`, then the existing constant names from `PARAMS` (and derived values, e.g. mac4 `ACC_BITS = 2 * LANE_BITS + ceil(log2(LANES * CYCLES))`).

- [ ] **Step 1: failing tests** in `tests/core/test_family.py`: `test_validate_defaults` (empty raw gives `{"lanes":4,"width":8,"cycles":16}` for mac4 KNOBS), `test_validate_rejects_unknown_key`, `test_validate_rejects_bool_for_int`, `test_validate_rejects_out_of_range` (lanes 9 raises `ParamsError` whose text contains "1 to 8"), `test_render_defaults_returns_base_pack` (same object), `test_render_mac4_6x12x20` (loaded pack: ports `a`,`b` width 12 count 6, `acc` width `2*12+ceil(log2(120))=31`, `latency_cycles == 20`, `sandbox_files()` has `params.json` and no `reference.v`/`family.py`), `test_render_cache_reused` (two calls, same folder, second does not rewrite: mtime unchanged), `test_render_cache_tampered_rerenders` (edit `task.toml` in cache, next call returns a pack that loads).
- [ ] **Step 2: run** `PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m pytest tests/core/test_family.py -q`, expect failures (module missing).
- [ ] **Step 3: implement** `verity/core/family.py`, `tasks/mac4/family.py` (render `task.toml` from today's file as a template with the derived widths, latency, `max_cycles_per_case = max(64, 4 * cycles)`, `eqy.depth = cycles + 8`, `spec_text` and `summary` worded with the knob values), `reference.v` with `localparam`s set from the knobs, `params.json`; switch `golden.py`/`test_dut.py` to `params.json`; add `family.py` to `SANDBOX_EXCLUDE`; regenerate the mac4 manifest.
- [ ] **Step 4: API and manager:** `params` on `CreateRunRequest`; `routes.create_run` passes it; `manager.create_run` calls `render_pack(pack, params, settings data dir / "packs")` in a thread (`asyncio.to_thread`) before admission, maps `ParamsError` to `ApiError(422, str(exc))`; `health()` returns `features=list(FEATURES)`. Route tests: POST with `{"lanes": 9}` gives 422 and the sentence; POST with valid params gives 201 and the run's spec event has the rendered ports; `/health` has `"features": ["params"]`.
- [ ] **Step 5: verify** `pytest -q` all green; packs self-test for mac4 at default (`--tasks mac4`) ok.
- [ ] **Step 6: commit** `feat(backend): knob params and render_pack, mac4 family`.

### Task 2: add8 and cnt8 families, live

**Files:** `backend/tasks/add8/{family.py,params.json,golden.py,test_dut.py,task.toml,MANIFEST.sha256}`, same for `cnt8`; test additions in `backend/tests/core/test_family.py`.

**Interfaces:** Consumes Task 1's `family.py` contract and `render_pack`. Knobs: add8 `width` int 4..32 default 8; cnt8 `width` int 4..32 default 8, `enable` bool default true (false removes the `en` port and the enable wording).

- [ ] **Step 1: failing tests:** `test_render_add8_width_32` (ports `a`,`b`,`sum` width 32), `test_render_cnt8_no_enable` (no `en` port, width 16).
- [ ] **Step 2: implement** both families following mac4; set `eval_only = false` in both `task.toml`; regenerate manifests.
- [ ] **Step 3: packs self-test at min/default/max** for both (write params via a small helper in the test or the evals CLI if it accepts params; otherwise add `tests/packs/test_family_edges.py` that renders edges and runs the existing self-test entry point for each rendered pack under `@pytest.mark.docker`). Expect golden == reference at every edge.
- [ ] **Step 4:** `pytest -q` green. Commit `feat(backend): add8 and cnt8 knob families, live`.

### Task 3: fsm_seq family, live

**Files:** `backend/tasks/fsm_seq/*` as Task 2; tests in `test_family.py` and the edge test.

**Interfaces:** Knobs `pattern` bits length 3..8 default `"1011"`, `overlap` bool default true. Golden reads `PATTERN` and `OVERLAP` from `params.json`; directed test cases are derived from the pattern (a stream containing the pattern twice, overlapping when allowed, and near misses).

- [ ] **Step 1: failing tests:** `test_render_fsm_pattern_110101_no_overlap` (spec_text mentions `110101` and "do not overlap"), validator rejects `"10201"` and `"10"`.
- [ ] **Step 2: implement**; `eval_only = false`; regenerate manifest.
- [ ] **Step 3: edges self-test:** `"111"` overlap on/off, `"10110011"`, default. Golden == reference.
- [ ] **Step 4:** `pytest -q` green. Commit `feat(backend): fsm_seq knob family, live`.

### Task 4: (folded into Tasks 2 and 3: every family proves golden == reference at its edges)

### Task 5: `human_ref` event

**Files:**
- Create: `backend/verity/orchestrator/human_ref.py`
- Modify: `backend/verity/contracts/events.py` (new `HumanRefEvent`), `backend/verity/orchestrator/events.py` (`Emitter.human_ref`), `backend/verity/orchestrator/machine.py` (call after `apply_winner_override`, before `_finish`)
- Test: `backend/tests/orchestrator/test_human_ref.py`, fixture validation test in `tests/contracts/test_web_validate_fixture.py` if it enumerates event types

**Interfaces:**
- `HumanRefEvent(EventBase)`: `t: Literal["human_ref"]`, `ppa: PPA`, `eqy: Equivalence` (existing contract models; `eqy.against_id` = winner candidate id).
- `async def measure_human_ref(st: RunState, winner_id: str) -> None` in `human_ref.py`: no-op when `pack.reference_rtl()` is `None`; reference `Rtl` built without the LLM line limit if `validate_rtl` would reject the human file (use `Rtl.validate` with a generous `max_lines`); `ctx.tools.measure(ref, pack)` then `to_ppa()`; `ctx.tools.check_equivalence(gold=ref, gate=winner.rtl_obj, pack)` mapped with the same status mapping `_prove` uses; `ToolInfraError` or any measure failure gives null metrics / `inconclusive` and a log line, never raises; emit `em.human_ref(ppa, eqy)` once.
- Runs in fast and full mode. Not counted as an LLM call.

- [ ] **Step 1: failing tests** with the fake tool runner: event emitted once after `winner` and before the terminal `run`; tool failure yields event with `areaUm2 is None` and run ends `done`; pack without `reference.v` emits nothing.
- [ ] **Step 2: implement.** **Step 3:** `pytest -q` green. **Step 4:** commit `feat(backend): human reference measurement event`.

### Task 6: `POST /parse`

**Files:**
- Create: `backend/verity/api/parse.py` (prompt, call, validation)
- Modify: `backend/verity/api/routes.py` (route), `backend/verity/contracts/api.py` (`ParseRequest`, `ParseReply` models), `backend/verity/llm/fake.py` (deterministic fake answer for the parse role), `backend/config.toml` (`[limits] parse_per_session_per_min = 6`, `[budget.parse] max_output_tokens = 400`)
- Test: `backend/tests/api/test_parse.py`

**Interfaces:**
- Request `ParseRequest`: `text: str` (1..300 chars after strip, else 422).
- Reply union exactly as `BACKEND_CHECKLIST.md` section 4: `{"result":"in_range","family","params","note"?}` or `{"result":"out_of_range","reason","closest": {"family","params"} | null}`.
- `async def parse_request(text: str, packs: Mapping[str, TaskPack], llm: <provider>, settings: Settings) -> ParseReply`: one call to the planner model (Nemotron Ultra) with a system prompt listing the four families, their knobs and ranges (generated from each `family.KNOBS`) and the out-of-range list from the spec; model must answer one JSON object; the server validates `family` against live packs and params with `validate_params`; an in-range answer with any invalid knob becomes `out_of_range` with the validated `closest` or `null`; unparseable model output becomes `out_of_range` with reason "Verity could not read that request. Pick a family below." Cost recorded in the daily spend the same way runs are (find the existing daily-spend write path in `runs/manager.py` and `runs/ledger.py`; reuse it; if none can take a non-run cost, add `store.add_spend(usd, kind="parse")`).
- Route: session guard, per-session limiter (`parse_per_session_per_min`), 429 when limited, 503 when maintenance.

- [ ] **Step 1: failing tests** (fake provider): in-range sentence returns family and params; "an RTX 6090" returns `out_of_range` with mac4 closest; model reply with `lanes: 99` becomes out_of_range; non-JSON reply handled; 301-char text gives 422; 7th call in a minute gives 429.
- [ ] **Step 2: implement.** **Step 3:** `pytest -q` green. **Step 4:** commit `feat(backend): plain-English parse endpoint`.

### Task 7 (controller): features, real checks, docs

- [ ] Set `FEATURES = ("params", "human_ref", "parse")` once Tasks 1 to 6 pass.
- [ ] Code review of the whole diff (opus reviewer).
- [ ] Real Nebius checks, hard cap $2.50 total tracked from run records: one `/parse` call per outcome, then range probe (spec section 7) at min/default/max per family in fast mode; shrink any failing range in both `family.py` and `frontend/src/lib/contracts/presets.ts`; write `backend/evals/probe-2026-10-18.md`.
- [ ] Bench browser check against the real backend: refusal, a non-default knob run, human scoreboard.
- [ ] Update `BACKEND_CHECKLIST.md` statuses, `backend/CONTRACTS.md` section 9, `REPORT.md`, `HANDOFF.md`; commit; push `v1 main`.

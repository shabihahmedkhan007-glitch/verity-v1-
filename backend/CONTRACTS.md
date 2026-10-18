# Verity backend build contract (`backend/`)

Written 2026-10-05 by the architect, before the five builders start. It turns `backend/ARCHITECTURE.md` into exact interfaces. When this file and ARCHITECTURE.md disagree, this file wins for interfaces and ARCHITECTURE.md wins for intent; flag the conflict, do not silently reconcile.

The shared code already exists and is the source of truth for every type named here:

| File | What it holds |
|---|---|
| `verity/config.py` | `Settings`, `load_settings()`, every config section |
| `config.toml` | every default value (budgets, limits, timeouts, routes, prices, auth TTLs) |
| `verity/contracts/` | pydantic mirror of `frontend/src/lib/contracts/types.ts` and `view-types.ts`, API bodies, `CircuitGraph` |
| `verity/core/types.py` | one import point for `Rtl`, `TaskPack`, sandbox result models, protocols, `RunContext`, fitness, captions, errors |

**Do not edit shared files.** If one is wrong, fix the smallest thing, say so in your return value, and keep the signature.

---

## 0. Ground rules for every builder

1. No em dash or en dash anywhere (code, comments, docs, copy). Use commas, colons, parentheses.
2. No secrets in code, config or logs. Read keys only through `Settings` (env names in section 10).
3. Typed Python 3.11+, pydantic v2, `async` wherever I/O happens, small modules.
4. Wire JSON is produced ONLY with `verity.contracts.to_wire(model)` / `to_json(model)` / `event_to_json(event)`. Never `model_dump()` without `by_alias=True`. Optional TS fields (`x?: T`) are omitted when `None`; nullable TS fields (`x: T | null`) are sent as `null`. This is already encoded in the models (`opt()` in `contracts/base.py`).
5. Python names are snake_case; the wire is camelCase (alias generator). Construct models with snake_case kwargs: `Candidate(parent_id=None, created_by="INIT", ...)`, `TestCase(pass_=False, ...)`.
6. Where behavior can only be known by running it, write your best implementation and mark it `# UNVERIFIED: <what to check>`. List every such mark in your return value.
7. No runtime testing in this build (no pip install, docker build, servers, network). `python -m compileall -q backend/verity` is allowed. You may write tests under `backend/tests/<area>/` without running them.
8. Only touch your own folders (section 1). Never touch `frontend/`.

---

## 1. Module ownership

| Builder | Owns (write only here) | Must export (exact names) |
|---|---|---|
| **A** | `sandbox/` (Dockerfile + `/verity/bin` scripts + `/verity/lib`), `tasks/`, `verity/evals/`, `evals/` (cassettes, results, report) | Image `verity-tools:0.1` with `/verity/bin/verify`, `/verity/bin/measure`, `/verity/bin/eqy`, `/verity/bin/bundle`; `/verity/lib/verity_tb.py`; task packs `mac4`, `alu8`, `matmul4`, `add8`, `cnt8`, `fsm_seq` (live, must equal `frontend/src/lib/contracts/presets.ts`) and `mm4_int4` (`eval_only = true`); `mac4`, `add8`, `cnt8`, `fsm_seq` are knob families (`family.py`); `verity.evals.__main__:main` |
| **B** | `verity/llm/`, `verity/roles/` (+ `roles/prompts/*.md`) | `verity.llm.factory.build_provider(settings) -> LLMProvider`; `verity.llm.gateway.RunLLM(provider, settings, ledger)` implementing `LLMGateway`; `verity.llm.nebius.NebiusProvider`, `OpenAICompatProvider`; `verity.llm.fake.FakeProvider`; `verity.roles.planner.plan`, `verity.roles.rtl_gen.generate_rtl`, `verity.roles.repair.repair`, `verity.roles.optimizer.optimize`; `verity.roles.default_roles() -> Roles` |
| **C** | `verity/tools/` | `verity.tools.factory.build_tool_runner(settings) -> ToolRunner`; `verity.tools.local_docker.LocalDockerRunner`; `verity.tools.nebius_sandbox.NebiusSandboxRunner`; `verity.tools.parse.parse_stdout_json(stdout) -> dict` |
| **D** | `verity/orchestrator/`, `verity/runs/` | `verity.orchestrator.run_orchestrator(ctx: RunContext) -> None`; `verity.orchestrator.feasibility.check_plan(plan, pack, settings) -> list[str]`; `verity.runs.manager.RunManager(settings, store, provider, tools, packs)` implementing `RunService`; `verity.runs.ledger.RunLedger(limits, settings)` implementing `Ledger`; `verity.runs.runlog.build_run_log(run, events, settings) -> RunLog` |
| **E** | `verity/api/`, `verity/store/`, `verity/main.py` | `verity.api.app.create_app(settings, service) -> FastAPI`; `verity.store.sqlite.SqliteStore(settings)` implementing `Store`; `verity.main:main()` (console script `verity-api`) |

Composition (E writes it in `verity/main.py`, everyone relies on it):

```python
settings = load_settings()
problems = settings.production_problems()          # refuse to start if non-empty
store = SqliteStore(settings); await store.open()
packs = load_packs(settings.tasks_dir)              # fail fast on a broken pack
provider = build_provider(settings)                 # B
tools = build_tool_runner(settings)                 # C
service = RunManager(settings, store, provider, tools, packs)   # D, builds RunLLM + RunLedger per run
app = create_app(settings, service)                 # E; lifespan calls service.start() / service.shutdown()
uvicorn.run(app, host=settings.server.host, port=settings.server.port, workers=1)
```

Protocols and signatures: `verity/core/protocols.py`. Run context: `verity/core/context.py`.

---

## 2. Shared decisions every builder must know

| # | Decision |
|---|---|
| S1 | Task pack id == web `presetId`. Live packs: `mac4`, `alu8`, `matmul4` (fixed presets, matching `presets.ts` `PRESETS` exactly: title, text, ports, testCount, maxLines) and the bench knob families `mac4`, `add8`, `cnt8`, `fsm_seq` (knob ids, kinds, ranges and defaults matching `presets.ts` `FAMILIES` and each pack's `family.py` `KNOBS`). |
| S2 | Ports with `count > 1` are ONE flat Verilog vector of `width * count` bits; lane i is `p[i*W +: W]`. Flat lane vectors are declared unsigned; lane signedness lives in `element_type`. |
| S3 | Sandbox stage order inside `/verity/bin/verify` is **lint (Verilator), then interface check (Yosys JSON), then sim**. Verilator first gives the repair prompt the clearest syntax errors. |
| S4 | Sandbox scripts print exactly one JSON object as the LAST line of stdout. Everything else goes to stderr. |
| S5 | `maxLines` counts non-blank lines. RTL max 20,000 bytes, ASCII only. |
| S6 | Pack hashes are SHA-256 over file bytes with CRLF normalized to LF. Pack hash = SHA-256 of `MANIFEST.sha256`. Use `write_manifest(root)` to (re)generate. |
| S7 | `reference.v` never enters a sandbox for a run and never reaches a role. `FakeProvider` may use it as canned RTL, and the orchestrator measures it once per run for the `human_ref` event. |
| S8 | `ppa.powerMw` is an OpenSTA `report_power` estimate (section 3.6), `null` when it is not available (older records, failed estimate). Fitness drops a missing metric and renormalizes. Recorded `Fitness.weights` are the effective (renormalized) weights. |
| S9 | `seq` and `tMs` are stamped by the `EventSink`. Producers create events with the defaults (0). |
| S10 | Canvas `add_node` and `connect` ops use `by: "ai"`, `update_status` uses `by: "system"`, exactly like `golden.json`, so a recorded run is a drop-in fixture. (ARCHITECTURE 9.1 says `system` for all; flagged, golden.json wins because the web is built against it.) |
| S11 | `auth.required = false` by default: the current `frontend/src/lib/sources/live.ts` sends no token and no `?st=`. Anonymous session id = `"anon-" + sha256(client_ip)[:16]`. The production guard forces `required = true` (web change O5 needed first). |
| S12 | SSE is hand-rolled (Starlette `StreamingResponse`), not sse-starlette. |
| S13 | ToolRunner is batched: `verify` (lint + interface + sim), `measure` (synth + sta + circuit), `check_equivalence`. These replace the six functions sketched in ARCHITECTURE 11.3. |
| S14 | Per-candidate repair limit is checked by the orchestrator (`fix_count < max_repairs_*`); the ledger only keeps totals. |
| S15 | Captions come only from `verity/core/captions.py`. The one place model text appears is `captions.diagnosis()`, truncated and ASCII-cleaned. |
| S16 | Model ids: Ultra `nvidia/Nemotron-3-Ultra-550b-a55b`, Super `nvidia/nemotron-3-super-120b-a12b`. Unknown models are priced with `prices.fallback` (Ultra prices). |

---

## 3. Sandbox I/O contract (builder A writes the scripts, builder C calls them)

### 3.1 Image

- Tag `verity-tools:0.1` (config `tools.image`). Debian/Ubuntu base, Python 3.11+, Verilator 5.x, Icarus Verilog 12, cocotb pinned (recommend 1.9.2), Yosys, OpenSTA, Yosys EQY + SBY + one SMT solver, Nangate45 liberty downloaded at build time (do not commit it).
- Paths: scripts `/verity/bin/`, helpers `/verity/lib/` (on `PYTHONPATH`), liberty `$VERITY_LIBERTY` (default `/verity/pdk/nangate45/NangateOpenCellLibrary_typical.lib`).
- Runs as uid 1000, no network needed, writes only to `/work` and `/tmp`.

### 3.2 Inputs

| Path | Mode | Content |
|---|---|---|
| `$VERITY_PACK_DIR` (default `/pack`) | read-only | fresh pack copy from `TaskPack.copy_for_sandbox()`: `task.toml`, `golden.py`, `test_dut.py`, `vectors/` (no `reference.v`, no manifest) |
| `$VERITY_WORK_DIR/dut.v` (default `/work/dut.v`) | rw dir | the candidate RTL (`Rtl.text`). For `eqy`: the GOLD design (v1) |
| `/work/b.v` | rw dir | `eqy` only: the GATE design (the candidate being proven) |
| `/work/out/` | rw | scripts create it; `result.json` (same JSON as stdout) and logs |
| `/tmp` | tmpfs | build dirs (`/tmp/verity/...`) |

Environment (fixed names, values from `[timeouts]`): `VERITY_LINT_TIMEOUT_S`, `VERITY_SIM_TIMEOUT_S`, `VERITY_SYNTH_TIMEOUT_S`, `VERITY_STA_TIMEOUT_S`, `VERITY_EQY_TIMEOUT_S`. Optional: `VERITY_PACK_DIR`, `VERITY_WORK_DIR`, `VERITY_LIBERTY`.

### 3.3 Invocation (builder C; fixed templates, no model text in any argument)

Local Docker (`LocalDockerRunner`), one container per call, per-call temp dir on the host holding `dut.v` (and `b.v`) plus a fresh pack copy:

```
docker run --rm --name verity-<12 hex> --network none --read-only
  --tmpfs /tmp:rw,exec,size=512m
  --memory 2g --cpus 2 --pids-limit 256 --user 1000:1000
  --cap-drop ALL --security-opt no-new-privileges
  -v <host_work>:/work:rw -v <host_pack>:/pack:ro
  -e VERITY_LINT_TIMEOUT_S=20 -e VERITY_SIM_TIMEOUT_S=60 ... 
  verity-tools:0.1 /verity/bin/verify
```

Run with `asyncio.create_subprocess_exec` (argument list, never a shell string). Outer timeout = inner budget + `timeouts.sandbox_overhead_s` (verify: lint + sim; measure: synth + sta; eqy: eqy). On outer timeout: `docker kill verity-<id>`, then return a result with `status: "timeout"` (not an exception).

Nebius Sandboxes (`NebiusSandboxRunner`), if the API cannot mount files: `/verity/bin/bundle <verify|measure|eqy>` reads an uncompressed tar from stdin with members `work/dut.v`, optional `work/b.v`, and `pack/<files>`. It extracts the pack to `/tmp/verity/pack`, makes it read-only (`chmod -R a-w`), sets `VERITY_PACK_DIR`, writes `work/*` into `$VERITY_WORK_DIR`, then runs the stage script and passes its stdout and exit code through. `# UNVERIFIED: Sandboxes file upload, stdin, image import and timeout APIs (M0).`

### 3.4 Exit codes

| Code | Meaning | Runner action |
|---|---|---|
| 0 | Script finished and printed a result (the design may still have failed) | parse last stdout line |
| 2 | Input error (missing `dut.v`, bad `task.toml`); JSON with `status: "input_error"` printed if possible | raise `ToolInfraError`, no retry |
| 3 | Internal error (tool missing or crashed unexpectedly); JSON with `status: "internal_error"` if possible | retry `tools.infra_retries` times, then `ToolInfraError` |
| 124 / killed | Outer timeout | synthesize `status: "timeout"` result |
| other | Docker or sandbox failure | retry, then `ToolInfraError` |

Each script enforces its own stage deadlines with `subprocess` timeouts and reports `status: "timeout"` with exit 0 when it catches one itself. Logs inside the JSON are capped (lint log first 4,000 chars; sim, synth, sta logs last 4,000; eqy log last 8,000) so stdout stays under the 64 KB sandbox cap.

### 3.5 `/verity/bin/verify` (lint, interface, sim; early exit)

Steps:
1. **Lint**: `verilator --lint-only -Wall -Wno-fatal -Wno-DECLFILENAME --top-module <top> /work/dut.v`. `ok` = exit code 0 and no `%Error` line. `warnings` = count of `%Warning-` lines. Fail: `status: "lint_fail"`, stop.
2. **Interface**: `yosys -q -p "read_verilog -sv /work/dut.v; hierarchy -check -top <top>; proc; write_json /tmp/verity/ports.json"`. Compare `modules[<top>].ports` against `task.toml` ports: same name set, same direction (`input` -> `in`, `output` -> `out`; `inout` is always an error), `len(bits) == width * count`, and for `count == 1` ports the same signedness. One error string per mismatch, e.g. `"port acc: width 16, expected 22"`. Fail: `status: "contract_fail"`, stop. `# UNVERIFIED: key Yosys uses for port signedness in write_json.`
3. **Sim**: cocotb with Icarus (`cocotb.runner.get_runner("icarus")`, `hdl_toplevel=<top>`, `test_module="test_dut"`, build dir `/tmp/verity/sim_build`, `timescale=("1ns","1ps")`), env `PYTHONPATH=$VERITY_PACK_DIR:/verity/lib`, `VERITY_SIM_RESULT=/work/out/sim_result.json`, `VERITY_SEED=<task.toml sim.seed>`, `VERITY_MAX_CYCLES=<sim.max_cycles_per_case>`, `VERITY_TEST_COUNT=<test_count>`. Read `sim_result.json` (section 4). `status` = `pass` when `passed == total == test_count`, else `sim_fail`. Compile error or missing result file: `sim_error` with `message` = first error line.

Stdout (last line), matching `verity.core.results.VerifyResult`:

```json
{
  "schema": "verity.verify/1",
  "status": "pass | contract_fail | lint_fail | sim_fail | sim_error | timeout | input_error | internal_error",
  "lint":     {"ok": true, "errors": 0, "warnings": 1, "log": "%Warning-WIDTH ...", "tool": "Verilator 5.028"},
  "contract": {"ok": true, "errors": [], "ports": [{"name": "a", "dir": "in", "width": 32, "signed": false}]},
  "sim": {
    "ok": false, "total": 16, "passed": 13, "failure_count": 3,
    "failures": [{"name": "acc_16_cycles_max", "inputs": "a=[255,255,255,255] b=[255,255,255,255] x16",
                  "expected": "0x3F8040", "got": "0x008040", "pass": false, "cycle": 16}],
    "seed": 1, "log": "...", "tool": "iverilog 12.0 + cocotb 1.9.2"
  },
  "duration_ms": 2140,
  "message": "",
  "tool_versions": {"verilator": "5.028", "yosys": "0.45", "iverilog": "12.0", "cocotb": "1.9.2"}
}
```

Sections not reached are `null`. `failures` holds at most 5 cases, in case order; `failure_count` is the full count. Mapping to the wire `Verification` is `VerifyResult.to_verification(pack.test_count)` (already written): `contract_fail` and `lint_fail` become `lint: "fail"` with the log in `lintLog`; a vector-count mismatch can never pass.

### 3.6 `/verity/bin/measure` (synth, timing, circuit)

Steps:
1. **Circuit** (before tech mapping): `read_verilog -sv /work/dut.v; hierarchy -check -top <top>; proc; opt; write_json /tmp/verity/pre.json`, then build the `CircuitGraph` (section 3.8).
2. **Synth**: `synth -top <top> -flatten; dfflibmap -liberty $LIB; abc -liberty $LIB; opt_clean; stat -liberty $LIB; write_verilog -noattr /work/out/netlist.v`. `area_um2` = "Chip area" from `stat`; `cell_count` = number of cells; `cells` = per-cell counts.
3. **Timing** (OpenSTA, post-synthesis, no wires): read liberty and `netlist.v`, `link_design <top>`; clocked design: `create_clock -name clk -period <target_clock_ns> [get_ports <clock>]`; combinational design (`clock.name == ""`): virtual clock `create_clock -name vclk -period <target_clock_ns>`; `set_input_delay 0` on all inputs except the clock and `set_output_delay 0` on all outputs; worst setup slack `wns_ns`; `clock_period_ns = target_clock_ns - wns_ns` (the minimum period). `# UNVERIFIED: OpenSTA command names and report parsing.`

4. **Power** (OpenSTA `report_power`, same netlist and constraints as step 3, a separate `sta` run so a power failure never fails timing): `set_power_activity -input -activity 0.1 -duty 0.5`, then `report_power -digits 6`; the `Total` row (Watts) is converted to mW. Method `vectorless`: every non-clock input toggles 0.1 times per cycle, activity propagates through the logic, so it is a relative figure for comparing a candidate with v1, not a measurement of a real workload. The clock is fixed to the pack's `target_clock_ns` (NOT the measured minimum period, which differs per candidate), so v1 and every child are measured identically. Estimate only (open-source tools, Nangate45 typical liberty, no wires or clock tree), not signoff. Simulation-derived activity (VCD/SAIF) is not used: the measure stage does not run the testbench, and RTL signal names do not map onto the gate-level netlist.

Stdout (last line), matching `MeasureResult`:

```json
{
  "schema": "verity.measure/1",
  "status": "ok | synth_fail | sta_fail | timeout | input_error | internal_error",
  "synth": {"ok": true, "area_um2": 1840.2, "cell_count": 412, "cells": {"NAND2_X1": 40}, "log": "...", "tool": "Yosys 0.45"},
  "sta":   {"ok": true, "clock_period_ns": 3.2, "wns_ns": 6.8, "target_period_ns": 10.0, "clocked": true, "log": "...", "tool": "OpenSTA 2.6"},
  "power": {"ok": true, "power_mw": 1.870394, "internal_mw": 1.037427, "switching_mw": 0.784294, "leakage_mw": 0.048673, "method": "vectorless", "input_activity": 0.1, "reference_clock_ns": 10.0, "log": "...", "tool": "OpenSTA 3.1.0"},
  "circuit": { "format": "verity.circuit/1", "candidateId": "", "top": "mac4", "...": "see 3.8" },
  "pdk": "Nangate45",
  "duration_ms": 18000,
  "message": "",
  "tool_versions": {"yosys": "0.45", "opensta": "2.6"}
}
```

A candidate is **measured** when `synth.ok` and `area_um2` is present (`MeasureResult.measured`). `sta_fail` keeps the area and sends `clockPeriodNs: null`. `power` is optional (absent from older results); when `power.ok` is false the PPA sends `powerMw: null` and the status stays `ok`. `synth_fail` means rejected (child) or run error (baseline). PPA mapping: `MeasureResult.to_ppa()`.

### 3.7 `/verity/bin/eqy`

Gold = `/work/dut.v` (v1), gate = `/work/b.v` (candidate). Config written to `/tmp/verity/eqy/verity.eqy`:

```
[gold]
read_verilog -sv /work/dut.v
prep -top <top>

[gate]
read_verilog -sv /work/b.v
prep -top <top>

[strategy sby]
use sby
depth <task.toml eqy.depth>
engine smtbmc <solver in the image>
```

Run `eqy -f verity.eqy -d /tmp/verity/eqy/out` under `VERITY_EQY_TIMEOUT_S`. Status (first run, 2026-10-06): the script first runs a reset-aware miter (sby: reset asserted in cycle 0, outputs compared from cycle 1, engines `abc pdr` and `smtbmc yices`): PASS -> `proven`, FAIL -> `not_equivalent` (a real trace from reset). Otherwise EQY runs: all partitions proven -> `proven`; a failed partition -> `not_equivalent` only for a design without a reset (no hidden state), else `inconclusive` (EQY starts from any register state, so its counterexample may be unreachable); unknown partitions -> `inconclusive`; own deadline hit -> `timeout`; tool crash -> `error`. `# UNVERIFIED: eqy summary lines and exit codes, and whether the sby strategy proves (induction) or only bounds.`

```json
{"schema": "verity.eqy/1", "status": "proven | not_equivalent | inconclusive | timeout | error",
 "log": "last 8000 chars", "duration_ms": 41000, "message": "", "tool": "yosys-eqy", "tool_versions": {"eqy": "0.45"}}
```

Mapping: `EquivalenceResult.to_equivalence(against_id)`: `timeout` and `error` become `inconclusive`, never `proven`. If `task.toml eqy.enabled = false`, the orchestrator does not call it and records `not_run_equivalence(...)`.

### 3.8 CircuitGraph (built in the sandbox from `pre.json`)

Model: `verity/contracts/circuit.py`. Cell classes: `$add $sub $neg $alu $macc` -> `add`; `$mul` -> `mul`; `$mux $pmux $bmux $demux` -> `mux`; `$eq $ne $lt $le $gt $ge $eqx $nex $logic_*` compare family -> `cmp`; any `$*dff*` / `$*latch*` -> `reg`; non-`$` cell types -> `submodule`; everything else -> `logic`; module ports -> `port`. At most 60 nodes: merge cells of the same kind and width that feed the same targets into one node labeled `"<kind> x<n>"`, else drop the remainder and set `truncated: true`. Edges carry the bit width. No coordinates. `candidateId` is `""`; the backend fills it (`MeasureResult.circuit_for(id)`). An invalid or oversized graph becomes `null` without failing the measurement.

---

## 4. cocotb testbench contract (builder A)

- `golden.py`: pure Python reference model. No I/O, no cocotb import, no randomness without an explicit seed argument. Function names are pack-defined.
- `test_dut.py`: exactly ONE cocotb test, `@cocotb.test() async def run_all(dut)`, that runs exactly `test_count` named cases (directed cases first, then seeded random ones from `random.Random(int(os.environ["VERITY_SEED"]))`). It resets the DUT before each case, never stops at the first failure, records every case, then writes the result file and finally asserts all passed.
- It finds the golden model with a plain `import golden` (the pack directory is on `PYTHONPATH`) and the helper with `from verity_tb import Recorder, read_int, fmt_hex` (`/verity/lib/verity_tb.py`, builder A).
- Each case is bounded by `VERITY_MAX_CYCLES` clock cycles; waiting longer records a failure (`got: "no done after N cycles"`).
- Latency is checked: a case that expects `done` at cycle 18 fails if it arrives at 17 or 19 (golden.json examples).
- X or Z on an output is a failure with `got: "X"` (`read_int` returns `None`).
- Values are formatted as hex with the output width (`fmt_hex(value, bits)` -> `"0x3F8040"`); `inputs` is a short human description (max 200 chars).

`Recorder` writes `$VERITY_SIM_RESULT`:

```json
{
  "schema": "verity.sim/1",
  "top": "mac4",
  "total": 16,
  "passed": 13,
  "failure_count": 3,
  "failures": [
    {"name": "acc_carry_boundary", "inputs": "a=[64,0,0,0] b=[64,0,0,0] x16",
     "expected": "0x010000", "got": "0x000000", "pass": false, "cycle": 16}
  ],
  "cases": [{"name": "acc_zero", "pass": true}],
  "seed": 1
}
```

`failures`: first 5 failing cases in case order. `cases`: every case name with pass/fail, no values. `verify` copies `total`, `passed`, `failure_count`, `failures`, `seed` into its `sim` section and cross-checks `total` against `task.toml test_count`.

Pack self-test (evals `packs` suite, builder A): `reference.v` passes; at least one mutant (wrong width, off-by-one done, missing reset) fails.

---

## 5. `task.toml` schema (builder A writes packs, `TaskPack` parses them)

Model: `verity/core/pack.py` (`extra = "forbid"`: unknown keys are errors). Example for the showcase preset, consistent with `presets.ts` `mac4`:

```toml
schema = "verity.task/1"
id = "mac4"                         # == folder name == web presetId
title = "4-lane MAC array, 8-bit"
summary = "4 lanes of 8-bit multiply-accumulate over 16 cycles"   # used in the Spec caption
spec_text = "A 4-lane multiply-accumulate unit. Each cycle it multiplies four pairs of unsigned 8-bit inputs and adds the four products to a running sum. After 16 cycles it raises done and holds the 22-bit result until reset. Smallest area matters most."
top = "mac4"
family = "mac"
element_type = "uint8"              # int4 | uint4 | int8 | uint8 | none
latency_cycles = 16                 # pack-defined meaning; testbench enforces it exactly; optimizers must keep it
max_lines = 300
test_count = 16                     # exact number of cases test_dut.py runs
default_priority = "area"
priorities = ["area", "speed", "power"]
target_clock_ns = 10.0              # STA reference period
max_plan_blocks = 8
eval_only = false
coding_rules = []                   # extra pack rules appended to CODING_RULES

[clock]
name = "clk"                        # "" for combinational

[reset]
name = "rst_n"                      # "" for none
active_low = true
synchronous = true

[sim]
seed = 1
max_cycles_per_case = 64

[eqy]
enabled = true
depth = 24

[budget]                            # optional; may only LOWER [budget.run] values
# max_candidates = 4

[[ports]]
name = "clk"
dir = "in"
width = 1

[[ports]]
name = "rst_n"
dir = "in"
width = 1

[[ports]]
name = "start"
dir = "in"
width = 1

[[ports]]
name = "a"
dir = "in"
width = 8
count = 4                           # flat vector [31:0], lane i = a[i*8 +: 8]

[[ports]]
name = "b"
dir = "in"
width = 8
count = 4

[[ports]]
name = "acc"
dir = "out"
width = 22

[[ports]]
name = "done"
dir = "out"
width = 1
```

Pack folder: `task.toml`, `golden.py`, `test_dut.py`, optional `vectors/`, `reference.v`, and `MANIFEST.sha256` (lines `<sha256>  <relative path>`, every file except the manifest, LF-normalized hashes). Generate it with `from verity.core.types import write_manifest; write_manifest(Path("tasks/mac4"))`.

The LLM sees only `TaskPack.public_brief()` (title, spec text, module header, latency, limits, coding rules).

---

## 6. Orchestrator to events (builder D)

Reference stream: `frontend/public/runs/golden.json` (140 events). Match its shapes and ordering. Everything below is emitted through `ctx.sink.emit(ctx.run_id, event)`.

### 6.1 Canvas ids, zones, edges

| Thing | Node id | kind | zone | label | refId |
|---|---|---|---|---|---|
| Spec | `spec` | `spec` | `plan` | `Spec` | `spec` |
| Plan block | `blk-<slug>` (normalize the model's ids: lowercase, `[a-z0-9-]`, unique, prefix `blk-`) | `block` | `plan` | block name | same id |
| Golden model | `golden` | `golden` | `plan` | `Golden model` | `golden` |
| Candidate n | `c<n>` (creation order, from 1) | `candidate` | `tree` | `v<n>` | `c<n>` |

| Edge | source -> target | kind | label |
|---|---|---|---|
| Plan chain | `spec` -> first block, block -> next block | `plan` | none |
| Checks | `golden` -> `c1` | `checks` | `checks every version` |
| Lineage | parent -> child | `lineage` | none |
| Proof | winner -> `c1`, only when `proven` | `proof` | `Proven equal (EQY)` |

Node statuses via `update_status` (by `system`): blocks `replanning` -> `drafted` (note `Changed: <what>`) -> `approved` (gate closed) -> `built` (v1 measured); golden `pending` -> `locked`. Candidate node status follows `candidate` events automatically (the reducer syncs it); do not send `update_status` for candidates.

Order rule: `add_node` before `connect`, and both before the first `candidate` event of that id.

### 6.2 Stage script

`[stage]` means `StageEvent`; `[cand cN status]` means a full `CandidateEvent` upsert; captions name the template in `core/captions.py` and their chapter.

1. **spec**: `run running`; `human {kind: spec, tMs: ctx.now_ms(), presetId, priority}`; `spec` (`pack.to_spec(priority)`); `add_node spec`; `[stage spec done]`; caption `spec_read` (Spec).
2. **plan**: `[stage plan active]`; caption `drafting_plan` (Plan); `roles.plan(...)`; credits; artifact `plan/plan.r1.json`; `plan {revision 1, blocks}` (no diff); per block: `add_node blk-*`, `connect` (plan chain); `gate {open, autoContinueMs: plan.gate_auto_continue_ms}`; caption `plan_drafted`. Set `ctx.gate_state`.
3. **gate loop** (until auto-continue elapses, `build_now`, or `max_hold_s` while held):
   - `pin` / `toggle`: `human` echo (PinInput / ToggleInput with `ctx.now_ms()`); `update_status blk-* replanning`; caption `pinned` / `toggled`; if replans left (`plan.max_replans`): `roles.plan(previous=..., steering=[all pins/toggles so far])`, else apply the pin/toggle to the blocks in code (no LLM). Then `plan {revision n+1, blocks, diff, reason}` (diff computed in code: added/changed/removed block ids); `update_status ... drafted` with note; `add_node`/`remove` for added/removed blocks; `gate {open, autoContinueMs: plan.gate_after_replan_ms}`; caption `plan_updated`.
   - `gate hold` (or `autopilot` off): `gate {held, autoContinueMs: <remaining>}`; caption `gate_held`. `resume` (or `autopilot` on): `gate {open, autoContinueMs: <remaining>}`. `build_now`: close now. Gate steers have no `human` echo (HumanInput has no gate kind).
   - Close: `gate {closed, autoContinueMs: 0}`.
4. **feasibility** (`check_plan` returns reasons; empty = ok): ok -> `[stage plan done]`, `update_status blk-* approved`. Fail -> `[stage plan failed, detail=<first reason>]`, caption `plan_rejected`, `run error {message}`.
5. **lock**: `[stage lock active]`; `add_node golden`; `update_status golden pending`; `pack.reverify()` (PackIntegrityError -> `[stage lock failed]`, run error); artifacts `tests/golden_model.py` (= `pack.golden_source()`) and `tests/test_dut.py`; `update_status golden locked`; `[stage lock done]`; caption `locked` (Lock).
6. **rtl**: `[stage rtl active]`; `add_node c1`; `connect golden->c1 checks`; `[cand c1 drafting]` (attempts empty, rtl ""); caption `writing_v1` (Build and fix); `roles.generate_rtl` (R4: with `[baseline] samples` > 1 it is called that many times in parallel at `[baseline] temperature` and `top_p`, each sample gets the declaration fixer and one sandbox check with no events, samples that still fail lint are dropped, the one passing the highest fraction of tests becomes attempt 1 of c1, and caption `sampled` follows; if none passes lint the one with the fewest lint issues continues; one failed sample does not end the run, all failing does; `samples = 1` is the single call path); credits; `[stage rtl done]`.
7. **verify loop for c1** (one sandbox call per attempt):
   - validate: `pack.validate_rtl(text)`; `RtlRejected` -> attempt with `Verification(lint="fail", lintLog="Rejected before simulation:\n- ...", passed=0, total=test_count, tool="Verity RTL rules", durationMs=0)` and go to fail handling (caption `rejected_rules`).
   - `[stage lint active]`; `[cand c1 linting]` (rtl = the new text); `tools.verify`; then `[stage lint done|failed]`; if lint passed: `[stage sim active]`, `[cand c1 simulating]`, caption `simulating`, then the result.
   - append `Attempt(n, by, reason, rtl, verification)`; candidate `verification` = that verification.
   - PASS: `[stage sim done]`; if fixes happened `[stage fix done, detail "<k> fix" / "<k> fixes"]`; `[cand c1 pass, isBaseline true]`; caption `baseline_passes`.
   - FAIL: `[cand c1 fail]`; `[stage sim failed]` (or lint failed); caption `failed_tests` / `failed_lint`; if `fix_count < max_repairs_baseline` and budget allows: `[stage fix active]`; `[cand c1 fixing]`; `roles.repair`; credits; set `diagnosis` on the failed attempt's verification (re-upsert); caption `diagnosis`; `fix_count += 1`; next attempt has `by: "FIX"`. Otherwise: caption `no_baseline`, `run error "no passing baseline"`.
8. **synth (v1)**: `[stage synth active]`; `[cand c1 synthesizing]`; `tools.measure`; `ppa = to_ppa()`; `fitness = compute_fitness(ppa, ppa, priority, "c1")` (score 0); `[cand c1 measured]`; `[stage synth done]`; `update_status blk-* built`; caption `baseline_measured`; artifacts `reports/synth_v1.txt`, `reports/sta_v1.txt`, `circuit/c1.json`. Synth failure on v1: caption `baseline_synth_failed`, run error.
9. **fast mode** stops here: `[stage evolve skipped]`, `[stage prove skipped]`, `winner {c1, ai, aiPickId c1}`, then step 12.
10. **evolve round r** (r = 1, then 2 if `max_rounds >= 2`, round 1 beat v1 or `round2_requires_improvement = false`, and budget allows):
    - `[stage evolve active, detail "R<r> of <max_rounds>", round r]`; `round {round r, parents}`; caption `round_started` (Round 1 / Round 2).
    - Round 1: parent `c1`, children `round1_children` with strategies `round1_strategies` in order. Round 2: parents = current elites (best first), `round2_children` children assigned round-robin; strategy = the parent's `createdBy` (OPTIMIZE if the parent is INIT).
    - Per child, in creation order: `ledger.count("candidate")`; `add_node cN`; `connect parent->cN lineage`; `[cand cN drafting, round r, parentId, createdBy]`. Then generate all children in parallel (`asyncio.gather`), each followed by its own verify, repair (`max_repairs_child`) and measure. During evolve, no per-candidate `stage` events for lint/sim/fix/synth: only `candidate` events and captions (`child_failed`, `child_rejected`, `child_duplicate`, `child_synth_failed`, `child_measured`).
    - Duplicate RTL (same `Rtl.sha256` as any earlier attempt in the run): `[cand cN rejected]`, no sandbox call.
    - After all children settle: `elites = select_elites(all candidates, evolution.elites)`; `round {round r, parents, elites}`; re-upsert every candidate whose `isElite` changed; caption `elites_kept`.
11. **winner and prove**: `ai = pick_winner(...)`; `winner {candidateId: ai, by: "ai", aiPickId: ai}`; `[stage evolve done]`; caption `winner` (or `baseline_wins`). If winner is `c1`: `[stage prove skipped, detail "v1 is the winner"]`. Else `[stage prove active]`; caption `proving` (Prove); `tools.check_equivalence(v1, winner)`; upsert winner with `eqy`; `proven` -> `connect winner->c1 proof "Proven equal (EQY)"`, caption `proven`; `inconclusive` -> caption `not_proven`, winner stands; `not_equivalent` -> winner `rejected` (fitness null, isElite false), caption `not_equivalent`, next best becomes winner (`winner` event again), prove again, at most `max_prove_attempts`, then `c1`. Artifact `reports/eqy_<label>_vs_v1.log`. `[stage prove done]`.
12. **end**: `credits`; artifact `reports/summary.json`; `run done` (or `cap_reached` with `budget_reached` caption first); caption `done` (Done) AFTER the run event, as in golden.json. Set `ctx.outcome`.

Budget: `BudgetExhausted` from any role call means: no new LLM calls; finish verifying and measuring what is in flight; pick the winner among measured; still prove if the tool budget allows; terminal phase `cap_reached` with `message` naming the limit. Wall clock over `max_wall_s` behaves the same.

Credits: after every LLM call, `credits {usedUsd: round(ledger.snapshot().usd, 4), capUsd: ledger.limits.max_usd}`.

Artifact events: content capped at `sse.max_event_bytes - 1024` bytes, with `\n[truncated]` appended when cut. Paths: `tests/golden_model.py`, `tests/test_dut.py`, `plan/plan.r<n>.json`, `reports/synth_<label>.txt`, `reports/sta_<label>.txt`, `reports/eqy_<label>_vs_v1.log`, `reports/summary.json`, `circuit/<cid>.json`. The web zip export takes `tests/` and `reports/`.

Disk (via `store.write_run_file`, ARCHITECTURE 15): `spec.md`, `plan.r<n>.json`, `candidates/<cid>/attempt-<n>.v`, `attempt-<n>.verify.json`, `attempt-<n>.llm.json` (raw model text + CallMeta; for a deterministic fix `meta.model` is `verity-declaration-fixer` and `raw` is empty), `candidates/c1/samples.json` (only when baseline sampling ran: per sample `lintOk`, `passed`, `total`, `fixerChanges`, `outputTokens`, `reasoningTokens`, `finishReason`, plus `chosen`), `final/llm-calls.json` (one entry per model call: role, model, temperature, topP, input, output and reasoning tokens, `finishReason`, `maxOutputTokens`, usd; `finishReason` `length` means the call was cut at the output cap), `attempt-<n>.autofix.json` (only when the declaration fixer changed attempt n: `fromAttempt`, `lintIssues`, `changes`), `stall-<n>.json` (only when a stalled baseline was restarted from the plan: `signature`), `ppa.json`, `synth.log`, `sta.log`, `circuit.json`, `final/winner.v`, `final/eqy.log`, `final/summary.json`, `runlog.json`.

Candidate field rules: `rtl` = text of the attempt in flight or the last attempt; `attempts` only contains attempts that have a verification; `verification` = last attempt's verification; `reason` = attempt 1's `RtlOut.reason` (fallback `"First version, written from the plan"`); `fixCount` = number of FIX attempts; `fitness` null unless measured and not rejected; `isBaseline` true for c1 from its first pass.

Terminal events: the orchestrator emits `done | error | cap_reached`. The run manager emits `stopped` (Stop, after cancelling the task), `error` with `"timed out: no progress for 90 s"` (watchdog; `runs.status = timed_out`), and `error` with `"server restarted"` (startup recovery).

RunLog (`build_run_log`): `meta.runId`, `sample: false`, `title` = pack title, `presetId`, `recordedAt` = run start ISO UTC (`Z`), `durationMs` = last event tMs, `chapters` = first tMs of each caption chapter label in `captions.CHAPTERS` order (id from `CHAPTER_ID_BY_LABEL`), `note` = `"Recorded live run. Models: planner=<id>, rtl_gen=<id>, repair=<id>, optimizer=<id>."`; events sorted by seq.

---

## 7. Fitness (frontend ARCHITECTURE 8.3), implemented in `verity/core/fitness.py`

```
gain_m  = 100 * (v1_m - c_m) / v1_m        m in {area, clock period, power}; lower is better
fitness = w_area * gain_area + w_timing * gain_timing + w_power * gain_power
weights: area {0.60, 0.25, 0.15}; speed {0.25, 0.60, 0.15}; power {0.25, 0.15, 0.60}
missing metric (null for v1 or c) -> drop it, renormalize remaining weights to sum 1
FAIL or rejected -> fitness null, never ranked
elites: best 2 by fitness among measured versions so far (v1 counts, score 0)
winner: highest fitness; tie -> smaller area (then older candidate)
```

Use `compute_fitness`, `select_elites`, `pick_winner`. Do not reimplement.

---

## 8. Captions (`verity/core/captions.py`)

| When | Function | Example text | Chapter |
|---|---|---|---|
| spec loaded | `spec_read(pack.summary, priority)` | Spec read: 4 lanes of 8-bit multiply-accumulate over 16 cycles. Goal: smallest area. | Spec |
| planning | `drafting_plan()` | Drafting the plan. | Plan |
| plan ready | `plan_drafted(n, ms)` | Plan drafted: 4 blocks. Building in 10 s unless you steer. | Plan |
| toggle | `toggled(block, variant, value)` | You set pipeline on Multiplier array (4 lanes) to 2-stage. Replanning. | Plan |
| pin | `pinned(block, pin)` | You pinned "Minimize area" on Adder tree. Replanning. | Plan |
| replanned | `plan_updated(ms)` | Plan updated. Building in 6 s. | Plan |
| hold | `gate_held()` | Plan on hold. Building when you resume. | Plan |
| infeasible | `plan_rejected(reason)` | Plan rejected before any Verilog was written: ... | Plan |
| lock | `locked(n)` | Answer key locked: 16 tests from the golden model. The agent cannot edit them. | Lock |
| rtl | `writing_v1()` | Writing v1 from the plan. | Build and fix |
| sim | `simulating(n)` | Simulating 16 tests against the golden model. | Build and fix |
| fail | `failed_tests(label, k, n)` | v1 failed 3 of 16 tests. Reading the mismatches. | Build and fix |
| lint fail | `failed_lint(label)` | v1 did not pass lint. Reading the errors. | Build and fix |
| rules | `rejected_rules(label, problem)` | v1 broke the coding rules: initial blocks are not allowed (use reset logic). Fixing it. | Build and fix |
| repair | `diagnosis(text)` | Diagnosis: the accumulator is 16 bits and wraps. | Build and fix |
| baseline | `baseline_passes(label, n)` | v1 passes 16 of 16. This is the baseline. | Build and fix |
| no baseline | `no_baseline(k)` | No passing version after 3 fixes. Stopping here. | Build and fix |
| v1 PPA | `baseline_measured(label, ppa)` | v1 measured: 1,840 µm², 3.20 ns, power not measured. Everything after is compared to this. | Build and fix |
| round | `round_started(r, n, parents, from_elites)` | Round 1: three new versions from v1. | Round r |
| child fail | `child_failed(label, k, n)` | v3 failed 2 of 16 tests. Fixing it before it can compete. | Round r |
| rejected | `child_rejected(label)` | v6 failed again after a fix and was rejected. | Round r |
| duplicate | `child_duplicate(label, other)` | v4 was identical to v2 and was dropped. | Round r |
| child PPA | `child_measured(label, "v1", ppa, base)` | v5: area -17.4% vs v1, clock period +5.6%, power not measured. | Round r |
| elites | `elites_kept(labels)` | Kept the two best: v3 and v2. | Round r |
| no gain | `no_improvement()` | No version beat v1 this round. Skipping round 2. | Round 1 |
| winner | `winner(label)` / `baseline_wins()` | Winner by fitness: v5. | Round r |
| prove | `proving(label)` | Checking v5 against v1 with Yosys EQY. | Prove |
| proven | `proven()` | Proven equal to v1. | Prove |
| inconclusive | `not_proven()` | Tested, not proven: EQY could not decide in time. | Prove |
| not equal | `not_equivalent(label, next)` | v5 is not equal to v1 and was rejected. Next best: v3. | Prove |
| cap | `budget_reached(limit)` | Budget reached (max usd). Finishing with what is measured. | current |
| done | `done(versions, fixes, rejected, human)` | Done. 6 versions, 2 fixes, 1 rejected. Human inputs: 2. | Done |
| error | `failed(reason)` | Run ended: no passing baseline | current |

Chapter labels are the constants `CH_*` in `captions.py`; `round_chapter(r)` picks Round 1 or Round 2.

---

## 9. HTTP API (builder E)

| Method and path | Auth (when `auth.required`) | Request | Response |
|---|---|---|---|
| `GET /health` | none | | `HealthResponse {liveEnabled, reason?, capUsd, provider, models, authRequired, features}` |
| `POST /auth/session` | none, `limits.auth_per_ip` per `auth_window_s` | `SessionRequest {accessCode}` | `200 SessionResponse {token, expiresAt}` or `401` |
| `POST /runs` | session | `CreateRunRequest {presetId, priority, mode?, params?}` | `201 CreateRunResponse {runId, capUsd, streamToken}`; `429 {error, reason}`; `422 {error}` |
| `POST /parse` | session, `limits` parse bucket per session | `ParseRequest {text}` (1 to 300 characters) | `200 ParseReply`; `422`; `429 {error, reason}`; `502`; `503 {error, reason: "maintenance"}` |
| `GET /runs/{id}/events` | `?st=<stream token>` | `Last-Event-ID` header or `?after=<seq>` | SSE |
| `GET /runs/{id}/log` | session, owner | | `RunLog` |
| `POST /runs/{id}/steer` | session, owner | `SteerRequest` | `202` |
| `POST /runs/{id}/stop` | session, owner | | `202` |

- Tokens: `itsdangerous.URLSafeTimedSerializer(settings.signing_secret)`, salt `verity.session` (payload `{sid, role}`, max age `auth.session_ttl_s`) and salt `verity.stream` (payload `{runId, sid}`, max age `auth.stream_ttl_s`). Access codes: compare `sha256(code).hexdigest()` against `settings.access_codes` with `hmac.compare_digest`. In development with no signing secret, generate a random one per process and log that tokens will not survive a restart.
- `auth.required = false`: no token needed anywhere; session id from the client IP (S11); a stream token is still returned and accepted but not required.
- SSE: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`. First line `retry: 3000`. Each event `id: <seq>\ndata: <event_to_json(e)>\n\n`. `: ping\n\n` every `sse.ping_s`. Source: `service.stream(run_id, after_seq)`; close after the terminal run event.
- Errors: `AdmissionDenied` 429 `{error, reason}`; `UnknownPreset` and validation 422; `NotFound` 404; `Forbidden` 403; `Conflict` 409; bad or expired token 401. Bodies use `ErrorResponse`.
- Rate limits (in-process token buckets, `[limits]`): auth per IP, API requests per session per minute, new runs per session per hour (429 `rate_limited`). Concurrency (per session, global) and daily spend are the RunManager's admission (`busy`, `budget_exhausted`).
- Health: `liveEnabled` false with `reason`: `maintenance` (provider `nebius`/`openai_compat` without an API key, or tool backend not configured), `budget_exhausted` (today's spend >= `limits.daily_usd`), `busy` (global concurrency full). `capUsd` = `budget.run.max_usd`; `models` = `settings.models_by_role()`.
- CORS: `settings.cors_origin_list`, methods GET/POST/OPTIONS, headers `Authorization`, `Content-Type`, `Last-Event-ID`.
- `features` (on `GET /health`): `string[]` of what this backend serves end to end. Today `["params", "human_ref", "parse"]`. Unknown values are ignored by clients; absent means `[]`.
- `params` (on `POST /runs`): optional `{ "<knob id>": int | bool | string }`. Omitted means the chip's defaults. Keys and values are validated against the family's `KNOBS` table (`tasks/<id>/family.py`): an unknown key, a wrong type (a bool is not an int) or an out-of-range value is `422 {error}` with a sentence meant to be shown as is; a chip with no knobs and a non-empty `params` is `422 "This chip has no settings."`. The run executes against the pack rendered at those knobs (`verity.core.family.render_pack`), so the `spec` event and every test describe that chip. Knobs: `mac4` lanes 1 to 8 (4), width 4 to 8 (8), cycles 4 to 32 (16); `add8` width 4 to 32 (8); `cnt8` width 4 to 16 (8), enable bool (true); `fsm_seq` pattern string of 0/1, length 3 to 8 ("1011"), overlap bool (true).
- `POST /parse`: the sentence goes only in the user message of one planner-model call (no reasoning tokens); the server re-validates family and knobs against the knob tables, so the reply only pre-fills the bench. `ParseReply` is one of
  `{ "result": "in_range", "family": "<id>", "params": { ... }, "note"?: "<one sentence>" }` (params fully filled with defaults) or
  `{ "result": "out_of_range", "reason": "<sentence>", "closest": { "family": "<id>", "params": { ... } } | null }` (`closest` is always present; the model is told to suggest the nearest buildable family and clamps its values into range, `null` only when nothing relates). Unreadable model output is an `out_of_range` with a fixed fallback reason, never a 500. A provider failure is `502`; `budget_exhausted` is `429 {error, reason}`.
- `human_ref` (SSE event): `{ "seq", "tMs", "t": "human_ref", "ppa": PPA, "eqy": Equivalence }`, emitted once after the `winner` event and before the terminal `run` event (also on the cap_reached path when a winner exists), only when the pack has a `reference.v`. A `caption` "Measuring the human-written design with the same tools." precedes it. `ppa` is `reference.v` (rendered at the run's knobs) through the same synth, timing and power flow as the candidates, with nulls for anything not measured. `eqy` is EQY of the reference (gold) against the winner (gate), `againstId` = the winner id, `status` one of `proven | not_equivalent | inconclusive | not_run`. EQY is `not_run` (reason in `log`) when equivalence is off for the task, the wall limit was reached, or the winner's own prove EQY timed out. A failure here never changes the run's status.
- Logs never include `Authorization` headers, tokens, access codes or API keys.

---

## 10. Environment variables (names only; `.env` is gitignored)

| Name | Maps to | Notes |
|---|---|---|
| `VERITY_CONFIG` | path of config.toml | default `backend/config.toml` |
| `VERITY_ENV` | `env` | development, production, test |
| `VERITY_PROVIDER` | `provider` | fake, nebius, openai_compat |
| `VERITY_TOOL_BACKEND` | `tool_backend` | local_docker, nebius_sandbox |
| `VERITY_DATA_DIR`, `VERITY_TASKS_DIR` | paths | relative to `backend/` |
| `VERITY_CORS_ORIGINS` | `cors_origins` | comma separated |
| `VERITY_ACCESS_CODE_HASHES` | `access_code_hashes` | `role:sha256hex,role:sha256hex` |
| `VERITY_SIGNING_SECRET` | `signing_secret` | 32+ chars in production |
| `VERITY_<TABLE>__<KEY>` | any table value | e.g. `VERITY_AUTH__REQUIRED=true`, `VERITY_BUDGET__RUN__MAX_USD=0.3` |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_ULTRA`, `LLM_MODEL_SUPER` | `[llm]` | Nebius Token Factory, OpenAI-compatible |
| `SANDBOX_BASE_URL`, `SANDBOX_API_KEY` | `[tools.nebius_sandbox]` | key falls back to `LLM_API_KEY` |

---

## 11. LLM layer notes (builder B)

- `NebiusProvider` and `OpenAICompatProvider` share one class over `openai.AsyncOpenAI(base_url, api_key, timeout)`; `request_id` from the response id (or the `x-request-id` header); usage from `response.usage` (add `completion_tokens_details.reasoning_tokens` if reported separately). `# UNVERIFIED: Nemotron reasoning token reporting and JSON mode on Nebius.`
- `FakeProvider`: zero network. Cassettes `backend/evals/cassettes/<task_id>/<role>[.<strategy>][.<n>].txt` keyed by `LLMRequest.tags` (`task_id`, `strategy`, `attempt`); without a cassette it returns a canned plan built from the run's pack (tag `pack_root`, the rendered pack of a knob run; never put in a prompt) and its `reference.v` as the RTL, so the full pipeline runs at $0.
- Prompt version: `"<template file name>@<sha256(template)[:12]>"`, recorded per attempt.
- Roles extract exactly one fenced Verilog block (accept `verilog`, `systemverilog`, `v` or bare fences; if several, take the one containing `module <top>`). Planner JSON: tolerate fences, retry once (`plan.json_retries`), then `RoleOutputError`. Truncate `reason` to 200 chars and `diagnosis` to 300.
- Repair prompts get the RTL plus either the lint log (first 4,000 chars) or at most 5 failing cases; never `golden.py`, `test_dut.py` or `reference.v`.

---

## 12. Open items marked UNVERIFIED (check on test day)

1. Nebius Sandboxes API: file upload vs stdin bundle, image import, per-run timeout above 120 s, cancel support, outbound network.
2. Yosys `write_json` port signedness key; OpenSTA commands and slack parsing; EQY result parsing and proof strength.
3. Nemotron on Nebius: JSON reliability, reasoning tokens in `usage`, request id location.
4. cocotb runner API for the pinned version (`cocotb.runner` in 1.9 vs `cocotb_tools.runner` in 2.x).
5. Docker Desktop on Windows: bind mounts of temp dirs with `--user 1000:1000` and `--read-only`.

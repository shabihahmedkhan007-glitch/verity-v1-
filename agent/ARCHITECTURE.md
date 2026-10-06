# Verity backend architecture (`agent/`)

The implementation contract for the Verity agent backend. Written 2026-10-05, before any backend code exists. Nothing here is built yet.

Read with:
- `../ARCHITECTURE.md`: the frontend architecture. It owns the event and data contracts (section 5), the reducer, the fitness formula (section 8.3) and the first proposed agent API (section 10). **This backend must emit exactly those contracts.** Where this document proposes a change to them, it says so and lists it in section 23.
- `../MEETING.md` and `../REPORT.md`: requirements and decisions D1 to D10. They outrank this file.

## 0. How to read the claims in this file

Every claim that matters carries one of these tags:

| Tag | Meaning |
|---|---|
| **[FACT]** | Checked against a source on 2026-10-05 (official rules, vendor docs, or this repo). Source given. |
| **[DECIDED]** | Already decided in `REPORT.md` (D-number given) or `MEETING.md`. Not reopened here. |
| **[REC]** | Recommendation made by this document. The team can overrule it. |
| **[OPEN]** | Needs a team decision. Collected in section 23. |
| **[ASSUME]** | Assumption not yet verified. Each one has a check in section 24. |

Numbers marked "est." are estimates, not measurements.

---

## 1. Executive summary

Verity's backend is **one Python process** (FastAPI) that runs a **deterministic orchestrator**. The orchestrator is ordinary Python code: it decides what happens next (repair, synthesize, discard, stop). It calls Nemotron on Nebius Token Factory only for the creative steps: writing the plan, writing RTL, repairing RTL, proposing optimized variants. It runs the chip tools (Verilator lint, Icarus Verilog + cocotb simulation, Yosys synthesis, OpenSTA timing, Yosys EQY equivalence) through **fixed tool functions** inside an isolated sandbox. The model never gets a shell and never gets tools; it only returns text (a plan or a Verilog file), which the orchestrator validates and then tests.

Correctness is judged against a **locked task pack** per supported design: a human-written Python golden model, a cocotb testbench and a port contract with fixed bit widths. The pack is read-only, hashed at run start, and copied fresh into every sandbox run. The agent can only submit RTL.

The search is **REvolution-lite** [DECIDED D8]: one baseline candidate is built and repaired until it passes; then 3 children are generated from it with different strategies; failures get bounded repairs; passing candidates are synthesized and ranked by measured PPA relative to our own v1; the best 1 to 2 are kept; an optional second round runs; the winner is checked for equivalence against v1. Every limit (candidates, repairs, rounds, LLM calls, tokens, dollars, wall clock) is a config value, and the run stops cleanly when any of them is hit.

The backend streams the frontend's existing `RunEvent` contract over SSE, and writes the same events to a `RunLog` file. A recorded real run therefore becomes the replay fixture (`web/public/runs/golden.json`) with no conversion.

No Celery, no Redis, no microservices for the MVP. State lives in SQLite plus an immutable artifact directory. One login gate (an access code that issues a signed session token) protects the live path; replay stays public.

**One-minute judge version:** "You type or pick a chip spec. Nemotron on Nebius writes a plan and Verilog. Real open-source chip tools test it against answers the AI cannot touch. If it fails, Nemotron reads the failing cases and fixes it. Once it passes, Verity breeds three alternative designs, measures each one's real size and speed with synthesis tools, keeps the best, and finally proves the winner behaves exactly like the first tested version. Every version, number and log is saved and shown live."

---

## 2. System diagram

```
 Browser
   |  replay: GET /runs/golden.json (static, public, no login, no network after load)
   |  live:   REST + SSE with a session token
   v
 web/ (Next.js static export, any static host)               [DECIDED D10]
   |
   |  HTTPS: POST /auth/session, POST /runs, GET /runs/{id}/events (SSE), ...
   v
 agent/ : ONE FastAPI process                                [REC]
 +-------------------------------------------------------------------------+
 |  API layer: auth, rate limits, input validation, SSE                     |
 |     |                                                                    |
 |  Run Manager: admission (budgets, concurrency), asyncio task per run,    |
 |     |         heartbeat + watchdog, cancel, startup recovery             |
 |     v                                                                    |
 |  Verity Orchestrator (deterministic state machine, plain Python)         |
 |     |-- Planner role ......... LLM  (plan + feasibility explanation)     |
 |     |-- Feasibility gate ..... deterministic rules, no LLM               |
 |     |-- RTL Generator role ... LLM  (baseline RTL)                       |
 |     |-- Verifier role ........ tools only (lint, sim, contract check)    |
 |     |-- Repair role .......... LLM  (FIX from failing cases)             |
 |     |-- Optimizer role ....... LLM  (SIMPLIFY / OPTIMIZE / EXPLORE)      |
 |     |-- Judge ................ deterministic (PPA, fitness, elites)      |
 |     '-- Prover ............... tools only (EQY)                          |
 |     |                     |                        |                     |
 |  Budget Ledger         LLMProvider             ToolRunner                |
 |  (calls, tokens, $)       |                        |                     |
 |  Store: SQLite + immutable artifact dir (data/)    |                     |
 +---------------------------|------------------------|--------------------+
                             v                        v
              Nebius Token Factory            Sandbox (one fixed image)
              OpenAI-compatible API           prod: Nebius Token Factory Sandboxes
              Nemotron 3 Ultra / Super        dev:  local Docker, --network none
                                                 |-- Verilator --lint-only
                                                 |-- Icarus Verilog + cocotb  (sim)
                                                 |-- Yosys + Nangate45 liberty (area, cells)
                                                 |-- OpenSTA                   (post-synth timing)
                                                 '-- Yosys EQY                 (equivalence)
                             Task packs (read-only, hashed): golden model, testbench,
                             port contract, constraints. Mounted into the sandbox per call.
```

Changes from the diagram in the brief, and why:
- **No separate worker tier.** The run is mostly waiting on network calls (LLM and sandbox). An asyncio task per run inside the API process is enough (section 18).
- **Verifier and Prover are not LLM roles.** They are tool calls plus parsing. Only four roles call a model.
- **Feasibility is split** into deterministic rules (cheap, trustworthy) and the planner's explanation (LLM). The rules decide; the LLM explains.
- **OpenROAD place and route is not in the MVP path.** Post-synthesis timing from OpenSTA is the MVP timing number (section 11.4).

---

## 3. Component responsibilities

| Component | Plain-English job | Must not |
|---|---|---|
| **API layer** | Checks the session, applies rate limits, validates input, starts runs, streams events. | Run tools or call the LLM itself. |
| **Run Manager** | Decides whether a new run may start (concurrency, daily budget). Starts one asyncio task per run. Keeps the heartbeat, times out stuck runs, handles Stop, marks orphaned runs failed after a restart. | Contain design logic. |
| **Orchestrator** | The loop. A state machine that calls roles in order, applies the budget, emits events. Every branching decision (pass or fail, keep or discard, continue or stop) is an `if` in Python. | Ask the LLM whether to continue or which design is better. |
| **Planner** | One LLM call: spec + task pack summary in, structured plan out (blocks, interfaces, widths, verification approach, risks). | Change the port contract or widths. |
| **Feasibility gate** | Deterministic checks on the request and the plan (section 10.2). Rejects with a reason before any RTL tokens are spent. | Claim a design is physically realizable. It is a scope filter. |
| **RTL Generator** | One LLM call: plan + port contract + coding rules in, one Verilog file out. | Emit anything except RTL for the DUT. |
| **Verifier** | Runs contract check, lint, then simulation in the sandbox. Parses results into `Verification` (expected vs got per failing case). | Edit tests or expectations. |
| **Repair** | One LLM call per FIX attempt: current RTL + lint errors or the first few failing cases in, corrected RTL out. | See the golden model source or the testbench source. |
| **Optimizer** | One LLM call per child: parent RTL + its PPA + one strategy instruction in, a new RTL file out. | Change the interface or the cycle latency defined in the task pack. |
| **Judge** | Synthesis + timing via tools, then the fitness formula from `../ARCHITECTURE.md` 8.3, then elite selection. Pure code. | Use any LLM output in ranking. |
| **Prover** | Runs EQY between the winner and v1. Reports `proven`, `not_equivalent`, `inconclusive` or `not_run`. | Mark a design proven on timeout. |
| **LLMProvider** | The only code that knows about Nebius. Counts tokens, enforces per-call limits, records model id and request id. | Be imported by anything except the roles. |
| **ToolRunner** | The only code that executes anything. Exposes a closed list of tool functions with fixed command templates. | Accept a command string. |
| **Budget Ledger** | Counts LLM calls, tokens, estimated dollars, candidates, repairs, rounds, wall time. Every role asks it before spending. | Allow an overdraft "just this once". |
| **Store** | SQLite tables for runs, candidates, events, artifacts index, eval results. Content-addressed, write-once files under `data/`. | Overwrite a recorded artifact. |

---

## 4. Request lifecycle (user presses Run)

```
1. Browser  POST /runs {presetId, priority}  Authorization: Bearer <session token>
2. API      verify token (signature, expiry)                       -> 401 if bad
3. API      rate limits: per-session runs/hour, per-session concurrent,
            global concurrent, global daily $ budget                -> 429 {reason}
4. API      validate presetId exists, priority in {area,speed,power} -> 422
5. RunMgr   create Run row (status=queued, budget snapshot, task pack hash,
            model ids, prompt versions, tool image digest)
6. RunMgr   create asyncio task; return 201 {runId, capUsd, streamToken}
7. Browser  EventSource GET /runs/{id}/events?st=<streamToken>
8. API      verify stream token (scoped to this runId, short-lived);
            replay stored events after Last-Event-ID, then follow live
9. Orchestrator runs (section 5), appending events: each event is written to
            SQLite first, then fanned out to subscribers (so reconnect never loses one)
10. Heartbeat: orchestrator touches runs.heartbeat_at at every step and every 10 s
            while a tool or LLM call is in flight; SSE sends ": ping" every 15 s
11. End:    run event phase = done | error | cap_reached | stopped; RunLog file
            written; SSE stream closes
```

The stream token exists because the browser's native `EventSource` cannot send an `Authorization` header (section 12.1).

---

## 5. Agent lifecycle

### 5.1 Stages

Stage ids are the frontend's existing `StageId` values [FACT: `../ARCHITECTURE.md` section 5].

```
spec   load task pack, record its hash, emit spec event
  |
plan   Planner (LLM, 1 call) -> plan JSON, validated by pydantic
  |    emit plan revision 1; emit gate {open, autoContinueMs: 10000}
  |    user may pin/toggle via /steer -> plan revision 2 (1 more LLM call max)
  |
  |    FEASIBILITY GATE (deterministic, section 10.2)
  |      fail -> stage plan failed, run error with the reason. Stop. (0 RTL tokens spent)
  |
lock   copy task pack to the run's read-only area, verify hash matches the repo copy
  |
rtl    RTL Generator (LLM, 1 call) -> c1 attempt 1
  |
lint   contract check (ports, widths, signedness, banned constructs) + Verilator lint
sim    Icarus + cocotb against the golden model
  |      FAIL -> fix: Repair (LLM) -> lint -> sim   up to max_repairs_baseline (default 3)
  |      still FAIL after budget -> run ends "error: no passing baseline". Stop.
  |      (Children are never generated from a failing baseline.)
  |      PASS -> c1 is the baseline (v1)
  |
synth  Yosys + OpenSTA on c1 -> PPA of v1 (fitness 0 by definition)
  |
evolve round 1: 3 children of the best parent, one per strategy
  |      (SIMPLIFY, OPTIMIZE, EXPLORE), generated in parallel
  |      each child: lint -> sim -> FAIL? up to max_repairs_child (default 1) -> still FAIL: rejected
  |      each passing child: synth -> PPA -> fitness vs v1
  |      Judge: elites = best 2 by fitness among measured (v1 counts at 0)
  |    optional round 2 (if budget allows and round 1 improved on v1):
  |      2 children of the best elite, same rules
  |
prove  EQY: winner vs v1 (winner != v1)
  |      proven -> winner stands
  |      not_equivalent -> winner demoted to rejected, next best becomes winner, prove again
  |                        (max 2 prove attempts, then winner = v1)
  |      inconclusive / timeout -> winner stands, labeled "tested, not proven"
  |
done   winner event, final RunLog, artifacts closed
```

### 5.2 Decision rules (all deterministic)

```python
if lint_failed or contract_failed: next = REPAIR (counts as a repair attempt)
elif sim_failed:                   next = REPAIR
elif sim_passed and not measured:  next = SYNTH
if candidate.fitness is None:      never ranked
if child.fitness <= parent.fitness: kept in the tree, not an elite
if budget.exhausted(any_limit):    stop issuing new LLM calls; finish what is measured;
                                   run phase = cap_reached; still run PROVE on the current best
                                   if the tool budget allows
if stop_requested:                 cancel in-flight calls; run phase = stopped
```

### 5.3 Fast path and full path

| Path | Steps | When |
|---|---|---|
| **Fast** | spec, plan, rtl, lint, sim, (fix), synth: baseline with area and timing | Gate rehearsal, evals of functional correctness, a live demo if credits run low |
| **Full** | Fast path + round 1 (3 children) + optional round 2 + prove | The showcase run and the recorded golden run |

The path is a run config (`mode: fast | full`), not separate code.

---

## 6. Candidate model

Matches `Candidate` and `Attempt` in `../ARCHITECTURE.md` section 5 [FACT]. Key rules:

- A **candidate** is one design idea, created by `INIT` (baseline) or an optimizer strategy (`SIMPLIFY`, `OPTIMIZE`, `EXPLORE`). [DECIDED D8]
- An **attempt** is one RTL text inside a candidate. Attempt 1 comes from the creating strategy; attempts 2..n come from `FIX`. FIX never creates a new candidate. [FACT: existing contract]
- `parentId` links a child to the candidate it was derived from. v1 has `parentId: null`.
- `reason` is a one-sentence rationale returned by the LLM (max 200 chars, truncated). No long reasoning traces are stored in the candidate; the full raw LLM response is kept as an artifact for debugging only.

Lifecycle (existing `CandidateStatus` values):

```
drafting -> linting -> simulating -> pass -> synthesizing -> measured
                |            |
                +-> fail -> fixing -> linting ...   (bounded by max_repairs_*)
                              |
                              +-> rejected   (repair budget spent, or EQY not_equivalent)
```

Extra backend-only fields (stored in SQLite, not sent in the `Candidate` event unless the contract is extended, see section 23):

| Field | Purpose |
|---|---|
| `model_id`, `prompt_version` per attempt | Reproducibility and evals |
| `llm_request_id`, `input_tokens`, `output_tokens` per attempt | Cost accounting |
| `rtl_sha256` per attempt | Immutability and dedupe (an identical child is rejected without simulation) |
| `tool_image_digest` | Which tool versions measured it |

---

## 7. Run and state model

SQLite, one file under `data/`. Proposed tables [REC]:

```
runs(
  id TEXT PK, session_id, preset_id, priority, mode,            -- mode: fast|full
  status,                    -- queued|running|done|error|cap_reached|stopped|timed_out
  created_at, started_at, ended_at, heartbeat_at,
  budget_json,               -- the limits this run was admitted with
  spent_json,                -- calls, tokens, est_usd, candidates, repairs, rounds
  task_pack_sha256, tool_image_digest, models_json, prompt_versions_json,
  error_reason, winner_id, git_sha
)
candidates(run_id, id, parent_id, round, created_by, status, fitness, ppa_json,
           is_baseline, is_elite, eqy_json, reason, PRIMARY KEY(run_id, id))
attempts(run_id, candidate_id, n, by, rtl_artifact, verification_json,
         model_id, prompt_version, llm_request_id, input_tokens, output_tokens, created_at)
events(run_id, seq, t_ms, json, PRIMARY KEY(run_id, seq))   -- append-only
artifacts(sha256 PK, path, bytes, mime, created_at)          -- index of files in data/blobs
eval_results(eval_run_id, task_id, suite, metrics_json, git_sha, created_at)
```

- **Run**: one press of Run. Owns its budget and its event log.
- **Candidate / Attempt**: section 6.
- **Event**: exactly a `RunEvent` (frontend contract). `seq` is assigned by the Run Manager, gap-free per run. The events table is the source of truth; the SSE stream and the RunLog file are both views of it.
- **Artifact**: any file (RTL, logs, reports, netlist JSON, circuit JSON, plan JSON). Stored once by SHA-256, never modified.
- **Evaluation**: one row per (eval run, task, suite) with the metrics in section 14.

`timed_out` exists in the backend only. The frontend's `RunPhase` has no such value [FACT], so the event emitted is `run {phase: "error", message: "timed out: no progress for 90 s"}` (section 23, decision O6).

---

## 8. API surface

Extends `../ARCHITECTURE.md` section 10 [FACT] with auth and a run log endpoint. Nothing else.

| Method and path | Auth | Request | Response |
|---|---|---|---|
| `GET /health` | none | | `{liveEnabled, reason?, capUsd, provider, models}`. `provider` lets judges and us confirm Nebius is wired. |
| `POST /auth/session` | none (rate limited per IP) | `{accessCode}` | `200 {token, expiresAt}` or `401` |
| `POST /runs` | session | `{presetId, priority, mode?}` | `201 {runId, capUsd, streamToken}` or `429 {reason}` |
| `GET /runs/{id}/events` | stream token (`?st=`) | SSE, `Last-Event-ID` | `id: <seq>` + `data: <RunEvent>` |
| `GET /runs/{id}/log` | session | | `RunLog` JSON (same format as `golden.json`). Used for Results after a live run and for recording the golden run. |
| `POST /runs/{id}/steer` | session, run owner | `SteerRequest` (existing) | `202` |
| `POST /runs/{id}/stop` | session, run owner | | `202` |

Not included on purpose: user accounts, run listing, artifact browsing endpoints (artifacts already travel as `artifact` events and the frontend builds the zip), admin endpoints (use the CLI on the server), any endpoint that runs a tool directly.

Free-text specs: `POST /runs` takes a `presetId` only in the MVP [DECIDED D7: "live runs are presets only"]. A free-text field is a later item that goes through the feasibility path in section 10.

---

## 9. Event / SSE model

### 9.1 Events the backend emits

All are existing `RunEvent` variants [FACT: `../ARCHITECTURE.md` section 5]. No new event types are needed for the MVP.

| When | Event |
|---|---|
| Run starts, ends, errors, hits cap, stops | `run {phase, message}` |
| Each stage changes | `stage {stage, status, detail, round}` |
| Spec loaded | `spec` |
| Plan drafted or revised | `plan {revision, blocks, diff, reason}` |
| Plan gate | `gate {state, autoContinueMs}` |
| Canvas changes | `op {by: "system", op}`: emitted by the orchestrator from state, **not** by the LLM (section 17) |
| Candidate created or changed | `candidate {candidate}` (full upsert) |
| Round starts | `round {round, parents, elites}` |
| Winner chosen | `winner {candidateId, by, aiPickId}` |
| Steering echoed | `human {input}` |
| Short status line | `caption {text}`: template strings from code, not LLM prose |
| Spend changes | `credits {usedUsd, capUsd}` |
| File produced | `artifact {path, content}` for small text files (RTL, plan, reports, circuit JSON). Cap 64 KB per event; larger files are summarized |

### 9.2 Liveness on the wire

- Every SSE message carries `id: <seq>`. On reconnect the server replays from the events table after `Last-Event-ID` [FACT: the frontend dedupes by `seq`].
- `: ping` comment lines every 15 s. `EventSource` ignores comments, so this needs no frontend change, and it keeps proxies from closing idle streams.
- A run never stays "running" silently: the watchdog (section 18.3) turns a stalled run into an `error` event within 90 s.

---

## 10. Plan mode and feasibility

### 10.1 Plan (LLM)

One Planner call returns JSON validated by pydantic (retry once on invalid JSON, then fail the stage):

```json
{
  "summary": "one paragraph",
  "blocks": [ {"id": "...", "name": "...", "reason": "...", "pinOptions": [], "pins": [], "variants": []} ],
  "interfaces": "must equal the task pack port contract; echoed for display",
  "dataWidths": "echoed from the task pack, e.g. INT8 signed inputs, 20-bit accumulators",
  "latencyCycles": 1,
  "verification": "which golden-model checks apply (from the pack)",
  "risks": ["..."],
  "estimatedLines": 120
}
```

`blocks` maps directly onto the frontend's `PlanBlock[]` [FACT]. The plan is stored as an artifact and emitted as the `plan` event, so it is visible and part of the run record.

### 10.2 Feasibility gate (deterministic)

Rules run in code, before any RTL call [REC]:

| Check | Rule (defaults, all configurable) |
|---|---|
| Supported scope | `presetId` is a known task pack. (Free text later: classifier must map it to a supported task family, else reject.) |
| Widths and types | Every port width and signedness in the plan equals the task pack contract. Allowed element types for the showcase: INT4 and INT8 signed/unsigned. |
| Size | `estimatedLines <= maxLines` from the pack (default 300, per MEETING Q4). Plan blocks <= 8. |
| Latency | `latencyCycles` equals the pack's contract (needed for EQY, section 11.5). |
| Verifiable | The pack has a golden model and a testbench. No pack, no run. |
| Toolchain | Plan requests nothing outside the coding rules (section 19): no memories larger than the pack allows, no vendor IP, no analog, no multiple clocks. |

If any check fails, the run ends at the plan stage with the reason shown, and only the Planner tokens were spent. This is a scope filter, not a proof that a design is realizable.

### 10.3 Arbitrary specifications (later, honest limits)

Verity cannot produce a trustworthy golden model for an arbitrary English spec automatically, and this document does not pretend otherwise. The later path is:

```
free text -> Planner -> "reference proposal" (LLM drafts a Python golden model + test vectors)
          -> HUMAN reviews and approves in the UI
          -> pack is frozen, hashed, locked
          -> normal run
```

Without human approval, a run on an LLM-drafted reference must be labeled "reference not independently checked" in the UI and excluded from evals. [OPEN O9: whether to build this at all before submission. Recommendation: no.]

---

## 11. Tool execution model

### 11.1 Toolchain choice

| Job | Tool | License [FACT unless marked] | Why |
|---|---|---|---|
| Lint, contract check | **Verilator** `--lint-only -Wall` | LGPL-3.0 or Artistic-2.0 | Fast, strict, the clearest error messages for repair prompts |
| Simulation | **Icarus Verilog 12** + **cocotb** | GPL-2.0 (iverilog); BSD-3-Clause (cocotb) | Event-driven, full Verilog-2005, 4-state (X/Z) so uninitialized-register bugs show up; cocotb lets the golden model be plain Python. Already the planned pair [DECIDED in MEETING section 5] |
| Synthesis, area, cells | **Yosys** + Nangate45 liberty via `abc -liberty`, `stat -liberty` | ISC (Yosys) | Standard open flow; REvolution used iverilog + Yosys + Nangate45 too |
| Timing (MVP) | **OpenSTA** on the Yosys netlist | GPL-3.0 **[ASSUME: verify]** | Real clock period number in seconds, no place and route |
| Equivalence | **Yosys EQY** (with SBY and a SAT/SMT solver) | ISC **[ASSUME: verify solver licenses]** | Already planned [MEETING section 5] |
| Place and route (later) | OpenROAD / ORFS | BSD-3-Clause | Finalist-only; multi-GB and minutes per run (MEETING P3) |

Why Icarus for simulation and not Verilator: Verilator is faster on big designs but is 2-state and needs C++ compilation per design (tens of seconds); for a design under 300 lines the run time is dominated by startup, and 4-state X propagation catches real bugs the LLM makes. Verilator stays as the linter. Switching cocotb's simulator to Verilator later is a config flag if speed matters. [REC]

All GPL tools run as separate executables inside the tool image. Verity's own code (MIT) does not link them, so the repo license is unaffected; the image build file must reference upstream sources. [REC; legal detail in risk R11]

Playwright is not part of verification. It may be used only to test the web UI.

### 11.2 One image, one script per stage

The sandbox image (`agent/sandbox/Dockerfile`) contains the tools above at pinned versions, the Nangate45 liberty file, and one entrypoint script per stage (`/verity/bin/lint`, `sim`, `synth`, `sta`, `eqy`, `netlist_json`). The image digest is recorded on every run.

### 11.3 Tool functions (the only things the orchestrator can call)

```python
class ToolRunner(Protocol):
    async def lint(self, rtl: Rtl, pack: TaskPack) -> LintResult
    async def simulate(self, rtl: Rtl, pack: TaskPack) -> Verification
    async def synthesize(self, rtl: Rtl, pack: TaskPack) -> SynthResult     # area, cells, netlist
    async def timing(self, netlist: Artifact, pack: TaskPack) -> TimingResult
    async def check_equivalence(self, a: Rtl, b: Rtl, pack: TaskPack) -> Equivalence
    async def circuit_json(self, rtl: Rtl, pack: TaskPack) -> CircuitGraph   # section 16
```

`Rtl` is a validated value object (section 12.3), never a path. Each function builds its command from a fixed template with no string interpolation of model output: the RTL is written to `/work/dut.v` as a file, and the command line is constant.

To pay sandbox start-up once per candidate, `lint` + `simulate` run in a single sandbox call with early exit (`/verity/bin/verify` runs contract check, lint, then sim). `synthesize` + `timing` + `circuit_json` likewise share one call. [REC: latency, section 19]

### 11.4 PPA measured in the MVP

| Metric | Source | Label in UI |
|---|---|---|
| Area (um2) and cell count | Yosys `stat -liberty` on Nangate45 | "Yosys, Nangate45, post-synthesis" |
| Clock period (ns) | OpenSTA, post-synthesis, no wires | "post-synthesis timing estimate" |
| Power (mW) | `null` in the MVP | "not measured" |

Power from OpenSTA with default switching activity is a guess, not a measurement, so it is left `null` until a SAIF from simulation is wired in (later). The fitness formula already drops missing metrics and renormalizes [FACT: `../ARCHITECTURE.md` 8.3]. All gains are relative to our own v1 [DECIDED, MEETING P7].

### 11.5 Equivalence

- EQY compares the winner against v1 (both passed the same locked tests).
- EQY proves combinational and same-latency sequential designs well; it often cannot prove designs whose pipeline depth differs. **Rule [REC]:** the task pack fixes the cycle latency of the interface, and optimizer candidates must keep it (checked by simulation timing in the testbench). This keeps EQY useful.
- `inconclusive` or timeout is reported honestly as "tested, not proven". It is never shown as proven.

### 11.6 Execution backends

| Backend | Use | Isolation |
|---|---|---|
| `NebiusSandboxRunner` | Production and the recorded golden run | Nebius Token Factory Sandboxes (ConTree): microVM per execution, OCI images imported from a registry, per-run timeout, disposable filesystem mode [FACT: docs.tokenfactory.nebius.com/sandboxes]. No inbound network [FACT]; outbound network and CPU/RAM limits are not documented **[ASSUME: test day 1]** |
| `LocalDockerRunner` | Development, CI, evals at $0 | `docker run --rm --network none --read-only --tmpfs /work --memory 2g --cpus 2 --pids-limit 256 --user 1000:1000 --cap-drop ALL --security-opt no-new-privileges` |
| `NebiusJobRunner` (fallback) | If Sandboxes cannot run the image | Nebius AI Cloud Serverless Job [MEETING P3] |

Same image, same scripts, same parsers for all three. The backend is a config value.

---

## 12. Sandbox and security model

### 12.1 Authentication: single login

[REC] One shared access code per audience (team, judges), set in server env, never in the repo or frontend. Judges get theirs in the Devpost "testing instructions".

```
POST /auth/session {accessCode}
  -> constant-time compare against hashed codes in env
  -> token = HMAC-signed {sid, role, exp: now + 12 h}   (itsdangerous or PyJWT)
REST: Authorization: Bearer <token>   (web keeps it in sessionStorage)
SSE:  ?st=<stream token>  signed {runId, sid, exp: now + 30 min}, read-only, one run
```

Why not cookies: the web app is a static export on its own host [DECIDED D10] and the API is on another, so a session cookie would be a third-party cookie that browsers increasingly block. If both end up on subdomains of one domain, switch to an `HttpOnly; Secure; SameSite=Lax` cookie and drop the stream token.

Why not OAuth: an extra provider app and redirect flow for a two-week build, and it adds friction for judges. Replay stays fully public and needs no login [DECIDED D7].

**Frontend impact:** the Try page needs a code prompt, and `live.ts` must append `?st=` to the stream URL. Listed in section 23.

### 12.2 Authorization and limits

- A session can only read, steer or stop runs it created (`runs.session_id`).
- All limits are config (`agent/config.toml` + env overrides). Defaults [REC]:

| Limit | Default |
|---|---|
| `POST /auth/session` per IP | 10 / 10 min |
| API requests per session | 60 / min |
| New runs per session | 3 / hour |
| Concurrent runs per session | 1 |
| Concurrent runs global | 2 (also bounded by Sandboxes' 50 simultaneous operations [FACT]) |
| Global estimated spend per day | $5, then `/health` returns `liveEnabled: false, reason: budget_exhausted` |
| Per-run cap | $0.50 [matches the planner's assumption in REPORT 2026-10-04] |

Rate limiting is an in-process token bucket keyed by session id and IP. That is correct only because there is one process; daily spend is persisted in SQLite so a restart does not reset it.

### 12.3 What the model can and cannot do

The LLM is given **no tools at all**. It receives a prompt and returns text. The orchestrator extracts one fenced Verilog block (or a JSON plan), validates it, and decides what to run. This is stronger than a tool allowlist: there is no tool interface to abuse.

Validation of every RTL response before it reaches a sandbox (`Rtl` value object):

| Check | Rule |
|---|---|
| Size | <= 20 KB and <= `maxLines` |
| Encoding | ASCII only |
| Structure | Exactly the top module named in the pack, with the pack's ports; other modules allowed only if declared in the same file |
| Banned tokens | Any `$` system task or function other than `$signed`, `$unsigned`, `$clog2`; `` `include ``; `` `define `` with paths; `initial` blocks; `force`/`release`; `$readmem*`, `$fopen`, `$system`, `$dump*`; DPI; `bind` |
| Interface | Port names, directions, widths, signedness equal the pack (parsed by Yosys `read_verilog; write_json` in the verify call, rejected before sim) |

The banned list matters because Verilog can do file I/O at simulation time; banning system tasks means a generated design cannot read the golden data or overwrite test files even inside the sandbox.

### 12.4 Isolation summary

| Threat | Control |
|---|---|
| LLM runs arbitrary commands | No tools exposed to the model. Fixed command templates. RTL passed as a file, never as an argument. |
| Generated RTL escapes the simulator | Banned system tasks (12.3); disposable sandbox per call; non-root; no secrets in the sandbox environment; local backend has no network |
| Agent edits tests or golden model | Task pack is outside the agent's write path, hashed at lock, copied fresh per call (section 13) |
| Path traversal | Artifact paths are generated server-side from ids (`runs/<uuid>/candidates/c3/attempt-2.v`); no user or model input becomes a path; artifact reads resolve and check the prefix |
| Huge outputs | `max_output_tokens` per call; RTL size cap; sandbox output truncated at 64 KB [FACT: ConTree default truncation 65,536 bytes]; event payload cap 64 KB |
| Runaway execution | Per-tool timeouts (lint 20 s, sim 60 s, synth 120 s, sta 60 s, eqy 180 s, all config); per-run wall clock 15 min |
| Secret leakage | `NEBIUS_API_KEY`, sandbox token and access-code hashes only in server env; `.env` gitignored; `.env.example` has names only; nothing secret in `NEXT_PUBLIC_*` [DECIDED, CLAUDE.md]; logs redact `Authorization` headers |
| Prompt injection via spec text | MVP specs are presets, so no user text reaches the model. Steering inputs are enums (pin and variant ids), not free text |
| Cost abuse | Section 12.2 limits + per-run budget ledger (section 20) |

---

## 13. Golden / reference model isolation

A **task pack** is the locked reference for one supported design. Structure [REC]:

```
agent/tasks/<task_id>/
  task.toml          # title, spec text, port contract (name, dir, width, signed),
                     # element type (e.g. INT8 signed), latency cycles, maxLines,
                     # clock/reset names, allowed priorities, budgets override
  golden.py          # Python reference model (pure function of inputs)
  test_dut.py        # cocotb testbench: directed + seeded random vectors, compares to golden.py
  vectors/           # optional fixed vectors
  reference.v        # optional human-written RTL, used ONLY by evals and to validate the pack
  MANIFEST.sha256    # hash of every file above
```

What is locked and how:

| Locked item | Enforcement |
|---|---|
| Golden model, testbench, vectors, port contract, latency, widths | Lives in the repo, read-only to the backend process user. Hashed at run start; mismatch with `MANIFEST.sha256` aborts the run. Hash recorded on the Run. |
| What the LLM sees | Only the spec text, the port contract and coding rules. Never `golden.py`, `test_dut.py` or `reference.v`. Repair prompts get failing cases as data (inputs, expected, got), at most 5. |
| What the sandbox gets | A fresh copy of the pack plus `dut.v` for each call. The sandbox output is parsed for results; nothing from the sandbox is written back into the pack. |
| Pass criteria | Defined in `test_dut.py` (all vectors must match). The orchestrator reads a result JSON written by the testbench, then cross-checks the vector count against `task.toml` so a truncated test run cannot count as a pass. |
| Bit widths | Fixed in `task.toml`. The interface check rejects an INT4 to INT8 change before simulation, and the feasibility gate rejects a plan that proposes one. A repair cannot "fix" a failure by widening a port. |

Before a pack is used, it must pass its own self-test: `reference.v` passes `test_dut.py`, and one deliberately broken copy fails it. This is a CI check (`evals/packs`).

**Golden model vs golden dataset:** Verity does not need a large dataset. It needs one trusted reference per supported task, and a handful of tasks (section 14). That is achievable by hand.

**Golden run vs golden model:** the "golden run" (`golden.json`) is a recorded event log for replay. It is unrelated to the golden model. The UI copy should keep them apart.

---

## 14. Evals

### 14.1 Purpose

Answer "did Verity actually work and improve the design?" with numbers, per version of the code, prompts and models.

### 14.2 Task set (small, curated) [REC]

| Task id | Kind | Why |
|---|---|---|
| `add8` | combinational, INT8 adder with carry | Smoke test, near-certain pass |
| `cnt8` | sequential counter with enable and reset | Reset and clock handling |
| `fsm_seq` | sequence detector FSM | Control logic, a common LLM failure |
| `mac4_int8` | 4-lane INT8 MAC (matches current sample data) | Showcase candidate A |
| `mm4_int8` | 4x4 INT8 matrix multiply | Showcase candidate B [OPEN O1] |
| `mm4_int4` | 4x4 INT4 matrix multiply | Width-lock test against `mm4_int8` |

Six packs, each with `reference.v`. More only if time remains.

### 14.3 Suites

```
agent/evals/
  packs/          self-test of every task pack (reference passes, mutant fails)   $0
  functional/     spec -> first RTL -> pass@1 (no repair)                         LLM
  repair/         known-good reference with injected bugs (wrong width, off-by-one,
                  missing reset, swapped operands) -> repair within N attempts    LLM
  optimization/   full run -> best fitness vs v1, area and timing gains           LLM
  regression/     winner vs v1: EQY status + re-run locked tests                  $0 after run
  performance/    calls, tokens, est. $, wall time, time per stage                from run records
  isolation/      pack hash unchanged after every run; banned-construct RTL
                  is rejected before sim                                          $0
```

Run with a CLI: `python -m verity.evals --suite functional --tasks all --provider fake|nebius --repeats 3`. `--provider fake` replays recorded LLM responses (cassettes) for $0 pipeline checks; `--provider nebius` spends credits and is budgeted like any run.

### 14.4 Metrics (one JSON line per task per repeat)

```
eval_run_id, git_sha, task_id, suite, provider, model_ids, prompt_versions,
tool_image_digest, candidate_count, llm_calls, input_tokens, output_tokens, est_usd,
runtime_s, stage_times, initial_pass, final_pass, repairs_used, repair_success,
baseline_area_um2, final_area_um2, baseline_clock_ns, final_clock_ns,
fitness_best, improved (bool), equivalence, pack_hash_ok
```

Aggregates in `evals/report.md` (generated): pass@1, pass after repair, repair success rate, median area and timing gain vs v1, share of runs that improved, share proven equivalent, median cost and runtime. Comparisons are across `git_sha` and `prompt_versions`.

Honesty rules: report gains only relative to our own v1; never compare to REvolution's numbers; say how many repeats each figure comes from.

---

## 15. Version tracking

Lightweight and immutable, not a Git replacement.

```
Run r_<uuid>
 |-- plan rev 1 (artifact)  -- rev 2 after steering (artifact, diff vs rev 1)
 |-- c1 (INIT, round 0, parent null)
 |     |-- attempt 1 (INIT)  rtl sha, verification
 |     |-- attempt 2 (FIX)   rtl sha, verification, reason
 |     '-- PPA, fitness 0  -> baseline v1
 |-- c2 (SIMPLIFY, round 1, parent c1) ...
 |-- c3 (OPTIMIZE, round 1, parent c1) ...
 '-- c4 (EXPLORE, round 1, parent c1) ...
```

Recorded per attempt: parent, strategy, timestamp, verification, PPA, model id, prompt version (hash of the template file), tool image digest. Recorded per run: task pack hash, git sha, budget, models.

The UI's `v1 -> v2 -> v3` lineage is `parentId` plus the attempts list; both are already in the `Candidate` contract [FACT]. Diffs are computed in the browser (the web app already ships `diff`) [FACT: `web/package.json`].

Artifact layout on disk (all write-once):

```
data/
  verity.db
  blobs/<sha256[0:2]>/<sha256>            # content-addressed store
  runs/<run_id>/
    spec.md  plan.r1.json  plan.r2.json
    candidates/c1/attempt-1.v  attempt-1.verify.json  attempt-1.llm.json
                  ppa.json  synth.log  sta.log  netlist.json  circuit.json
    candidates/c2/...
    final/winner.v  eqy.log  summary.json
    runlog.json                           # RunLog, replayable
```

Files under `runs/` are hard links or copies of blobs; a write to an existing path fails.

---

## 16. Circuit builder / viewer backend requirements

[REC] The backend produces a simplified, size-bounded graph per measured candidate, from Yosys (`read_verilog; hierarchy -top; proc; opt; write_json`) run in the same sandbox call as synthesis, before technology mapping so cells are still readable (`$add`, `$mul`, `$mux`, `$dff`, ...).

```ts
interface CircuitGraph {
  format: "verity.circuit/1";
  candidateId: string;
  top: string;
  modules: { name: string; instanceOf?: string }[];
  ports: { name: string; dir: "in" | "out"; width: number; signed: boolean }[];
  nodes: { id: string; kind: "port" | "reg" | "add" | "mul" | "mux" | "cmp" | "logic" | "submodule";
           label: string; width: number; module: string }[];
  edges: { source: string; target: string; width: number }[];
  truncated: boolean;          // true if over the node budget
  stats: { regs: number; adders: number; multipliers: number; muxes: number };
}
```

Rules: at most 60 nodes (group repeated lanes into one node with a count, else set `truncated`); widths always shown; no layout coordinates (the frontend lays it out). Delivered as an `artifact` event with path `circuit/<candidateId>.json`, so no new event type is required. The frontend viewer itself is a separate, later UI task.

---

## 17. Multi-agent design

Roles are Python modules in one process, each with a prompt template file, an output schema and a model route. They do not talk to each other; the orchestrator passes data between them.

```
agent/verity/roles/
  planner.py      prompts/planner.v1.md      -> PlanOut (pydantic)
  rtl_gen.py      prompts/rtl_gen.v1.md      -> RtlOut {rtl, reason}
  repair.py       prompts/repair.v1.md       -> RtlOut
  optimizer.py    prompts/optimize.v1.md     -> RtlOut   (strategy in the prompt)
```

Model routing is config [REC, to be confirmed by evals]:

| Role | Default model | Reason |
|---|---|---|
| Planner | Nemotron 3 Ultra | One call, highest leverage |
| RTL Generator | Nemotron 3 Ultra | Correctness of v1 drives everything after |
| Repair | Nemotron 3 Ultra | Debugging is hard; a cheap model that fails costs more calls |
| Optimizer | Nemotron 3 Super | 3 to 5 calls per run; a failing child is cheap to discard |

Canvas ops are emitted by the orchestrator from state (plan blocks become nodes, candidates become tree nodes), not by the LLM. This removes the open risk of Nemotron tool-call reliability for the canvas (`../ARCHITECTURE.md` section 14) and is compatible with section 10 there ("the agent is the only writer of canvas ops").

Future separation: because roles only exchange pydantic objects through the orchestrator, any role can move behind a queue or a separate service later without changing the others. Not needed now.

---

## 18. Celery / Redis decision

**Recommendation: defer both. Do not use them in the MVP.** [REC]

| Requirement | Does it need Celery + Redis here? |
|---|---|
| Long-running jobs (minutes) | No. The run is an asyncio task; the work is I/O waits on Nebius APIs, not CPU in our process. |
| Not blocking the API | No. The API stays responsive because all tool and LLM calls are async network calls. The only local CPU work (parsing small logs) is milliseconds. In local Docker mode, tools run as subprocesses via `asyncio.create_subprocess_exec`. |
| Concurrent runs | No. The global cap is 2 concurrent runs (credits, Sandboxes limits). An `asyncio.Semaphore` does it. |
| Queueing | No. With a cap of 2 we reject with 429 "busy" rather than queue; the replay is always available. |
| Retries | Done per call: LLM calls retry on 429/5xx with backoff (max 2); sandbox calls retry once on infrastructure errors (never on a test failure). |
| Worker recovery | Partly. A crash loses in-flight runs either way; Celery would re-run a task from the start and spend credits again, which we do not want. On startup, any `running` run is marked `error: server restarted`. |
| Heartbeats | No. A column in SQLite plus a watchdog task (18.3). |

**When to add them (scale-up option):** if live runs must survive deploys, if more than one API process is needed, or if CPU-heavy tools (OpenROAD) run on the same host instead of in Sandboxes. Then: Redis as broker and pub/sub for events, Celery workers for the `eda` queue only, the API process unchanged. The orchestrator code does not change because it already talks to `ToolRunner` and the event store through interfaces.

### 18.1 MVP option (chosen)

FastAPI + asyncio task per run + SQLite + watchdog. One process (`uvicorn --workers 1`).

### 18.2 Scale-up option (deferred)

FastAPI + Celery worker class for EDA jobs + Redis (broker, rate-limit counters, event fan-out).

### 18.3 Heartbeats, timeouts, cancel

| Mechanism | Behavior |
|---|---|
| Heartbeat | `runs.heartbeat_at` updated at every step and every 10 s while a call is in flight |
| Watchdog | Every 30 s: a `running` run with `heartbeat_at` older than 90 s, or older than `max_wall_s` (900 s), is cancelled and marked `timed_out`; emits `run {phase: "error", message}` |
| Per-call timeouts | LLM: 120 s (Ultra), 60 s (Super). Tools: section 12.4 |
| Cancel | `POST /stop` sets a flag and cancels the asyncio task; in-flight LLM requests are dropped; sandbox runs end at their timeout or are cancelled via the API if supported **[ASSUME]**; emits `run {phase: "stopped"}` |
| Restart | On startup, all `queued` or `running` runs become `error: server restarted` |
| Last activity | `heartbeat_at` and the last event's `tMs` are in `/runs/{id}/log` |

The frontend's existing reconnect logic (3 failed reconnects in 30 s shows "Lost connection") plus these server rules means the UI never shows "Running" forever.

---

## 19. Latency strategy

Where time goes in one full run (est., to be measured in milestone M1):

| Source | Est. per call | Calls per full run | Control |
|---|---|---|---|
| LLM: plan | 10 to 30 s | 1 | Bounded output (1.5k tokens) |
| LLM: RTL gen / repair | 15 to 60 s | 1 + 0 to 3 | Bounded output (4k tokens); repair prompt carries 5 failing cases, not waveforms |
| LLM: optimizer children | 15 to 60 s | 3 (+2) | Generated **in parallel** |
| Sandbox start | 2 to 5 s [FACT: ConTree microVM startup] | 2 per candidate | Batch lint+sim in one call, synth+sta+circuit in one call |
| Lint + sim | 2 to 15 s | per attempt | Small designs, early exit on lint fail |
| Synth + STA | 5 to 60 s | per passing candidate | Only for passing candidates; children evaluated in parallel |
| EQY | 10 to 180 s | 1 to 2 | Only on the winner, with a timeout |

Rules that keep latency down:
- Python decides every branch; the LLM is never asked "what next".
- No PPA for failing candidates; no children from a failing baseline.
- Optional round 2 only if round 1 improved and budget remains.
- OpenROAD and EQY only on finalists (OpenROAD not at all in the MVP).
- Prompts are small and templated: spec, contract, coding rules, and for repair only the RTL plus failing cases.
- Est. full run: 4 to 10 minutes. Fast path: 1 to 3 minutes. The replay plays in under a minute regardless.

---

## 20. Token and cost strategy

Prices [FACT: Nebius model catalog, 2026-10-05]: Nemotron 3 Ultra (`nvidia/Nemotron-3-Ultra-550b-a55b`) $1 / 1M input, $3 / 1M output; Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b`) $0.30 / $0.90. Base URL `https://api.tokenfactory.nebius.com/v1`, OpenAI-compatible [FACT].

Budget config per run (defaults [REC]):

```toml
[budget.run]
max_llm_calls            = 16
max_input_tokens         = 150_000
max_output_tokens        = 200_000    # includes any reasoning tokens the API reports
max_usd                  = 0.50
max_candidates           = 6          # v1 + 3 (round 1) + 2 (round 2)
max_repairs_baseline     = 3
max_repairs_child        = 1
max_rounds               = 2
max_wall_s               = 900

[budget.call]
plan_max_output          = 6_000
rtl_max_output           = 12_000
max_prompt_tokens        = 12_000
```

Est. full run cost: about 12 calls, about 80k input and 35k output tokens. Mostly Ultra, that is roughly $0.08 + $0.11 = $0.19 (est.), under the $0.50 cap. Reasoning-mode output can multiply output tokens **[ASSUME: check whether Nemotron on Nebius reports and lets us limit reasoning tokens]**.

How the ledger works:
- Before each call: `ledger.reserve(model, max_input, max_output)` fails if the worst case would cross any limit. The role then does not call; the orchestrator moves to wrap-up (`cap_reached`).
- After each call: `ledger.commit(usage)` from the API's `usage` field; the `credits` event is emitted.
- Estimated dollars use a price table in config, not a live price API.

Other controls: cached LLM responses keyed by (prompt hash, model, params) in dev and evals; the fake provider for all pipeline work; the replay for judges ($0) [DECIDED D7]; live runs on presets only [DECIDED D7].

---

## 21. LLM integration (the Nebius boundary)

```python
class LLMProvider(Protocol):
    async def complete(self, req: LLMRequest) -> LLMResponse

@dataclass
class LLMRequest:
    role: str                 # planner | rtl_gen | repair | optimizer
    model: str                # resolved from the role route
    system: str; user: str
    max_output_tokens: int
    temperature: float
    response_format: Literal["text", "json"]

@dataclass
class LLMResponse:
    text: str
    input_tokens: int; output_tokens: int
    model: str; request_id: str; latency_ms: int
```

Implementations:

| Provider | Use |
|---|---|
| `NebiusProvider` | `openai.AsyncOpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY)`. The only place the Nebius URL and key are read. |
| `FakeProvider` | Returns canned RTL per task and role, or replays recorded cassettes. Zero calls. |
| `OpenAICompatProvider` | Same class as Nebius with a different base URL: build.nvidia.com free tier or local Ollama for development [DECIDED, MEETING section 7] |

Env names follow MEETING section 7: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_ULTRA`, `LLM_MODEL_SUPER` (the brief's single `LLM_MODEL` becomes one per route).

**Submission guard [REC]:** with `VERITY_ENV=production`, the app refuses to start unless the provider is `nebius` and the base URL host is `api.tokenfactory.nebius.com`. `/health` reports the provider and model ids, every run stores the model id and request id of each call, and the recorded golden run's `meta.note` names the models. This prevents the submitted demo from silently running on a fake or non-Nebius model and gives judges evidence of the runtime call the rules require [FACT: rules, "makes a runtime call to the Token Factory inference API"].

Structured output: the Planner asks for JSON and validates with pydantic; whether Nebius enforces a JSON schema for Nemotron is unconfirmed **[ASSUME]**, so the parser tolerates fenced JSON and retries once.

---

## 22. MVP vs later

| Capability | MVP | Later |
|---|---|---|
| Single login | Shared access code, signed bearer token, stream token for SSE | Per-user accounts or OAuth if the app outlives the hackathon |
| Rate limiting | In-process token buckets per session and IP; global concurrency 2; daily $ cap in SQLite | Redis counters if more than one process |
| Token limits | Per-run ledger with every limit in section 20; per-call output caps | Per-user monthly quotas |
| Evals | 6 task packs; packs, functional, repair, optimization, regression, performance, isolation suites; JSONL + generated report | More packs, CVDP-style harder tasks, CI on every prompt change |
| Version tracking | Immutable artifacts, attempts and lineage in SQLite, prompt and model versions per attempt | Cross-run comparison UI |
| Circuit viewer | Backend emits `CircuitGraph` JSON artifact | Frontend viewer, post-mapping netlist view |
| Multi-agent roles | 4 LLM roles as modules + deterministic verifier, judge, prover | Separate processes only if needed |
| Celery | No | Only for an EDA worker class (section 18.2) |
| Redis | No | With Celery, or for multi-process rate limits |
| Heartbeats | SQLite heartbeat + watchdog + SSE pings + restart recovery | Leases across workers |
| Feasibility checker | Deterministic rules on presets + planner output | Free-text classifier + human-approved reference proposal |
| INT4/INT8 | As task-pack constraints (showcase), locked by contract check | More types (FP8, bfloat16) as new packs |
| Candidate search | v1 + 3 children, optional round 2 with 2 children, elites = best 2 | Adaptive strategy choice (bandit), larger populations if credits allow |
| Optimization | SIMPLIFY, OPTIMIZE, EXPLORE; area + post-synth timing | Power via SAIF, OpenROAD on finalists, REFACTOR and FUSION strategies |
| Equivalence | EQY winner vs v1, honest `inconclusive` | Latency-changing designs with sequential equivalence or a stronger testbench |

---

## 23. Open decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| O1 | Showcase chip | 4-lane INT8 MAC (current sample data) or INT8 4x4 matmul (this brief) | Build both packs; pick the one whose full run passes reliably by the 2026-10-18 gate. Matmul is the better story; MAC is the safer run. |
| O2 | Where the API runs | Nebius AI Cloud VM, or a free host (Render, Fly) with Nebius for inference and Sandboxes | Any host with a persistent disk for SQLite. Nebius compute is a stronger story but not required by the rules [FACT]. Already open as "Hosting" in REPORT. |
| O3 | Sandbox backend for the submission | Nebius Sandboxes or Serverless Job | Sandboxes if the day-1 spike passes (image imports, tools run inside time limits) |
| O4 | Login mechanism | Access code + bearer (recommended), same-site cookie, OAuth | Access code + bearer unless both apps share a domain |
| O5 | Frontend contract additions | Stream token in `live.ts`; login prompt on Try; optional `CircuitGraph` viewer; whether to add `timed_out` to `RunPhase` | Do the first two now; keep `timed_out` mapped to `error` |
| O6 | `timed_out` in the UI | New phase or `error` with message | `error` with message (no contract change) |
| O7 | Fixed latency for optimizer children | Fixed by pack (EQY-friendly) or free (more optimization room) | Fixed for the MVP |
| O8 | Power metric | `null`, or OpenSTA default-activity estimate labeled as estimate | `null` until SAIF is wired |
| O9 | Free-text specs before submission | Build reference-proposal flow, or presets only | Presets only [DECIDED D7]; reopen only after the 2026-10-25 freeze passes |
| O10 | Run budget numbers | Section 20 defaults | Confirm after M2 measurements |
| O11 | Reuse of REvolution code | Study only, or vendor parts (MIT, needs credit) | Study only; our loop is small enough to write, which keeps "new work" clear |
| O12 | Steering scope | Plan gate only, or during evolution | Plan gate only for the MVP (pins and toggles before RTL) |

---

## 24. Risks

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | **Latency**: a full run takes too long to watch live | Medium / Medium | Parallel children, batched sandbox calls, fast path, replay for judges, video shows the recorded run |
| R2 | **Nebius credits** run out ($25 + $25 per person [FACT: REPORT]) | Medium / High | Fake provider and free tiers in dev; ledger caps; daily cap; replay is $0; reserve half the credits for final tuning [MEETING section 7] |
| R3 | **Simulator availability** in Nebius Sandboxes (image import, size, timeouts, CPU) | Medium / High | Day-1 spike (M0); local Docker for dev; Serverless Job fallback; Yosys-only area loop as last resort [MEETING P3] |
| R4 | **Sandbox limitations**: outbound network and resource limits undocumented | Medium / Medium | No secrets in the sandbox; banned system tasks; fixed scripts; test outbound access on day 1 and record the result |
| R5 | **Model hallucination** (invented ports, wrong widths, non-synthesizable code) | High / Medium | Contract check before sim; lint; bounded repairs; deterministic decisions |
| R6 | **Invalid RTL** that passes sim but fails synthesis | Medium / Medium | Synthesis runs on every passing candidate; synth failure = rejected; REvolution reported this case too [FACT: REPORT 2026-10-01] |
| R7 | **Testbench manipulation** | Low (by design) / High | Model never sees or writes tests; pack hashing; fresh copy per call; banned file I/O; isolation eval |
| R8 | **Insufficient verification** (tests pass, design wrong) | Medium / High | Directed + seeded random vectors per pack; reference self-test with mutants; EQY on the winner; say "tested" not "proven" when EQY is inconclusive |
| R9 | **PPA measurement limits** (post-synth timing without wires, no power) | Certain / Medium | Label every number with tool and stage; gains only vs our own v1 [MEETING P7]; power `null` |
| R10 | **Concurrent runs** exhaust credits or Sandboxes limits | Medium / Medium | Global cap 2, per-session cap 1, 429 "busy", replay always available |
| R11 | **Third-party licenses** (GPL tools, Nangate45 terms, solvers, REvolution MIT) | Low / Medium | Tools run as separate programs in an image; list each tool and license in README; verify Nangate45 redistribution terms before putting the liberty file in the repo (download at image build instead); credit REvolution |
| R12 | **OpenROAD complexity** (multi-GB, minutes per run) | High if used / Medium | Not in the MVP; OpenSTA post-synthesis instead |
| R13 | **Arbitrary-spec feasibility** | Certain / High if promised | Presets only; feasibility gate; honest "not supported" message; no automatic golden models |
| R14 | **EQY cannot prove** optimized designs | Medium / Low | Fixed latency rule; honest `inconclusive` label |
| R15 | **Nemotron output format** (JSON, fenced code) unreliable | Medium / Medium | Tolerant parser, one retry, schema validation, evals catch regressions |
| R16 | **Process restart** loses live runs | Low / Low | Restart recovery marks them failed; artifacts already written stay; replay unaffected |

---

## 25. Implementation order

Each milestone ends with something that runs end to end. Dates follow the gates in `../REPORT.md` section 6.

| # | Milestone | Done when |
|---|---|---|
| **M0** (spike, 1 day) | Nebius checks | One real Nemotron call through `NebiusProvider` returns RTL; the tool image runs `iverilog`, `yosys` and `cocotb` inside Nebius Sandboxes and locally; outbound network and limits in the sandbox recorded |
| **M1** (vertical slice) | spec -> FastAPI -> orchestrator -> Nebius/Nemotron -> tiny RTL -> simulator -> result -> frontend | `add8` pack; `POST /runs` starts a run; plan + RTL from Nemotron; contract check + lint + sim in the sandbox; events stream over SSE; the existing Studio page shows the run live with pass/fail. No login, no budget yet (local only). |
| **M2** | Repair + budgets + auth | FIX loop with failing cases; budget ledger and caps; access-code login and stream token; rate limits; watchdog and heartbeats; `fsm_seq` and `mac4_int8` packs. Gate 2026-10-11: 3 specs to passing RTL unaided. |
| **M3** | PPA + candidates | Yosys + OpenSTA, fitness, round 1 with 3 children, elites, `CircuitGraph`. Gate 2026-10-18: measurable gain vs v1 on the showcase pack. |
| **M4** | Evals + equivalence | EQY on the winner; evals CLI with the six suites; first `evals/report.md` |
| **M5** | Ship | Production guard on, hosted API, record the golden run from a real Nebius run into `web/public/runs/golden.json`, README with tool licenses and REvolution credit. Gate 2026-10-25: feature freeze. |

Proposed `agent/` layout:

```
agent/
  ARCHITECTURE.md        # this file
  pyproject.toml
  .env.example           # names only
  config.toml            # budgets, limits, routes, timeouts
  verity/
    api/                 # FastAPI app, auth, rate limits, SSE
    runs/                # run manager, watchdog, ledger
    orchestrator/        # state machine, judge (fitness, elites)
    roles/               # planner, rtl_gen, repair, optimizer + prompts/
    llm/                 # LLMProvider, nebius, fake
    tools/               # ToolRunner, nebius_sandbox, local_docker, parsers
    contracts/           # pydantic mirror of web/src/lib/contracts/types.ts
    store/               # sqlite, artifacts
  sandbox/Dockerfile     # tool image + /verity/bin scripts
  tasks/<task_id>/       # locked task packs
  evals/                 # suites, cassettes, report generator
  tests/
```

Contract safety: a backend test writes a RunLog from a fake-provider run and validates it with the web's zod schema (`node web/scripts/validate-fixture.ts`, which today reads `golden.json` only and needs a path argument). That one check keeps the two languages in sync.

---

## 26. REvolution: what Verity takes and what it does not

> Verity adapts the evolutionary-search principle from REvolution to a small-budget hackathon environment.

| Taken (principles) | Not taken |
|---|---|
| Several candidates instead of one refined design | Population 10, 10 offspring per generation, 20 generations, about 200 evaluations per problem |
| FAIL pool gets repair, PASS pool gets PPA optimization | Their benchmark suite, model, PPA setup and timing constraints |
| Candidate records lineage, strategy and feedback | UCB / softmax operator bandit (later, if ever) |
| Fitness from measured PPA relative to a baseline | Any of their reported numbers (pass rates, the 95.5% VerilogEval result, PPA gains) |
| Elites retained across rounds | Fusion operator (needs two passing parents and more budget) |

Source: Min, Cho, Jang, Kang, "REvolution", ASP-DAC 2026, arXiv 2510.21407; code at github.com/kmcho2019/REvolution (MIT) [FACT: REPORT 2026-10-01]. No REvolution number appears in the Verity UI or README as a Verity result.

---

## 27. Facts, decisions, recommendations, assumptions (summary)

**Facts checked 2026-10-05**
- Rules: the project must make a runtime call to the Token Factory inference API or run on Nebius AI Cloud compute; use at least one NVIDIA open model; give a working demo URL; public repo with an open-source license (Apache 2.0, MIT, MPL 2.0 named); video under 3 minutes; third-party tools used per their licenses; submission closes 2026-10-30 10:00 PT. Track text: "agents that write, run, and test code in Token Factory." (nebiusglobalaihackathon.devpost.com/rules)
- Nebius model ids and prices in section 20 (tokenfactory.nebius.com/model-catalog.md). Base URL `https://api.tokenfactory.nebius.com/v1`, OpenAI-compatible.
- Nebius Sandboxes: microVM isolation, OCI image import, 2 to 5 s start, default run timeout 120 s, output truncated at 65,536 bytes, disposable mode, no inbound network, beta limit of 50 simultaneous operations (docs.tokenfactory.nebius.com/sandboxes).
- The frontend's event contract, fitness formula and reconnect behavior (this repo).

**Already decided:** D1 to D10 in `../REPORT.md`, especially D7 (presets only, replay first, capped live runs) and D8 (REvolution-lite).

**Recommendations:** everything tagged [REC], chiefly: one process, no Celery/Redis; deterministic orchestrator with no LLM tools; task packs as the locked reference; Icarus + cocotb for sim with Verilator as linter; OpenSTA instead of OpenROAD in the MVP; access-code login with stream tokens.

**Assumptions to verify (M0 unless noted):**
1. The tool image imports and runs in Nebius Sandboxes within its limits.
2. Sandbox outbound network behavior and CPU/RAM limits.
3. Whether a running sandbox execution can be cancelled through the API.
4. Nemotron on Nebius: JSON reliability, and how reasoning tokens are reported and limited.
5. OpenSTA, EQY solver, and Nangate45 license terms (M5, before the README).
6. Estimated latencies and costs in sections 19 and 20 (M2 measurements).

**Conflicts with existing docs (flagged, not silently reconciled):**
- `../ARCHITECTURE.md` section 10 proposes no authentication; this document adds a login for the live path only. Replay remains public as D7 requires.
- `../MEETING.md` section 5 says the agent "reads errors + waveform" to fix; this document sends failing cases (expected vs got) instead of waveforms to save tokens. Waveform input is a later option.
- `../MEETING.md` section 8 sizes the population as "4 x 4 x 5 rounds"; D8 (2 to 4 per round) supersedes it, and this document uses 3 then 2.
- `../MEETING.md` section 7 uses a single `LLM_MODEL`; this document uses one model variable per route.

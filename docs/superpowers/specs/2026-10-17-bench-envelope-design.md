# Verity Bench: capability envelope design

Date: 2026-10-17. Status: draft for user review. Feature freeze 2026-10-25 (8 days), internal submit 2026-10-29.

## 1. Goal

Give judges a live page where they describe a small chip in plain English (or set knobs), watch Verity build, test, fix and shrink it in real time, and see the result proven and compared against a human-written design. The page also tells them plainly what Verity can and cannot build.

Success, in order of importance:

1. The hosted bench works on a judge's first click and stays up until judging ends (hackathon pass/fail rule).
2. A judge goes from a sentence to a finished, tested result without leaving the page, and no run can overspend its cap.
3. Every PASS is checked against a human-written, locked golden model. No AI-written references.
4. The result shows Verity's best version against the human reference design, measured by the same tools.

## 2. What the user decided (2026-10-17)

- Live runs move out of the studio into a separate dashboard, `/bench`. The studio plays saved and recorded runs only.
- Instead of fixed presets, judges work inside a **range** per chip family ("the envelope"). The page states what is out of range (it cannot build a GPU).
- Finished live runs are saved and appear in the studio.
- Add "Beat the human": compare Verity's best against the pack's `reference.v`.
- Bring back a plain-English input, mapped onto the envelope by Nemotron, with a polite refusal for out-of-range asks.
- Trimmed scope: 4 families with knobs, hosting first.

## 3. Decisions this creates (to record in REPORT.md)

- **D13:** amends D7. Live runs are chip families with server-checked knob ranges instead of fixed presets. Plain-English requests are allowed only as input that Nemotron maps onto a family and knobs; the request never becomes a reference. O9 (no LLM-drafted references) stays.
- **D14:** a second comparison, "vs human reference", is allowed next to the vs-v1 figures. It is labelled separately, uses the same tools and settings, and is shown even when Verity loses. All other numbers stay relative to our own v1.
- **D15:** live runs leave `/studio`; `/try` is replaced by `/bench`.

## 4. The envelope

Four families get knobs. ALU, matmul4 and mm4_int4 stay as fixed packs reachable through recorded runs only (matmul is unreliable today, see `backend/evals/gate-2026-10-16.md`).

| Family | Pack today | Knobs (draft range) | Default |
|---|---|---|---|
| Adder | `add8` | width 4 to 32 | 8 |
| Counter | `cnt8` | width 4 to 32 | 8 |
| Sequence detector | `fsm_seq` | pattern of 3 to 8 bits (judge types it), overlap on or off | 1011, on |
| MAC array | `mac4` | lanes 1 to 8, width 4 to 16, cycles 4 to 32 | 4, 8, 16 |

Draft ranges are proposals. The shipped ranges are the ones that pass the probe (section 7). A range that fails shrinks; it never ships unproven.

Out of range, shown on the page as a short list: processors and GPUs, caches and memories, floating point, analog, multi-module systems, anything past the family limits above.

Derived values (accumulator width, test count, latency, max cycles per case, EQY depth) are computed from knobs by a per-family Python function, never typed by hand. Example: MAC accumulator bits = 2 x width + ceil(log2(lanes x cycles)).

## 5. Backend

### 5.1 Parameterized packs

Each of the 4 packs becomes a family template:

- `golden.py` and `test_dut.py` read knobs from `params.json` in the pack directory instead of module constants. Existing constant names stay, filled from params.
- `reference.v` takes Verilog parameters (or is rendered from a small template) so the human design matches the knobs.
- `task.toml` gains a `[params]` table: each knob's type, min, max, default. Port widths, `spec_text`, `coding_rules` and `test_count` are rendered from knobs.
- A new `render_pack(family, params) -> Path` writes a concrete pack into the run directory, writes `params.json`, and creates a fresh `MANIFEST.sha256`. The existing pack lock and re-verify logic (`backend/verity/core/pack.py`) then treats it like any other pack. Default knobs must render byte-identical behaviour to today's pack (checked by existing tests and self-test).
- Isolation unchanged: the LLM never sees `golden.py`, `test_dut.py` or `reference.v` (`pack.py` 253).

### 5.2 API

- `CreateRunRequest` gains optional `params: dict[str, int | bool | str]`. Server validates every knob against the family's `[params]` table and rejects anything else with 422. Missing knobs take defaults. `preset_id` keeps naming the family.
- New `POST /parse` (session-guarded, rate-limited): body is one sentence (max 300 chars). Nemotron returns `{family, params}` or `{out_of_range, closest: {family, params}, reason}` as strict JSON, validated server-side against the same tables. Model output never bypasses validation. Token cap about 400 out, cost under 1 cent. Logged into the session's spend.
- Spend controls (config, defaults until the user's meeting): per-run cap $0.25, 4 runs per judge session, 1 active run per session, global daily cap. Existing limiter and ledger enforce them.

### 5.3 Beat the human

After the run's final version is chosen, the backend synthesizes the rendered `reference.v` with the same Yosys and OpenSTA flow and settings as the candidates, and runs EQY between the winner and the reference. The run log gets a `human_ref` record: area, clock, power estimate (if measured), EQY status, tool versions. It is computed server side after the agent finishes, so the agent never sees the reference.

### 5.4 Saving runs

On terminal status, the backend writes the run log in the existing replay fixture format (`build_run_log`) to a runs store, plus an index entry (id, family, knobs, status, headline numbers, timestamp). New `GET /runs` lists the index; `GET /runs/{id}/log` exists already but becomes readable without ownership for finished runs (read-only, no secrets in logs, redaction already in `api/redact.py`).

## 6. Frontend

### 6.1 `/bench` (replaces `/try`)

Three columns at 1440 wide, stacked at 390:

- **Left, Request:** English box ("Describe a small chip"), the parsed result shown as a family plus knob sliders the judge can adjust, the out-of-range list, PPA priority, access code prompt, Run button (the one amber primary action), cost meter against the cap.
- **Center, Live:** live RTL code of the current version, LOOP and MONITOR modules reused from the studio.
- **Right, Result:** VERSIONS, final result, the "vs human reference" scoreboard, Stop, and "Open in studio" once saved.

States: backend unreachable (show "Live unavailable" plus links to recorded runs), needs code, parsing, out of range (refusal text plus a "Use closest" button), running, finished, failed, cap reached. Copy follows `docs/brand.md`; amber only for pass, proven, the primary action, focus.

### 6.2 Studio split

`StudioView` drops the live branch; any `?run=` id loads a saved log (static file for curated recordings, `GET /runs/{id}/log` for saved live runs). New `/runs` page lists curated recordings plus saved live runs, each opening in the studio. Replay of curated recordings still makes no network call after the fixture.

### 6.3 Needs user OK: `frontend/src/lib/`

HANDOFF marks `lib/` as off limits. This design needs small changes there: `params` on `startLive` in `lib/sources/live.ts`, the knob tables in `lib/contracts/presets.ts`, and the `human_ref` field in `lib/contracts/schemas.ts` plus the fixture validator. Alternative if the user says no: new files under `components/sections/bench/` that call the API directly, duplicating a little transport code.

## 7. Range probe (cost-capped)

Before ranges ship, run fast-mode baseline runs on real Nemotron for each family at min, default and max knob values, 3 seeds at the edges: about 24 runs, expected about $1.30 at today's median ($0.053 per run), hard cap $2.50 tracked from run records. Results go to `backend/evals/probe-<date>.md`. Shipped range = largest range whose edges pass at least 2 of 3. Probe also records wall time; any knob setting whose median run exceeds 4 minutes is cut (judges have minutes).

## 8. Hosting (decision pending, blocks day 1)

Rules require the demo to run on Nebius and stay up until judging ends. Proposal: one Nebius AI Cloud VM running the FastAPI backend and Docker sandbox image `verity-tools:0.1`, behind HTTPS; frontend stays a static export. Health check plus auto-restart. If hosting is not live by 2026-10-22, the bench ships with recorded runs only and the live column reads "Live runs are paused".

## 9. Testing and verification

- Backend: unit tests for every knob table (min, max, out of range rejected), `render_pack` default equals today's pack, golden vs reference agreement at min/default/max for each family (packs self-test), `/parse` validation rejects malformed or out-of-table model output, `human_ref` record written and never sent to a role. `pytest -q` stays green.
- Frontend: typecheck, lint, fixture validator on curated and one saved live run, build. Browser check with `agent-browser` at 1440x900 and 390 wide: full bench flow against a local backend, refusal flow, backend-down flow.
- One real end-to-end live run per family on the hosted backend before freeze.

## 10. Day plan

| Day | Date | Work |
|---|---|---|
| 1 | 10-17 | Hosting decided and backend reachable at a real URL. Knob tables and `render_pack` for adder and counter |
| 2 | 10-18 | Sequence detector and MAC templates, tests, packs self-test |
| 3 | 10-19 | Range probe (cap $2.50). `/parse` endpoint |
| 4 | 10-20 | `human_ref` compare, run saving, `GET /runs` |
| 5 to 6 | 10-21 to 10-22 | `/bench` page. Live-ready checkpoint 10-22 (fallback in section 8) |
| 7 | 10-23 | Studio split, `/runs` list |
| 8 | 10-24 | Hosted end-to-end runs, fixes, docs |
| freeze | 10-25 | Then video, feedback write-up, submit by 10-29 |

Cut order if late: `/runs` list (keep saving), studio split (studio keeps live branch), sequence detector knobs, then English parse (sliders only).

## 11. Out of scope

AI-drafted references, ALU and matmul knobs, capability map, pass predictions, layout pictures, multi-run queues, accounts.

## 12. Open questions for review (not decided)

This spec is shared for outside review before the team commits to it. Nothing below is decided.

1. **Hosting (blocks day 1).** Proposal in section 8: one Nebius AI Cloud VM with the backend and sandbox image. Where exactly, who runs it, and how it stays up until judging ends.
2. **`frontend/src/lib/` changes.** HANDOFF marks `lib/` off limits; the bench needs small changes there (section 6.3). Allow them, or duplicate transport code in new bench files.
3. **Public read-only run logs.** Section 5.4 makes finished runs readable by anyone so they can be listed in `/runs`. Logs are redacted. Confirm this is acceptable.
4. **Spend limits.** Per-run cap $0.25 and 4 runs per judge session are placeholders until the user's meeting.
5. **Human time claim.** A line like "hours for an engineer, minutes for Verity" helps the impact score, but only ships with an honest, cited estimate.

## 13. Context for reviewers

- Hackathon: Nebius x NVIDIA Global AI Hackathon, Coding and Agentic Engineering track. Pass/fail rules include a hosted demo URL that stays up, Nemotron as the model, a public open-source repo and a video under 3 minutes. Judged on four equal criteria: technical use of Token Factory and Nemotron, design of the live dashboard, potential impact, quality of the idea (the PPA loop). Source: `docs/hackathon/`.
- Why ranges and not free-form chips: Verity's trust claim is that every PASS is checked against a locked, human-written golden model. LLM-written references and testbenches are unreliable (`docs/AGENT_RESEARCH.md`, I10), so free-form chips would weaken every result.
- Real results so far: mac4 fast baseline passed 10 of 10 real runs (median $0.053 per run); best full run shrank area 1.6% and clock 7.4% vs its own v1, EQY proven (`backend/evals/gate-2026-10-16.md`).
- Main risks as we see them: hosting down on a judge's click, no plain-English input, the video, and only 8 days to freeze.

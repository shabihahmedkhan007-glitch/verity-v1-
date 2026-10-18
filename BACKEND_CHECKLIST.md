# Backend checklist for /bench

What the live bench (`frontend/src/components/sections/bench/`) consumes, with exact wire shapes (camelCase JSON), each
marked **IMPLEMENTED** or **MISSING** from what is in `backend/` on 2026-10-17 (`verity/api/routes.py`,
`verity/contracts/api.py`, `backend/CONTRACTS.md` section 9). Design source: `docs/superpowers/specs/2026-10-17-bench-envelope-design.md`
sections 4 and 5. The frontend side of every item below is built and degrades honestly until the backend ships it.

## Summary

| Item | Status | Bench behaviour until it ships |
|---|---|---|
| `GET /health` | IMPLEMENTED | |
| `GET /health` field `features` | **MISSING** | Treated as `[]`: no parse, no knobs, no human comparison |
| `POST /auth/session` | IMPLEMENTED | |
| `POST /runs` | IMPLEMENTED | |
| `POST /runs` field `params` | **MISSING** | Never sent. Only the MAC array at default knobs can run |
| Live presets `add8`, `cnt8`, `fsm_seq` | **MISSING** (packs are `eval_only = true`) | Adder, Counter, Sequence detector show "runs land with knob support" |
| `POST /parse` | **MISSING** | English box reads "Plain-English parse lands with the backend. Use the knobs below for now." |
| `GET /runs/{id}/events` (SSE) | IMPLEMENTED | |
| SSE event `human_ref` | **MISSING** | Result reads "Comparison with the human-written design is not available from this backend yet." |
| `POST /runs/{id}/stop` | IMPLEMENTED | |
| `POST /runs/{id}/steer` | IMPLEMENTED | Used by the reused detail panel (winner override) |
| `GET /runs/{id}/log` | IMPLEMENTED (owner only) | Not called by the bench. Public read for finished runs is MISSING (needed for the studio split, spec 6.2) |
| `GET /runs` | **MISSING** | Not called by the bench. Needed for the `/runs` list (spec 6.2) |

## Warning: `params` today is silently ignored

`WireModel` uses `extra="ignore"`, so a `POST /runs` body with `params` is accepted and the default chip runs. That is why
the bench never sends `params` unless `/health` lists `"params"` in `features`. Ship `features: ["params"]` in the same
change that makes `params` actually change the rendered pack, never before.

## 1. `GET /health`: IMPLEMENTED, one field MISSING

```json
{
  "liveEnabled": true,
  "reason": "budget_exhausted | busy | maintenance",
  "capUsd": 0.5,
  "provider": "nebius",
  "models": { "planner": "..." },
  "authRequired": false,
  "features": ["params", "parse", "human_ref"]
}
```

- **MISSING `features: string[]`**. List only what is live end to end. Values the bench reads: `"params"` (POST /runs
  honours knobs for all four families), `"parse"` (POST /parse exists), `"human_ref"` (runs emit the `human_ref` event).
  Unknown values are ignored. Absent or not an array = `[]`.
- `reason` is omitted when `liveEnabled` is true (existing behaviour).

## 2. `POST /auth/session`: IMPLEMENTED

Request `{ "accessCode": "..." }`. `200 { "token": "...", "expiresAt": "2026-10-17T12:00:00Z" }`, `401` wrong code,
`429` rate limited. Bench sends `Authorization: Bearer <token>` on POST /runs, /parse, /stop, /steer.

## 3. `POST /runs`: IMPLEMENTED, `params` MISSING

Request:

```json
{ "presetId": "mac4", "priority": "area", "params": { "lanes": 6, "width": 12, "cycles": 20 } }
```

- `presetId` names the family (the task pack folder): `mac4`, `add8`, `cnt8`, `fsm_seq`.
- **MISSING `params`** (optional; omitted = pack defaults). Validate every key against the family's `[params]` table in
  `task.toml` (spec 5.1); unknown key or out-of-range value = `422 { "error": "..." }` with a sentence the bench shows as is.
- Knob tables the bench renders (DRAFT, `frontend/src/lib/contracts/presets.ts` `FAMILIES`; backend must use the same ids):

| presetId | knob id | type | range | default |
|---|---|---|---|---|
| `mac4` | `lanes` | int | 1 to 8 | 4 |
| `mac4` | `width` | int | 4 to 16 | 8 |
| `mac4` | `cycles` | int | 4 to 32 | 16 |
| `add8` | `width` | int | 4 to 32 | 8 |
| `cnt8` | `width` | int | 4 to 32 | 8 |
| `cnt8` | `enable` | bool | | true |
| `fsm_seq` | `pattern` | string of `0`/`1` | length 3 to 8 | `"1011"` |
| `fsm_seq` | `overlap` | bool | | true |

  When the range probe (spec 7) narrows a range, change it in both places in one commit.
- **MISSING live presets**: `add8`, `cnt8`, `fsm_seq` are `eval_only = true`, so `POST /runs` answers 422 for them today.
- Responses (existing): `201 { "runId": "r_...", "capUsd": 0.5, "streamToken": "..." }`; `401`; `422 { "error" }`;
  `429 { "error", "reason": "busy | budget_exhausted | maintenance | rate_limited" }`. The bench maps every reason to its
  own message, including `rate_limited`.
- The agent's first `spec` event must describe the chip at the requested knobs (title, ports, text), because the bench
  does not seed the preset text when knobs were sent.

## 4. `POST /parse`: MISSING

Session-guarded (same as POST /runs), rate-limited, Nemotron call with about 400 output tokens, spend logged to the session.

Request: `{ "text": "a 6-lane multiply-accumulate with 12-bit inputs" }` (1 to 300 characters).

Responses (`200`, strict JSON, validated server side against the same knob tables before sending):

```json
{ "result": "in_range", "family": "mac4", "params": { "lanes": 6, "width": 12, "cycles": 16 }, "note": "Cycles not given; kept 16." }
```

```json
{
  "result": "out_of_range",
  "reason": "An RTX 6090 is a full GPU: thousands of cores, memories and caches. Verity builds small single-module blocks.",
  "closest": { "family": "mac4", "params": { "lanes": 8, "width": 16, "cycles": 32 } }
}
```

- `note` optional. `closest` may be `null` when nothing is close.
- `params` may omit knobs (the bench fills defaults), but every value sent must be in range: the bench re-checks against
  its table and refuses to apply a reply that is not.
- Errors: `401` (session), `429` (rate limited), anything else non-2xx = "could not read that request". `404`/`405` are read
  as "parse not available", so do not use them for other failures.
- The sentence is input only. It never becomes a reference or a test (decision O9).

## 5. `GET /runs/{id}/events?st=<streamToken>` (SSE): IMPLEMENTED, one event MISSING

Each message `id: <seq>` and `data: <RunEvent JSON>`. Every event is validated with `RunEventSchema`
(`frontend/src/lib/contracts/schemas.ts`); an invalid one is dropped and logged in development. Reconnect resumes with
`Last-Event-ID`; a finished run replays and ends (this is how "Open in studio" works today).

Event set consumed (all IMPLEMENTED except `human_ref`):

| `t` | Shape (besides `seq`, `tMs`) | Bench use |
|---|---|---|
| `run` | `phase: idle\|starting\|running\|done\|error\|cap_reached\|stopped`, `message?` | Status, Run lock, narration |
| `stage` | `stage`, `status`, `detail?`, `round?` | LOOP |
| `op` | `by`, `op` (canvas op) | studio state (kept for the studio) |
| `spec` | `spec: Spec` | run title |
| `plan` | `revision`, `blocks`, `diff?`, `reason?` | LOOP, detail panel |
| `gate` | `state`, `autoContinueMs` | LOOP |
| `candidate` | `candidate: Candidate` (full upsert) | LIVE RTL (`rtl`, `attempts`, `reason`), VERSIONS, discard reasons (`status`, `attempts[].verification` with `lint`, `lintLog`, `passed`, `total`, `failures[]`), winner PPA (`ppa`), gains vs v1 (`fitness.gains`), EQY vs v1 (`eqy`) |
| `round` | `round`, `parents`, `elites?` | LOOP, Status |
| `winner` | `candidateId`, `by`, `aiPickId` | Result |
| `human` | `input` | detail panel |
| `caption` | `text`, `chapter?` | Monitor narration |
| `credits` | `usedUsd`, `capUsd` | cost meter, Status |
| `artifact` | `path`, `content` | studio export |
| `human_ref` | **MISSING**, see below | vs-human scoreboard |

**MISSING `human_ref`** (spec 5.3). Emit once, after the winner is chosen and before the terminal `run` event:

```json
{
  "seq": 812, "tMs": 168000, "t": "human_ref",
  "ppa": { "areaUm2": 2201.3, "cellCount": 412, "clockPeriodNs": 1.71, "powerMw": 1.94,
           "tools": ["Yosys 0.69+190", "OpenSTA 3.1.0"], "pdk": "Nangate45" },
  "eqy": { "status": "proven", "againstId": "c4", "tool": "yosys-eqy" }
}
```

- `ppa`: the pack's `reference.v`, rendered at the run's knobs, through the same synth, timing and power flow and settings
  as the candidates. `null` for any metric not measured.
- `eqy`: EQY of the winner (`againstId` = winner candidate id) against that reference. `status` is one of
  `proven | not_equivalent | inconclusive | not_run`.
- The reference is never shown to any agent role (`core/pack.py` isolation stays).
- Send it even when the human design wins; the bench shows the loss.

## 6. `POST /runs/{id}/stop` and `POST /runs/{id}/steer`: IMPLEMENTED

`202 { "accepted": true }`; `401` clears the session in the bench. Stop is followed by a `run` event with `phase: "stopped"`.

## 7. Not consumed by the bench yet (studio split, spec 6.2)

- `GET /runs/{id}/log`: IMPLEMENTED for the owning session only. **MISSING**: read-only access without ownership for
  finished runs, so saved runs open in the studio for anyone (open question 3 in the spec).
- `GET /runs`: **MISSING**. `200 { "runs": [{ "id", "presetId", "params", "title", "status", "finishedAt", "winner": { "label", "areaUm2", "clockPeriodNs" } | null }] }`.

## 8. CORS

`VERITY_CORS_ORIGINS` must include the bench origin (local: `http://localhost:3000`). Methods GET, POST, OPTIONS;
headers `Authorization`, `Content-Type`, `Last-Event-ID` (existing).

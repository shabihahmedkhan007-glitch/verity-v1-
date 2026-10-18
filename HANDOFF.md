# Verity handoff

Last updated 2026-10-18. Read this first in a new session, then `CLAUDE.md`, then only the doc your task needs. The full history is in the `REPORT.md` change log; this file is the current snapshot only.

## Where things stand

| Area | State |
|---|---|
| Dates | Feature freeze 2026-10-25, internal submit 2026-10-29. |
| Repo | `main`. Push target is remote `v1` (`git push v1 main`); `origin` (Sahir619/verity) is not used, ask before touching it. Everything through the bench backend is committed and pushed (see `git log`). Working tree clean. |
| Look (decision D12) | "V3 Rack" world with an AMBER accent `#FFB000` on warm black `#0A0806` / panel `#13100C`; fonts Sofia Sans Extra Condensed (display), Sofia Sans (body), Martian Mono (data); tokens `--rk-*` in `frontend/src/app/globals.css`. Amber is earned (pass, proven, measured improvement, primary action, focus). Running = pale amber `--rk-run`. Fail = hollow white square plus the word. No red. |
| Landing | Two equal ways in under the headline: "Build one live" (amber, to `/bench`) and "Watch a recorded run" (to `/studio?run=mac4-real`); the top bar's amber action also goes to the live bench. |
| Live bench `/bench` (D13 to D15) | Judge-facing live page (`frontend/src/components/sections/bench/*`); `/try` forwards to it. Judge types plain English (Nemotron parses it, refuses out-of-range asks with a "Use closest" chip) or sets knobs; runs on real Nemotron; shows live RTL, loop, monitor, versions, winner, discarded versions with the reason, and "Verity vs human reference" (shown even when the human wins). Verified end to end on real Nemotron 2026-10-18 (counter 12-bit free-running: winner v4 proven equal to v1 and to the human design, area −0.6% vs human, $0.03). |
| Knob families (probe-proven ranges) | mac4 lanes 1 to 8, width 4 to 8, cycles 4 to 32; add8 width 4 to 32; cnt8 width 4 to 16, enable on/off; fsm_seq pattern 3 to 8 bits, overlap on/off. Ranges equal in `frontend/src/lib/contracts/presets.ts` `FAMILIES` and each `backend/tasks/<id>/family.py` `KNOBS` (change both together). Evidence: `backend/evals/probe-2026-10-18.md` (17 real runs, $0.69). |
| Backend | Knob params on `POST /runs` (rendered packs cached under the data dir, `verity/core/family.py`), `features` on `/health` (`params`, `human_ref`, `parse`), `human_ref` event (`orchestrator/human_ref.py`, never changes run status, respects the wall budget), `POST /parse` (`verity/core/parse.py`, thinking off, 600 token cap, server validation is the authority). Exact shapes: `backend/CONTRACTS.md` section 9 and `BACKEND_CHECKLIST.md`. pytest 386 pass, 24 skip without Docker (2 known DeprecationWarnings from `tests/core/test_sv_subset.py`). |
| Studio | Recordings and live runs both still play here; "Open in studio" from the bench works by replaying the finished run's stream. Both public read for finished logs (`GET /runs/{id}/log`) and the runs library index (`GET /runs`) are now implemented in the backend (spec 6.2). |
| Featured run | `frontend/public/runs/mac4-real.json`: real Nebius mac4 full run (2026-10-16), winner v4 area −1.6%, clock −7.4% vs v1, EQY proven. Landing figures derive from it at build time. |
| Nebius key | In `backend/.env` (gitignored), never printed. The key appeared in chat earlier: rotate it after the hackathon. A Claude Code deny rule blocks reading `.env`. Real spend 2026-10-18: about $1.13 (one $0.37 full bench run, parse checks, $0.69 probe, $0.03 judge-path run). |

## Next steps, in order

1. **Hosting (blocks judges).** Pass/fail rule: a hosted demo URL that stays up until judging ends. Proposal in the spec section 8: one Nebius AI Cloud VM running the FastAPI backend plus the `verity-tools:0.1` Docker image, HTTPS, health check and auto-restart; the frontend stays a static export built with `NEXT_PUBLIC_AGENT_URL` pointing at it. Needs the user's decision on where and who runs it.
2. **Production settings for judging:** `VERITY_AUTH__REQUIRED=true` with access codes (`VERITY_ACCESS_CODE_HASHES`), `VERITY_SIGNING_SECRET`, `VERITY_CORS_ORIGINS` = the site origin, per-run cap and `runs_per_session_per_hour` / `daily_usd` for the judging budget (spec section 12, still open with the user).
3. **Studio split and `/runs` library frontend integration:** backend endpoints `GET /runs` and `GET /runs/{id}/log` are live; frontend can now build the `/runs` page and split the studio (spec 6.2).
4. **Video and submission** (freeze 2026-10-25, submit 2026-10-29). Real "beat the human" material: fsm_seq first versions were 62% and 38% smaller than the human reference, proven equivalent (probe report).

## Open items

- Bench at large MAC sizes is now out of range; 4 lanes x 12 bits is proven but not expressible with per-knob ranges.
- Deferred minors from reviews: render cache cleanup (`prune_render_cache`), `Knob` default self-validation, dropped-keys note in parse, and knob parity regression test are all implemented and verified; stale comments in the locked mac4 testbench remain.
- `docs/UI_UX_SPEC.md` still describes the old /try page and old landing figures.
- matmul4 reliability is not fixed (not on the bench).
- `LICENSE` copyright reads "DOMINIC_WOLF"; confirm with the user.

## Rules that bite (beyond CLAUDE.md)

- No em or en dashes anywhere, including chat replies, commit messages and UI copy.
- Commit or push only on an explicit ask. Never commit `.planning/`, `.claude/`, `.env`, `.impeccable/`, `.superpowers/`, scratch files.
- Sonnet writes code, opus reviews; state agent counts before spawning.
- `frontend/src/lib/` is infrastructure; the bench extensions there (knob table, `human_ref`, `features`, `postParse`, params on `startLive`) were allowed by the spec. Keep further changes minimal.
- Never invent numbers. "PROVEN" only when `eqy.status === "proven"`.
- Real Nebius runs cost money: cap every probe or agent brief, track spend from run records. The fake provider (`VERITY_PROVIDER=fake`, the default without `.env`) costs $0 and now follows knob values.
- Pack files are hashed: after editing anything in `backend/tasks/<id>/`, run `backend/tasks/make_manifest.py`, and restart a running backend (it re-verifies hashes before each tool call).
- Windows: write edit scripts to a scratch file and run `python -I script.py` (heredocs with nested quotes break; some files are CRLF). Set `PYTHONIOENCODING=utf-8` for `python -m verity...`. Docker Desktop must be running for tools and edge tests. Only one `next dev` per project: to test the bench against a backend while another dev server runs, build the static export with `NEXT_PUBLIC_AGENT_URL` and serve `frontend/out` on another port (add that origin to `VERITY_CORS_ORIGINS`).

## Verify

- Frontend (from `frontend/`): `npm run typecheck`, `npm run lint` (1 old warning in `lib/contracts/view-types.ts`), `npm run validate:fixture`, `npm run build`.
- Browser: `agent-browser` CLI. `/bench` at 1440x900 fits without page scroll; 390 wide `scrollWidth` 390. `/studio?run=mac4-real` unchanged.
- Backend (from `backend/`): `PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m pytest -q` (410 total tests: 386 pass, 24 skip when Docker Desktop is absent).
- Knob parity: automated in `tests/core/test_knob_parity.py` checking frontend `FAMILIES` against every task pack's `KNOBS`.

## Map

- `REPORT.md`: decisions D1 to D15 and the full change log.
- `docs/superpowers/specs/2026-10-17-bench-envelope-design.md` (spec), `docs/superpowers/plans/2026-10-18-bench-backend.md` (plan), `BACKEND_CHECKLIST.md` (wire contract the bench consumes).
- `backend/evals/probe-2026-10-18.md`: range probe. `backend/evals/gate-2026-10-16.md`: earlier gate.
- `frontend/ARCHITECTURE.md`, `backend/ARCHITECTURE.md`, `backend/CONTRACTS.md`.
- End-of-day logs go to `E:\💻 Dev\work log\`.

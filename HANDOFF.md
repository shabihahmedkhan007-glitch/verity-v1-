# Verity handoff

Last updated 2026-10-16 (end of a long session). Read this first in a new session, then `CLAUDE.md`, then only the doc your task needs. The full history of today is in the `REPORT.md` change log; this file is the current snapshot only.

## Where things stand

| Area | State |
|---|---|
| Dates | Feature freeze 2026-10-25, internal submit 2026-10-29. |
| Repo | `main`. Push target is remote `v1` (`git push v1 main`); `origin` (Sahir619/verity) is not used, ask before touching it. Last pushed commit: `efdca71` (bench design spec only, 2026-10-17). Before it: `6c77fd0` (backend R1 to R5). Before it: `9f02877` (rack redesign). |
| Uncommitted | About 39 files: the matmul4 fixer patterns, power measurement, the real featured run and its frontend wiring (details below). All verified, not committed. Commit only when the user asks. |
| Look (decision D12) | "V3 Rack" world with an AMBER accent `#FFB000` on warm black `#0A0806` / panel `#13100C`; fonts Sofia Sans Extra Condensed (display), Sofia Sans (body), Martian Mono (data); tokens `--rk-*` in `frontend/src/app/globals.css`. Amber is earned (pass, proven, measured improvement, primary action, focus). Running = pale amber `--rk-run`. Fail = hollow white square plus the word. No red. Mockups that led here (gitignored): `.impeccable/mocks/slipstream/`. |
| Frontend | Landing `/` = rack (`components/sections/rack/*`), every figure derived at build time from the real run via `rack/real-run.ts`. Studio = TRANSPORT, LOOP, MONITOR, VERSIONS modules (`components/sections/studio/**`), one shared top bar `shared/RackBar.tsx` on every page. /studio and /results default to `?run=mac4-real`. Scroll model: one vertical scroller per panel, code boxes scroll sideways only. |
| Featured run | `frontend/public/runs/mac4-real.json`: REAL Nebius mac4 full-mode run `r_eval_99af31ad886145f1` (2026-10-16). Winner v4: area −1.6% (2,133.59 to 2,098.47 µm²), clock −7.4% (1.625 to 1.505 ns) vs v1, EQY proven. 6 versions, 2 lint fixes, v5 rejected, 1 human input. Power not measured (recorded before power landed). Raw stream `mac4-real-raw.json` (2:49); playable copy has only idle gaps over 6 s cut to 6 s (1:10), built by `npm run compress:fixture`; validator proves events are identical except `tMs`. Studio labels it "REAL RUN · 2:49 RECORDED, IDLE WAITS SHORTENED". `golden.json` (sample) is kept unchanged. |
| Backend | Reliability R1 to R5 done (logic-only SystemVerilog subset, v2 prompts, deterministic lint fixer + guidance incl. latch and nesting, finish_reason/reasoning tokens recorded, caps rtl 24k / plan 12k, 3 baseline samples at temperature 1.0, stall restart). Power: `sandbox/bin/measure` adds an OpenSTA vectorless estimate (activity 0.1, fixed pack reference clock, labelled estimate), image `verity-tools:0.1` rebuilt. pytest 304 pass, packs self-test 7 of 7. |
| Real-model results | `backend/evals/gate-2026-10-16.md`. GATE PASSED: mac4 fast baseline 10 of 10 (median $0.053/run). alu8 3 of 3. matmul4 weak (2 of 3 latest; failures now plain simulation mismatches). Full-mode optimize finds small real gains (best: the featured run). Real spend today about $3.82. |
| Nebius key | In `backend/.env` (gitignored, `LLM_API_KEY` + `VERITY_PROVIDER=nebius`), written by a script at the user's request, never printed; verified (27 models, Ultra + Super OK). The key appeared in chat: rotate it after the hackathon. A Claude Code deny rule (`~/.claude/settings.json`: `Read(.env)`) blocks reading `.env`; check config only through `load_settings()` printing booleans. |

## Next steps, in order

0. **2026-10-17: `/bench` frontend is built** (uncommitted) from spec `docs/superpowers/specs/2026-10-17-bench-envelope-design.md` at the user's instruction; `/try` forwards to it. Next is the backend side, in the order of `BACKEND_CHECKLIST.md`: `features` on `/health`, `params` on `POST /runs` with the three new live packs, `human_ref` event, `POST /parse`, then the range probe (spec 7). Turn on each `features` flag only when that item works end to end. Studio split (spec 6.2) waits for a public `GET /runs/{id}/log`. Spec open questions (hosting, run log visibility, spend limits) are still open. Local check: backend with `VERITY_PROVIDER=fake` costs $0 and needs Docker running.
1. **Commit and push** the uncommitted work to `v1` when the user says so.
2. **Optional, about $0.25:** record one new real mac4 full run that carries power. If it also has an EQY-proven gain, make it the featured run (rebuild with the backend's `build_run_log`, then `npm run compress:fixture`), restore "lower power" in the copy and the POWER knob on the landing.
3. **Step 3 of the agreed plan: the test bench.** /try becomes a rack-style live Bench: presets with editable parameters (recommended over free text), PPA priority, access code, credit cap, one run at a time, fallback to recorded runs if the backend is down, every finished run saved as a replay file. **Blocked on user decisions** (after their meeting): where the backend runs during judging, run budget per judge.
4. **Step 4:** /runs library listing saved runs, each opening in the studio.
5. **Step 5:** real-model evals refresh, then freeze 10-25. Fallback if live is not reliable by 10-22: bench ships recorded real runs only, live labelled "coming soon".

## Open items

- `docs/UI_UX_SPEC.md` section 2 and component inventory 5.2 to 5.4 still describe the old landing and sample figures.
- matmul4 reliability (simulation mismatches) is not fixed; mac4 is the demo chip.
- Power estimate is vectorless and only comparable within one design (matmul4 reads lower than mac4 despite more area; not investigated).
- The studio's "idle waits shortened" label is parsed from `meta.note` (the fixture contract strips unknown meta fields); keep that wording.
- Token names still say `--verity-green` (alias of amber).
- Direction decisions U1 to U11 in `docs/AGENT_RESEARCH.md` section 8.1 are still open.
- `LICENSE` copyright reads "DOMINIC_WOLF"; confirm with the user.
- Inside `lib/` (off limits): unused store fields `inspectorTab`, `autopilot`, `inspectorOpen`, `userMoved`.

## Rules that bite (beyond CLAUDE.md)

- No em or en dashes anywhere, including chat replies, commit messages and UI copy.
- Commit or push only on an explicit ask. Never commit `.planning/`, `.claude/`, `.env`, `.impeccable/`, scratch files.
- Sonnet writes code, opus reviews; state agent counts before spawning. Give parallel agents disjoint files.
- `frontend/src/lib/` is infrastructure: do not change it.
- Never invent numbers. "PROVEN" only when `eqy.status === "proven"`. Real figures come from run files; sample data is labelled "Sample data".
- Real Nebius runs cost money: set a spend cap in every agent brief and track it from run records.
- Windows: write edit scripts to a scratch file and run `python -I script.py` (heredocs with nested quotes break; some files are CRLF). Never pipe into `cat > /dev/null` (it hangs on stdin). Docker may need `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin` on PATH and Docker Desktop started.
- Set `PYTHONIOENCODING=utf-8` for `python -m verity...` (the emoji in the repo path crashes cp1252). Eval runs overwrite `backend/evals/report.md`: `git restore` it unless you mean to update it.

## Verify

- Frontend (from `frontend/`): `npm run typecheck`, `npm run lint` (1 old warning in `lib/contracts/view-types.ts` expected), `npm run validate:fixture` (golden, mac4-real, mac4-real-raw), `npm run build`. Dev server `npm run dev` on :3000.
- Browser: `agent-browser` CLI (not Playwright MCP). `/studio?run=mac4-real` at 1440x900 must fit without page scroll; seek via `input[type=range]` with the native `HTMLInputElement` value setter plus an `input` event (ms). End narration: "Winner v4: area −1.6% vs v1. PROVEN EQUAL (EQY)." 390 wide: `scrollWidth` 390.
- Backend (from `backend/`): `.venv/Scripts/python.exe -m pytest -q` (304), packs self-test per `backend/README.md`.

## Map

- `REPORT.md`: decisions D1 to D12 and the full change log.
- `backend/evals/gate-2026-10-16.md`: every real-model run today, with costs.
- `docs/AGENT_RESEARCH.md`: reliability fixes R1 to R7, workflows W1 to W5, open decisions U1 to U11.
- `frontend/ARCHITECTURE.md` section 9: studio structure. `backend/ARCHITECTURE.md`, `backend/CONTRACTS.md`: backend.
- End-of-day logs go to `E:\💻 Dev\work log\`.

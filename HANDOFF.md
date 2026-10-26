# Verity handoff

Last updated 2026-10-26 (live Supabase project, admin run visibility, network/sandbox checkpoint-resume). Read this first in a new session, then `CLAUDE.md`, then only the doc your task needs. Requirements and status per claim: `docs/PRD.md`. Decisions: `docs/DECISIONS.md` (D1 to D51). History: the `REPORT.md` change log.

## Dates and freeze scope

- Feature freeze 2026-10-26 (moved from 2026-10-25, D46). Internal submit 2026-10-29. Deadline 2026-10-30 10:00 am Pacific.
- What ships (PRD section 5): the design-partner plan's claims 1, 2, 3 and 5, all five claims of the Verilog-strength plan (D25), the chip engineer agent (phase A built; custom blocks to build, with a gate) and Supabase saved chats (to build). After the freeze only hosting, settings, the video, the write-up and fixes. New chip families wait until after the freeze (PRD section 7); the 2:4 sparse dot product was allowed only if hosting landed by 2026-10-23, and it has not.

## Where things stand

| Area | State |
|---|---|
| Repo | `main`, with the work since 2026-10-18 uncommitted. Remotes `origin` (Sahir619/verity) and `v1` (shabihahmedkhan007-glitch/verity-v1-). The 2026-10-22 change log recorded `v1` as the push target; the user has not confirmed which remote becomes the public repo. Commit and push only when asked. |
| Workspace `/workspace` | Sidebar Home: this browser's runs joined to `GET /runs` (new optional `outcome`), stats, family chips, cards, a change-vs-v1 chart and a spend chart (plain SVG), and a Combine blocks preview marked Coming soon (D37). |
| Limits (D34 to D36) | $10.00 per UTC day for the server, $3.00 per session per UTC day (migration 5, `core.budget.spend_owner` is the swap point for a user id), $0.50 per run. The UI shows only actual spend, never a limit figure. |
| Chat agent (D41 to D43) | Built and checked 2026-10-23 (phase A). After a thread's first chip request every message goes to `POST /threads/{id}/messages`: GLM 5.3 with six tools, a step line on each reply, numbers only from facts, tools or the user, step labels from code, dashes and pack ids cleaned from model text. Code: `backend/verity/ask/{prompt,agent_tools,memory,agent}.py`; web `AgentTurn.tsx`, `use-threads.ts`. Plan: `.planning/verity-chip-engineer-agent.html`. |
| Threads and memory (D42) | Migration 6 (`threads`, `thread_turns`) behind a `ThreadStore` protocol; the agent reads the facts record, a 20 to 40 word summary and the last 10 to 13 turns (fold 4 when 14 wait). The browser keeps `verity.threads`. |
| Supabase (D47, D48, D50, D51) | **Live and verified** 2026-10-26. Project "verity" (ref `eoherxlfoagvbqlhdyos`, org `arzharch`, region ap-south-1), schema applied. `backend/.env` has `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`; `frontend/.env.local` has the public URL and publishable key for the browser sign-in widget. `supadmin@verity.com` exists (role `super_admin`, 999 credits); password is with the user (generated this session, not in any repo file). Each account has 3 starting run credits by default (`initial_credits`); run admission requires credits > 0 and deducts 1 credit. Public signups disabled; an admin (`admin_emails`/`super_admin_emails` or team/super_admin role) onboards users via bench sidebar modal (`POST /admin/users`) and manages credits (`POST /admin/credits`); a super admin can see any user's runs (`GET /admin/runs`). Fixed a real bug this session: `RunManager.list_user_credits` was reading SQLite only, never Supabase, so `GET /admin/users` came back empty once Supabase was the live store. Checkpoint-and-resume now also covers a network or sandbox failure mid-run (D51), not only credits. |
| Nemotron quality (D49) | Winner rule (never worse than v1 on the goal), copy labels, ASCII comment fix, prompt versions optimize.v4, repair.v4, rtl_gen.v3. Checked on 16 real runs on 2026-10-23 (REPORT): correctness 16 of 16, more winners proven, gains unchanged, fsm_seq clock now slower under the area goal. Score runs with `backend/evals/quality_report.py <folder of run logs>`. Known test gap: fsm_seq S2 with din 0 (after the freeze). |
| Chat models | GLM 5.3 runs the chat agent, the fact check and the summaries; on a timeout, connection error or 5xx it falls back to DeepSeek V4 Pro, then Nemotron 3 Ultra (thinking off), with a 5-minute cooldown. Chosen from real tests on 2026-10-23 (REPORT). DeepSeek's price in `config.toml` is a third-party figure. |
| Custom blocks (D45) | Approved, not built. Brief `.planning/custom-blocks-design.md`, drafting guide `.planning/golden-model-skill.md`. Gate: 4 of 5 sample blocks end to end by 2026-10-26, or the `custom` switch stays off. Gate spend is about $3 (two sessions). |
| Bench `/bench` | Chat workspace: fact check verdict with research and sources, "I assumed" chips, chip card with Run, Progress tab, then Result, Versions, Verilog and Architecture tabs, a version chip and version tab (D20), the step rail and real circuit with Expand and a code-built walkthrough (D21), the sign-off sheet after the result (D22). Spec: `docs/UI_UX_SPEC.md` section 6. Code: `frontend/src/components/sections/bench/`. |
| Models (D16) | Nemotron 3 Ultra plans, writes and fixes; Nemotron 3 Super optimizes; Nemotron 3.5 Lightning routes chat messages; GLM 5.3 reads the first sentence, words chat answers and summarises research. Routes in `backend/config.toml`. |
| Sign-off (D22 to D24) | Every run, after `run done`: 8 more seeds, lint by tag, EQY vs v1 and vs the human design, planted-bug strength (seven fixed rules), a waveform. Artifacts `signoff/<id>.json`, `waves/<id>.json`, `spec/rules.json` (`backend/CONTRACTS.md` 6.3). |
| Research (D17, D19, D29) | Tavily for web search, Serper for Scholar and Patents. Both keys are in `backend/.env` (2026-10-23) and `GET /health` lists `research`. One real `POST /parse` on `:8000` worked end to end (REPORT 2026-10-23). |
| Tool image | `verity-tools:0.1` is `5e2f14cbdbf9` (with `seeds`, `strength`, `wave`); the previous `fc4d73950518` is tagged `verity-tools:0.1-prev`. Checked with `docker image ls` on 2026-10-23. Pack files unchanged (D32). |
| Live backend `:8000` | **Stopped** on 2026-10-23: Claude Code ended it when the machine ran low on memory (about 3 GB free of 20 GB). Restart only when the user asks, after a fresh database copy: migration 6 runs on start, then `/health` lists `agent`. Command: `cd backend && .venv/Scripts/verity-api.exe`. |
| Real spend | The 2026-10-23 change log: the live database had one `daily_spend` row (2026-10-22, $0.31, 0 search credits) and nothing for 2026-10-23. Not re-checked in the docs pass. |
| Featured run | `frontend/public/runs/mac4-real.json`: a real Nebius mac4 full run (2026-10-16), winner v4, EQY proven. Landing figures derive from it at build time. |

## Built but not verified live

- The sign-off ran on 16 real full runs on 2026-10-23 (REPORT); the waveform panel and `statedKnobs` on a real run have not been looked at on screen.
- A winner other than v1 in the new tabs on a real run, and the `cap_reached` ending, have not been seen on screen.
- The Nebius Sandboxes runner: written, never tried against the real service, and off.

## Next steps, in order

1. **Restart the live backend** when the user asks (copy the database first: migrations 6 and 7 run on start), then the user tests the chat.
2. **Supabase live** (row above). The `/workspace` Runs cards now show a Resume button on a `stopped` run (D51); still open: no admin UI listing every run (the backend route is done, `GET /admin/runs`, but nothing in the bench sidebar calls it yet); sign in once on two browsers to see the Chats and Your runs lists follow the account.
3. **Custom blocks (phase B)** from `.planning/custom-blocks-design.md` and `.planning/golden-model-skill.md`, then the 5-block gate by 2026-10-26.
4. **Hosting (blocks judging; the user decides):** Cloudflare Pages for `frontend/out/` plus a Linux VM with Docker (Nebius CPU VM or a GCP trial VM).
5. **Production settings** on the host, then one real run on the host.
6. **User decisions:** the track, the `LICENSE` holder, the public remote.
7. **Video and submission** (PRD section 6). The diagrams in `.archify/` can help the write-up.

## Open items

- A finished run with no sign-off sheet shows "Sign-off checks running" for about a second on reload before it reads "none".
- Under parallel Docker load the `cnt8` width 16 edge tests can time out in a full `pytest` run; they pass alone.
- A run cut off by a backend restart ends as "The server restarted during this run."
- The chat column is narrow between 900 and 1100 px with the panel open.
- Verilog keywords still use amber in `globals.css` (`--syn-keyword`); left for the owner.
- The old `agent/` and `web/` folders are untracked leftovers from before the `backend/` and `frontend/` move; delete when the user agrees.
- `docs/ARCHITECTURE_EXPLAINED.html` and `docs/GOLDEN_MODELS.html` are untracked; add them to the next commit if the user wants them public.

## Rules that bite (beyond CLAUDE.md)

- Never read or print `backend/.env` or `frontend/.env.local`; a deny rule also blocks the `.env.example` files. Check a key only through the settings loader, printing true or false.
- Pack files are hashed: after any edit in `backend/tasks/<id>/`, run `backend/tasks/make_manifest.py` and restart a running backend. Golden models, `test_dut.py` and `reference.v` should not change at all (D32).
- Real Nebius, Tavily and Serper calls cost money: cap every probe and track spend from run records. The fake provider (the default) costs $0 and still uses the real Docker image.
- A second dev server or backend: `NEXT_DIST_DIR=.next-<name>`, your own `NEXT_PUBLIC_AGENT_URL`, a copy of `backend/data` via `VERITY_DATA_DIR`, your own `VERITY_SERVER__PORT` and `VERITY_CORS_ORIGINS`. Delete the `.next-<name>` folder afterwards (`npm run lint` scans it). `next dev` adds the dist dir to `frontend/tsconfig.json` `include`; remove those lines. `npm run build` bakes in whatever `NEXT_PUBLIC_AGENT_URL` is set.
- `next dev` rewrites `frontend/AGENTS.md`; leave it alone.
- Windows: many files are CRLF, and Git Bash heredocs mangle backslash sequences. Set `PYTHONIOENCODING=utf-8` for `python -m verity...`. Docker Desktop must be running for tools and the edge tests.

## Verify

- Frontend (from `frontend/`): `npm run typecheck`, `npm run lint` (0 errors, 1 old warning in `src/lib/contracts/view-types.ts`), `npm run validate:fixture` (three fixtures, all OK on 2026-10-23), `npm run build` (passed 2026-10-23 after the phase A build, about 6 minutes; not re-run after the review fixes, which passed typecheck and lint).
- Backend (from `backend/`): `PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m pytest -q` (1030 passed in 8 min 38 s on 2026-10-23 with Docker running, after the Nemotron quality changes).
- Browser: the `agent-browser` CLI; `/bench` at 1440 x 900 and 390 wide; `/studio?run=mac4-real` unchanged.

## Map

- `ARCHITECTURE.md` (one page), `docs/PRD.md`, `docs/DECISIONS.md`, `docs/GLOSSARY.md`, `docs/GOLDEN_MODELS.html`.
- `backend/ARCHITECTURE.md` (17.1 chat roles and research, 17.2 ask, 17.3 sign-off), `backend/CONTRACTS.md` (6.3 sign-off, 9 HTTP API, 10 env names), `frontend/ARCHITECTURE.md` (9 bench specifics).
- `backend/evals/gate-2026-10-16.md` and `backend/evals/probe-2026-10-18.md`: real-model evidence.
- `.planning/` (local only, gitignored): the approved plans and research notes; their content is in `docs/PRD.md`.

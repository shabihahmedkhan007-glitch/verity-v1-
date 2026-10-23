# Verity: working rules

Hackathon entry (Nebius x NVIDIA Global AI Hackathon). Describe a chip in plain English; Verity fact-checks it, writes the Verilog with Nemotron, tests it against a locked golden model, fixes its own bugs, evolves smaller and faster versions, signs off the winner, then talks the result through with you. Feature freeze 2026-10-26, internal submit 2026-10-29.

## Layout

```
backend/          Python FastAPI agent: orchestrator, model routes, research, ask, sandbox tools, task packs, evals
frontend/         Next.js static web app: landing, /studio replay, /bench chat workspace
docs/             PRD, decisions, glossary, product, brand, UI spec; history docs carry a banner
ARCHITECTURE.md   one-page map: fact check, research, database, run, sign-off, chat, threads
REPORT.md         status and change log        HANDOFF.md   state for the next session
```

## Docs (read the one your task needs, not all)

| File | What it owns |
|---|---|
| `docs/PRD.md` | Requirements, personas, verdict words, acceptance, hackathon rules, roadmap. The build contract |
| `docs/DECISIONS.md` | Append-only decision log, D1 onward. New decisions go here only |
| `backend/CONTRACTS.md` | Exact backend interfaces (wins on interfaces) |
| `ARCHITECTURE.md`, `backend/ARCHITECTURE.md`, `frontend/ARCHITECTURE.md` | How it is built |
| `docs/UI_UX_SPEC.md`, `docs/brand.md`, `docs/PRODUCT.md` | Pages and copy; tokens and verdict shapes; users and tone |
| `docs/GLOSSARY.md` | Canonical words |
| `docs/GOLDEN_MODELS.html` | The locked golden models, their known gaps, and the edit checklist |
| `HANDOFF.md`, `REPORT.md` | Current state; change log. **Append a REPORT.md change log entry every session that changes files; update HANDOFF.md when pausing.** |

Precedence when docs disagree (D33): PRD, then DECISIONS, then CONTRACTS for interfaces, then the ARCHITECTURE files, then UI_UX_SPEC, brand and PRODUCT, then HANDOFF and REPORT, then history (MEETING, AGENT_RESEARCH, UI_CANVAS_RESEARCH, docs/hackathon, docs/superpowers, BACKEND_CHECKLIST). Flag conflicts; do not silently reconcile.

## Commands

Frontend (from `frontend/`):

```
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run validate:fixture # checks the run fixtures in public/runs/
npm run build            # static export to out/
```

Backend (from `backend/`, venv in `backend/.venv`): `pytest -q` (Docker Desktop running for the tool tests). Sandbox image and evals: `backend/README.md`.

## Guardrails

Writing and design
- Never write an em dash or en dash anywhere: code, comments, copy, docs, commit messages.
- Brand colors are fixed (D12): `#0A0806` ground, `#13100C` panel, `#FFB000` amber. Components use token utilities from `globals.css`, never raw hex.
- Amber is earned: a passed or verified result, the one primary action, or focus. The logo's V is amber too (D40). Nothing else. Verdicts and status are a shape plus a word.
- Every number in the UI comes from run data and is labelled against our own v1. Sample data is labelled "Sample data".
- Name only tools that run (Yosys, OpenSTA, Verilator, Icarus with cocotb, Yosys EQY). OpenROAD is not run.
- REvolution is a reference for principles only (tiny population, FAIL vs PASS pools, PPA fitness vs our own v1, keep best 1 to 2, operators FIX, SIMPLIFY, OPTIMIZE, EXPLORE). Never show the paper's numbers as Verity's.

Models and trust
- Nemotron writes the plan and every line of Verilog. GLM never writes Verilog.
- Only technique ids from the fixed list (`backend/verity/research/techniques.py`) reach Nemotron. Web text reaches only the GLM summary call, which has no tools. The agent sees only the summary's code-checked sentences and source titles.
- A chat answer takes every number from code, never from the model.
- Agent step labels are fixed code phrases; the model's words never reach a label.
- A chat proposal starts a run only after the user presses Confirm.
- Golden models are locked. `golden.py`, `test_dut.py` and `reference.v` in `backend/tasks/` are not edited without the checklist in `docs/GOLDEN_MODELS.html`; pack hashes must not move by accident.

Secrets and paths
- The replay path makes no network call after its run file. Live code stays in `frontend/src/lib/sources/live.ts`.
- `frontend/` holds no secrets; `NEXT_PUBLIC_*` is for public URLs and the Supabase publishable key (public by design) only. `LLM_API_KEY`, `TAVILY_API_KEY`, `SERPER_API_KEY` and `SUPABASE_SECRET_KEY` live only in `backend/.env`.
- Never open or print `backend/.env` or `frontend/.env.local`. Check a key only through the settings loader, printing true or false.

Git
- Commit only when asked. Push only on an explicit ask for that push. Never commit or push `.planning/`, `.claude/`, `.env*`, scratch files or screenshots.
- Remotes: `origin` (Sahir619/verity) and `v1` (shabihahmedkhan007-glitch/verity-v1-). Which one becomes the public repo is not decided.

## Agents

Sonnet does coding; opus plans and reviews. Keep agent counts small and state them before spawning.

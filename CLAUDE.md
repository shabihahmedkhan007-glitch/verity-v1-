# Verity: working rules

Hackathon entry (Nebius x NVIDIA Global AI Hackathon). Describe a chip in plain English; an agent writes Verilog, tests it against a locked golden model, fixes its own bugs, then evolves smaller and faster versions. Internal submit 2026-10-29, feature freeze 2026-10-25.

## Layout

```
backend/    Python FastAPI agent (orchestrator, Nebius LLM, Docker sandbox tools, task packs, evals)
frontend/   Next.js static web app (replay + live run UI)
docs/       product, design and research docs; docs/hackathon/ holds the original brief material
.archify/   journey and plan diagrams (tool output, kept as is)
REPORT.md   project record and change log (stays at the root)
```

## Docs (read the one your task needs, not all)

| File | What it owns |
|---|---|
| `docs/MEETING.md` | Product brief, loop, risks, glossary (requirements live here until a PRD exists) |
| `REPORT.md` | Project record: status, decisions, change log. **Append a change log entry every session that changes files.** |
| `HANDOFF.md` | Living status for the next session: where things stand, next steps, gotchas. **Update it when pausing work.** |
| `docs/PRODUCT.md` | Users, registers, tone, anti-references (design context) |
| `docs/brand.md` | Colors, tokens, type, motion, icons, voice. Source of truth for styling |
| `docs/UI_UX_SPEC.md` | Pages, states, copy, reusable component inventory |
| `frontend/ARCHITECTURE.md` | Frontend stack, structure, data contracts, reducer, store, verification commands |
| `backend/ARCHITECTURE.md` | Backend architecture: orchestrator, Nebius LLM boundary, sandbox tools, task packs, budgets, auth, evals |
| `backend/CONTRACTS.md` | Exact backend interfaces (wins over backend/ARCHITECTURE.md on interfaces) |
| `docs/AGENT_RESEARCH.md` | Engineer-agent research and proposed reframe (decisions U1 to U11 pending) |
| `docs/UI_CANVAS_RESEARCH.md` | Canvas research behind the UI decisions |
| `.archify/workflow-verity-journey-v2-*/` | Approved user journey map |

Precedence when docs disagree: MEETING.md and REPORT.md decisions, then the ARCHITECTURE.md files, then UI_UX_SPEC.md. Flag conflicts; do not silently reconcile.

## Commands

Frontend (from `frontend/`):

```
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run validate:fixture # checks public/runs/golden.json
npm run build            # static export to out/
```

Backend (from `backend/`, venv in `backend/.venv`): `pytest -q`. Sandbox image and evals: see `backend/README.md`.

## Guardrails

- Never write an em dash or en dash anywhere: code, comments, copy, docs.
- Brand colors are fixed (D12): `#0A0806` ground, `#13100C` panel, `#FFB000` amber accent. Components use token utilities from `globals.css`, never raw hex.
- Amber is earned: pass/verified, the one primary action, or focus. Nothing else.
- The replay path makes no network call after `golden.json`. Live code stays in `lib/sources/live.ts`.
- `frontend/` holds no secrets. `NEXT_PUBLIC_*` is for public URLs only. API keys live in `backend/.env` (server side only).
- REvolution is a reference for principles only (tiny population, FAIL vs PASS pools, PPA fitness vs our own v1, keep best 1 to 2, operators FIX, SIMPLIFY, OPTIMIZE, EXPLORE). Never show the paper's numbers as Verity's.
- Every number in the UI comes from run data and is labeled relative to our own v1. Sample data is labeled "Sample data".
- Git repo (origin `Sahir619/verity`). Do not commit or push unless asked.

## Agents

Sonnet does coding; opus plans and reviews. Keep agent counts small and state them before spawning.

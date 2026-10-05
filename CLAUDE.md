# Verity: working rules

Hackathon entry (Nebius x NVIDIA Global AI Hackathon). Describe a chip in plain English; an agent writes Verilog, tests it against a locked golden model, fixes its own bugs, then evolves smaller and faster versions. Internal submit 2026-10-29, feature freeze 2026-10-25.

## Docs (read the one your task needs, not all)

| File | What it owns |
|---|---|
| `MEETING.md` | Product brief, loop, risks, glossary (requirements live here until a PRD exists) |
| `REPORT.md` | Project record: status, decisions, change log. **Append a change log entry every session that changes files.** |
| `PRODUCT.md` | Users, registers, tone, anti-references (design context) |
| `brand.md` | Colors, tokens, type, motion, icons, voice. Source of truth for styling |
| `UI_UX_SPEC.md` | Pages, states, copy, reusable component inventory |
| `ARCHITECTURE.md` | Stack, `web/` structure, data contracts, reducer, store, verification commands |
| `agent/ARCHITECTURE.md` | Backend (agent) architecture: orchestrator, Nebius LLM boundary, sandbox tools, task packs, budgets, auth, evals. Kept separate from the frontend doc |
| `UI_CANVAS_RESEARCH.md` | Canvas research behind the UI decisions |
| `.archify/workflow-verity-journey-v2-*/` | Approved user journey map |

Precedence when docs disagree: MEETING.md and REPORT.md decisions, then ARCHITECTURE.md, then UI_UX_SPEC.md. Flag conflicts; do not silently reconcile.

## Commands (from `web/`)

```
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run validate:fixture # checks public/runs/golden.json
npm run build            # static export to out/
```

## Guardrails

- Never write an em dash or en dash anywhere: code, comments, copy, docs.
- Brand colors are fixed: `#050A12` background, `#0B1220` surface, `#39FF88` Verity Green. Components use token utilities from `globals.css`, never raw hex.
- Green is earned: pass/verified, the one primary action, or focus. Nothing else.
- The replay path makes no network call after `golden.json`. Live code stays in `lib/sources/live.ts`.
- `web/` holds no secrets. `NEXT_PUBLIC_*` is for public URLs only. API keys live in the future `agent/` backend.
- REvolution is a reference for principles only (tiny population, FAIL vs PASS pools, PPA fitness vs our own v1, keep best 1 to 2, operators FIX, SIMPLIFY, OPTIMIZE, EXPLORE). Never show the paper's numbers as Verity's.
- Every number in the UI comes from run data and is labeled relative to our own v1. Sample data is labeled "Sample data".
- Not a git repo yet. Do not commit or push unless asked.

## Agents

Sonnet does coding; opus plans and reviews. Keep agent counts small and state them before spawning.

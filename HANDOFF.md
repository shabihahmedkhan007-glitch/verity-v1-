# Verity handoff

Last updated 2026-10-15. Read this first in a new session, then `CLAUDE.md`, then only the doc your task needs.

## Where things stand

| Area | State |
|---|---|
| Repo | `main`. Remote `v1` = github.com/shabihahmedkhan007-glitch/verity-v1- (the active one; user said "push it on main v1"), at `c353475` (studio chrome, committed and pushed by the user at 11:14 on 2026-10-15). Remote `origin` = github.com/Sahir619/verity, behind at `bfc631d`. Ask before syncing origin. |
| Uncommitted | `HANDOFF.md` (new), its pointer in `CLAUDE.md`, `REPORT.md` entries, the studio review fixes (4 files under `frontend/src/components/sections/studio/`), and the /try and /results datasheet re-skin (`sections/shared/app-pages.css`, `app-roots.ts`, `datasheet-base.css`, `studio.css` token move, `app/layout.tsx`, the try and results roots), the /try radio fix, and the landing grid on every page (`VignetteGrid.tsx` moved to `sections/shared/`, a staged git rename; mounted in studio, try, results, their skeletons and `app/not-found.tsx`). |
| Review | Opus review of the studio chrome: VERIFIED WITH CAVEATS. All acceptance checks reproduced (no page scroll at 1440x900, auto-follow at 0:31, deltas at 0:59, pin and Follow run, end state, 0 red or navy, 0 console errors, 900 and 390 widths). Open defects are step 1 below. |
| Frontend | Landing = hardware datasheet (committed). /studio rebuilt as "Figure 1, live": `frontend/src/components/sections/studio/` with `figure/`, `detail/`, `table/`, `timeline/`, `chrome/`, `studio.css`, `studio-root.ts`. Theme decision D11 in `REPORT.md` (datasheet world under `.vs`, overrides brand.md 1.1 navy). /try (`.vt`) and /results (`.vr`) re-skinned to the same theme on 2026-10-15 (tokens only, layout and copy unchanged; see REPORT.md). Every route, the 404 page (`.vn`) included, now shows the landing's vignette grid behind its content. |
| Backend | `backend/` FastAPI agent: 247 pytest pass, Docker image `verity-tools:0.1` built, packs self-test 7 of 7. Every number in `backend/evals/report.md` comes from the FAKE provider. With the real model: add8 passed once, mac4 keeps failing, optimize has never improved on v1. |
| Nebius key | A teammate's Token Factory key was pasted in chat on 2026-10-15 and checked (HTTP 200; Nemotron Ultra, Super, Nano, Lightning available; credit balance unknown). The user must put it in `backend/.env` themselves (never open `.env` files). It should be rotated after the hackathon. Never write it anywhere. |
| Dates | Feature freeze 2026-10-25, internal submit 2026-10-29. |

## Next steps, in order

1. **Review defects: fixed and verified, uncommitted** (2026-10-15, see the REPORT.md entry "Studio review fixes"). Touched `StudioWorkspace.tsx`, `detail/DetailPanel.tsx`, `figure/LoopFigure.tsx`, `studio.css`. Still open: from 54.0 s to 59.0 s the narration still says v3 is being fixed while the figure shows it passed (`public/runs/golden.json` has no caption there). Ask before editing the recording.
2. **Commit and push to `v1` main only when the user asks.**
3. **Backend plan** (proposed to the user on 2026-10-15, awaiting a yes): make the real model reliable (R1 to R5 in `docs/AGENT_RESEARCH.md` section 4; gate: mac4 passes 9 of 10 real runs), then make optimize produce a real measured gain, then a "fix my broken chip" debug button (W1 without chat), then re-run evals on the real model, then ship. Chat, uploads, AI-drafted references and MCP are cut. Needs the key in `backend/.env` first. Direction decisions U1 to U11 (`docs/AGENT_RESEARCH.md` section 8.1) are still open.

## Rules that bite (beyond CLAUDE.md)

- No em or en dashes anywhere, including chat replies, commit messages and UI copy (use words for empty table cells).
- Commit or push only on an explicit ask, push to `v1` (`git push v1 main`). Never commit `.planning/`, `.claude/`, `.env`, scratch files.
- Project rule: Sonnet writes code, opus reviews, state agent counts before spawning. The last two studio builds were written by the main session instead; say so if you do it again.
- `frontend/src/lib/` (contracts, store, hooks, run, sources) is infrastructure: do not change it. `@xyflow/react` and `@dagrejs/dagre` must stay installed: `lib/canvas/layout.ts` and `lib/canvas/zones.ts` still use them (the reducer lays out nodes that `useRunSummary` reads).
- Never invent numbers or proofs. Labels come from run data: the sample fixture says PPA tools are Yosys and OpenROAD (the real backend uses OpenSTA); "PROVEN" only when `eqy.status === "proven"`.
- Green is earned (pass, proven, numbers, primary action, focus). Running states are mint. Fail is a white hollow square plus the word.
- Windows: shell edits can flip CRLF; bash heredocs with nested quotes break, so write edit scripts to a scratch file and run `python -I script.py`. Old terminals lack Docker on PATH: prepend `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`.
- `python -m verity.evals ...` overwrites the committed `backend/evals/report.md`; `git restore` it unless you mean to update it.

## Verify the studio

From `frontend/`: `npm run typecheck`, `npm run lint` (1 old warning in `view-types.ts` is expected), `npm run validate:fixture`, `npm run build`. Dev server: `npm run dev` on :3000 (may already be running).

Browser (use the `agent-browser` CLI, not Playwright MCP) at `/studio?run=golden`, 1440x900. The replay autoplays in real time (90 s). Seek by setting `.tlb-scrub input[type=range]` value through the native `HTMLInputElement` value setter and dispatching an `input` event. Expected: no page scroll; at 0:31 the detail panel shows v1 attempt 1 failures and diagnosis with no click; at 0:59 Table 1 shows area deltas; clicking a row pins (inverted row, ring on the figure box) and "Follow run" resumes; at the end the narration reads "Winner v5: area −17.4% vs v1. PROVEN EQUAL (EQY)." with all 6 rows visible; no red or navy computed colours inside `.vs`; 0 console errors; 900 wide stacks; 390 wide has no horizontal overflow.

## Open items

- Store fields `inspectorTab`, `autopilot` and `inspectorOpen` no longer have users; they stay because `lib/` is off limits.
- Landing pixel diff against the pre-studio baseline: 739 of 14.9M pixels differ inside the pointer-following vignette; cause not confirmed (no landing source changed).
- `LICENSE` copyright reads "DOMINIC_WOLF" (GitHub default when the repo was created); confirm with the user.
- Leftovers inside `lib/` (off limits): unused `userMoved` in the run slice, stale comment in `lib/canvas/zones.ts`.
- Doc drift: `backend/sandbox/Dockerfile` comment says the image was never built; `.planning/codebase/*` (gitignored) still uses the old `agent/` and `web/` paths.

## Map

- `REPORT.md`: decisions D1 to D11 and the change log (append an entry every session that changes files).
- `docs/AGENT_RESEARCH.md`: reliability fixes R1 to R7, workflows W1 to W5, open decisions U1 to U11.
- `frontend/ARCHITECTURE.md` section 9: studio structure. `backend/ARCHITECTURE.md`, `backend/CONTRACTS.md`: backend.
- End-of-day logs go to `E:\💻 Dev\work log\` (latest: `2026-10-11-verity-docker-sandbox-and-repo-layout.md`).

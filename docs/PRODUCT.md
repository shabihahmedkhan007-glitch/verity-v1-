# Product

Impeccable context file for Verity. Written 2026-10-04 by the frontend planning lead, non-interactively, from `MEETING.md`, `REPORT.md`, `UI_CANVAS_RESEARCH.md`, the approved journey map and the locked decisions of 2026-10-04. Assumptions are listed at the end; anything unconfirmed is marked.

Visual system lives in `brand.md` (it plays the role impeccable calls DESIGN.md). Page specs live in `UI_UX_SPEC.md`, build structure in `ARCHITECTURE.md`.

## Register

product

Per-surface override (the register field above is the default):

| Surface | Route | Register | Why |
|---|---|---|---|
| Landing | `/` | brand | The first 10 seconds decide whether a judge keeps watching. Design is the pitch. |
| Studio (run view) | `/studio` | product | A working tool: canvas, inspector, status. Design serves the task. |
| Try live | `/try` | product | A short form with real cost behind it. |
| Results and export | `/results` | product | Dense, factual, exportable. |

## Users

Ranked. The demo serves the first persona before anyone else.

1. **Hackathon judge** (Nebius x NVIDIA Global AI Hackathon, Coding & Agentic Engineering track). Has a URL, about 3 minutes, and many other submissions. May not know hardware. Judges on technological implementation, design, potential impact and quality of idea (equal weight). Wants to see an agent plan, fail, fix itself, improve and prove its work, with no waiting, no setup and no Verilog reading required. Skeptical of AI demos that only show a chat box.
2. **Hardware engineer or chip-startup founder.** Has real specs and PPA targets, reads Verilog and synthesis logs, distrusts inflated numbers. Wants constraints, honest measured numbers and exportable verified RTL.
3. **Student.** Curious, light on vocabulary. Served by plain-English labels and tooltips only; no separate mode in the MVP.

Job to be done: "Show me, quickly and honestly, that this agent can take a plain-English chip description to tested, measured, improved Verilog without me helping it."

## Product Purpose

Verity is an agent that turns an English hardware spec into Verilog, tests it against a locked golden model it cannot edit, fixes its own bugs, then evolves a tiny population of design versions to improve power, performance and area (PPA), and proves the winner equivalent to its first verified version. The web app lets anyone watch that loop on one canvas: a Plan Board of AI-drafted blocks and an Evolution Tree of competing versions.

Success for the hackathon: a judge who opens the URL understands the loop within 30 seconds, sees the self-fix moment and a measured improvement within 90 seconds, and can finish the whole story by clicking (no dragging, no typing, no credits spent).

Success beyond the hackathon: an engineer trusts the numbers enough to download the zip and read the RTL.

## Brand Personality

Three words: **exact, candid, calm.**

- Exact: every number has a unit, a source tool and a baseline. Nothing is rounded up into a claim.
- Candid: failures are shown, not hidden. A failure is shown on screen before the pass. Limits are stated on the landing page.
- Calm: the agent does the work; the interface does not shout about it. No hype words, no confetti.

Emotional goals: the judge feels "I can see it working" (clarity), then "I believe the numbers" (trust), then "I could use this" (relevance).

Voice in one line: a careful engineer explaining a test bench to a smart friend.

## Anti-references

What Verity must not look or feel like:

- **Hacker-terminal costume.** Matrix rain, scanlines, glitch text, glowing monospace everywhere. The palette is a warm near-black with an amber accent (instrument-panel colors); that is exactly why this trap is close. Mono is for code and measured values only.
- **Crypto neon dashboards.** Glowing everything, gradient text, stacked hero metrics.
- **Chat-first AI apps.** A prompt box and a stream of prose as the main surface. Verity's main surface is the loop, not the conversation.
- **n8n-style pipeline canvases.** Draggable stages that mean nothing (you cannot simulate before the RTL exists).
- **Generic AI SaaS landing.** Centered hero, three identical icon cards, "AI-powered" and sparkle icons.
- **Dense EDA chrome.** Tcl consoles, port lists and terminals as the first thing a judge sees.
- **Inflated research claims.** Any number from the REvolution paper (or any other paper) presented as Verity's result.

## Design Principles

1. **Show the loop, not the chat.** Every screen answers "what is the agent doing right now, and did it work?" through status on blocks and versions, never through paragraphs.
2. **Amber is earned.** The amber accent means verified, passing, proven, the one primary action or keyboard focus. It never decorates. A screen gets more amber only as the run actually passes tests. Running states use a paler amber.
3. **Measured, never judged.** Fitness and every displayed number come from tool output (Yosys, OpenROAD, iverilog, EQY), relative to our own v1, labeled as such. The interface never asks or shows an LLM's opinion of quality.
4. **Autopilot first, steering optional.** Nothing waits on the user. Every human touch has a default that proceeds, and the "Human inputs: N" counter proves it.
5. **Failure is content.** The FAIL state is designed as carefully as PASS: expected vs got, the agent's diagnosis, the fix as a diff.

## Accessibility & Inclusion

- Target WCAG 2.2 AA. All token pairs in `brand.md` were contrast-checked (results recorded there).
- Never color alone: every status pairs a square with a text label (PASS, FAIL, RUNNING). Pass is a filled amber square, fail is a hollow white square (never red), running is a pale amber square, so states separate by shape and word, not hue.
- Typefaces (decision D12): Sofia Sans Extra Condensed for display, Sofia Sans for body, Martian Mono for data, labels and code; see `brand.md` section 2.
- Every story step is reachable by keyboard and by clicking; dragging is never required.
- The countdown gate is adjustable (Hold, Build now, Autopilot off) to satisfy timing-adjustable criteria.
- Moving content (the auto-playing replay) has a visible pause control; `prefers-reduced-motion` starts the landing replay paused on its final state and removes pulsing.
- Narration captions are mirrored to a polite live region for screen readers, throttled to stage changes and results.

## Assumptions (not confirmed with the user)

1. The judge persona outranks the engineer persona for every trade-off until submission (from `UI_CANVAS_RESEARCH.md` personas table).
2. The showcase chip is still open (4x4 matrix multiply or small MAC array). Sample data uses a 4-lane 8-bit MAC array; swapping chips changes data, not design.
3. Live mode exists in the MVP but depends on an agent backend that is not built yet; replay is the guaranteed path.
4. No light theme. The user chose dark; the brand thumbnail is dark.
5. Partner names appear as text ("NVIDIA Nemotron", "Nebius Token Factory"), not logos, until logo usage rules are checked.
6. English only; no i18n in the MVP.
7. "Human inputs" counts actions that change what the agent does (spec, pin, toggle, winner override, stop). Viewing, scrubbing and dragging blocks do not count.

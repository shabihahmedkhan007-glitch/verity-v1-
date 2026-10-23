# Verity: one-page brief

Status as of 2026-10-23. Sources: `REPORT.md`, `docs/DECISIONS.md`, `HANDOFF.md`. Hackathon: Nebius x NVIDIA Global AI Hackathon. Feature freeze 2026-10-26, internal submit 2026-10-29, deadline 2026-10-30 10:00 am Pacific.

## What it is

Verity is a chip design partner. You describe a small digital chip in plain English. Verity fact-checks the request with real sources, then NVIDIA Nemotron writes the plan and every line of Verilog. A sandbox tests it against a locked, human-written golden model, fixes its own bugs, evolves smaller and faster versions, and proves the winner with Yosys EQY. A sign-off sheet checks the winner again. A chat agent then discusses the result and remembers the thread. Locked tests and proofs decide what passes, never a model.

## Who it is for

- **A hackathon judge** with about three minutes: a clear verdict, visible steps, real sources, a measured gain against v1.
- **An RTL designer** who wants tiers and dates on sources, and numbers kept apart from model opinion.
- **A student or a curious visitor** who needs plain words, the failing test before the fix, and a kind "Not a chip".
- **A founder with a big idea** who needs "not the whole thing, but this block".

## How it was built

- **Run pipeline (2026-10-05 to 10-18).** A fixed state machine: plan, three parallel drafts, lint, simulate, fix, synthesize, up to two rounds of improvement, EQY proof. Built 10-05, first real runs 10-05 and 10-06. Docker tool image with Verilator, Icarus, Yosys, OpenSTA and EQY on 10-11. Seven packs, every planted mutant killed (31 of 31). Real gate on 10-16: first version passed all tests in 10 of 10 runs. Knob families, a human reference design and the plain-English fact check on 10-18.
- **Design partner (10-22).** Per-role model routes, a fact check with a verdict set by code (D17), research from Tavily and Serper, a knowledge store, and chat about a finished run.
- **Sign-off (10-23, D22 to D24).** Every run re-checks the winner: 8 more seeds, lint by tag, two proofs, and test strength from bugs planted by seven fixed text rules. No model is involved.
- **Chat agent and memory (10-23, D41 to D43).** GLM 5.3 picks from six tools and shows each step. Memory is a facts record written by code, the last 10 turns and a 20 to 40 word summary. Numbers come from code, Verilog is stripped, and a run starts only on Confirm. No fine-tuning (D44).
- **Model bake-off (10-23, about $1.10).** The same 24 messages on GLM 5.3, Nemotron 3 Ultra and DeepSeek V4 Pro. GLM 5.3 stayed the chat model: the other two offered adder architectures Verity cannot build, and Ultra changed a setting on "make it smaller". GLM then timed out on Token Factory for a while, so the chain is GLM 5.3, DeepSeek V4 Pro, Nemotron 3 Ultra. A 39-message real conversation: 39 of 39 answered, no fallback, median 1.3 s, $0.2865.
- **Supabase (10-23, D47, D48).** Email and password sign-in with no sign-up, saved chats and run lists. Built and tested on mocks only. Steps: `docs/SUPABASE_HANDOFF.md`.
- **Nemotron quality A/B (10-23, D49).** Changes: the winner is never worse than v1 on the goal, copies are labelled and not proven again, ASCII comments, prompts optimize.v4, repair.v4 and rtl_gen.v3. Measured on 16 real full runs (the 4 families once on the old prompts, twice on the new ones, then the MAC array and the sequence detector twice more each after a fix round), about $1.20.

## Results (real runs, honest)

| What | Measured |
|---|---|
| Correctness of the 16 real runs | v1 passed first try 16 of 16. Every winner proven equal to the human reference. 9 of 9 seeds in every sign-off |
| Planted bugs | Caught or proven harmless in all but 3. Two in the MAC array were left unproven by a proof cap of 3. One in the sequence detector is a real test gap (input 100011 shows it), left for after the freeze |
| Gains against our own v1 | MAC array: area 0 to 1.8 percent, clock up to 4.6 percent, unchanged by the prompt changes. Sequence detector: area 19.3 percent smaller every time, but the clock 13 to 16 percent slower on the area goal (watch it) |
| Winner rule | Before: a speed run picked a version 1.7 percent slower than v1 (0.350 ns against 0.344 ns). On 2026-10-23, 5 of 18 new versions were worse than v1 on the goal and 9 of 18 were copies. After: v1 is kept instead |
| MAC array winners proven equal to v1 | 3 of 3 after the changes, 3 of 5 in older real runs |
| Cost per run | $0.058 average before, $0.074 after (more repair calls). MAC array $0.13 to $0.21 |
| 2026-10-16 gate (fast mode, MAC array) | 10 of 10 first versions passed all 16 tests, median $0.053, 22 to 41 s |
| Recorded featured run | Winner v4: area -1.6 percent, clock -7.4 percent against v1, EQY proven, 6 versions |
| First real research call | 8 sources, 2 Tavily and 1 Serper credits, $0.0195 |
| Tests | Backend: 1030 passed in 8 min 38 s with Docker (2026-10-23) |

Limits: four chip families only. EQY does not prove every structure. Power is an estimate. Supabase is not tried on a real project. There is no public demo URL yet because hosting is undecided.

## What is next

1. The team creates the Supabase project and a real two-browser test.
2. Custom blocks: GLM 5.3 drafts a golden model and only your Approve locks it. Gate: 4 of 5 sample blocks end to end by 2026-10-26, or the switch stays off.
3. Architect mode: planned, not designed in the repo docs yet.
4. Hosting and production settings, then the video and the Devpost write-up.
5. After the freeze: one more locked test for the sequence detector gap, and new chip families.

# Verity: from a 3-preset demo to an agent engineers work with

**Date:** 2026-10-06. **Status:** proposal for the user to decide. Nothing here is built or decided yet.
**Inputs:** four research tracks (industry, engineers, technical, architecture) and one skeptic pass that checked 66 claims against primary sources, our code and the `verity-tools:0.1` image: 0 refuted, 13 corrected (corrected values are used below).
**Builds on:** `MEETING.md`, `REPORT.md` (D1 to D10), `backend/ARCHITECTURE.md`, `backend/README.md`.

**Status words used in this file**

| Word | Meaning |
|---|---|
| verified | The skeptic confirmed it against the linked source |
| corrected | The skeptic found an error; the corrected value is shown |
| vendor claim | Confirmed that the vendor says it; not independently measured by anyone |
| local check | Checked in our repo, run data or the `verity-tools:0.1` image on 2026-10-06 |
| not checked | From one research track only; the skeptic did not re-check it |
| unconfirmed | Open fact; needs the spike in section 5.5 |
| est. | Our estimate, not a measurement |

---

## 1. The answer

Verity should become an **open, evidence-first verification and debug agent that an engineer points at their own RTL**. The engineer brings a module and its tests, or starts from a spec and approves a locked reference. Verity reproduces the failing test, explains the bug with cycle-level evidence, proposes a small patch the engineer accepts or rejects, re-runs the real tools, and then shrinks or speeds up the same module with changes that are measured against the engineer's own v1 and checked with EQY. The existing deterministic loop (generate, repair, evolve, prove) stays as one workflow the agent can launch. The 3 presets become demo projects, not the product. This is credible for these judges for four reasons. First, real adoption of AI in chip design is in debug and test, not spec-to-chip ([Siemens/Wilson 2026](https://verificationacademy.com/topics/planning-measurement-and-analysis/wrg-industry-data-and-trends/ai-in-functional-verification-what-the-2026-industry-data-reveals-paper/)). Second, Cadence, Synopsys and Siemens all announced agents for this exact loop, with engineers approving the important steps, and two of them run on Nemotron 3 Ultra. None is generally available, and their speedups are vendor claims ([Futurum](https://futurumgroup.com/insights/synopsys-cadence-and-siemens-take-agentic-chip-design-autonomous-at-dac/)). Third, NVIDIA's own research uses the open toolchain Verity already ships ([CVDP](https://arxiv.org/html/2506.14074v1), [VerilogCoder](https://arxiv.org/html/2408.08927v2)). Fourth, it fits the track text: "agents that write, run, and test code". Verity's edge is openness: it runs on Nemotron on Nebius, uses fixed sandboxed tools and references the AI cannot edit, keeps an exportable evidence trail, and makes no autonomy or 10x claims.

---

## 2. What the industry does and what engineers need

| # | Finding | Status | What it means for Verity |
|---|---|---|---|
| I1 | 2026 study (604 respondents): 82.8% use AI beyond pilots, but only 9.0% have it broadly integrated. Top uses: debug and root cause, testbench and test generation, coverage. Barriers: integration with existing flows, data quality, trust and explainability (cost is not among the named barriers) ([source](https://verificationacademy.com/topics/planning-measurement-and-analysis/wrg-industry-data-and-trends/ai-in-functional-verification-what-the-2026-industry-data-reveals-paper/)) | verified; Siemens-sponsored | Lead with debug and tests on the engineer's own files. Make trust visible |
| I2 | Debug is the largest slice of verification engineer time: 47% (2024 Wilson studies) ([secondary quote](https://www.sigasi.com/news/verification-blog/)). Design engineers spend 49% of their own time on verification (2022) ([source](https://blogs.sw.siemens.com/verificationhorizons/2022/12/12/part-8-the-2022-wilson-research-group-functional-verification-study/)) | verified (47% only as a secondary quote; the primary report is gated) | The user is an RTL designer who also owns tests, not only a DV specialist |
| I3 | IC/ASIC first-silicon success: about 24% (2022), 14.4% (2024), 5% (2026). The study changed its sampling method in 2024, so the trend crosses a method change ([source](https://blogs.sw.siemens.com/verificationhorizons/2026/09/08/the-2026-functional-verification-study/), [method](https://verificationacademy.com/topics/planning-measurement-and-analysis/wrg-industry-data-and-trends/functional-verification-study-survey-methodology-evolution-reference/)) | corrected | Can motivate the problem in the video. Do not say "collapsed" |
| I4 | Vendors: Cadence ChipStack (Nemotron plus NVIDIA OpenShell, early access H2 2026, "40X faster RTL validation"), Synopsys AgentEngineer DV agent (Nemotron 3 Ultra plus OpenShell, customers "evaluating", "up to 50x"), Siemens Questa One Agentic Toolkit (NVIDIA Agent Toolkit, Llama Nemotron, NIM). Analyst view: no named customers or audited baselines yet ([Futurum](https://futurumgroup.com/insights/synopsys-cadence-and-siemens-take-agentic-chip-design-autonomous-at-dac/), [Cadence](https://www.cimdata.com/en/industry-summary-articles/item/30157-cadence-unveils-industry-s-first-fully-autonomous-virtual-engineer-for-chip-design-powered-by-nvidia), [Siemens](https://news.siemens.com/en-us/questa-one-agentic-ai-toolkit/)) | corrected (announcements, not shipped products); all numbers are vendor claims | Same loop, same model family, closed and not yet available. Verity is the open, runnable version. Never repeat their multipliers as fact |
| I5 | Interaction model: Siemens requires human confirmation for "any action that affects design or verification intent, execution scope, or closure criteria" ([Foster](https://semiengineering.com/human-centered-agentic-ai-comes-to-rtl-verification/)). Cadence engineers "inspect, guide and collaborate". Siemens and Cadence deliver into Claude Code, Copilot, Cursor and Codex. AMIQ ships an MCP server for its IDE ([AMIQ](https://eda.amiq.com/press-releases/amiq-eda-integrates-code-development-and-debug-with-ai-assistance)) | verified; vendor-authored | Approval gates on edits, locked references and spending. An MCP surface is a credible add-on, not the core |
| I6 | Practitioner rule: "AI-generated outputs must always be validated by deterministic engines" ([source](https://semiengineering.com/formal-verification-first-how-ai-supports-but-cannot-replace-it/)) | verified; formal-vendor bias | Matches Verity: the model proposes, the tools decide |
| I7 | NVIDIA's CVDP benchmark: 783 problems, 13 categories, Docker with Icarus, Yosys, Verilator and cocotb. Claude 3.7 Sonnet pass@1: debugging 53%, spec-to-RTL 48%, code modification 45%, lint/QoR 44%, testbench stimulus 25%, assertions 19%, testbench checker 6%. The testbench and assertion categories (cid12 to cid14) need Cadence Xcelium ([paper](https://arxiv.org/html/2506.14074v1), [harness, Apache 2.0](https://github.com/NVlabs/cvdp_benchmark), [dataset license CC BY 4.0 / Apache 2.0](https://huggingface.co/datasets/nvidia/cvdp-benchmark-dataset/blob/main/LICENSE)) | corrected (the Xcelium point) | Debugging is the strongest LLM category, so lead with it. The LLM should not write test checkers or reference models unsupervised. Only the open categories are runnable for us |
| I8 | NVIDIA's blog: Nemotron 3 Ultra averages 97.1% across nine CVDP categories inside the ACE-RTL harness, at 6,629 tokens per iteration ([blog](https://developer.nvidia.com/blog/nvidia-nemotron-3-ultra-leads-open-models-on-accuracy-and-efficiency-in-agentic-rtl-coding/)). The ACE-RTL paper's own results (spec-to-RTL 96.15%, debugging 91.43%) come from a Qwen2.5-Coder-32B generator fine-tuned on 1.7M RTL samples, with Claude 4 Sonnet as the reflector ([paper](https://arxiv.org/html/2602.10218)) | 97.1% is a vendor claim; paper corrected | Copy the pattern (structured failure report, failure memory, restart when stalled). Never compare Verity's numbers to 97.1% (different harness, iteration cap and subset) |
| I9 | VerilogCoder (NVIDIA) gives its debug agent a waveform tracer: mismatched signals in; code lines, a cycle table and driver signals out. The tracer adds +11.5 points (planner 1) or +19.8 (planner 2), reaching 94.2% on VerilogEval-Human v2 ([paper](https://arxiv.org/html/2408.08927v2)) | corrected | Build a compact cycle-table and driver-trace evidence tool. Do not hand the model raw VCD files |
| I10 | LLM-written tests and references are unreliable. Direct LLM testbenches pass 33.33% of tasks, and mutant-based self-validation reaches 70.13% ([CorrectBench](https://arxiv.org/html/2411.08510v1)). The best model scores 13.33% on Python reference models for realistic modules ([ChipBench](https://arxiv.org/abs/2601.21448)). GPT-4o SVA is 91.1% syntactically valid but 45.6% functionally correct ([FVEval](https://arxiv.org/html/2410.23299v1)) | verified | References stay human-owned and locked. AI drafts are labeled drafts and need engineer approval. Test quality is measured with mutants |
| I11 | Agents tamper with tests when they can write them: GPT-5 cheated on 54% of conflicting-spec tasks, cut to 9% when given an abort option. Claude models cheated mostly by modifying tests (over 79% of cheating cases) ([ImpossibleBench](https://arxiv.org/html/2510.20270)) | verified | Tests are read-only and enforced in code. Add an explicit "cannot satisfy this spec" outcome. Note: `MEETING.md` section 4 cites "76%" for GPT-5 in the same benchmark; the 76% figure was not verified here, so confirm which variant it refers to before reusing it |
| I12 | Industrial root-cause study: engineers valued log evidence even when they rejected the proposed root cause. Multi-agent was about 3x slower and 2x costlier with no quality gain ([Westermo](https://arxiv.org/html/2609.21843)) | verified; software tests, n=6 | Evidence first, diagnosis second. One agent with tools, not a swarm |
| I13 | On CVDP agentic tasks, naive tool-agent wrapping lowered pass rates, and a structured harness recovered them. Using the simulator was the strongest marker of success. For Gemini 3.1 Pro, plain non-agentic (58.61%) beat every agentic setting ([NYU](https://arxiv.org/html/2603.19347)) | corrected; table values read through a summarizing fetch, re-check the PDF before quoting | Keep the deterministic workflow. Give the chat agent a few parsed, capped tools. Do not hand over a free shell |
| I14 | NVIDIA's internal LLM use began with an engineering assistant, EDA scripts and bug summarization. Dally expected bug summarization to pay off first ([IEEE Spectrum](https://spectrum.ieee.org/ai-for-engineering)) | verified | Explanation and summary are cheap and safe wins |
| I15 | Real repos are multi-file and parameterized, with FuseSoC `.core` files, a Makefile, and `rtl/`, `dv/`, `formal/`, `lint/`, `syn/` folders ([Ibex](https://github.com/lowRISC/ibex)). UVM and SVA dominate industry, and cocotb is tracked but its share is unquantified ([Wilson 2022](https://blogs.sw.siemens.com/verificationhorizons/2022/12/26/part-10-the-2022-wilson-research-group-functional-verification-study/)) | verified (FuseSoC docs not checked) | Accept multi-file uploads. Position Verity as the open-flow agent (cocotb, Verilator, Icarus, Yosys). UVM and commercial simulators go on the roadmap |
| I16 | AlphaEvolve proposed a Verilog rewrite of a TPU arithmetic circuit; it "must pass robust verification methods" and was integrated into an upcoming TPU ([DeepMind](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)) | verified | Public precedent for "LLM proposes, verification gates" optimization, which is Verity's EQY-gated optimizer |
| I17 | IP and data: by default Nebius may store inputs and outputs for speculative decoding (never for training). Zero Data Retention is an org-level account setting and may slow inference ([Nebius](https://docs.tokenfactory.nebius.com/legal/legal-quick-guide)). Samsung banned ChatGPT in 2023 after engineers pasted source code ([Fortune](https://fortune.com/2023/05/02/samsung-bans-employee-use-chatgpt-data-leak)). NVIDIA says Nemotron 3 Ultra can be deployed on premises ([NVIDIA](https://nvidianews.nvidia.com/news/nvidia-expands-nvidia-agent-toolkit-with-nvidia-physicsnemo-and-cuda-x-libraries-to-transform-how-the-world-engineers-designs-and-builds)) | verified; on-prem is a vendor claim | State the data policy in the UI. The story for real IP: the same open weights can be self-hosted |

**What Verity must not claim:** autonomy levels (L4, L5), any 4x to 50x speedup, NVIDIA's 97.1% as a comparable number, REvolution's or any paper's numbers as Verity's, or "proven" when EQY is inconclusive.

**Still unverified:** the primary 2024 debug-share report; 2026 per-use and per-barrier percentages (in a gated white paper); cocotb adoption share; the Cadence quote about NVIDIA engineers running "hundreds of dynamic simulations"; the "last 9 first attempts" statistic from our run data.

---

## 3. The recommended product

**One-line positioning (draft, replaces D5 if approved, 196 characters):** "Point Verity at your Verilog. It reproduces the failing test, explains the bug with evidence, proposes a fix you approve, then shrinks the design and checks equivalence. NVIDIA Nemotron on Nebius."

**Core objects:** a **project** holds files (`rtl`, `test`, `golden`, `spec`). The engineer can **lock** any file; locked files are the reference set. Every change creates an immutable file **version**. Agent changes arrive as **proposals** (a diff that is already linted and tested) that the engineer accepts or rejects. A **thread** is the conversation with the agent, and every tool call in it is an **evidence** item with an id. A **workflow run** is today's orchestrator run, linked to the thread.

**Scope limits (stated in the UI):** single clock and single reset; small modules (about 300 lines per module, a few files); the Verilog and SystemVerilog that Icarus 12, Verilator and open-source Yosys 0.69 accept; cocotb tests. Out of scope: UVM, commercial simulators, concurrent SVA (open-source Yosys rejects `assert property (@(posedge clk) ...)`, local check), and multiple clocks.

### W1. Debug my failing test (lead workflow, Must)

| Field | Content |
|---|---|
| Story | "My `test_random` fails on the MAC. Find out why and fix the RTL without touching my tests." |
| Inputs | RTL files, a cocotb test plus `golden.py` (or a preset pack), all tests locked |
| Agent does | Runs lint and the tests. Pulls the first failing vectors and a cycle table around the first mismatch, then traces the drivers of the failing output (Yosys input cone). Writes a root-cause explanation that cites evidence ids. Proposes a whole-file edit to RTL only, which is automatically linted and re-tested before the engineer sees it. If the fix would require changing a test or the spec, the agent says "cannot satisfy" instead of trying to work around it |
| Real tools | Verilator lint, Icarus + cocotb, Yosys (`select <out> %ci*:-$dff` cone, not checked), a VCD dump module written by Verity plus a small parser |
| Engineer approves | Accept or reject each proposal. Tests and golden files are never writable by the agent (enforced in code) |
| Evidence shown | Expected vs got per failing vector (kept first, as D7 requires), the cycle table, driver source lines, the diff, before and after test results, and the tool commands and versions |

### W2. Optimize my module, with proof (Must)

| Field | Content |
|---|---|
| Story | "This block passes my tests. Make it smaller (or faster) without changing behavior." |
| Inputs | A passing module, its locked tests, a goal (area or timing), a dollar budget |
| Agent does | Launches the existing optimize workflow with the engineer's RTL as v1: SIMPLIFY, OPTIMIZE and EXPLORE children, repairs, PPA fitness vs v1, elites (D8 unchanged), then EQY of the winner against the engineer's RTL |
| Real tools | Icarus + cocotb, Yosys + Nangate45, OpenSTA, EQY |
| Engineer approves | Launching above the dollar threshold, and adopting the winner as a new version |
| Evidence shown | Area and clock period deltas vs **their** v1, each labeled with tool and stage; EQY `proven`, `inconclusive` ("tested, not proven") or `not_equivalent`; the diff; the evolution tree as a tab |

### W3. How strong are my tests? (Should)

| Field | Content |
|---|---|
| Story | "My tests pass. Would they catch a real bug?" |
| Inputs | Passing RTL and its locked tests |
| Agent does | Generates 20 to 40 mutants with `yosys mutate`, runs the tests on each one in parallel, and reports killed / (killed + survived). It lists each surviving mutant with its source line, labeled "possibly equivalent" when that applies. Stretch: it drafts a directed test for a survivor into a **new** file, which the engineer approves before it joins the locked set |
| Real tools | Yosys `mutate` (in the image, local check), Icarus + cocotb. Building and compiling 20 mutants took about 3.7 s (not checked); the cocotb time per mutant has not been measured |
| Engineer approves | Any new test file |
| Evidence shown | The mutation score, the survivors with their lines, and the commands |

### W4. Build a block from my spec, with a reference I approve (Could, cut first among workflows)

| Field | Content |
|---|---|
| Story | "Here is a short spec. Draft the interface and reference, I will check them, then build it." |
| Inputs | Spec text, or a preset (presets are already approved packs) |
| Agent does | Drafts a port table, a Python cycle model with a fixed signature (`reset()`, `step(inputs) -> outputs`) and a numbered test plan. A generic cocotb harness written by us drives the model, so the LLM never writes checker code. After the engineer locks the drafts, the current generate loop runs (with the section 4 fixes), followed by a mutation score. If 2 of 3 sampled candidates disagree with the model on the same scenario, the agent asks the engineer a spec question instead of repairing ([CorrectBench](https://arxiv.org/html/2411.08510v1)-style) |
| Real tools | Same as today, plus mutation |
| Engineer approves | The reference lock (mandatory, hashed) and the plan |
| Evidence shown | The reference hash and the label "AI-drafted, engineer-approved", test plan items hit, mutation score, logs |

### W5. Explain and triage (Could)

Read-only Q&A over the project (module hierarchy, parameters, "why did this fail" summaries for a ticket). Optionally run N seeds and bucket failures by first failing check, signal and cycle, then launch W1 on a bucket. This is low risk because it writes nothing ([ChipNeMo use cases](https://spectrum.ieee.org/ai-for-engineering)).

**Trust layer (applies to every workflow, Must):** an immutable record of model id, request id, prompts, parameters, every tool command and output, image digest, and SHA-256 of locked files; diff-first review; approvals enforced in code; evidence ids that every claim must cite (the UI flags claims without one); a "what was not verified" footer; an exportable evidence bundle (extends the D7 zip). Reason: LLM output varies even at temperature 0. 1,000 identical prompts gave 80 distinct completions, and deterministic kernels cost about 1.6x to 2.1x in speed ([Thinking Machines](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/), corrected). Reproducing a result therefore means re-running the tools on recorded artifacts, not asking the model again.

---

## 4. Fixing reliability now (first passing design)

**Diagnosis (local check):** the MAC failures come mostly from our own prompt and plan, not from a limit of the model. `pack.py` renders plain `output [..] name` under "Module header (use exactly)". At the same time, `rtl_gen.v1.md` requires `output reg` for outputs assigned in always blocks and allows helper modules. The plan asked for hand-built ripple-carry adders, array multipliers and a carry-save tree. In run `r_10eac53e`, attempt 1 had 6 modules, 14 lines containing `generate` and 11,334 output tokens, and failed on "unexpected endgenerate". Repairs then hit "Duplicate declaration of signal: out" and then PROCASSWIRE in other modules, so each repair fixed one module while the same bug class stayed elsewhere. All three error messages were reproduced in the image. The literature classes these as RTL knowledge gaps ("Wire in Always Block", "Variable Redefinition", "Incorrect Use of Generate Statement") rather than reasoning failures ([taxonomy](https://arxiv.org/html/2508.05266v2), corrected).

| Rank | Change | Fixes | Evidence | Effort |
|---|---|---|---|---|
| R1 | **Restricted SystemVerilog subset and a single behavioral module for v1.** Every port and signal is `logic`; `always_ff` uses non-blocking assignments and `always_comb` blocking ones. No `wire`/`reg`, no `generate`, no unpacked-array ports. Lanes are written out or use `for` loops inside `always_comb`. Use `*` and `+` for arithmetic in v1, and leave hand-built structures to the optimizer's EXPLORE step. Render the header with `logic` and delete the conflicting `output reg` rule. Tell the planner that plan blocks are sections of one module. Change sandbox flags to `iverilog -g2012`, Yosys `read_verilog -sv` (verify, measure) and `read_verilog -sv -formal` (eqy). Re-run the packs suite on all 7 packs | All three observed error classes, by construction | NVIDIA's VerilogEval rule "Declare all ports and signals as logic; do not to use wire or reg" ([source](https://raw.githubusercontent.com/NVlabs/verilog-eval/main/scripts/sv-generate), verified). A logic-style mac4 passes lint, `-g2012` and `read_verilog -sv` synth, and fails `-g2005` and plain `read_verilog` (local check) | 1 day |
| R2 | **Deterministic pre-repair fixer plus a guidance table keyed by Verilator error tag** (PROCASSWIRE, "Duplicate declaration of signal", unexpected generate/endgenerate, MULTIDRIVEN, BLKANDNBLK, WIDTH, undeclared identifier). The fixer promotes a redeclared or procedurally driven output to a variable and re-lints without an LLM call. The repair prompt gets the 2 to 4 matching guidance lines and the instruction "apply this fix to every module and signal with the same pattern". Optional: run a lint-fix inner loop on Lightning or Super before spending another Ultra repair | Repairs that chase one bug class from module to module | RTLFixer: error-tag retrieval took GPT-3.5 one-shot fixes from 58.7% to 89.9% with a 30-entry table. With GPT-4 the gain was small (0.91 to 0.98), so expect less on a strong model ([paper](https://arxiv.org/html/2311.16543v3), corrected). Template fixes before the LLM: [UVLLM](https://arxiv.org/html/2411.16238v1) (not checked) | 1 day |
| R3 | **Reasoning cost and truncation.** Store `finish_reason` and reasoning tokens per call (missing today, local check). Probe whether Nebius forwards `enable_thinking`, `medium_effort` (Ultra) and `low_effort` (Super), or maps `reasoning_effort` (section 5.5). Then measure pass rate, tokens and dollars on 10 mac4 fast runs per setting. If calls are truncated at 12,000, raise `rtl_max_output` | The 11k-token first attempt; possible silent truncation (one earlier attempt reported exactly 12,000 tokens, not checked) | Ultra card: `medium_effort` "uses significantly fewer reasoning tokens" ([card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16), verified). Accuracy grows with reasoning length and then flattens ([ScaleRTL](https://arxiv.org/abs/2506.05566v2), not checked), so measure instead of assuming | 0.5 day |
| R4 | **Sample k=3 first attempts in parallel** at the card's recommended temperature 1.0 and top_p 0.95 (config today: 0.2 for rtl_gen, 0.1 for repair). Drop candidates that fail lint after the fixer, score the rest by the fraction of vectors passed, repair only the best, and stop at the first full pass. Cut `max_repairs_baseline` to 2 and raise `max_llm_calls` from 16 to about 20 | One bad first draft consuming all repairs | AutoChip: more candidates (k) helped more than more repair depth; only k up to 5 and depth up to 10 were tested ([paper](https://arxiv.org/html/2411.11856v3), corrected). MAGE samples many candidates and scores them by mismatch fraction ([paper](https://arxiv.org/html/2412.07822v1), verified). Cost about 3 x $0.034 = $0.10 on Ultra at today's token use (est.), still under the $0.50 cap | 1.5 days |
| R5 | **Stall detection and restart.** Record a failure signature per attempt (lint tag and module, or first failing vector). If the same signature appears twice, discard the candidate and regenerate from the plan instead of patching | Repeated identical failures | ACE-RTL restarts when the same primary failure persists ([paper](https://arxiv.org/html/2602.10218), verified) | 0.5 day |
| R6 | **Better failure evidence in repair prompts:** a cycle table around the first mismatch (inputs, outputs and expected values per edge), plus the driver cone of the failing output, capped at about 20 rows and 12 signals. The same code powers W1 | Functional failures after lint passes | VerilogCoder tracer +11.5 to +19.8 points (corrected); MAGE feeds a text waveform window | 2 days (shared with W1) |
| R7 | A/B one short logic-style worked example in the RTL prompt; keep it only if evals improve | Style drift | One-shot helps some models and hurts others ([VerilogEval v2](https://arxiv.org/html/2408.11053v2), not checked) | 0.5 day |

**Done when (gate for milestone A1):** on Nebius, mac4 fast mode reaches a passing baseline in at least 9 of 10 runs, and alu8 and matmul4 each in at least 4 of 5. The packs suite stays green on all 7 packs with the new flags, and pytest is green. Median output tokens and dollars per passing baseline are recorded in `evals/report.md`. These are targets to measure, not predictions.

---

## 5. Architecture: how `backend/` evolves

### 5.1 Shape

```
Engineer: dashboard (later), optional MCP client (stretch)
   |  REST + SSE: thread channel (new) and run channel (existing RunEvent, unchanged)
backend/  one FastAPI process (unchanged choice: no Celery, no Redis)
  workspace/     projects, files, file_versions, proposals, threads, messages, tool_calls   [new]
  copilot/       hand-rolled tool loop, guards, approvals and locks enforced in code         [new]
  orchestrator/  generate | repair | optimize | prove  (existing; text-only LLM inside)        [kept]
  llm/           OpenAICompatProvider + messages, tools, tool_choice, stream                  [extended]
  tools/         ToolRunner -> verity-tools image, network none                               [extended]
  store/         SQLite + write-once blobs (reused for file versions)                         [new tables]
        |                                   |
  Nebius Token Factory                 sandbox: local Docker or Nebius Sandboxes (O3 still open)
  Ultra / Super / Lightning
```

What exists today (local check): `OpenAICompatProvider` sends exactly one system and one user message, with no tools and no streaming (streaming is a TODO). The SQLite tables are runs, candidates, attempts, events, artifacts, eval_results and daily_spend. `ToolRunner` has verify, measure and check_equivalence. Bug injectors (`wrong_width`, `off_by_one`, `missing_reset`, `swapped_operands`) and a repair suite already exist in `verity/evals/`.

### 5.2 Fixed tools (the only things the chat model can request)

| Tool | Returns (parsed, capped at about 4 KB) | Writes | Gate |
|---|---|---|---|
| `list_files`, `read_file(file_id, lines)`, `search_files(query)` | ids, kinds, lock state; text slices | no | none |
| `run_lint(version_set)` | top 20 Verilator diagnostics plus matching guidance lines | no | none |
| `run_tests(version_set)` | pass/fail, first 5 failing vectors (expected vs got) | no | none |
| `inspect_failure(test_run, signals<=12, window<=32)` | cycle table around the first mismatch; driver source lines | no | none |
| `measure(version)` | area and clock period, labeled with tool and stage | no | none |
| `check_equivalence(gold, gate)` | proven, not_equivalent, inconclusive | no | none |
| `mutation_score(version, n<=40)` | killed and survived, survivors with source lines | no | time cap |
| `propose_edit(file_id, full_content, rationale)` | pending proposal with a server-made diff, auto-linted and tested | proposal only | engineer accepts; rejected in code if the file is locked |
| `start_workflow(kind, target, goal, budget_usd)` | linked run id; results come back as proposals | proposals only | engineer approval above a dollar threshold |
| `update_plan(items)` | checklist shown to the engineer | plan only | engineer can edit |

Rules: ids instead of paths. The existing `Rtl` checks (size, ASCII, banned system tasks) run before any sandbox call on agent-written RTL. Fixed command templates, and no shell, ever. Edits are whole-file, which is the simplest edit format and fine for files under about 300 lines ([Aider](https://aider.chat/docs/more/edit-formats.html), corrected: Aider documents six formats). Authorization never depends on model output.

**Loop guards** (from LangChain's Nemotron 3 Ultra harness profile, registered for Nebius, [source](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/profiles/harness/_nvidia_nemotron_3_ultra.py), verified):
- at most 12 to 16 model calls per engineer message;
- stop after 3 identical consecutive tool calls;
- a fallback parser for tool calls written as text (`<tool_call><function=...>`);
- strip stray `<think>` tags;
- a placeholder for empty tool results;
- when the budget runs out, answer from the results gathered so far.

Do not echo `reasoning_content` back into the loop.

### 5.3 Model routing and cost

| Step | Model (Nebius id) | Price per 1M in / out | Why |
|---|---|---|---|
| Chat loop driver | Super `nvidia/nemotron-3-super-120b-a12b`, `low_effort` if forwarded | $0.30 / $0.90 | Tool loops at about a third of Ultra's price |
| RTL write, repair, optimize (inside workflows) | Ultra `nvidia/Nemotron-3-Ultra-550b-a55b`, `medium_effort` if forwarded | $1.00 / $3.00 | Correctness of v1 drives everything else |
| Summaries, lint-fix inner loop, draft failure explanations | Lightning `nvidia/Nemotron-3_5-Lightning`, thinking off | $0.06 / $0.24 | Cheap, short steps. It replaced Nemotron-3-Nano-Omni on Nebius on 2026-08-31 ([notice](https://docs.tokenfactory.nebius.com/august-2026-deprecation-notice.md)) |

Model ids are verified. Prices are the values set in [Nebius's cookbook config](https://github.com/nebius/token-factory-cookbook/tree/main/agents/agent-cost-comparison-1), not an official price page; Ultra and Super match the catalog prices already recorded in `backend/ARCHITECTURE.md` section 20. In that cookbook, all three models completed a multi-turn file tool loop on Nebius. On the same toy task Ultra took 23 calls ($0.085) and Super took 8 ($0.013). That is a vendor-published toy task, not hardware. Estimated cost of one 8-call engineer turn (about 80k input and 6k output tokens): about $0.03 on Super, $0.10 on Ultra, $0.006 on Lightning (est.).

### 5.4 Nebius and Nemotron facts this depends on

| Fact | Status |
|---|---|
| OpenAI-style function calling: `tool_choice` none, auto, required or a named function; the client executes the tools ([docs](https://docs.tokenfactory.nebius.com/ai-models-inference/function-calling.md)) | verified; no per-model support list |
| Nemotron tool loops work on Nebius for Ultra, Super and Lightning (cookbook, commit 2026-09-08) | verified (one toy task) |
| Chat API has `reasoning_effort` (none to max), `reasoning_content`, `usage...reasoning_tokens`, `cached_tokens`, `stream_options.include_usage`; `max_tokens` defaults to 8192 ([API](https://docs.tokenfactory.nebius.com/api-reference/inference/create-chat-completion.md)) | verified that the fields exist |
| Whether `reasoning_effort` or `chat_template_kwargs` (`enable_thinking`, `medium_effort`, `low_effort`, `force_nonempty_content`) actually reach Nemotron on Nebius | **unconfirmed** |
| `response_format` `json_schema`: the JSON guide shows it, but the API reference says only `json_object` or `text` ([guide](https://docs.tokenfactory.nebius.com/ai-models-inference/json.md)) | docs contradict each other; keep today's tolerant parser |
| Ultra: 550B total, 55B active; up to 1M context, 262,144 default in serving recipes; recommended temperature 1.0, top_p 0.95; tool calls rendered as XML-like blocks; earlier-turn reasoning dropped by default ([card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16), [template](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16/blob/main/chat_template.jinja)) | verified; context actually served on Nebius unconfirmed |
| Lightning: 30B total, 3B active, on/off reasoning only, OpenMDW-1.1, recommended for coding agents with `force_nonempty_content` ([card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16)) | verified |
| Rate limits are dynamic (example baseline 60 RPM, 400k TPM; HTTP 429 when exceeded) ([docs](https://docs.tokenfactory.nebius.com/ai-models-inference/rate-limits.md)) | not checked |
| Zero Data Retention is opt-in at the org level ([docs](https://docs.tokenfactory.nebius.com/legal/legal-quick-guide)) | verified. The UI states the policy; it cannot be toggled per request |
| Cached-token discount; whether tool-call deltas stream; whether text-only Nemotron 3 Nano is still served | **unconfirmed** |

### 5.5 Spike first (2026-10-07, about $0.05)

| Probe | Pass if | If it fails |
|---|---|---|
| `tools` with `tool_choice` auto and required on Ultra, Super, Lightning | Structured `tool_calls` come back | Use the text `<tool_call>` parser; failing that, the fallback in 5.7 |
| Streaming with tools | Tool-call deltas arrive incrementally | Show one card per tool step; no token streaming |
| `chat_template_kwargs` and `reasoning_effort` forwarding | `reasoning_tokens` drops with `enable_thinking: false` and with `medium_effort`/`low_effort` | Cap with `max_completion_tokens` and measure; keep k=3 only if affordable |
| `json_schema` enforcement | An invalid schema output is rejected or the output conforms | Keep json_object plus pydantic retry |
| `finish_reason` at the cap; whether reasoning counts toward `completion_tokens` | Documented in `backend/README.md` | Store raw usage and decide from data |
| `GET /v1/models?verbose=true` (free) | Context length and prices per model recorded | Use card values, labeled |

### 5.6 Reference generalization (how projects replace presets without trusting an LLM oracle)

A project's reference set is its locked files, copied fresh into each sandbox call by hash (same rule as task packs today). Kinds, in build order:

1. **Existing task packs** (Must). Presets become read-only demo projects.
2. **Engineer-uploaded cocotb test plus `golden.py`** (Must). A pack is built from the project. This user Python runs only in the network-none sandbox with the existing timeouts, and needs a security review before hosting.
3. **The engineer's own v1 RTL as gold**, checked by an auto-generated differential random testbench plus EQY (Could). The engineer must declare latency.
4. **AI-drafted reference after engineer approval** (W4, Could).

Only the engineer can lock or unlock files.

### 5.7 Fallback if the chat loop is unreliable

If the spike or A2 shows that Nemotron tool calling on Nebius crashes or misreads tool output (the NYU study found open models fail more on tool use), keep the product and drop the free chat. W1 to W3 become **buttons** that run deterministic workflows with today's text-only LLM model (`backend/ARCHITECTURE.md` 12.3 unchanged). For example, Debug becomes: run tests, build evidence, Ultra repair prompt with evidence, re-run, proposal. The engineer experience (project, locks, proposals, evidence) is the same; only the free-form chat is lost.

### 5.8 Not adopted before the freeze

LangGraph, deepagents, NeMo Agent Toolkit, NeMo Guardrails and NVIDIA OpenShell would each re-plumb the working ledger, store, SSE and safety model for no gain visible in the demo. Cite them in the README as references. Verity's fixed tools and code-enforced locks are a stricter control than a shell sandbox.

---

## 6. Plan, 2026-10-07 to 2026-10-25

Effort if everything is built: about 36 person-days (est.) against 19 calendar days. The plan therefore has Must, Should and Could tiers, and explicit cut lines. Coding goes to sonnet agents and reviews to opus, per the project's CLAUDE.md.

| # | Dates | Milestone | Done when |
|---|---|---|---|
| A0 | Wed 10-07 | Nebius probe (5.5) and baseline numbers from existing runs | Probe table in `backend/README.md`; spend under $0.10 |
| A1 | 10-07 to Fri 10-09 | Reliability R1 to R5 (R6 starts in A3) | Section 4 gate met, or the measured shortfall is recorded and the user decides |
| A2 | Sat 10-10 to Tue 10-13 | Workspace tables, `copilot/` loop, core tools (list, read, lint, tests, propose_edit), approvals and locks in code, thread SSE channel | Through the API: create a project from uploads or a preset, lock files, chat, get a proposal that is auto-tested, accept it into a new version. An edit to a locked file is rejected by a pytest test. Loop guards are tested with a fake provider that emits text tool calls and repeated calls. One real Super session costs under $0.05 |
| A3 | Mon 10-12 to Thu 10-15 | W1 Debug: `inspect_failure` (cycle table, then driver cone) plus R6 in repair prompts | Seeded-bug eval (existing injectors, 10 to 20 bugs across at least 3 packs): fix rate, cost and "tests untouched" recorded in `evals/report.md`. Every explanation cites evidence ids. Decision point: if fewer than half are fixed, the video leads with W2 instead |
| A4 | Thu 10-15 to Sun 10-18 | W2 on uploaded RTL via `start_workflow` (pack built from the project); W3 mutation score | A module that is not a preset, with its own cocotb test, runs optimize end to end with PPA vs its v1 and an EQY label. Mutation scores are reported for 3 packs. **Gate 10-18** (replaces the old PPA gate) |
| A5 | Mon 10-19 to Fri 10-23 | UI dashboard redesign (after the agent core, as the user asked): files and versions on the left; editor with diff accept and evidence tabs (expected vs got, cycle table, PPA, EQY) in the center; chat, plan, budget and run timeline on the right; the existing Evolution Tree as a workflow tab. Record real sessions for replay | A real debug thread and a real optimize run replay with no network call after load. `typecheck`, `lint`, `validate:fixture` and `build` exit 0. agent-browser check at 1440x900 |
| A6 | Sat 10-24 to Sun 10-25 | Ship hardening: auth on, access codes, ZDR decision, security review (`cso`) of upload, sandbox and tool paths, hosted URL, README with tool licenses | Hosted URL works from a clean browser; live sessions capped. **Feature freeze 10-25** |
| After | 10-26 to 10-29 | Video, Devpost text, Nebius and NVIDIA feedback, public repo with license | Submitted 10-29 |

**Tiers.** Must: R1 to R5, the probe, workspace, the tool loop or its fallback (5.7), W1, W2 with uploaded tests, the trust layer, replay for judges, Nebius runtime calls. Should: R6 driver cone, W3 score, the dashboard, a recorded debug replay. Could: W4 spec drafting, W5 triage, the differential testbench (5.6 kind 3), an MCP server (1.5 days), and a CVDP open-category subset run (cid16 debugging; report only against the same model single-shot, never against 97.1%).

**Cut lines, in this order if behind:**
1. CVDP subset.
2. MCP server.
3. W4 AI-drafted reference (keep presets and uploaded tests, and leave O9 as decided).
4. W5 triage.
5. W3 "draft a test for a survivor" (keep the score).
6. Driver cone (keep the cycle table).
7. Token streaming in chat (keep per-step tool cards).
8. Chat itself (switch to the 5.7 buttons).
9. The dashboard scope (a 3-pane shell around existing Studio components).

**Never cut:** R1 to R3, locked-file enforcement, approvals, the evidence trail, the replay, Nebius plus Nemotron at runtime.

**Credits (est.):** probe $0.05; reliability A/B 30 to 40 fast runs, $2 to $5; chat development on Super $1 to $2; seeded-bug eval $1 to $3; optimize runs and recordings $2 to $3. Total about $6 to $13, plus the hosted daily cap ($5 per day today). Keep a reserve for judging.

**Demo story (under 3 minutes):**

| Time | On screen | Says |
|---|---|---|
| 0:00 to 0:15 | A failing test in a real project | "Verification is about half of a chip project, and debug is the biggest slice. Verity works on your RTL, with your tests." |
| 0:15 to 0:35 | Project files, lock icons, hashes | "Your tests and reference are locked. The agent can read them, never edit them." |
| 0:35 to 1:20 | W1: tool cards (lint, tests), expected vs got, cycle table, driver lines, explanation citing evidence, a 3-line diff that has already passed, Accept | "Nemotron on Nebius found the root cause from the evidence and proposed a fix; Icarus and cocotb confirmed it." |
| 1:20 to 2:00 | W2: approve budget, evolution tab, area and clock deltas vs the engineer's v1 with tool labels, EQY result | "Smaller, measured by Yosys and OpenSTA against your own version, and checked for equivalence." (Say "tested, not proven" if EQY is inconclusive.) |
| 2:00 to 2:25 | W3: mutation score, a surviving mutant line | "Your tests missed this mutant. Here is where they are weak." |
| 2:25 to 2:45 | Evidence bundle export, model ids and request ids, "not verified" footer | "Every step is recorded: tool commands, versions, model calls. Built on NVIDIA Nemotron 3 Ultra, Super and Lightning on Nebius Token Factory, with open tools." |
| 2:45 to 3:00 | Presets as demo projects; repo link | "Open source. Point it at your module." |

---

## 7. Conflicts with existing decisions (not reconciled; each needs a user decision)

| Existing | What it says | Proposed change |
|---|---|---|
| D5 (REPORT) | Pitch opens "Describe a chip in plain English" | New D-entry with the section 3 draft pitch, keeping "tests" rather than "proves" |
| D6 (REPORT) | UI is one React Flow canvas (Plan Board plus Evolution Tree); "steering never blocks" | The dashboard replaces the single canvas; the Evolution Tree becomes a workflow tab and the Plan Board a plan checklist. Approvals block only for applying edits, locking references and spending above a threshold; workflows inside their budget stay on autopilot |
| D7 (REPORT), O9 (backend/ARCHITECTURE 23) | Live runs are presets only; no free-text specs or LLM-drafted references before submission | Live sessions run on engineer projects (uploads), with presets as demo projects; replay-first landing and the credit cap stay. O9 stays unless W4 is approved (W4 is the first workflow cut) |
| D7 detail | Failures shown as expected vs got; "waveform-first failure view" rejected | Expected vs got stays first. The cycle table and driver lines are added below it as evidence (not waveform-first) |
| D2 (REPORT) | Website; editor plugin and MCP server rejected | The website stays primary. An MCP server is an optional add-on (Could), only by a new decision |
| backend/ARCHITECTURE 12.3 | "The LLM is given no tools at all" | The chat model may request a closed set of fixed tools (5.2). The server validates and executes fixed templates; there is no shell. Workflows keep the text-only rule. The fallback in 5.7 restores 12.3 fully |
| backend/ARCHITECTURE 12.4 | "MVP specs are presets, so no user text reaches the model" | Engineer text and files reach the model, which creates a prompt-injection surface. Mitigations: tools cannot escalate, locks and approvals are in code, budgets, network-none sandbox, security review before hosting |
| backend/ARCHITECTURE 13 | The LLM never sees `golden.py` or `test_dut.py` | For engineer projects the agent may **read** locked tests and never write them (read-only tests remove the main cheating route; hidden tests also hurt legitimate performance, per [ImpossibleBench](https://arxiv.org/html/2510.20270)). Preset packs keep tests hidden so evals stay clean |
| backend/ARCHITECTURE 11.1, sandbox scripts, MEETING glossary | "Full Verilog-2005"; `-g2005`; "Verity's AI writes Verilog" | D11: restricted SystemVerilog subset (R1). Copy can say "Verilog/SystemVerilog". If rejected, keep Verilog-2005 but make the header and rules consistent and still ban `generate` and helper modules in v1 |
| backend/ARCHITECTURE 17, 20; `config.py` | Routing has Ultra for plan, RTL and repair and Super for the optimizer; temperatures 0.2/0.1; `max_llm_calls` 16 | Add Super as the chat driver and Lightning for cheap steps. Card temperatures for sampled first attempts. About 20 calls and k=3 with 2 baseline repairs |
| backend/ARCHITECTURE 19; MEETING 5 | Repair gets failing cases, not waveforms; the brief said "reads errors + waveform" | A compact cycle table and driver lines (R6) partly restore the brief's intent within a token cap |
| O12 (backend/ARCHITECTURE 23) | Steering only at the plan gate | Chat steering at any time; stop and queue as in coding agents |
| Frontend ARCHITECTURE section 5 (owns contracts) | RunEvent contract only | Additive thread events (`message.delta`, `tool.started`, `tool.finished`, `proposal.created`, `proposal.resolved`, `plan.updated`, `budget.updated`, `workflow.linked`); RunEvent and run replay unchanged; the replay fixture gains a thread form |
| UI_UX_SPEC pages | `/`, `/studio`, `/try`, `/results` | Dashboard redesign in A5 (the user already said the UI comes later) |
| REPORT section 6 gates | 10-11 "3 English specs to passing RTL unaided"; 10-18 PPA gain | Re-baseline to the A1 reliability gate and the A4 gate of 10-18 |
| MEETING section 4 | "GPT-5 exploited tests 76% of the time in ImpossibleBench" | The verified figure is 54% (conflicting-spec variant), cut to 9% with an abort option; check the 76% source before reuse |

When approved, these become new append-only entries in `REPORT.md` (D11 onward). This file does not edit REPORT.md.

---

## 8. Risks and open decisions

### 8.1 Open decisions for the user

| # | Decision | Recommendation |
|---|---|---|
| U1 | Reframe Verity as an engineer's verify, debug and optimize agent, with presets as demo projects | Yes. It is what the evidence supports and what "an agent the engineer can work with" means |
| U2 | Which workflow leads the video | W1 Debug, if the A3 eval fixes at least half the seeded bugs; otherwise W2 Optimize |
| U3 | D11: SystemVerilog subset vs Verilog-2005 | SV subset (R1). It is the cheapest fix with the strongest evidence |
| U4 | Allow tool calls for the chat model (supersede 12.3 for chat only) | Yes, with the closed tool set and the 5.7 fallback ready |
| U5 | Can the agent read the engineer's locked tests | Read yes, write never; preset packs stay hidden |
| U6 | Build W4 (AI-drafted reference) before the freeze | Only if A4 passes by 10-18; otherwise keep O9 as decided |
| U7 | MCP server | Only if A5 is on track by 10-21; otherwise a roadmap slide |
| U8 | External number | Our seeded-bug eval first. A CVDP cid16 subset only as a stretch, compared to the same model single-shot |
| U9 | Turn on Nebius Zero Data Retention for the hosting org | Yes, if latency stays acceptable in A6; state the policy in the UI |
| U10 | Demo project source | Our packs with realistic seeded bugs, plus one module written by the team member who reads Verilog (MEETING Q8), labeled as such. Third-party cores (for example Ibex) only if they run on Icarus 12 without changes |
| U11 | Validate with real engineers | Spend 1 day on 3 to 5 short conversations with RTL or DV engineers before A5. Forum evidence was thin (Reddit was unreachable) |

### 8.2 Risks

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| Scope: about 36 person-days of work in 19 days | High / High | Tiers and cut lines (section 6); the 5.7 fallback keeps the product without chat |
| Nemotron tool use on Nebius is unreliable (text tool calls, crashes, weak reading of tool output) | Medium / High | Spike on 10-07; loop guards; parsed and capped tool output; structured workflows ([NYU](https://arxiv.org/html/2603.19347)) |
| Reasoning controls not forwarded, so costs stay high | Medium / Medium | Cap tokens, measure, route chat to Super and cheap steps to Lightning, cut k to 2 |
| R1 to R5 do not reach the reliability gate | Low to Medium / High | Measured gate on 10-09; fall back to the fast path for demos; record the honest rate |
| Prompt injection through uploaded files or spec text | Medium / Medium | No privileged tools; locks and approvals in code; budgets; network-none sandbox; `cso` review in A6 |
| User Python (tests, golden) executing in the sandbox | Medium / High | Network none, non-root, timeouts, no secrets; isolation on Nebius Sandboxes unconfirmed (O3 still open) |
| Overclaiming to technical judges | Medium / High | Section 2 "must not claim" list; numbers only vs our own v1 and our own evals |
| EQY inconclusive for structurally different winners (seen today) | High / Low | Honest "tested, not proven"; fixed latency rule (O7) |
| Credits run out | Low / High | Section 6 budget; fake provider for UI work; replay for judges; daily cap |
| Judges see "yet another chat agent" | Medium / Medium | Lead with locks, evidence and measured tool results, not chat; open and runnable vs closed vendor agents |
| Live demo fails during judging | Medium / High | Replay-first landing (D7 kept); recorded real sessions |

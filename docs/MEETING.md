# Verity: Project Meeting Brief

**Meeting:** Friday 2026-10-02
**Project:** Verity: AI Hardware Engineer
**Goal of this meeting:** agree the scope, lock the open decisions, and assign owners so the build starts this weekend.

**How to use this doc**
- Section 1 is the short version: the most important questions, answers and problems. Read it first.
- Hardware words are explained in plain English in **Section 12 (Glossary)**. If a word in this doc is unfamiliar, look there.

---

## 1. Start here: the crucial questions and problems (recommended)

These are the questions most likely to decide whether the project succeeds, and the answers you should be able to give without notes.

### Crucial questions

**Q1. What does Verity actually produce?**
A tested Verilog file (the code that describes a chip), its test results, and its measured power, speed and size, for several improved versions. It does **not** produce a physical chip. Nobody in the hackathon manufactures chips; the output is a design that could be manufactured.

**Q2. How do we know the design is correct, and not just the AI saying so?**
Two safeguards. First, tests are checked against a **golden model**: a separate, simple reference program that computes the right answers, which the AI is not allowed to edit. Second, after optimizing, an **equivalence check** proves the faster version still behaves exactly like the tested one.

**Q3. What is new about it compared with "AI writes code"?**
The loop. It writes, tests, fixes its own bugs, then keeps redesigning for speed and size, and keeps the best version. Recent research (REvolution, 2026) shows this loop beats simply asking the AI many times.

**Q4. What can it not do?**
Large designs. Research shows AI-written chip code that is correct on the first try drops to 0% above about 500 lines. We deliberately pick one small showcase design (under 300 lines) and show it working and improving.

**Q5. Can we finish by the deadline?**
Yes, if we hold the scope. Internal deadline is Oct 29 (official: Oct 30, 10:00 AM Pacific). There is a **minimum version** that meets every rule even if things slip: English spec to tested Verilog with self-fixing, plus a size improvement, plus a recorded replay for judges.

**Q6. Will we run out of credits?**
Not if we develop for free and spend credits only at the end. Credits are $25 + $25 **per person**. Development can use free options (Section 7). Nebius is switched in by changing three settings.

**Q7. Is it allowed to reuse other people's code?**
Yes, with care. REvolution's code is public under the MIT license (a permissive open-source license). The rules require "new work, or significantly updated", so our own parts must be most of the project, and the README must credit REvolution.

**Q8. Does someone need to know hardware?**
Yes, at least one person must be able to read Verilog and tool error logs, even roughly. The AI writes the code, but a human has to judge whether results make sense and set up the tests.

### Crucial problems (ranked)

| # | Problem | Why it is serious | What we do |
|---|---|---|---|
| P1 | Credit budget is small | A full research-size run is ~400 AI calls (~$12 est.) | Develop free (Section 7); small runs; cheap model for easy steps |
| P2 | Judges run the demo on our bill | Every judge click spends our credits until judging ends | Instant replay of a recorded run; live runs capped |
| P3 | Nebius Sandbox limits are unknown | Chip tools might not fit or might time out | Test on day 1; fall back to size-only optimization or a Nebius Serverless Job |
| P4 | AI fails on big designs | Correctness collapses with size | One small showcase chip |
| P5 | AI can "cheat" its tests | Agents have been caught editing tests to pass | Tests and golden model kept where the AI cannot write |
| P6 | We start ~3 days behind | Week 1 was due Sep 28 | Weekly go / no-go gates; feature freeze Oct 25 |
| P7 | Numbers might look too good | Open tools are not industry signoff | Report gains relative to our own first version, and say so |

---

## 2. The one-line pitch

> Describe a chip in plain English. Verity writes the Verilog, tests it, fixes its own bugs, then redesigns it to run faster and smaller. Built on NVIDIA Nemotron and Nebius.

Not "an LLM that writes Verilog". An agent that does the engineer's loop: **design, test, fix, measure, improve**.

---

## 3. Why this project is worth doing

### The problem is real and expensive
- Custom chips (AI accelerators, edge devices, networking) need rare, specialized engineers and long design cycles.
- Every design goes through the same slow loop: write RTL, simulate, find bugs, fix, synthesize, check power/area/timing, repeat.
- NVIDIA's own chief scientist calls an end-to-end chip from a prompt "a distant goal". The gap is open.

### The industry is moving here right now
- **Production today:** Synopsys DSO.ai (700+ tape-outs), Cadence Cerebrus, Google AlphaChip, NVIDIA ChipNeMo internally.
- **Just announced (2026):** Cadence ChipStack RTL agent (Sep 22, early access), Synopsys AgentEngineer (Mar), Siemens Fuse EDA agent (Mar).
- **Funding:** ChipAgents raised a $134M Series A (120+ chip firms), Cognichip $60M.
- **Takeaway:** big players and investors are betting on AI chip design agents, but no released tool closes the full loop from an English spec to an optimized design. That is exactly what we demo.

### The research says the core idea works
- **REvolution (ASP-DAC 2026, POSTECH):** an evolving population of LLM-generated designs raised pass rates by up to 24 points and reached 95.5% on VerilogEval, with large power/area gains. It beat 200 independent attempts at the same budget, so the **loop** is what matters, not raw volume.
- **Agent loops work:** MAGE (95.7%) and VerilogCoder (94.2%) show that self-debugging agents are far better than single tries.
- **A hackathon team already proved the PPA loop is buildable in a day:** chip-harness (Sep 26 2026) got +46% clock speed (909.5 to 1332.2 MHz) on a MAC array for $8.23 in API spend.

### It fits this hackathon unusually well
- **Track text:** Coding & Agentic Engineering is literally "agents that write, run, and test code in Token Factory Sandboxes". That is our project.
- **Judges want** "an agent that plans, writes, tests, and iterates ... with minimal human input". Our loop does all four.
- **Measurable results:** most entries show a chat UI. We show numbers: tests passed, area down X%, clock up Y%, version by version.
- **Prize upside:** $20k grand prize, track winners get an NVIDIA Jetson, plus a $3k Tavily bonus we can target.

---

## 4. What makes us different

| Typical entry | Verity |
|---|---|
| LLM writes code once | Agent writes, tests, fixes itself |
| "It compiles" | Tested against a **locked golden model** the agent cannot edit |
| Correct is the finish line | Correct is the start; then it optimizes power, performance and area |
| One answer | Several design versions competing; best one wins (REvolution-style) |
| Trust the AI | Final design proven equivalent to the tested one (Yosys EQY) |

**Anti-cheating is a talking point:** research shows agents edit tests or hardcode answers to "pass" (GPT-5 exploited tests 76% of the time in ImpossibleBench). Our tests live outside the agent's reach. Judges who know AI will notice this.

---

## 5. How it works (30-second version)

```graphql
English spec
   -> Plan (Nemotron 3 Ultra)
   -> Write Verilog (Nemotron)
   -> Lint (Verilator) -> Simulate vs locked golden model (iverilog + cocotb)
        fail -> agent reads errors + waveform, fixes, retries
        pass -> Synthesize (Yosys): area, cell count
             -> optional Place & Route (OpenROAD): timing, power
             -> Optimizer proposes new versions, keep the best
             -> Prove optimized == verified (Yosys EQY)
   -> Live dashboard: agent steps, code diff, waveform, circuit, PPA chart
```

- **Brain:** NVIDIA Nemotron 3 Ultra (hard steps) and Super (cheap steps) on Nebius Token Factory.
- **Hands:** chip tools run in Nebius Token Factory Sandboxes.
- **Window:** web dashboard (Next.js + FastAPI live stream). Judges open a link, no install.
- **All chip tools are free and open source.**

---

## 6. A shortcut we found

- **REvolution's code is public and MIT-licensed** (github.com/kmcho2019/REvolution). It already runs iverilog + Yosys + OpenROAD in Docker and supports OpenAI-compatible APIs.
- **Nebius Token Factory is OpenAI-compatible**, so Nemotron should plug in with little work (to be confirmed on day 1).
- **Proposal:** study or reuse its evolution loop, credit it clearly, and spend our effort on what is new: English spec to golden model, the Nebius sandbox integration, anti-cheat test isolation, and the live dashboard.
- **Caution:** rules require "new work, or significantly updated". Our additions must be the bulk of the project, and the README must credit REvolution.

---

## 7. Building without burning credits

**Idea:** build and test almost everything for free, then connect Nebius at the end by changing three settings.

**How the switch works**
- Nebius Token Factory and the free options below all speak the same "OpenAI-compatible" API language.
- So the code never hard-codes a provider. The model's address, key and name live in a settings file (`.env`):
```text
LLM_BASE_URL=...   # which service to call
LLM_API_KEY=...    # password for that service
LLM_MODEL=...      # which model to use
```
- Switching to Nebius = editing these three lines. No code changes.

**Free ways to develop (cheapest first)**

| Option | Cost | Good for |
|---|---|---|
| Fake AI that returns pre-written Verilog | $0, no calls | Dashboard, pipeline, chip tools: most day-to-day work |
| Recorded replays (save real answers once, reuse in tests) | $0 after first call | Running the same scenario many times |
| Nemotron on our own PC (Ollama, `nemotron-3-nano`) | $0 | Real AI behavior, unlimited tries |
| NVIDIA build.nvidia.com free tier | $0, 40 requests/min | Nemotron 3 **Super**, same family as the final model |
| Chip tools (iverilog, Yosys, OpenROAD) in Docker on our PC | $0 | All testing and synthesis |

**Our dev PC:** 31 GB RAM, NVIDIA RTX 2070 SUPER (8 GB video memory). The 30B Nemotron 3 Nano (~24 GB) will run but slowly; a smaller Nemotron (~4B) runs fast on the graphics card.

**Two rules so this does not backfire**
1. Prompts tuned on a smaller or different model can behave differently on Nemotron 3 **Ultra**. Keep about half the credits for final tuning and the demo on Nebius.
2. Make one small real call to Nebius in **week 1** (part of the Oct 4 gate), so connection or tool-calling surprises show up early, not on Oct 25.

**Rules check:** "must run on Nebius" applies to the submitted project. We found nothing forbidding other tools during development (based on the rules summary; confirm on the Nebius Discord if needed). Free-tier details come from third-party guides; confirm at sign-up.

---

## 8. Honest risks and how we handle them

| Risk | Why it matters | Mitigation |
|---|---|---|
| Only $50 of credits per person | ~400 LLM calls per full REvolution-sized run (~$12 est.) | Develop free (Section 7); each teammate claims $25 + $25; small population (4 x 4 x 5 rounds, ~$1-2 per run est.); Nemotron Super for cheap steps |
| Judges run the demo on our bill | Uncontrolled spend until judging ends | Instant replay of a recorded run + capped live runs on preset specs |
| Sandbox limits undocumented | CPU, RAM, timeout unknown; OpenROAD is multi-GB | Test on day 1; fall back to Yosys-only area loop or a Nebius Serverless Job |
| Big designs fail | LLM pass rate drops to 0% above 500 lines | One small showcase chip under 300 lines (4x4 matrix multiply or MAC array) |
| Numbers look inflated | Open tools are not signoff; references may be unoptimized | Report relative gains within one flow, versus our own first version |
| Tight timeline | 28 days to the internal deadline (Oct 29) | Weekly go / no-go gates; feature freeze Oct 25 |

---

## 9. Plan and gates

We are about 3 days behind the original plan (week 1 was due to start Sep 28).

| Week | Dates | Goal | Gate (go / no-go) |
|---|---|---|---|
| 1 | Oct 2-8 | Setup + spikes: credits, sandbox image, free dev model, one real Nebius call, Nemotron on 20 test problems | Sandbox runs iverilog + Yosys; Nebius call works; Nemotron passes 10 of 20 |
| 2 | Oct 9-15 | Core loop: spec to RTL to sim to fix (on free models) | 3 English specs to passing RTL with no human help |
| 3 | Oct 16-21 | PPA loop: area, timing, versions, EQY | Measurable PPA gain on the showcase chip |
| 4 | Oct 22-25 | Switch to Nebius, tune prompts, dashboard, hosting, cost caps, Tavily | Hosted URL works from a clean browser; feature freeze |
| 5 | Oct 26-29 | Video, README, feedback, submit | Submitted Oct 29 |

**Minimum viable submission** (if things slip): spec to tested Verilog with self-fixing + Yosys area improvement + recorded replay. That alone meets every rule and still shows the loop.

---

## 10. Decisions needed in this meeting

1. **Team and roles:** who owns the agent loop, the chip tools/sandbox, the dashboard, and the video/submission? Who can read Verilog?
2. **Representative:** who submits on Devpost (one person, per the rules)?
3. **Showcase chip:** 4x4 matrix multiply or small MAC array?
4. **Optimization loop:** simple single-design refine loop, or small REvolution-style population?
5. **Free dev setup:** local Nemotron, build.nvidia.com free tier, or both?
6. **Hosting:** Nebius (~$100-250 est., best story) or free option (Vercel/Render + FastAPI on Nebius)?
7. **Credits:** everyone claims both $25 credits this week (code `NEBIUS-DEVPOST-GLOBAL26` + Builders Program).
8. **City** for the City Winner award (no event attendance needed).

---

## 11. Likely questions and answers

**"Isn't this just ChatGPT writing Verilog?"**
No. Writing code is step one. The agent tests against a model it cannot edit, fixes its own bugs, then keeps redesigning for speed and size. The output is a measured, proven-equivalent design, not a code snippet.

**"Big companies are doing this. Why us?"**
Their tools are unreleased or early access, closed, and expensive. We show the full loop in the open, on open tools, from an English spec, in a browser. For a hackathon, that is a strong and rare demo.

**"Can it design a GPU?"**
No, and we say so. Research shows correctness collapses on large designs. We focus on small blocks where the loop is reliable, and show that it measurably improves them.

**"Are the power/area numbers real?"**
They are real outputs of open-source tools (Yosys, OpenROAD), reported as relative gains within one flow. They are not commercial signoff numbers, and we say that.

**"What if the model gets it wrong?"**
That is the point of the loop: failing designs go back for fixing, and nothing ships unless it passes the locked tests and the equivalence check.

**"Can we afford it?"**
Yes, with discipline: free models during development, per-person credits, a small population, a cheaper model for simple steps, and a recorded replay for judges.

---

## 12. Glossary (plain English)

### Chips and hardware basics
- **Chip / integrated circuit (IC):** a small piece of silicon containing millions or billions of tiny switches (transistors) that compute.
- **Transistor:** a microscopic on/off switch. Everything a chip does is built from these.
- **Logic gate:** a tiny circuit made of transistors that does one simple job, like AND, OR or XOR on bits.
- **Cell / standard cell:** a ready-made gate or small block from a library, used as a building piece in chip design. "Cell count" is roughly how many pieces a design uses.
- **Accelerator:** a chip (or part of one) built to do one job very fast, such as matrix math for AI. GPUs are a famous example.
- **GPU:** graphics processing unit; a chip with many small cores, now used heavily for AI.
- **RISC-V:** an open, free instruction set for processors; popular in research and startups.
- **Matrix multiply:** the core math of AI, multiplying grids of numbers. A "4x4 matrix multiplier" multiplies two 4-by-4 grids.
- **MAC (multiply-accumulate):** multiply two numbers and add the result to a running total. AI chips use huge arrays of MAC units.
- **Combinational vs sequential circuit:** combinational output depends only on current input (like an adder). Sequential circuits also have memory and a clock (like a counter).
- **FSM (finite state machine):** a circuit that moves between a fixed set of states, like a traffic light controller.

### Describing a chip in code
- **RTL (register-transfer level):** a way of describing what a chip does, in terms of data moving between storage (registers) each clock tick. "Writing RTL" means writing the chip's code.
- **HDL (hardware description language):** a programming language for describing chips instead of software.
- **Verilog / SystemVerilog:** the most common HDLs. Verity's AI writes Verilog. Unlike software, every line runs at the same time (in parallel), which is why AI finds it harder.
- **Module:** one building block in Verilog, like a function or class in software. Big chips are many modules wired together.

### Testing a chip design
- **Simulation:** running the chip's code on a computer to see what it would do, before any chip exists.
- **Testbench:** test code that feeds inputs to a design and checks its outputs.
- **Golden model:** a simple, trusted reference program (in Python for us) that computes the correct answers. The design's outputs are compared against it. We lock it so the AI cannot change it.
- **Lint / linting:** an automatic check for code mistakes and bad style before running anything.
- **Waveform:** a graph of every signal in the chip over time; engineers read it to find bugs. Files are often **VCD** format.
- **Functional correctness / pass rate:** whether the design gives the right outputs. "Pass rate" = share of problems solved correctly.
- **pass@1:** pass rate when the AI gets one single try.
- **Equivalence check:** a mathematical proof that two versions of a design behave identically for every possible input. We use it to prove the optimized version still matches the tested one.
- **Formal verification:** proving correctness with math instead of only running tests.

### Turning code into a chip
- **Synthesis:** converting Verilog into an actual list of gates the chip would be built from. Tells us the design's size.
- **Netlist:** the output of synthesis: a list of gates and the wires between them.
- **Place and route (P&R):** deciding where every gate sits on the silicon and drawing every wire between them. Gives real timing and power. Takes minutes per run.
- **Layout:** the final physical drawing of the chip produced by place and route.
- **PDK (process design kit):** the rulebook and cell library for a specific chip factory process. **Nangate45** and **sky130** are free, open ones (45 nm and 130 nm).
- **nm (nanometer):** the size class of a manufacturing process. Smaller usually means faster and more efficient.
- **DRC (design rule check):** checks that the layout obeys the factory's rules.
- **Signoff:** the final, official check with commercial tools before manufacturing. Our open-tool numbers are good estimates, not signoff.
- **Tape-out:** sending the finished design to a factory to be manufactured.
- **Fab / foundry:** the factory that manufactures chips (for example TSMC).
- **SAIF:** a small file recording how often each signal switches, used for better power estimates.

### Measuring a chip: PPA
- **PPA (power, performance, area):** the three things every chip design trades off.
- **Power:** how much electricity it uses (watts, mW).
- **Performance:** how fast it runs, usually clock speed or how much work per second.
- **Area:** how much silicon it takes (square micrometers or mm²). Smaller is cheaper.
- **Clock / clock period:** the chip's heartbeat. Each tick, data moves one step. Shorter period = faster chip.
- **Fmax / MHz / GHz:** maximum clock speed. 1 GHz = one billion ticks per second.
- **Latency:** time from input to output.
- **Throughput / GOPS:** how much work per second (GOPS = billions of operations per second).
- **Timing slack / WNS / TNS:** how much spare time signals have each tick. Negative slack = design is too slow for the target clock. WNS = worst single case, TNS = total of all failures.

### The tools we use (all free)
- **EDA (electronic design automation):** the category of software used to design chips. Synopsys, Cadence and Siemens are the big commercial vendors.
- **iverilog (Icarus Verilog):** a free Verilog simulator.
- **Verilator:** a free, fast Verilog simulator and linter.
- **cocotb:** a Python library for writing testbenches; lets the golden model be plain Python.
- **Yosys:** free synthesis tool; turns Verilog into gates and reports size.
- **Yosys EQY:** Yosys's equivalence checker.
- **OpenROAD / OpenROAD-flow-scripts (ORFS):** free place-and-route flow; turns gates into a layout and reports timing and power.
- **Docker:** packages software and all its dependencies into one container that runs the same anywhere.
- **WSL2:** runs Linux inside Windows; the chip tools need Linux.

### AI and our stack
- **LLM (large language model):** an AI model that reads and writes text and code.
- **Agent:** an AI system that plans, takes actions with tools, checks the results and tries again, rather than answering once.
- **Nemotron:** NVIDIA's family of open AI models. **Ultra** = biggest and smartest, **Super** = mid-size and cheaper, **Nano** = small enough to run on a PC.
- **Nebius Token Factory:** Nebius's service for calling AI models over the internet; our hackathon credits are for this.
- **Token Factory Sandboxes:** isolated mini-computers from Nebius where our agent can safely run the chip tools.
- **Nebius AI Cloud / Serverless Job:** Nebius's rentable computers; our fallback if a sandbox is too small.
- **Token:** a chunk of text (roughly 3/4 of a word). AI services charge per million tokens.
- **API / API key:** a way for programs to call a service; the key is the password.
- **OpenAI-compatible API:** a common request format many AI services share, so switching providers only means changing the address, key and model name.
- **Ollama:** free software for running AI models on your own computer.
- **build.nvidia.com:** NVIDIA's site with free (rate-limited) access to its models for developers.
- **Rate limit (RPM):** maximum requests per minute a service allows.
- **Tool calling:** an AI model's ability to ask the program to run a tool (like a simulator) and read the result.
- **FastAPI:** a Python framework for building the backend server.
- **SSE (server-sent events):** a way for the server to push live updates to the web page, so judges see each step as it happens.
- **Next.js / Tailwind:** frameworks for building the website and styling it.
- **Tavily:** a search API for AI agents; we use it to look up datasheets, and it has its own $3,000 bonus prize.
- **Golden run / recorded replay:** a saved full run the dashboard can play back instantly without spending credits.

### Research terms
- **Benchmark:** a standard set of test problems used to compare methods. **VerilogEval**, **RTLLM** and **CVDP** are chip-code benchmarks; CVDP (by NVIDIA) is the hard, realistic one.
- **Ablation study:** an experiment that removes one part of a system to prove that part matters.
- **Evolutionary algorithm / population:** a search method inspired by natural selection: keep many candidates, create new ones from the best, discard the worst, repeat.
- **Fitness score:** the number that says how good a candidate is (for us: correct, then better PPA).
- **Local optimum:** a design that is better than its close variations but not the best overall; one-design-at-a-time refinement can get stuck there.
- **Multi-armed bandit / UCB:** a method for choosing between options (here, prompt strategies) by trying them and favoring the ones that work.
- **Fine-tuning:** further training an AI model on specific data; REvolution and Verity do not need it.

### Hackathon terms
- **Devpost:** the website hosting the hackathon and submissions.
- **Representative:** the one team member who officially enters the submission.
- **Track:** a prize category; ours is Coding & Agentic Engineering.
- **Gate (go / no-go):** a checkpoint where we decide whether to continue as planned or cut scope.
- **Feature freeze:** the date after which we only fix bugs, no new features.
- **MIT / Apache 2.0 / MPL 2.0:** open-source licenses the rules accept for our repo.

---

## 13. Sources

- Hackathon overview: https://nebiusglobalaihackathon.devpost.com/
- Rules: https://nebiusglobalaihackathon.devpost.com/rules
- Resources and credits: https://nebiusglobalaihackathon.devpost.com/resources
- REvolution paper: arXiv 2510.21407 (ASP-DAC 2026); code: https://github.com/kmcho2019/REvolution (MIT)
- NVIDIA build.nvidia.com free tier (third-party guides): https://yangmao.ai/en/providers/nvidia-build/ and https://decodethefuture.org/en/nvidia-nim-api-pricing-limits-guide/
- Nemotron 3 Nano on Ollama: https://cobusgreyling.medium.com/running-nvidias-nemotron-3-nano-model-locally-with-ollama-918c608dbc3a
- Industry, prior work and risk figures: `AI_Hardware_Engineer_Report.html` (DOC AIHE-01, compiled 2026-09-28)
- Plan, architecture, costs and gates: `Nebius_Hackathon_Game_Plan.html` (DOC AIHE-02)

**Caveats:** cost figures (per call, per run, hosting) are estimates, not measurements. Vendor claims (Cadence ChipStack) and NVIDIA's Nemotron benchmark claims are unverified by us. Free-tier limits come from third-party guides. Nothing has been built or run yet.

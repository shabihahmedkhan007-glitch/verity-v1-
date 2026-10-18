# Task pack self-test

Spec for the `packs` evals suite (ARCHITECTURE 13 and 14.3, CONTRACTS section 4). It costs $0 (no LLM) and runs
every pack under `backend/tasks/` through the same sandbox scripts a live run uses. A pack that fails its
self-test must not be offered, and the backend refuses to start on a broken pack (`load_packs` fails fast).

Not yet run: the first build pass had no Docker and no simulators. Run it on test day, after
`docker build -t verity-tools:0.1 -f sandbox/Dockerfile sandbox`, with `python -m verity.evals --suite packs`.

## What the suite does, per pack

1. **Integrity.** `TaskPack.load(root)` (parses `task.toml`, which rejects unknown keys, and verifies
   `MANIFEST.sha256`). Also `python tasks/make_manifest.py --check` must print `ok` for the pack. Record the pack hash.
2. **Rules.** `pack.validate_rtl(pack.reference_rtl())` must succeed (the reference obeys the coding rules, the
   line limit and the 20 KB limit). Otherwise the pack could never pass through a normal run.
3. **Reference passes.** Copy the pack with `pack.copy_for_sandbox(tmp)`, put the reference at `dut.v`, call
   `ToolRunner.verify`. Required: `status == "pass"`, `sim.total == sim.passed == task.toml test_count`,
   `lint.ok`, `contract.ok`. Warnings are allowed, errors are not.
4. **Determinism.** Run step 3 twice. Both runs must give the same `sim.total`, `sim.passed` and the same case
   list in `result.json` (`sim_result.json` `cases`). A flaky testbench is a failed pack.
5. **Measurable.** Call `ToolRunner.measure` on the reference. Required: `synth.ok` with an area greater than 0.
   `sta.ok` is reported but not required (STA is the least verified stage, CONTRACTS section 12).
6. **Mutants fail.** For every mutant in the table below, apply the exact text replacement to `reference.v`, check
   the result still passes `pack.validate_rtl` (so the failure must come from the sandbox, not the rules), call
   `verify`, and require `status != "pass"`. The expected status column is a guide; any non-pass status counts,
   and a mutant that passes means the testbench is too weak and the pack fails its self-test.
7. **Equivalence sanity (only when `eqy.enabled`).** `check_equivalence(reference, reference)` should be
   `proven` or `inconclusive`, never `not_equivalent`. `check_equivalence(reference, mutant)` for the first
   `sim_fail` mutant should be `not_equivalent` or `inconclusive`, never `proven`. This guards the proof path
   against false positives.
8. **Pack unchanged.** After all runs, `pack.reverify()` must succeed and the pack hash must equal step 1.

The report line per pack: `pack_id, pack_sha256, reference_pass, tests, mutants_killed/mutants_total,
area_um2, clock_period_ns, eqy_self, eqy_mutant`.

## Mutants

Each row is one exact, single occurrence text replacement in `reference.v` (the find string appears exactly once
in that file).

| Pack | Mutant | Find | Replace | Expected |
|---|---|---|---|---|
| mac4 | done_early | `cnt == 4'd15` | `cnt == 4'd14` | sim_fail |
| mac4 | acc_too_narrow | `output reg [21:0] acc` | `output reg [15:0] acc` | contract_fail |
| mac4 | lane_dropped | `acc <= acc + {4'd0, lane_sum};` | `acc <= acc + {4'd0, p0};` | sim_fail |
| mac4 | restart_after_done | `end else if (start && !done) begin` | `end else if (start) begin` | sim_fail |
| mac4 | missing_reset | `if (!rst_n) begin` | `if (1'b0) begin` | sim_fail |
| matmul4 | done_early | `cnt == 5'd23` | `cnt == 5'd22` | sim_fail |
| matmul4 | c_too_narrow | `output reg [319:0] c` | `output reg [279:0] c` | contract_fail |
| matmul4 | transposed | `ma[(row * 4 + k) * 8 +: 8] * mb[(k * 4 + col) * 8 +: 8]` | `ma[(col * 4 + k) * 8 +: 8] * mb[(k * 4 + row) * 8 +: 8]` | sim_fail |
| matmul4 | wrong_operand | `mb[cnt[1:0] * 32 +: 32] <= b_row;` | `mb[cnt[1:0] * 32 +: 32] <= a_row;` | sim_fail |
| matmul4 | missing_reset | `if (!rst_n) begin` | `if (1'b0) begin` | sim_fail |
| alu8 | sub_no_borrow | `3'd1: begin y_n = dif[7:0]; c_n = dif[8]; end` | `3'd1: begin y_n = dif[7:0]; c_n = 1'b0; end` | sim_fail |
| alu8 | y_too_narrow | `output reg [7:0] y,` | `output reg [6:0] y,` | contract_fail |
| alu8 | shr_no_carry | `3'd6: begin y_n = shr_ext[8:1]; c_n = shr_ext[0]; end` | `3'd6: begin y_n = shr_ext[8:1]; c_n = 1'b0; end` | sim_fail |
| alu8 | cmp_zero_flag | `z_n = (op == 3'd7) ? (a == b) : (y_n == 8'd0);` | `z_n = (y_n == 8'd0);` | sim_fail |
| alu8 | missing_reset | `if (!rst_n) begin` | `if (1'b0) begin` | sim_fail |
| add8 | cout_stuck | `assign cout = total[8];` | `assign cout = 1'b0;` | sim_fail |
| add8 | cin_ignored | `{8'd0, cin}` | `{8'd0, 1'b0}` | sim_fail |
| add8 | sum_too_narrow | `output [7:0] sum,` | `output [6:0] sum,` | contract_fail |
| cnt8 | enable_ignored | `else if (en)` | `else` | sim_fail |
| cnt8 | step_two | `q <= q + 8'd1;` | `q <= q + 8'd2;` | sim_fail |
| cnt8 | missing_reset | `if (!rst_n)` | `if (1'b0)` | sim_fail |
| cnt8 | q_too_narrow | `output reg [7:0] q` | `output reg [6:0] q` | contract_fail |
| fsm_seq | wrong_pattern | `(window == 4'b1011)` | `(window == 4'b1010)` | sim_fail |
| fsm_seq | detect_early | `detect <= hit;` | `detect <= (seen == 4'd3) && (hist == 3'b101);` | sim_fail |
| fsm_seq | detect_kept_on_reset | `detect <= 1'b0;` | `detect <= detect;` | sim_fail |
| fsm_seq | missing_reset | `if (!rst_n) begin` | `if (1'b0) begin` | sim_fail |
| fsm_seq | detect_too_wide | `output reg   detect` | `output reg [1:0] detect` | contract_fail |
| mm4_int4 | done_early | `cnt == 5'd23` | `cnt == 5'd22` | sim_fail |
| mm4_int4 | unsigned_lane | `reg signed [3:0] av;` | `reg [3:0] av;` | sim_fail |
| mm4_int4 | c_too_wide | `output reg [159:0] c,` | `output reg [199:0] c,` | contract_fail |
| mm4_int4 | result_off_by_one | `c[e * 10 +: 10] <= dot;` | `c[e * 10 +: 10] <= dot + 10'sd1;` | sim_fail |

A `missing_reset` mutant leaves registers at X (Icarus is 4-state), which the testbench reports as `got: "X"`.

## Width lock (mm4_int4 against matmul4)

The `isolation` suite also uses `mm4_int4` to prove the width lock: feed the `matmul4` reference (8-bit lanes) as
a candidate for `mm4_int4` after renaming its module (`module matmul4` to `module mm4_int4`). `verify` must return `contract_fail` with `port a_row: width 32, expected 16` before any
simulation runs. A repair prompt can therefore never "fix" a failure by widening a port.

## Adding a pack

Create `tasks/<id>/` with `task.toml`, `golden.py`, `test_dut.py`, `reference.v`, then run
`python tasks/make_manifest.py <id>`. The folder name must equal `id` in `task.toml`. A live preset needs the same
`id`, title, text, ports, test count and line limit as `frontend/src/lib/contracts/presets.ts`. Add at least three
mutants to the table above, including one width mutant (`contract_fail`) and one timing mutant.

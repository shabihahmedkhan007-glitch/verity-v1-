"""cocotb testbench for fsm_seq (locked: the agent never sees or edits this file).

Exactly one cocotb test (run_all) runs 12 named cases: 10 directed, then 2 seeded random. A case is a list of
(rst_n, din) stimuli, one per clock edge, checked against golden.golden_fsm_seq_step. For every step the
testbench drives the inputs on the falling edge, checks detect has NOT changed yet (registered), clocks once,
then compares detect. X or Z on detect is a failure.

Timing convention: inputs change and outputs are sampled only on the falling clock edge.
"""

import os
import random
from dataclasses import dataclass

import cocotb
import golden
from cocotb.triggers import FallingEdge, RisingEdge
from verity_tb import PASSED, Outcome, Recorder, read_int, reset_dut, run_cases, settle, start_clock

TOP = "fsm_seq"
RANDOM_STEPS = 64


@dataclass
class Case:
    name: str
    inputs: str
    steps: list  # (rst_n, din)


def bits(text):
    return [(1, int(ch)) for ch in text]


def build_cases(rng):
    cases = [
        Case("reset_state", "reset held low with din high", [(0, 1), (0, 1), (0, 0), (1, 0), (1, 0)]),
        Case("exact_1011", "bits 1011", bits("1011") + bits("0")),
        Case("overlap_1011011", "bits 1011011", bits("1011011") + bits("0")),
        Case("no_match_zeros", "eight zeros", bits("00000000")),
        Case("near_miss_1010", "bits 1010 repeated", bits("10101010")),
        Case("near_miss_1001", "bits 1001 repeated", bits("10011001")),
        Case("triple_overlap", "bits 1011011011", bits("1011011011") + bits("0")),
        Case("reset_mid_sequence", "bits 101, reset, bit 1", bits("101") + [(0, 0)] + bits("1") + bits("011")),
        Case("all_ones", "eight ones", bits("11111111")),
        Case("alternating", "bits 10 repeated", bits("1010101010101010")),
    ]
    for i in range(2):
        steps = [(0 if rng.random() < 0.05 else 1, rng.getrandbits(1)) for _ in range(RANDOM_STEPS)]
        cases.append(Case(f"random_{i + 1}", f"{RANDOM_STEPS} random steps, seed {os.environ.get('VERITY_SEED', '1')}, set {i + 1}", steps))
    return cases


def fmt_detect(value):
    return "detect=X" if value is None else f"detect={value}"


async def run_case(dut, case):
    await reset_dut(dut.clk, dut.rst_n)
    start = read_int(dut.detect)
    if start != 0:
        return Outcome(False, "detect=0 after reset", fmt_detect(start), 0)
    history, expected = (0, 0, 0), 0
    for n, (rst_n, din) in enumerate(case.steps, start=1):
        dut.rst_n.value = rst_n
        dut.din.value = din
        await settle(1)
        early = read_int(dut.detect)
        if early != expected:
            return Outcome(
                False,
                f"detect unchanged before the edge: {expected}",
                f"{fmt_detect(early)} (changed before the edge)",
                n,
                f"step {n}: rst_n={rst_n} din={din}",
            )
        await RisingEdge(dut.clk)
        await FallingEdge(dut.clk)
        history, expected = golden.golden_fsm_seq_step(history, rst_n, din)
        got = read_int(dut.detect)
        if got != expected:
            sent = "".join(str(d) for _, d in case.steps[:n])
            return Outcome(False, f"detect={expected}", fmt_detect(got), n, f"step {n}: rst_n={rst_n} din={din}, bits so far ...{sent[-24:]}")
    dut.rst_n.value = 1
    dut.din.value = 0
    return PASSED


@cocotb.test()
async def run_all(dut):
    rec = Recorder(TOP)
    start_clock(dut, "clk")
    dut.rst_n.value = 1
    dut.din.value = 0
    rng = random.Random(int(os.environ.get("VERITY_SEED", "1")))
    cases = build_cases(rng)
    await run_cases(rec, cases, lambda case: run_case(dut, case))

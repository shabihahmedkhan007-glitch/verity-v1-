"""cocotb testbench for add8 (locked: the agent never sees or edits this file).

Exactly one cocotb test (run_all) runs 12 named cases: 9 directed, then 3 seeded random. A case is a list of
(a, b, cin) vectors. The design is combinational, so each vector is driven and sampled 1 ns later, with no clock.
X or Z on an output is a failure.
"""

import os
import random
from dataclasses import dataclass

import cocotb
import golden
from verity_tb import PASSED, Outcome, Recorder, fmt_hex, read_int, run_cases, settle

TOP = "add8"
RANDOM_VECTORS = 64
CORNERS = (0, 1, 127, 128, 255)


@dataclass
class Case:
    name: str
    inputs: str
    vectors: list  # (a, b, cin)


def build_cases(rng):
    cases = [
        Case("add_zero", "0 + 0 + 0", [(0, 0, 0)]),
        Case("add_one_plus_one", "1 + 1", [(1, 1, 0), (2, 3, 0), (10, 20, 0)]),
        Case("add_carry_in_only", "0 + 0 + cin", [(0, 0, 1), (1, 0, 1), (254, 0, 1)]),
        Case("add_max_no_cin", "255 + 0", [(255, 0, 0), (0, 255, 0), (255, 1, 0)]),
        Case("add_max_with_cin", "255 + 0 + 1", [(255, 0, 1), (0, 255, 1), (255, 1, 1)]),
        Case("add_overflow", "255 + 255 + cin", [(255, 255, 0), (255, 255, 1), (200, 100, 1)]),
        Case("add_half_range", "128 + 128", [(128, 128, 0), (128, 127, 0), (127, 128, 1)]),
        Case("add_alternating_bits", "0xAA + 0x55", [(0xAA, 0x55, 0), (0xAA, 0x55, 1), (0x55, 0x55, 0)]),
        Case("add_corner_grid", "corner values for a, b and cin", [(a, b, c) for a in CORNERS for b in CORNERS for c in (0, 1)]),
    ]
    for i in range(3):
        vectors = [(rng.randrange(256), rng.randrange(256), rng.getrandbits(1)) for _ in range(RANDOM_VECTORS)]
        cases.append(Case(f"add_random_{i + 1}", f"{RANDOM_VECTORS} random vectors, seed {os.environ.get('VERITY_SEED', '1')}, set {i + 1}", vectors))
    return cases


def fmt_out(total, cout):
    return f"sum={fmt_hex(total, 8)} cout={'X' if cout is None else cout}"


async def run_case(dut, case):
    for n, (a, b, cin) in enumerate(case.vectors, start=1):
        expected = golden.golden_add8(a, b, cin)
        dut.a.value = a
        dut.b.value = b
        dut.cin.value = cin
        await settle(1)
        got = (read_int(dut.sum), read_int(dut.cout))
        if got != expected:
            stimulus = f"a={fmt_hex(a, 8)} b={fmt_hex(b, 8)} cin={cin}"
            return Outcome(False, fmt_out(*expected), fmt_out(*got), n, stimulus)
    return PASSED


@cocotb.test()
async def run_all(dut):
    rec = Recorder(TOP)
    dut.a.value = 0
    dut.b.value = 0
    dut.cin.value = 0
    await settle(1)
    rng = random.Random(int(os.environ.get("VERITY_SEED", "1")))
    cases = build_cases(rng)
    await run_cases(rec, cases, lambda case: run_case(dut, case))

"""Golden model for mac4: 4-lane unsigned 8-bit multiply-accumulate over 16 accumulate edges.

Pure function of its inputs: no I/O, no cocotb, no randomness. The testbench (test_dut.py) calls it and compares.
"""

LANES = 4
LANE_BITS = 8
CYCLES = 16
ACC_BITS = 22
ACC_MASK = (1 << ACC_BITS) - 1


def lane_products(a_lanes, b_lanes):
    """The four unsigned products for one accumulate edge."""
    return [(a & 0xFF) * (b & 0xFF) for a, b in zip(a_lanes, b_lanes)]


def golden_mac4(a_cycles, b_cycles):
    """Final acc after 16 accumulate edges.

    a_cycles[k] and b_cycles[k] are the four lane values present on a and b at accumulate edge k + 1.
    The inputs on the start edge (edge 0) are not part of the sum.
    """
    acc = 0
    for a_lanes, b_lanes in zip(a_cycles, b_cycles):
        acc += sum(lane_products(a_lanes, b_lanes))
    return acc & ACC_MASK

"""Golden model for add8: 8-bit adder with carry in and carry out (combinational).

Pure function of its inputs: no I/O, no cocotb, no randomness.
"""


def golden_add8(a, b, cin):
    """Return (sum, cout): the low 8 bits of a + b + cin, and the carry out of bit 7."""
    total = (a & 0xFF) + (b & 0xFF) + (cin & 1)
    return total & 0xFF, total >> 8

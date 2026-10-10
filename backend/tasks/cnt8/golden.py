"""Golden model for cnt8: 8-bit up counter with enable and synchronous active-low reset.

Pure function of its inputs: no I/O, no cocotb, no randomness.
"""


def golden_cnt8_step(q, rst_n, en):
    """Value of q after one rising edge that samples rst_n and en. Reset wins over enable."""
    if not rst_n:
        return 0
    return (q + 1) & 0xFF if en else q & 0xFF

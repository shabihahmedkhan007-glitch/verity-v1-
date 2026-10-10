"""Golden model for fsm_seq: serial detector for the bit pattern 1011 (overlaps allowed), registered output.

Pure function of its inputs: no I/O, no cocotb, no randomness.
"""

PATTERN = (1, 0, 1, 1)


def golden_fsm_seq_step(history, rst_n, din):
    """One rising edge. `history` is the tuple of the last three bits received (oldest first).

    Returns (new_history, detect). Reset clears the history and detect. After reset the history is (0, 0, 0),
    which can never be the start of the pattern, so the first bit received is the first bit of a pattern.
    """
    if not rst_n:
        return (0, 0, 0), 0
    window = (*history, din & 1)
    return window[1:], 1 if window == PATTERN else 0

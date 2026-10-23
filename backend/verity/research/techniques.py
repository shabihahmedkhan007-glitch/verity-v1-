"""The fixed technique list per live family (plan claim 2.2). Only these ids, with OUR one-line labels, ever reach a
Nemotron role. No web text, no summary text and no user text crosses into a run.

A research summary may name a technique only when its id is in this list for the family AND one of its keywords
appears in a source it cites (checked in code, verity.research.summary). Pipelining is not in the list: pack latency is
fixed and checked by feasibility and EQY. Nemotron still writes every line of Verilog; no code is fetched from the web.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Technique:
    id: str
    label: str  # short name shown in the chat and the plan prompt
    idea: str  # our own one-line description, used in the plan prompt and as the EXPLORE idea
    keywords: tuple[str, ...]  # lowercase; one must appear in a cited title or snippet
    goals: tuple[str, ...] = ()  # the run goals (area | speed | power) this approach usually serves; ranks it first for them


TECHNIQUES: dict[str, tuple[Technique, ...]] = {
    "add8": (
        Technique(
            "ripple_carry",
            "Ripple-carry adder",
            "one full adder per bit; the carry passes from bit to bit",
            ("ripple",),
            ("area", "power"),
        ),
        Technique(
            "carry_lookahead",
            "Carry-lookahead adder",
            "generate and propagate signals compute the carries of a group in parallel",
            ("lookahead", "look-ahead", "carry look ahead"),
            ("speed",),
        ),
        Technique(
            "carry_select",
            "Carry-select adder",
            "each block computes the sum for both carry-in values and a mux picks one when the carry arrives",
            ("carry select", "carry-select"),
            ("speed",),
        ),
        Technique(
            "kogge_stone",
            "Kogge-Stone adder",
            "a parallel prefix tree for the carries with the fewest logic levels",
            ("kogge",),
            ("speed",),
        ),
        Technique(
            "brent_kung",
            "Brent-Kung adder",
            "a parallel prefix tree for the carries with fewer cells and a few more levels",
            ("brent",),
            ("speed",),
        ),
    ),
    "cnt8": (
        Technique(
            "ripple_incrementer",
            "Ripple incrementer",
            "each bit toggles when every lower bit is one, with the all-ones condition chained bit to bit",
            ("ripple",),
            ("area", "power"),
        ),
        Technique(
            "lookahead_incrementer",
            "Lookahead incrementer",
            "the all-ones condition of the lower bits is computed in parallel groups, which splits the carry chain",
            ("lookahead", "look-ahead", "carry chain", "prefix"),
            ("speed",),
        ),
    ),
    "mac4": (
        Technique(
            "booth_radix4",
            "Radix-4 Booth multiplier",
            "recode the multiplier in radix 4 so there are half as many partial products",
            ("booth",),
            ("area", "speed"),
        ),
        Technique(
            "wallace_tree",
            "Wallace tree",
            "add the partial products with layers of carry-save adders and one final adder",
            ("wallace",),
            ("speed",),
        ),
        Technique(
            "dadda_tree",
            "Dadda tree",
            "a carry-save reduction of the partial products that uses as few adders per layer as possible",
            ("dadda",),
            ("speed", "area"),
        ),
        Technique(
            "carry_save_accumulate",
            "Carry-save accumulator",
            "keep the running sum in carry-save form and resolve it with one adder at the end",
            ("carry-save", "carry save"),
            ("speed",),
        ),
    ),
    "fsm_seq": (
        Technique(
            "binary_encoding",
            "Binary state encoding",
            "number the states in binary so the state register has the fewest bits",
            ("binary encod", "state encoding", "binary state"),
            ("area", "power"),
        ),
        Technique(
            "one_hot_encoding",
            "One-hot state encoding",
            "one flip-flop per state, which keeps the next-state logic simple",
            ("one-hot", "one hot"),
            ("speed",),
        ),
        Technique(
            "shift_register_match",
            "Shift-register match",
            "keep the last input bits in a shift register and compare them with the pattern",
            ("shift register", "shift-register"),
            ("speed",),
        ),
    ),
}

_BY_ID: dict[str, Technique] = {t.id: t for family in TECHNIQUES.values() for t in family}


def techniques_for(family: str | None) -> tuple[Technique, ...]:
    return TECHNIQUES.get(family or "", ())


def technique(technique_id: str) -> Technique | None:
    return _BY_ID.get(technique_id)


def valid_ids(family: str | None, ids: list[str]) -> list[str]:
    """Keep only ids from this family's fixed list, in the order given, without duplicates."""
    allowed = {t.id for t in techniques_for(family)}
    out: list[str] = []
    for tid in ids:
        if tid in allowed and tid not in out:
            out.append(tid)
    return out


def mentioned_in(family: str | None, text: str) -> set[str]:
    """Ids of this family whose keywords appear in `text` (used to guess which technique a plan already uses)."""
    low = text.lower()
    return {t.id for t in techniques_for(family) if any(k in low for k in t.keywords)}

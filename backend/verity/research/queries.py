"""Search queries from code templates only (plan claim 1.2). Never raw user text.

In-family requests are searched from the family and its knobs. Other hardware requests are searched from the
parser's intent label after code keeps only words from a fixed hardware vocabulary, so a product name, a private
idea or an instruction typed by the user never reaches Serper or Google. At most `research.max_queries` (3) queries.
"""

import hashlib
import json
import re
from collections.abc import Mapping
from dataclasses import dataclass

from .serper import Endpoint

MAX_LABEL_WORDS = 6
_WORD = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
_BITS = re.compile(r"^\d{1,3}-bit$")

# Words a label may keep. Anything else (names, places, brands, instructions) is dropped before a query is built.
HARDWARE_VOCAB: frozenset[str] = frozenset(
    """
    adder subtractor counter incrementer decrementer multiplier divider accumulator mac alu cpu gpu npu tpu dsp fpu
    processor microprocessor microcontroller controller core risc risc-v riscv cache memory ram sram dram rom fifo lifo
    stack queue buffer register registers file shift shifter barrel mux multiplexer demux demultiplexer decoder encoder
    comparator parity crc checksum ecc hamming fsm state machine sequence detector pattern timer clock divider pll
    oscillator pwm uart spi i2c usb pcie ethernet bus axi apb arbiter scheduler interrupt dma pipeline pipelined
    systolic array matrix vector tensor convolution fft fir iir filter neural network accelerator inference ai ml
    crypto aes sha hash rsa random lfsr prng gray bcd binary one-hot display seven-segment segment led lcd vga hdmi
    video image camera audio codec sensor motor stepper servo traffic light vending elevator thermostat temperature
    keypad keyboard debouncer debounce edge signed unsigned integer fixed floating point bit bits byte word carry
    lookahead ripple select prefix booth wallace dadda up down modulo mod synchronous asynchronous serial parallel
    low power area fast small digital analog mixed-signal rf radio amplifier adc dac regulator supply battery charger
    soc asic fpga chip circuit logic gate gates latch flip-flop flipflop transistor cmos verilog rtl vhdl hdl
    architecture unit block engine detector generator divider square root sqrt sorter sorting network-on-chip noc
    """.split()
)
STOP = frozenset("a an the of for and or to with in on my me i want make build design please".split())

FAMILY_TERMS: dict[str, list[str]] = {
    "add8": ["adder", "carry"],
    "cnt8": ["counter", "incrementer"],
    "mac4": ["multiply", "accumulate"],
    "fsm_seq": ["sequence", "state"],
}


def safe_label(label: object) -> str:
    """The parser's label reduced to hardware-vocabulary words (and "16-bit" style tokens), at most 6 words."""
    if not isinstance(label, str):
        return ""
    words = []
    for word in _WORD.findall(label.lower()[:120]):
        if word in STOP:
            continue
        if word in HARDWARE_VOCAB or _BITS.match(word):
            if word not in words:
                words.append(word)
        if len(words) >= MAX_LABEL_WORDS:
            break
    return " ".join(words)


@dataclass(frozen=True, slots=True)
class Query:
    endpoint: Endpoint
    q: str


def family_queries(family: str, params: Mapping[str, object]) -> list[Query]:
    width = params.get("width")
    w = f"{width}-bit " if isinstance(width, int) and not isinstance(width, bool) else ""
    if family == "add8":
        return [Query("search", f"{w}adder architecture area delay comparison"), Query("scholar", "carry lookahead carry select adder comparison")]
    if family == "cnt8":
        return [Query("search", f"{w}synchronous counter incrementer design"), Query("scholar", "fast synchronous binary counter lookahead")]
    if family == "mac4":
        return [Query("search", f"{w}multiply accumulate unit design area"), Query("scholar", "multiply accumulate booth wallace tree low area")]
    if family == "fsm_seq":
        return [Query("search", "sequence detector state machine design"), Query("scholar", "finite state machine state encoding one-hot binary area")]
    return []


def label_queries(intent_class: str, label: str, family: str | None, params: Mapping[str, object]) -> list[Query]:
    """Queries for requests outside the families: built on the filtered label, plus the closest family's query."""
    out: list[Query] = []
    if label:
        out.append(Query("search", f"{label} digital design architecture"))
        out.append(Query("scholar", f"{label} hardware architecture"))
        if intent_class in ("too_big", "not_digital"):
            out.append(Query("patents", f"{label} circuit"))
    if family and len(out) < 3:
        out.extend(family_queries(family, params)[: 3 - len(out)])
    return out


def key_terms(label: str, family: str | None) -> list[str]:
    terms = [w for w in label.split() if not _BITS.match(w)]
    for t in FAMILY_TERMS.get(family or "", []):
        if t not in terms:
            terms.append(t)
    return terms


def canonical_key(family: str, params: Mapping[str, object]) -> str:
    """sha256 of the family plus its validated knobs (defaults filled in by the caller)."""
    body = json.dumps({"family": family, "params": dict(params)}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def query_key(queries: list[Query]) -> str:
    body = json.dumps(sorted([q.endpoint, q.q] for q in queries), separators=(",", ":"))
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def text_sha256(text: str) -> str:
    """The user's sentence is never stored in the shared store; only this hash of its normalized form."""
    normalized = " ".join(text.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

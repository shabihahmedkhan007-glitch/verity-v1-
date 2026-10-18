"""Optimizer role (operators SIMPLIFY, OPTIMIZE, EXPLORE): a parent design and its measured PPA in, a child design out.

Same pattern as REvolution's operators, at tiny scale: the child must keep the interface and the latency, and is
judged afterwards by the golden model and by PPA against our own v1.
"""

import hashlib

from ..contracts import PPA, Priority
from ..core.llm_types import RtlOut
from ..core.pack import TaskPack
from ..core.protocols import LLMGateway
from .common import call_parsed, format_ppa, priority_text, relative_note
from .parsing import RtlAnswer, parse_rtl_answer
from .prompts import load_template

TEMPLATE_FILE = "optimize.v2.md"
FORMAT_HINT = "Give one REASON line, then exactly one ```verilog fenced block with the whole file."

STRATEGIES: dict[str, str] = {
    "SIMPLIFY": (
        "SIMPLIFY: make the design smaller by removing what is not needed. Look for redundant registers, signals wider "
        "than any value can use, duplicated logic, unused outputs of sub-expressions, and logic that can share a "
        "resource. Do not trade away behavior."
    ),
    "OPTIMIZE": (
        "OPTIMIZE: improve the chosen priority metric with a targeted change that keeps the same structure. For area, "
        "reduce logic depth of the biggest operator, share arithmetic, narrow datapaths that are provably safe. For "
        "speed, shorten the longest combinational path (balanced adder trees, fewer operators in series) without "
        "changing the cycle latency."
    ),
    "EXPLORE": (
        "EXPLORE: try a clearly different micro-architecture that still gives identical cycle-by-cycle outputs, for "
        "example resource sharing across cycles, a different counter or state encoding, or a different way to build the "
        "arithmetic. Prefer an idea the parent does not already use."
    ),
}
DEFAULT_REASONS: dict[str, str] = {
    "SIMPLIFY": "Simplified the design",
    "OPTIMIZE": "Optimized the design",
    "EXPLORE": "Explored a different structure",
}


async def optimize(
    llm: LLMGateway,
    pack: TaskPack,
    parent_rtl: str,
    parent_ppa: PPA,
    baseline_ppa: PPA,
    priority: Priority,
    strategy: str,
) -> RtlOut:
    strategy = strategy.upper()
    if strategy not in STRATEGIES:
        raise ValueError(f"unknown strategy {strategy!r}; expected one of {sorted(STRATEGIES)}")
    template = load_template(TEMPLATE_FILE)
    note = relative_note(parent_ppa, baseline_ppa)
    system, user = template.render(
        task_brief=pack.public_brief(),
        priority=f"{priority}: {priority_text(priority)}",
        strategy=STRATEGIES[strategy],
        parent_rtl=parent_rtl.strip("\n"),
        parent_ppa=format_ppa(parent_ppa) + (f" ({note})" if note else ""),
        baseline_ppa=format_ppa(baseline_ppa),
        top=pack.top,
        latency_cycles=str(pack.latency_cycles),
    )
    parsed = await call_parsed(
        llm,
        "optimizer",
        template=template,
        system=system,
        user=user,
        parse=lambda text: parse_rtl_answer(text, pack.top),
        tags={
            "task_id": pack.id,
            "pack_root": str(pack.root),
            "strategy": strategy,
            "priority": priority,
            "attempt": "1",
            "parent_sha": hashlib.sha256(parent_rtl.encode("utf-8", errors="replace")).hexdigest(),
        },
        format_hint=FORMAT_HINT,
    )
    answer: RtlAnswer = parsed.value
    return RtlOut(
        text=answer.text,
        reason=answer.reason or DEFAULT_REASONS[strategy],
        meta=parsed.meta,
        raw=parsed.raw,
    )

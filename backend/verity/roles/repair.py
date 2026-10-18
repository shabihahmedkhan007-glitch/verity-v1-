"""Repair role (operator FIX): failing RTL plus its lint log or up to 5 failing cases in, corrected RTL out.

The prompt contains the spec brief, the current RTL and the failure evidence. It never contains golden.py,
test_dut.py or reference.v. Expected values shown for failing cases come from the Verification record.
"""

import hashlib

from ..contracts import TestCase, Verification
from ..core.llm_types import RtlOut
from ..core.pack import TaskPack
from ..core.protocols import LLMGateway
from ..core.rtl_fixer import guidance_block
from .common import call_parsed
from .parsing import RtlAnswer, parse_rtl_answer
from .prompts import load_template

TEMPLATE_FILE = "repair.v2.md"
FORMAT_HINT = "Give one DIAGNOSIS line, one REASON line, then exactly one ```verilog fenced block with the whole file."
MAX_LINT_CHARS = 4_000
MAX_CASES = 5
DEFAULT_REASON = "Fixed the reported failure"
DEFAULT_DIAGNOSIS = "The reported failure was addressed in the new version."


async def repair(
    llm: LLMGateway,
    pack: TaskPack,
    rtl_text: str,
    verification: Verification,
    *,
    attempt_n: int,
) -> RtlOut:
    template = load_template(TEMPLATE_FILE)
    system, user = template.render(
        task_brief=pack.public_brief(),
        current_rtl=rtl_text.strip("\n"),
        failure=_failure_text(verification, rtl_text),
        top=pack.top,
        latency_cycles=str(pack.latency_cycles),
    )
    parsed = await call_parsed(
        llm,
        "repair",
        template=template,
        system=system,
        user=user,
        parse=lambda text: parse_rtl_answer(text, pack.top, want_diagnosis=True),
        tags={
            "task_id": pack.id,
            "pack_root": str(pack.root),
            "attempt": str(attempt_n),
            "source_sha": hashlib.sha256(rtl_text.encode("utf-8", errors="replace")).hexdigest(),
        },
        format_hint=FORMAT_HINT,
    )
    answer: RtlAnswer = parsed.value
    return RtlOut(
        text=answer.text,
        reason=answer.reason or DEFAULT_REASON,
        meta=parsed.meta,
        raw=parsed.raw,
        diagnosis=answer.diagnosis or DEFAULT_DIAGNOSIS,
    )


def _failure_text(verification: Verification, rtl_text: str = "") -> str:
    """Lint log (first 4,000 chars) plus matching guidance when lint failed, else at most 5 failing cases."""
    if verification.lint == "fail":
        log = (verification.lint_log or "no log was produced").strip()
        text = "The design did not pass the checks before simulation. Tool output:\n\n" + log[:MAX_LINT_CHARS]
        guidance = guidance_block(log, rtl_text)
        return text + "\n\n" + guidance if guidance else text
    failing = [case for case in verification.failures if not case.pass_][:MAX_CASES]
    lines = [
        f"Lint passed. Simulation passed {verification.passed} of {verification.total} test cases.",
        f"Showing {len(failing)} failing case{'s' if len(failing) != 1 else ''}:",
        "",
    ]
    for case in failing:
        lines.append(_case_text(case))
    if not failing:
        lines.append("(no case details were reported)")
    return "\n".join(lines)


def _case_text(case: TestCase) -> str:
    when = f" at cycle {case.cycle}" if case.cycle is not None else ""
    return f"- {case.name}{when}\n    inputs:   {case.inputs}\n    expected: {case.expected}\n    got:      {case.got}"

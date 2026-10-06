"""RTL generator role: the approved plan in, the baseline Verilog (v1, createdBy INIT) out."""

from ..contracts import Priority
from ..core.llm_types import PlanOut, RtlOut
from ..core.pack import TaskPack
from ..core.protocols import LLMGateway
from .common import call_parsed, priority_text, render_plan
from .parsing import RtlAnswer, parse_rtl_answer
from .prompts import load_template

TEMPLATE_FILE = "rtl_gen.v1.md"
FORMAT_HINT = "Give one REASON line, then exactly one ```verilog fenced block with the whole file."
DEFAULT_REASON = "First version, written from the plan"


async def generate_rtl(llm: LLMGateway, pack: TaskPack, plan: PlanOut, priority: Priority) -> RtlOut:
    """Raises RoleOutputError when no Verilog block can be extracted (after one retry). The text is NOT validated
    against the coding rules here: the orchestrator calls pack.validate_rtl() so a rejection is a normal attempt."""
    template = load_template(TEMPLATE_FILE)
    system, user = template.render(
        task_brief=pack.public_brief(),
        priority=f"{priority}: {priority_text(priority)}",
        plan=render_plan(plan),
        latency_cycles=str(pack.latency_cycles),
        top=pack.top,
    )
    parsed = await call_parsed(
        llm,
        "rtl_gen",
        template=template,
        system=system,
        user=user,
        parse=lambda text: parse_rtl_answer(text, pack.top),
        tags={"task_id": pack.id, "priority": priority, "attempt": "1"},
        format_hint=FORMAT_HINT,
    )
    answer: RtlAnswer = parsed.value
    return RtlOut(text=answer.text, reason=answer.reason or DEFAULT_REASON, meta=parsed.meta, raw=parsed.raw)

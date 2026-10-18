"""Shared helpers for the four roles: the call-parse-retry loop, call metadata, small prompt formatters."""

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Generic, TypeVar

from ..contracts import PPA, Priority
from ..core.errors import RoleOutputError
from ..core.llm_types import CallMeta, LLMResponse, PlanOut, ResponseFormat
from ..core.protocols import LLMGateway
from .parsing import ParseError
from .prompts import PromptTemplate

T = TypeVar("T")

PRIORITY_TEXT: dict[str, str] = {
    "area": "smallest area (fewest and smallest cells)",
    "speed": "shortest clock period (highest clock speed)",
    "power": "lowest estimated power (keep the logic small and avoid needless toggling)",
}

RETRY_NOTE = (
    "Your previous answer could not be used: {error}.\n"
    "Answer again from the start, following the output format exactly. {format_hint}"
)


@dataclass(frozen=True, slots=True)
class Parsed(Generic[T]):
    value: T
    meta: CallMeta
    raw: str


def meta_from(template: PromptTemplate, response: LLMResponse, usd: float, role: str) -> CallMeta:
    return CallMeta(
        role=role,  # type: ignore[arg-type]
        model=response.model,
        request_id=response.request_id,
        prompt_version=template.version,
        input_tokens=response.input_tokens,
        output_tokens=response.output_tokens,
        latency_ms=response.latency_ms,
        usd=usd,
        finish_reason=response.finish_reason,
        reasoning_tokens=response.reasoning_tokens,
    )


def merge_meta(first: CallMeta, second: CallMeta) -> CallMeta:
    """Two calls for one role result (a parse retry): sum tokens, latency and cost; keep every request id."""
    return CallMeta(
        role=second.role,
        model=second.model,
        request_id=f"{first.request_id},{second.request_id}",
        prompt_version=second.prompt_version,
        input_tokens=first.input_tokens + second.input_tokens,
        output_tokens=first.output_tokens + second.output_tokens,
        latency_ms=first.latency_ms + second.latency_ms,
        usd=first.usd + second.usd,
        finish_reason=",".join(r for r in (first.finish_reason, second.finish_reason) if r),
        reasoning_tokens=first.reasoning_tokens + second.reasoning_tokens,
    )


def json_retries(llm: LLMGateway) -> int:
    """plan.json_retries from the gateway's settings when it exposes them, else 1."""
    settings = getattr(llm, "settings", None)
    plan = getattr(settings, "plan", None)
    return int(getattr(plan, "json_retries", 1))


async def call_parsed(
    llm: LLMGateway,
    role: str,
    *,
    template: PromptTemplate,
    system: str,
    user: str,
    parse: Callable[[str], T],
    tags: Mapping[str, str],
    format_hint: str,
    response_format: ResponseFormat = "text",
    retries: int = 1,
    sampling: Mapping[str, float] | None = None,
) -> Parsed[T]:
    """Call the model, parse the text; on ParseError ask again (up to `retries` times) with the error appended.

    BudgetExhausted and LLMError from the gateway propagate untouched. After the last failed parse raises
    RoleOutputError carrying the raw text of every attempt.
    """
    meta: CallMeta | None = None
    raws: list[str] = []
    current_user = user
    last_error = ""
    for attempt in range(retries + 1):
        request_tags = dict(tags)
        if attempt:
            request_tags["parse_retry"] = str(attempt)
        response, usd = await llm.call(
            role,  # type: ignore[arg-type]
            system=system,
            user=current_user,
            response_format=response_format,
            prompt_version=template.version,
            tags=request_tags,
            **(sampling or {}),
        )
        call_meta = meta_from(template, response, usd, role)
        meta = call_meta if meta is None else merge_meta(meta, call_meta)
        raws.append(response.text)
        try:
            value = parse(response.text)
        except ParseError as exc:
            last_error = str(exc)
            if response.finish_reason == "length":
                last_error += " (the model hit the output token limit)"
            current_user = user + "\n\n" + RETRY_NOTE.format(error=last_error, format_hint=format_hint)
            continue
        return Parsed(value=value, meta=meta, raw="\n\n----- retry -----\n\n".join(raws))
    raise RoleOutputError(role, last_error or "unusable answer", raw="\n\n----- retry -----\n\n".join(raws))


# ---------- prompt formatters ----------
def priority_text(priority: Priority) -> str:
    return PRIORITY_TEXT.get(priority, PRIORITY_TEXT["area"])


def render_plan(plan: PlanOut) -> str:
    """Compact, human-readable plan for the RTL prompt (blocks with their pins and chosen variant values)."""
    lines = [f"Summary: {plan.summary}"]
    for block in plan.blocks:
        extras: list[str] = []
        if block.pins:
            extras.append("pinned: " + "; ".join(block.pins))
        for variant in block.variants:
            extras.append(f"{variant.label} = {variant.value} (options: {', '.join(variant.options)})")
        suffix = f" [{' | '.join(extras)}]" if extras else ""
        lines.append(f"- {block.name}: {block.reason}{suffix}")
    if plan.data_widths:
        lines.append(f"Data widths: {plan.data_widths}")
    lines.append(f"Latency: {plan.latency_cycles} cycles")
    if plan.risks:
        lines.append("Risks: " + "; ".join(plan.risks))
    return "\n".join(lines)


def format_ppa(ppa: PPA) -> str:
    area = f"{ppa.area_um2:.1f} um2" if ppa.area_um2 is not None else "not measured"
    cells = f"{ppa.cell_count} cells" if ppa.cell_count is not None else "cells unknown"
    clock = f"{ppa.clock_period_ns:.2f} ns" if ppa.clock_period_ns is not None else "not measured"
    power = f"{ppa.power_mw:.3f} mW (estimate)" if ppa.power_mw is not None else "not measured"
    return f"area {area}, {cells}, clock period {clock}, power {power}"


def relative_note(parent: PPA, baseline: PPA) -> str:
    """How the parent compares with v1, in plain words. Empty when there is nothing to compare."""
    parts: list[str] = []
    for label, now, base in (
        ("area", parent.area_um2, baseline.area_um2),
        ("clock period", parent.clock_period_ns, baseline.clock_period_ns),
    ):
        if now is None or base is None or base == 0:
            continue
        change = 100.0 * (now - base) / base
        parts.append(f"{label} {change:+.1f}% vs v1")
    return ", ".join(parts)

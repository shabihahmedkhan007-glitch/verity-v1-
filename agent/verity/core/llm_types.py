"""LLM boundary types (ARCHITECTURE 21) and role outputs (ARCHITECTURE 10.1, 17)."""

from dataclasses import dataclass, field
from typing import Literal

from pydantic import Field

from ..config import RoleName
from ..contracts import PlanBlock, WireModel

ResponseFormat = Literal["text", "json"]


@dataclass(frozen=True, slots=True)
class LLMRequest:
    role: RoleName
    model: str  # resolved from the role route by the gateway
    system: str
    user: str
    max_output_tokens: int
    temperature: float
    response_format: ResponseFormat = "text"
    timeout_s: float = 120.0
    # Non-prompt metadata: task_id, strategy, attempt, prompt_version. Used by FakeProvider cassettes and logs.
    # Never sent to the model.
    tags: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int  # includes reasoning tokens when the API reports them separately
    model: str
    request_id: str
    latency_ms: int
    reasoning_tokens: int = 0
    finish_reason: str = ""


@dataclass(frozen=True, slots=True)
class CallMeta:
    """Recorded per attempt (ARCHITECTURE 6, 15)."""

    role: RoleName
    model: str
    request_id: str
    prompt_version: str  # "<template file name>@<sha256[:12] of the template>"
    input_tokens: int
    output_tokens: int
    latency_ms: int
    usd: float


# ---------- role outputs ----------
class PlanOut(WireModel):
    """The Planner's JSON (ARCHITECTURE 10.1). camelCase keys in the model's JSON, snake_case here."""

    summary: str
    blocks: list[PlanBlock]
    interfaces: str = ""
    data_widths: str = ""
    latency_cycles: int
    verification: str = ""
    risks: list[str] = Field(default_factory=list)
    estimated_lines: int


@dataclass(frozen=True, slots=True)
class PlanResult:
    plan: PlanOut
    meta: CallMeta
    raw: str  # full model text, stored as an artifact for debugging only


@dataclass(frozen=True, slots=True)
class RtlOut:
    """RTL text as extracted from the model, NOT yet validated. The orchestrator calls pack.validate_rtl()."""

    text: str
    reason: str  # one sentence, max 200 chars (role truncates)
    meta: CallMeta
    raw: str
    diagnosis: str | None = None  # repair only: one-paragraph reading of the failures, max 300 chars

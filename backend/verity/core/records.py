"""Store records (ARCHITECTURE 7). Backend-only; snake_case JSON in SQLite."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from ..contracts import Priority
from .budget import BudgetLimits, SpendSnapshot

RunStatus = Literal["queued", "running", "done", "error", "cap_reached", "stopped", "timed_out"]
ACTIVE_STATUSES: tuple[RunStatus, ...] = ("queued", "running")
PathMode = Literal["fast", "full"]


class RunRecord(BaseModel):
    id: str  # "r_<uuid4 hex>"
    session_id: str
    preset_id: str
    priority: Priority
    mode: PathMode
    status: RunStatus = "queued"
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    heartbeat_at: datetime | None = None
    budget: BudgetLimits
    spent: SpendSnapshot = Field(default_factory=SpendSnapshot)
    task_pack_sha256: str
    tool_image_digest: str = ""
    models: dict[str, str] = Field(default_factory=dict)  # role -> model id
    prompt_versions: dict[str, str] = Field(default_factory=dict)  # role -> prompt version
    error_reason: str | None = None
    winner_id: str | None = None
    git_sha: str | None = None
    params: dict[str, Any] | None = None
    title: str | None = None


class RunPatch(BaseModel):
    """Partial update. Store.update_run writes only the fields that were set (model_fields_set)."""

    status: RunStatus | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    heartbeat_at: datetime | None = None
    spent: SpendSnapshot | None = None
    tool_image_digest: str | None = None
    models: dict[str, str] | None = None
    prompt_versions: dict[str, str] | None = None
    error_reason: str | None = None
    winner_id: str | None = None
    params: dict[str, Any] | None = None
    title: str | None = None


class AttemptMeta(BaseModel):
    """Backend-only attempt fields (ARCHITECTURE 6). All optional: a FIX that never reached the LLM has none."""

    model_id: str | None = None
    prompt_version: str | None = None
    llm_request_id: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    rtl_sha256: str | None = None
    rtl_artifact: str | None = None  # run-relative path, e.g. candidates/c1/attempt-1.v
    tool_image_digest: str | None = None
    created_at: datetime


class ArtifactRef(BaseModel):
    sha256: str
    path: str  # absolute path of the file under data/
    size_bytes: int
    mime: str


class EvalResultRow(BaseModel):
    eval_run_id: str
    task_id: str
    suite: str
    metrics: dict[str, Any]
    git_sha: str | None = None
    created_at: datetime

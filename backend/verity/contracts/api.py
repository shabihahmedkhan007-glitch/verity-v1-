"""HTTP request/response bodies (frontend ARCHITECTURE 10, backend ARCHITECTURE 8). camelCase on the wire."""

from typing import Literal

from .base import WireModel, opt
from .events import Priority

PathMode = Literal["fast", "full"]
# 429 reasons. The web maps busy | budget_exhausted | maintenance; anything else shows as "busy".
AdmissionReason = Literal["busy", "budget_exhausted", "maintenance", "rate_limited"]
HealthReason = Literal["budget_exhausted", "busy", "maintenance"]


class HealthResponse(WireModel):
    live_enabled: bool
    reason: HealthReason | None = opt()
    cap_usd: float
    provider: str
    models: dict[str, str]  # role -> model id
    auth_required: bool = False
    features: list[str] = []  # what this backend serves end to end, e.g. ["params"]


class SessionRequest(WireModel):
    access_code: str


class SessionResponse(WireModel):
    token: str
    expires_at: str  # ISO 8601 UTC


class CreateRunRequest(WireModel):
    preset_id: str
    priority: Priority
    mode: PathMode | None = opt()
    params: dict[str, int | bool | str] | None = opt()  # knob values; omitted = the chip's defaults


class CreateRunResponse(WireModel):
    run_id: str
    cap_usd: float
    stream_token: str


class ErrorResponse(WireModel):
    error: str
    reason: str | None = opt()

"""HTTP routes (CONTRACTS section 9). Auth, ownership and rate limits are applied here; run logic is the RunService's."""

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import TypeVar

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ValidationError

from ..config import Settings
from ..contracts import (
    CreateRunRequest,
    CreateRunResponse,
    HealthResponse,
    SessionRequest,
    SessionResponse,
    to_json,
    to_wire,
)
from ..contracts.view_types import STEER_ADAPTER
from ..core.protocols import RunService
from ..core.records import ACTIVE_STATUSES, RunRecord
from .auth import AuthService, Principal, anonymous_sid, iso_z
from .errors import ApiError, rate_limited, unauthorized, validation_summary
from .ratelimit import TokenBucketLimiter
from .sse import close_stream, sse_body

log = logging.getLogger("verity.api")

router = APIRouter()

_RUN_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
MAX_BODY_BYTES = 8 * 1024
MAX_STEER_BYTES = 4 * 1024
_PEEK_TIMEOUT_S = 10.0

M = TypeVar("M", bound=BaseModel)


@dataclass(slots=True)
class ApiState:
    settings: Settings
    service: RunService
    auth: AuthService
    ip_limiter: TokenBucketLimiter
    session_limiter: TokenBucketLimiter
    auth_limiter: TokenBucketLimiter
    run_limiter: TokenBucketLimiter


def _state(request: Request) -> ApiState:
    return request.app.state.api  # type: ignore[no-any-return]


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# ---------- dependencies ----------
async def ip_guard(request: Request) -> None:
    """Applied to every route: per-IP request bucket."""
    wait = _state(request).ip_limiter.acquire(client_ip(request))
    if wait > 0:
        raise rate_limited(wait)


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def _principal(request: Request, state: ApiState) -> Principal:
    token = _bearer(request)
    if token:
        principal = state.auth.read_session(token)
        if principal is not None:
            return principal
    if state.settings.auth.required:
        raise unauthorized("Missing or invalid session token.")
    return Principal(sid=anonymous_sid(client_ip(request)), role="anonymous", anonymous=True)


def _charge_session(state: ApiState, sid: str) -> None:
    wait = state.session_limiter.acquire(sid)
    if wait > 0:
        raise rate_limited(wait)


async def session_guard(request: Request) -> Principal:
    """Session from the bearer token (or an anonymous one when auth is off), then the per-session bucket."""
    state = _state(request)
    principal = _principal(request, state)
    _charge_session(state, principal.sid)
    return principal


# ---------- helpers ----------
async def _read_raw(request: Request, limit: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise ApiError(413, "Request body too large.")
    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > limit:
            raise ApiError(413, "Request body too large.")
        chunks.append(chunk)
    return b"".join(chunks)


async def _read_json(request: Request, model: type[M], limit: int = MAX_BODY_BYTES) -> M:
    raw = await _read_raw(request, limit)
    try:
        return model.model_validate_json(raw)
    except ValidationError as exc:
        raise ApiError(422, validation_summary([e["loc"] for e in exc.errors()])) from None


def _valid_run_id(run_id: str) -> str:
    if not _RUN_ID_RE.fullmatch(run_id):
        raise ApiError(404, "Run not found.")
    return run_id


async def _owned_run(state: ApiState, run_id: str, sid: str) -> RunRecord:
    run = await state.service.get_run(_valid_run_id(run_id))
    if run is None:
        raise ApiError(404, "Run not found.")
    if run.session_id != sid:
        raise ApiError(403, "This run belongs to another session.")
    return run


def _json(model: BaseModel, status: int = 200) -> JSONResponse:
    return JSONResponse(to_wire(model), status_code=status, headers={"Cache-Control": "no-store"})


# ---------- routes ----------
@router.get("/health")
async def health(request: Request) -> JSONResponse:
    state = _state(request)
    settings = state.settings
    try:
        result = await state.service.health()
    except Exception:
        log.exception("health check failed")
        result = HealthResponse(
            live_enabled=False,
            reason="maintenance",
            cap_usd=settings.run_cap_usd,
            provider=settings.provider,
            models=settings.models_by_role(),
        )
    return _json(result.model_copy(update={"auth_required": settings.auth.required}))


@router.post("/auth/session")
async def create_session(request: Request) -> JSONResponse:
    state = _state(request)
    wait = state.auth_limiter.acquire(client_ip(request))
    if wait > 0:
        raise rate_limited(wait)
    body = await _read_json(request, SessionRequest, limit=1024)
    role = state.auth.check_access_code(body.access_code)
    if role is None:
        raise unauthorized("Invalid access code.")
    token, expires = state.auth.issue_session(role)
    return _json(SessionResponse(token=token, expires_at=iso_z(expires)))


@router.post("/runs")
async def create_run(request: Request, principal: Principal = Depends(session_guard)) -> JSONResponse:
    state = _state(request)
    body = await _read_json(request, CreateRunRequest)

    pack = state.service.presets().get(body.preset_id)
    if pack is None:
        raise ApiError(422, "Unknown preset.")
    if body.priority not in pack.priorities:
        raise ApiError(422, "This preset does not support that priority.")
    mode = body.mode or state.settings.limits.default_mode

    wait = state.run_limiter.acquire(principal.sid)
    if wait > 0:
        raise rate_limited(wait)
    try:
        run = await state.service.create_run(
            session_id=principal.sid, preset_id=body.preset_id, priority=body.priority, mode=mode
        )
    except BaseException:
        state.run_limiter.refund(principal.sid)  # refused before any work started
        raise
    token = state.auth.issue_stream_token(run.id, principal.sid)
    return _json(CreateRunResponse(run_id=run.id, cap_usd=run.budget.max_usd, stream_token=token), status=201)


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str, request: Request) -> Response:
    state = _state(request)
    _valid_run_id(run_id)

    stream_token = request.query_params.get("st")
    if stream_token:
        claims = state.auth.read_stream_token(stream_token)
        if claims is None or claims[0] != run_id:
            raise unauthorized("Invalid or expired stream token.")
        sid = claims[1]
    elif state.settings.auth.required:
        raise unauthorized("A stream token is required.")
    else:
        sid = _principal(request, state).sid
    _charge_session(state, sid)
    run = await _owned_run(state, run_id, sid)

    after = _after_seq(request)
    stream = state.service.stream(run_id, after)
    agen = stream.__aiter__()

    first = None
    if run.status not in ACTIVE_STATUSES:
        # UNVERIFIED: that the browser EventSource stops reconnecting on HTTP 204 (spec says it does) and that
        # web/src/lib/sources/live.ts treats the resulting error with readyState CLOSED as a normal end.
        # A finished run replays and ends. When there is nothing left after `after`, answer 204: EventSource
        # treats 204 as "do not reconnect", so a client that already has the terminal event stops cleanly.
        try:
            first = await asyncio.wait_for(agen.__anext__(), timeout=_PEEK_TIMEOUT_S)
        except StopAsyncIteration:
            await close_stream(agen)
            return Response(status_code=204, headers={"Cache-Control": "no-store"})
        except Exception:
            await close_stream(agen)
            raise ApiError(503, "The event stream is unavailable.") from None

    return StreamingResponse(
        sse_body(agen, float(state.settings.sse.ping_s), first),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def _after_seq(request: Request) -> int:
    """Resume point: Last-Event-ID header (sent by EventSource on reconnect), else ?after=. Junk means 0."""
    raw = request.headers.get("last-event-id") or request.query_params.get("after") or "0"
    raw = raw.strip()
    return int(raw) if raw.isdigit() and len(raw) <= 12 else 0


@router.get("/runs/{run_id}/log")
async def run_log(run_id: str, request: Request, principal: Principal = Depends(session_guard)) -> Response:
    state = _state(request)
    await _owned_run(state, run_id, principal.sid)
    log_model = await state.service.run_log(run_id)
    return Response(content=to_json(log_model), media_type="application/json", headers={"Cache-Control": "no-store"})


@router.post("/runs/{run_id}/steer")
async def steer_run(run_id: str, request: Request, principal: Principal = Depends(session_guard)) -> JSONResponse:
    state = _state(request)
    await _owned_run(state, run_id, principal.sid)
    raw = await _read_raw(request, MAX_STEER_BYTES)
    try:
        steer = STEER_ADAPTER.validate_json(raw)
    except ValidationError as exc:
        raise ApiError(422, validation_summary([e["loc"] for e in exc.errors()])) from None
    await state.service.steer(run_id, principal.sid, steer)
    return JSONResponse({"accepted": True}, status_code=202)


@router.post("/runs/{run_id}/stop")
async def stop_run(run_id: str, request: Request, principal: Principal = Depends(session_guard)) -> JSONResponse:
    state = _state(request)
    await _owned_run(state, run_id, principal.sid)
    await state.service.stop(run_id, principal.sid)
    return JSONResponse({"accepted": True}, status_code=202)


def new_limiters(settings: Settings) -> tuple[TokenBucketLimiter, TokenBucketLimiter, TokenBucketLimiter, TokenBucketLimiter]:
    """(per-IP requests, per-session requests, auth attempts per IP, new runs per session)."""
    limits = settings.limits
    return (
        TokenBucketLimiter(limits.api_per_session_per_min, 60.0),
        TokenBucketLimiter(limits.api_per_session_per_min, 60.0),
        TokenBucketLimiter(limits.auth_per_ip, float(limits.auth_window_s)),
        TokenBucketLimiter(limits.runs_per_session_per_hour, 3600.0),
    )


__all__ = ["ApiState", "ip_guard", "new_limiters", "router"]

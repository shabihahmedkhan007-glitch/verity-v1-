"""Interfaces between builders. Implementations must match these signatures exactly.

Owner of each implementation:
  LLMProvider, LLMGateway, role functions ........ builder B (verity/llm, verity/roles)
  ToolRunner ...................................... builder C (verity/tools)
  Ledger, EventSink, RunService, run_orchestrator . builder D (verity/runs, verity/orchestrator)
  Store ........................................... builder E (verity/store)
"""

from collections.abc import AsyncIterator, Mapping, Sequence
from datetime import datetime
from typing import Protocol, runtime_checkable

from ..config import RoleName
from ..contracts import (
    PPA,
    Attempt,
    Candidate,
    EventBase,
    HealthResponse,
    PinInput,
    Priority,
    RunLog,
    ToggleInput,
    Verification,
)
from .budget import BudgetLimits, CountKind, Reservation, SpendSnapshot, Usage
from .llm_types import LLMRequest, LLMResponse, PlanOut, PlanResult, ResponseFormat, RtlOut
from .pack import TaskPack
from .records import ArtifactRef, AttemptMeta, EvalResultRow, PathMode, RunPatch, RunRecord, RunStatus
from .results import EquivalenceResult, MeasureResult, VerifyResult
from .rtl import Rtl

# ======================================================================
# LLM (builder B)
# ======================================================================


@runtime_checkable
class LLMProvider(Protocol):
    """The only code that talks to a model API. NebiusProvider / OpenAICompatProvider / FakeProvider."""

    name: str  # "nebius" | "openai_compat" | "fake"

    async def complete(self, req: LLMRequest) -> LLMResponse:
        """One request. Raises LLMError(retryable=True) on 429/5xx/timeouts, LLMError(retryable=False) otherwise.
        Does NOT retry and does NOT touch the ledger (the gateway does both)."""
        ...

    async def aclose(self) -> None: ...


class LLMGateway(Protocol):
    """Per-run role-aware wrapper: route -> model, ledger reserve/commit, call caps, retries with backoff.

    Implementation: verity.llm.gateway.RunLLM(provider, settings, ledger). One instance per run.
    """

    async def call(
        self,
        role: RoleName,
        *,
        system: str,
        user: str,
        response_format: ResponseFormat = "text",
        prompt_version: str = "",
        tags: Mapping[str, str] | None = None,
    ) -> tuple[LLMResponse, float]:
        """Returns (response, estimated usd). Before the call: estimate prompt tokens, raise LLMError if above
        budget.call.max_prompt_tokens, then ledger.reserve() (raises BudgetExhausted). After: ledger.commit().
        On failure: ledger.release(), retry retryable errors up to llm.retries with backoff, then raise LLMError."""
        ...


# ---------- role functions (verity.roles.planner.plan, rtl_gen.generate_rtl, repair.repair, optimizer.optimize) ----------
class PlanFn(Protocol):
    async def __call__(
        self,
        llm: LLMGateway,
        pack: TaskPack,
        priority: Priority,
        *,
        previous: PlanOut | None = None,
        steering: Sequence[PinInput | ToggleInput] = (),
    ) -> PlanResult:
        """Revision 1 when previous is None; otherwise a replan honoring the pins/toggles.
        Retries once on invalid JSON (plan.json_retries), then raises RoleOutputError."""
        ...


class GenerateRtlFn(Protocol):
    async def __call__(self, llm: LLMGateway, pack: TaskPack, plan: PlanOut, priority: Priority) -> RtlOut:
        """Baseline RTL (createdBy INIT). Raises RoleOutputError if no Verilog block can be extracted."""
        ...


class RepairFn(Protocol):
    async def __call__(
        self,
        llm: LLMGateway,
        pack: TaskPack,
        rtl_text: str,
        verification: Verification,
        *,
        attempt_n: int,
    ) -> RtlOut:
        """FIX. Input: the failing RTL text (may be RTL that was rejected before sim) and its Verification
        (lint log or up to 5 failing cases). Returns new RTL plus `diagnosis`."""
        ...


class OptimizeFn(Protocol):
    async def __call__(
        self,
        llm: LLMGateway,
        pack: TaskPack,
        parent_rtl: str,
        parent_ppa: PPA,
        baseline_ppa: PPA,
        priority: Priority,
        strategy: str,
    ) -> RtlOut:
        """SIMPLIFY | OPTIMIZE | EXPLORE child. Must keep the interface and latency."""
        ...


# ======================================================================
# Tools (builder C)
# ======================================================================


@runtime_checkable
class ToolRunner(Protocol):
    """The only code that executes anything. Fixed command templates; RTL travels as a file.

    Implementations: verity.tools.local_docker.LocalDockerRunner, verity.tools.nebius_sandbox.NebiusSandboxRunner.
    Timeouts become results (status "timeout"); infrastructure failures raise ToolInfraError after
    tools.infra_retries retries. A failing design is never an exception.
    """

    async def verify(self, rtl: Rtl, pack: TaskPack) -> VerifyResult:
        """/verity/bin/verify: interface check, Verilator lint, Icarus + cocotb sim (early exit)."""
        ...

    async def measure(self, rtl: Rtl, pack: TaskPack) -> MeasureResult:
        """/verity/bin/measure: Yosys synth (Nangate45) + OpenSTA + CircuitGraph (candidateId left empty)."""
        ...

    async def check_equivalence(self, gold: Rtl, gate: Rtl, pack: TaskPack) -> EquivalenceResult:
        """/verity/bin/eqy: gold = v1 (mounted as /work/dut.v), gate = candidate (/work/b.v)."""
        ...

    async def image_digest(self) -> str:
        """Digest of the tool image, recorded on every run. "" if unknown."""
        ...


# ======================================================================
# Budget ledger (builder D)
# ======================================================================


class Ledger(Protocol):
    """Per-run, in-memory, synchronous. Every role asks it before spending (ARCHITECTURE 20)."""

    limits: BudgetLimits

    def reserve(self, *, role: str, model: str, max_input_tokens: int, max_output_tokens: int) -> Reservation:
        """Raises BudgetExhausted if the worst case (current + all open reservations + this one) would cross
        max_llm_calls, max_input_tokens, max_output_tokens or max_usd, or if wall time is over max_wall_s."""
        ...

    def commit(self, reservation: Reservation, usage: Usage) -> None: ...

    def release(self, reservation: Reservation) -> None: ...

    def can_count(self, kind: CountKind) -> bool:
        """candidate: total < max_candidates; round: total < max_rounds; repair: always True here.
        The per-candidate repair limit is the orchestrator's check:
        candidate.fix_count < (limits.max_repairs_baseline if baseline else limits.max_repairs_child)."""
        ...

    def count(self, kind: CountKind) -> None:
        """Increment the total for kind (snapshot().candidates / repairs / rounds)."""
        ...

    def exhausted(self) -> str | None:
        """Name of the first limit that is used up (BudgetLimits field name), or None."""
        ...

    def snapshot(self) -> SpendSnapshot: ...


# ======================================================================
# Events (builder D implements, orchestrator and run manager call)
# ======================================================================


class EventSink(Protocol):
    """Stamps seq (gap-free per run, from 1) and tMs (ms since run start, non-decreasing), writes the event
    to the Store FIRST, then fans it out to live subscribers. Returns the stamped event.
    On CreditsEvent it also persists runs.spent_json and adds the delta to the daily spend."""

    async def emit(self, run_id: str, event: EventBase) -> EventBase: ...


# ======================================================================
# Store (builder E)
# ======================================================================


class Store(Protocol):
    """SQLite (aiosqlite) + write-once artifact directory under settings.data_dir (ARCHITECTURE 7, 15)."""

    async def open(self) -> None:
        """Create tables if missing (idempotent)."""
        ...

    async def close(self) -> None: ...

    # ---- runs ----
    async def create_run(self, run: RunRecord) -> None: ...

    async def get_run(self, run_id: str) -> RunRecord | None: ...

    async def update_run(self, run_id: str, patch: RunPatch) -> None:
        """Writes only patch.model_fields_set."""
        ...

    async def touch_heartbeat(self, run_id: str, at: datetime) -> None: ...

    async def runs_with_status(self, statuses: Sequence[RunStatus]) -> list[RunRecord]: ...

    async def count_runs(
        self,
        *,
        statuses: Sequence[RunStatus] | None = None,
        session_id: str | None = None,
        created_since: datetime | None = None,
    ) -> int: ...

    # ---- candidates and attempts ----
    async def upsert_candidate(self, run_id: str, candidate: Candidate) -> None:
        """Full upsert keyed by (run_id, candidate.id). Stores ppa/fitness/eqy JSON and the flags."""
        ...

    async def add_attempt(self, run_id: str, candidate_id: str, attempt: Attempt, meta: AttemptMeta) -> None:
        """Insert keyed by (run_id, candidate_id, attempt.n). Re-adding the same n replaces the verification
        (used when a diagnosis is attached after the fact)."""
        ...

    # ---- events ----
    async def append_event(self, run_id: str, event: EventBase) -> None:
        """event is already stamped. Raises if (run_id, seq) exists (append-only)."""
        ...

    async def events_after(self, run_id: str, after_seq: int = 0) -> list[EventBase]:
        """Events with seq > after_seq, ordered by seq, parsed back into RunEvent models."""
        ...

    async def last_seq(self, run_id: str) -> int: ...

    # ---- artifacts (write-once) ----
    async def put_blob(self, data: bytes, mime: str) -> ArtifactRef:
        """data/blobs/<sha[0:2]>/<sha>. Idempotent for identical content."""
        ...

    async def write_run_file(self, run_id: str, relpath: str, data: bytes, mime: str) -> ArtifactRef:
        """data/runs/<run_id>/<relpath>. relpath must match ^[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)*$ with no '..'.
        Writing an existing path with different content raises FileExistsError."""
        ...

    async def read_run_file(self, run_id: str, relpath: str) -> bytes | None: ...

    # ---- evals and spend ----
    async def add_eval_result(self, row: EvalResultRow) -> None: ...

    async def add_daily_spend(self, day: str, usd: float) -> None:
        """day = UTC 'YYYY-MM-DD'. Adds (not sets)."""
        ...

    async def daily_spend(self, day: str) -> float: ...


# ======================================================================
# Run service: what the API layer (E) calls on the run manager (D)
# ======================================================================


class RunService(Protocol):
    """Implementation: verity.runs.manager.RunManager(settings, store, provider, tools, packs)."""

    async def start(self) -> None:
        """Startup: mark queued/running runs as error 'server restarted' (emitting a run error event),
        start the watchdog task."""
        ...

    async def shutdown(self) -> None:
        """Cancel live runs (they end as stopped/error), stop the watchdog."""
        ...

    def presets(self) -> Mapping[str, TaskPack]:
        """Live presets only (eval_only = false), keyed by id (= web presetId)."""
        ...

    async def create_run(self, *, session_id: str, preset_id: str, priority: Priority, mode: PathMode) -> RunRecord:
        """Admission (concurrency per session and global, daily spend), create the run row, start the asyncio
        task. Raises UnknownPreset, AdmissionDenied(reason)."""
        ...

    async def steer(self, run_id: str, session_id: str, request: object) -> None:
        """request: a contracts.SteerRequest model. Raises NotFound, Forbidden, Conflict. The echo `human`
        event is emitted by the orchestrator when it applies the steer, not here."""
        ...

    async def stop(self, run_id: str, session_id: str) -> None:
        """Sets the stop flag and cancels the run task. Raises NotFound, Forbidden. Idempotent."""
        ...

    def stream(self, run_id: str, after_seq: int = 0) -> AsyncIterator[EventBase]:
        """Stored events with seq > after_seq, then live events, with no gap and no duplicate. Ends after the
        terminal `run` event (done | error | cap_reached | stopped) has been yielded."""
        ...

    async def get_run(self, run_id: str) -> RunRecord | None: ...

    async def run_log(self, run_id: str) -> RunLog:
        """RunLog built from stored events (same format as golden.json, meta.sample = false)."""
        ...

    async def health(self) -> HealthResponse: ...


__all__ = [
    "LLMProvider",
    "LLMGateway",
    "PlanFn",
    "GenerateRtlFn",
    "RepairFn",
    "OptimizeFn",
    "ToolRunner",
    "Ledger",
    "EventSink",
    "Store",
    "RunService",
    "EvalResultRow",
    "ArtifactRef",
    "AttemptMeta",
    "RunRecord",
    "RunPatch",
]

"""RunManager: admission, one asyncio task per run, heartbeat, stop, restart recovery (ARCHITECTURE 4, 12.2, 18).

Implements core.protocols.RunService. One process, no Celery, no Redis: a run is an asyncio task that mostly waits on
network calls. The orchestrator (verity.orchestrator) owns every design decision; this class owns everything around
the run:

  admission   per-session concurrency 1, global concurrency 2 (asyncio.Semaphore), daily dollar cap from the store;
              429 reasons: busy | budget_exhausted | maintenance
  run row     budget snapshot, task pack hash, tool image digest, model ids, git sha (prompt versions are added by
              the orchestrator as roles report them)
  events      EventHub: gap-free seq, store first, then fan-out to per-run queues
  liveness    ctx.beat() on every step, a ticker that refreshes heartbeat_at every `watchdog.heartbeat_s` while the
              run is alive, a Watchdog that cancels stalled runs
  endings     the orchestrator emits done | error | cap_reached; this class emits stopped (Stop), error "timed out: ..."
              (watchdog, status timed_out), error "server restarted" (startup recovery), error "server shutting down"
"""

import asyncio
import logging
import time
import uuid
from collections.abc import AsyncIterator, Mapping
from datetime import UTC, datetime

from ..config import AGENT_ROOT, Settings
from ..features import FEATURES
from ..contracts import (
    AutopilotSteer,
    CaptionEvent,
    EventBase,
    GateSteer,
    HealthResponse,
    HumanEvent,
    PinSteer,
    Priority,
    RunLog,
    RunPhaseEvent,
    StopInput,
    ToggleSteer,
    WinnerOverrideSteer,
    is_terminal,
    to_json,
)
from ..core import captions as cap
from ..core.family import render_pack
from ..core.types import (
    ACTIVE_STATUSES,
    AdmissionDenied,
    BudgetLimits,
    Conflict,
    DailySpend,
    Forbidden,
    LLMProvider,
    NotFound,
    PathMode,
    RunContext,
    RunPatch,
    RunRecord,
    RunStatus,
    RunStopped,
    Roles,
    Store,
    TaskPack,
    ToolRunner,
    UnknownPreset,
)
from ..llm.gateway import RunLLM
from ..orchestrator import run_orchestrator
from ..roles import default_roles
from .hub import EventHub
from .ledger import RunLedger
from .live import LiveRun
from .runlog import build_run_log
from .watchdog import Watchdog

log = logging.getLogger("verity.runs.manager")

IMAGE_DIGEST_TIMEOUT_S = 20.0
SHUTDOWN_WAIT_S = 15.0
RESTART_REASON = "server restarted"
SHUTDOWN_REASON = "server shutting down"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class RunManager:
    def __init__(
        self,
        settings: Settings,
        store: Store,
        provider: LLMProvider,
        tools: ToolRunner,
        packs: Mapping[str, TaskPack],
        *,
        roles: Roles | None = None,
    ) -> None:
        self._settings = settings
        self._store = store
        self._provider = provider
        self._tools = tools
        self._packs = dict(packs)
        self._roles = roles or default_roles()
        self._hub = EventHub(store, settings)
        self._sem = asyncio.Semaphore(settings.limits.concurrent_global)
        self._live: dict[str, LiveRun] = {}
        self._watchdog = Watchdog(settings, lambda: list(self._live.values()), self._on_timeout)
        self._git_sha: str | None = settings.git_sha
        self._image_digest = ""
        self._closing = False

    # ======================================================================
    # lifecycle
    # ======================================================================
    async def start(self) -> None:
        """Startup: find the git sha, mark orphaned runs failed, start the watchdog."""
        if self._git_sha is None:
            self._git_sha = await self._detect_git_sha()
        await self._recover_orphans()
        self._watchdog.start()

    async def shutdown(self) -> None:
        """Stop the watchdog and cancel every live run; each one still writes its terminal event and run log."""
        self._closing = True
        await self._watchdog.stop()
        tasks: list[asyncio.Task] = []
        for live in list(self._live.values()):
            live.cancel_with(shutdown=True)
            if live.task is not None:
                tasks.append(live.task)
        if tasks:
            await asyncio.wait(tasks, timeout=SHUTDOWN_WAIT_S)

    async def _detect_git_sha(self) -> str | None:
        try:
            proc = await asyncio.create_subprocess_exec(
                "git",
                "rev-parse",
                "--short",
                "HEAD",
                cwd=str(AGENT_ROOT),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
            sha = stdout.decode("ascii", errors="ignore").strip()
            return sha or None
        except Exception:
            return None

    async def _recover_orphans(self) -> None:
        """Runs left queued or running by a previous process end as error 'server restarted' (ARCHITECTURE 18.3)."""
        for run in await self._store.runs_with_status(list(ACTIVE_STATUSES)):
            try:
                events = await self._store.events_after(run.id, 0)
                last_seq = events[-1].seq if events else 0
                last_t_ms = events[-1].t_ms if events else 0
                started = time.monotonic() - last_t_ms / 1000
                self._hub.open_run(
                    run.id,
                    started_monotonic=started,
                    last_seq=last_seq,
                    last_t_ms=last_t_ms,
                    terminal_seen=any(is_terminal(e) for e in events),
                )
                await self._emit_failure(run.id, RESTART_REASON)
                await self._store.update_run(
                    run.id, RunPatch(status="error", ended_at=_utcnow(), error_reason=RESTART_REASON)
                )
                await self._write_runlog(run.id)
            except Exception:
                log.exception("could not recover run %s", run.id)
            finally:
                self._hub.close_run(run.id)

    # ======================================================================
    # RunService: read side
    # ======================================================================
    def presets(self) -> Mapping[str, TaskPack]:
        return {pid: pack for pid, pack in self._packs.items() if pack.live_preset}

    async def get_run(self, run_id: str) -> RunRecord | None:
        return await self._store.get_run(run_id)

    async def run_log(self, run_id: str) -> RunLog:
        run = await self._store.get_run(run_id)
        if run is None:
            raise NotFound(run_id)
        events = await self._store.events_after(run_id, 0)
        return build_run_log(run, events, self._settings)

    async def stream(self, run_id: str, after_seq: int = 0) -> AsyncIterator[EventBase]:
        """Stored events with seq > after_seq, then live ones, no gap and no duplicate.

        The stream ends when the run's live stream closes, which is AFTER the last event (golden.json has a `done`
        caption after `run done`), or right after the stored events for a run that is no longer live. Consumers must
        keep reading until this generator ends and must not stop at the terminal `run` event.
        """
        if await self._store.get_run(run_id) is None:
            raise NotFound(run_id)
        # UNVERIFIED: no gap and no duplicate while events are emitted during the replay read. Test with a run that is
        # emitting (fake provider) and a reader that connects mid-run, then compare seq with the stored events.
        queue = self._hub.subscribe(run_id)  # subscribe BEFORE reading the store so nothing falls in the gap
        try:
            last = after_seq
            for event in await self._store.events_after(run_id, after_seq):
                last = event.seq
                yield event
            if queue is None:
                return
            while True:
                event = await queue.get()
                if event is None:
                    return
                if event.seq <= last:
                    continue
                last = event.seq
                yield event
        finally:
            if queue is not None:
                self._hub.unsubscribe(run_id, queue)

    async def health(self) -> HealthResponse:
        reason = None
        if self._closing or self._maintenance():
            reason = "maintenance"
        else:
            daily = await self._daily_spend()
            if daily.exhausted or not daily.can_admit(self._admission_cap(self._settings.budget.run.max_usd)):
                reason = "budget_exhausted"
            elif self._sem.locked():
                reason = "busy"
        return HealthResponse(
            live_enabled=reason is None,
            reason=reason,
            cap_usd=self._settings.run_cap_usd,
            provider=getattr(self._provider, "name", self._settings.provider),
            models=self._settings.models_by_role(),
            auth_required=self._settings.auth.required,
            features=list(FEATURES),
        )

    # ======================================================================
    # RunService: write side
    # ======================================================================
    async def create_run(
        self,
        *,
        session_id: str,
        preset_id: str,
        priority: Priority,
        mode: PathMode,
        params: Mapping[str, object] | None = None,
    ) -> RunRecord:
        pack = self._packs.get(preset_id)
        if pack is None or not pack.live_preset:
            raise UnknownPreset(f"unknown preset: {preset_id}")
        if priority not in pack.priorities:
            raise UnknownPreset(f"priority {priority} is not offered for {preset_id}")
        # Raises ParamsError (a ValueError with a user-facing sentence) for bad knobs; the route maps it to 422.
        pack = await asyncio.to_thread(render_pack, pack, params, self._settings.data_dir / "packs")

        if self._closing or self._maintenance():
            raise AdmissionDenied("maintenance", "live runs are offline")
        limits = BudgetLimits.from_settings(self._settings, pack.budget)
        daily = await self._daily_spend()
        if daily.exhausted or not daily.can_admit(self._admission_cap(limits.max_usd)):
            raise AdmissionDenied("budget_exhausted", "the daily budget is used up")

        # From here to the registration below there is no await, so two requests cannot both take the last slot.
        per_session = sum(1 for live in self._live.values() if live.session_id == session_id)
        if per_session >= self._settings.limits.concurrent_per_session:
            raise AdmissionDenied("busy", "you already have a run in progress")
        if self._sem.locked():
            raise AdmissionDenied("busy", "all run slots are taken")
        await self._sem.acquire()  # does not suspend: the semaphore is not locked

        run_id = "r_" + uuid.uuid4().hex
        ledger = RunLedger(limits, self._settings)
        ctx = RunContext(
            run_id=run_id,
            session_id=session_id,
            pack=pack,
            priority=priority,
            mode=mode,
            settings=self._settings,
            llm=RunLLM(self._provider, self._settings, ledger),
            roles=self._roles,
            tools=self._tools,
            ledger=ledger,
            sink=self._hub,
            store=self._store,
        )
        live = LiveRun(ctx=ctx)
        self._live[run_id] = live
        self._hub.open_run(run_id, started_monotonic=ctx.started_monotonic, ledger=ledger, ctx=ctx)

        try:
            record = RunRecord(
                id=run_id,
                session_id=session_id,
                preset_id=preset_id,
                priority=priority,
                mode=mode,
                status="queued",
                created_at=_utcnow(),
                budget=limits,
                task_pack_sha256=pack.sha256,
                tool_image_digest=await self._tool_image_digest(),
                models=self._settings.models_by_role(),
                git_sha=self._git_sha,
            )
            await self._store.create_run(record)
        except BaseException:
            self._live.pop(run_id, None)
            self._hub.close_run(run_id)
            self._sem.release()
            raise

        live.task = asyncio.create_task(self._drive(live), name=f"verity-run-{run_id}")
        live.ticker = asyncio.create_task(self._tick(live), name=f"verity-heartbeat-{run_id}")
        return record

    async def steer(self, run_id: str, session_id: str, request: object) -> None:
        live = await self._owned_live(run_id, session_id)
        if live is None:
            raise Conflict("the run has ended")
        ctx = live.ctx
        if isinstance(request, WinnerOverrideSteer):
            if ctx.ai_winner_id is None:
                raise Conflict("there is no winner to override yet")
        elif isinstance(request, PinSteer | ToggleSteer | GateSteer | AutopilotSteer):
            if ctx.gate_state not in ("open", "held"):
                raise Conflict("the plan gate is not open")
        else:
            raise Conflict("unsupported steer")
        ctx.steer.put_nowait(request)

    async def stop(self, run_id: str, session_id: str) -> None:
        # UNVERIFIED: that cancelling the run task also ends an in-flight sandbox call promptly (docker kill / Nebius
        # Sandboxes cancel) is the ToolRunner's job (verity/tools); check that no container outlives a Stop.
        live = await self._owned_live(run_id, session_id)
        if live is None:
            return  # already over: idempotent
        live.cancel_with(stop=True)

    async def _owned_live(self, run_id: str, session_id: str) -> LiveRun | None:
        """The live run if it is running and owned by this session; None if it exists but has ended."""
        live = self._live.get(run_id)
        if live is not None:
            if live.session_id != session_id:
                raise Forbidden("this run belongs to another session")
            return live
        run = await self._store.get_run(run_id)
        if run is None:
            raise NotFound(run_id)
        if run.session_id != session_id:
            raise Forbidden("this run belongs to another session")
        return None

    # ======================================================================
    # admission helpers
    # ======================================================================
    def _maintenance(self) -> bool:
        s = self._settings
        if s.provider in ("nebius", "openai_compat"):
            key = s.llm.api_key
            if key is None or not key.get_secret_value():
                return True
        if s.tool_backend == "nebius_sandbox":
            box = s.tools.nebius_sandbox
            key = s.sandbox_api_key()
            if not box.base_url or key is None or not key.get_secret_value():
                return True
        return False

    def _admission_cap(self, run_cap_usd: float) -> float:
        """Dollars one new run may add to the day. The fake provider spends nothing."""
        return 0.0 if self._settings.provider == "fake" else run_cap_usd

    async def _daily_spend(self) -> DailySpend:
        day = _utcnow().strftime("%Y-%m-%d")
        spent = await self._store.daily_spend(day)
        # Runs in flight still have budget they may spend: count it against the day.
        reserved = [
            max(0.0, live.ctx.ledger.limits.max_usd - live.ctx.ledger.snapshot().usd) for live in self._live.values()
        ]
        if self._settings.provider == "fake":
            reserved = []
        return DailySpend(day=day, usd=spent, limit_usd=self._settings.limits.daily_usd, reserved=reserved)

    async def _tool_image_digest(self) -> str:
        if self._image_digest:
            return self._image_digest
        try:
            digest = await asyncio.wait_for(self._tools.image_digest(), timeout=IMAGE_DIGEST_TIMEOUT_S)
        except Exception:
            log.warning("could not read the tool image digest", exc_info=True)
            return ""
        self._image_digest = digest or ""
        return self._image_digest

    # ======================================================================
    # the run task
    # ======================================================================
    async def _drive(self, live: LiveRun) -> None:
        ctx = live.ctx
        status: RunStatus = "error"
        reason: str | None = None
        winner: str | None = None
        try:
            now = _utcnow()
            await self._store.update_run(ctx.run_id, RunPatch(status="running", started_at=now, heartbeat_at=now))
            ctx.beat()
            await run_orchestrator(ctx)
            outcome = ctx.outcome
            if outcome is None:
                reason = "the run ended without a result"
                await self._emit_failure(ctx.run_id, reason)
            else:
                status, reason, winner = outcome.status, outcome.error_reason, outcome.winner_id
        except (asyncio.CancelledError, RunStopped):
            status, reason = await self._end_cancelled(live)
            winner = ctx.outcome.winner_id if ctx.outcome else None
        except Exception:
            log.exception("run %s crashed", ctx.run_id)
            reason = "internal error"
            await self._emit_failure(ctx.run_id, reason)
        finally:
            await self._finalize(live, status, reason, winner)

    async def _end_cancelled(self, live: LiveRun) -> tuple[RunStatus, str | None]:
        """The task was cancelled: emit the terminal event that matches why (Stop, watchdog, shutdown)."""
        ctx = live.ctx
        if self._hub.has_terminal(ctx.run_id):
            # The orchestrator had already ended the run when the cancel landed: keep its result.
            outcome = ctx.outcome
            return (outcome.status, outcome.error_reason) if outcome else ("stopped", None)
        if live.timeout_reason:
            await self._emit_failure(ctx.run_id, live.timeout_reason)
            return "timed_out", live.timeout_reason
        if live.stop_requested or ctx.stopped:
            await self._emit_safe(ctx.run_id, _human_stop(ctx))
            await self._emit_safe(ctx.run_id, CaptionEvent(text=cap.stopped(), chapter=None))
            await self._emit_safe(ctx.run_id, RunPhaseEvent(phase="stopped"))
            return "stopped", None
        reason = SHUTDOWN_REASON
        await self._emit_failure(ctx.run_id, reason)
        return "error", reason

    async def _emit_failure(self, run_id: str, message: str) -> None:
        """Caption plus `run error`. A second terminal event is dropped by the hub."""
        if self._hub.has_terminal(run_id):
            return
        await self._emit_safe(run_id, CaptionEvent(text=cap.failed(message), chapter=None))
        await self._emit_safe(run_id, RunPhaseEvent(phase="error", message=message))

    async def _emit_safe(self, run_id: str, event: EventBase) -> None:
        try:
            await self._hub.emit(run_id, event)
        except Exception:
            log.exception("run %s: could not emit %s", run_id, getattr(event, "t", "event"))

    async def _finalize(self, live: LiveRun, status: RunStatus, reason: str | None, winner: str | None) -> None:
        ctx = live.ctx
        live.finishing = True  # a Stop or watchdog cancel that lands now must not interrupt the bookkeeping below
        try:
            await self._store.update_run(
                ctx.run_id,
                RunPatch(
                    status=status,
                    ended_at=_utcnow(),
                    spent=ctx.ledger.snapshot(),
                    error_reason=reason,
                    winner_id=winner,
                ),
            )
            await self._write_runlog(ctx.run_id)
        except Exception:
            log.exception("run %s: could not finalize", ctx.run_id)
        finally:
            if live.ticker is not None:
                live.ticker.cancel()
            self._hub.close_run(ctx.run_id)
            self._live.pop(ctx.run_id, None)
            self._sem.release()

    async def _write_runlog(self, run_id: str) -> None:
        try:
            run = await self._store.get_run(run_id)
            if run is None:
                return
            events = await self._store.events_after(run_id, 0)
            body = to_json(build_run_log(run, events, self._settings))
            await self._store.write_run_file(run_id, "runlog.json", body.encode("utf-8"), "application/json")
        except FileExistsError:
            pass
        except Exception:
            log.exception("run %s: could not write runlog.json", run_id)

    # ======================================================================
    # heartbeat and watchdog
    # ======================================================================
    async def _tick(self, live: LiveRun) -> None:
        """Keep runs.heartbeat_at fresh every `watchdog.heartbeat_s` while the run is alive (busy or recently active)."""
        ctx = live.ctx
        wd = self._settings.watchdog
        try:
            while True:
                await asyncio.sleep(wd.heartbeat_s)
                if ctx.is_alive(wd.stall_s):
                    try:
                        await self._store.touch_heartbeat(ctx.run_id, _utcnow())
                    except Exception:
                        log.exception("run %s: heartbeat write failed", ctx.run_id)
        except asyncio.CancelledError:
            return

    async def _on_timeout(self, live: LiveRun, reason: str) -> None:
        live.cancel_with(timeout_reason=reason)


def _human_stop(ctx: RunContext) -> EventBase:
    return HumanEvent(input=StopInput(t_ms=ctx.now_ms()))

"""Shared ToolRunner logic (CONTRACTS S13): one sandbox call per method, retry on infrastructure errors only.

Backends (LocalDockerRunner, NebiusSandboxRunner) implement `_execute`: run one fixed script with the given
files and return what it printed. Everything else lives here:

- the three ToolRunner methods and their timeouts, environment and parsing,
- error classification (CONTRACTS 3.4): exit 0 parse the JSON; exit 2 input error (no retry); exit 3 or any
  other code or unparseable output is an infrastructure error (retried `tools.infra_retries` times, then
  ToolInfraError); outer timeout becomes a "timeout" result and is never an exception,
- a measure cache keyed by (pack, rtl sha) so repeated measurement of the same RTL never re-runs the sandbox.

A failing design is never an exception: it is a result with a failing status.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from collections import OrderedDict
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Literal, TypeVar

from ..config import Settings
from ..core.errors import ToolInfraError
from ..core.pack import TaskPack
from ..core.results import EquivalenceResult, MeasureResult, VerifyResult
from ..core.rtl import Rtl
from .parse import SandboxOutputError, parse_stdout_json
from .parsers import parse_eqy, parse_measure, parse_verify

log = logging.getLogger("verity.tools")

Script = Literal["verify", "measure", "eqy"]
# Fixed command templates. Nothing derived from model output ever reaches a command line.
SCRIPT_PATHS: dict[Script, str] = {
    "verify": "/verity/bin/verify",
    "measure": "/verity/bin/measure",
    "eqy": "/verity/bin/eqy",
}
SANDBOX_PACK_DIR = "/pack"
SANDBOX_WORK_DIR = "/work"
RETRY_PAUSE_S = 1.0
MEASURE_CACHE_SIZE = 128
_CACHEABLE_MEASURE = frozenset({"ok", "synth_fail", "sta_fail"})

T = TypeVar("T", VerifyResult, MeasureResult, EquivalenceResult)


class FatalToolError(ToolInfraError):
    """An infrastructure error that retrying cannot fix (bad input, bad credentials, docker missing)."""


@dataclass(frozen=True, slots=True)
class SandboxCall:
    script: Script
    work_files: Mapping[str, bytes]  # file name under /work -> content
    pack: TaskPack
    env: Mapping[str, str]
    timeout_s: int  # outer timeout: inner stage budgets plus sandbox_overhead_s


@dataclass(frozen=True, slots=True)
class RawOutput:
    exit_code: int | None
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool = False


def _tail(text: str, limit: int = 600) -> str:
    return text[-limit:] if len(text) > limit else text


class SandboxRunner(ABC):
    """ToolRunner base. Subclasses implement `_execute` and `image_digest`."""

    def __init__(self, settings: Settings, *, max_parallel: int) -> None:
        self._settings = settings
        self._retries = max(0, settings.tools.infra_retries)
        self._sem = asyncio.Semaphore(max_parallel)
        self._env = self._build_env(settings)
        self._measure_cache: OrderedDict[tuple[str, str, str], MeasureResult] = OrderedDict()
        self._measure_inflight: dict[tuple[str, str, str], asyncio.Task[MeasureResult]] = {}

    # ---------- backend hooks ----------
    @abstractmethod
    async def _execute(self, call: SandboxCall) -> RawOutput:
        """Run one script. Raise ToolInfraError (or FatalToolError) when the sandbox itself failed."""

    @abstractmethod
    async def image_digest(self) -> str: ...

    def config_problems(self) -> list[str]:
        """Human-readable reasons this backend cannot run (empty when ready). Used by health checks."""
        return []

    # ---------- environment ----------
    @staticmethod
    def _build_env(settings: Settings) -> dict[str, str]:
        t = settings.timeouts
        return {
            "VERITY_LINT_TIMEOUT_S": str(t.lint_s),
            "VERITY_SIM_TIMEOUT_S": str(t.sim_s),
            "VERITY_SYNTH_TIMEOUT_S": str(t.synth_s),
            "VERITY_STA_TIMEOUT_S": str(t.sta_s),
            "VERITY_EQY_TIMEOUT_S": str(t.eqy_s),
            "VERITY_PACK_DIR": SANDBOX_PACK_DIR,
            "VERITY_WORK_DIR": SANDBOX_WORK_DIR,
        }

    # ---------- ToolRunner ----------
    async def verify(self, rtl: Rtl, pack: TaskPack) -> VerifyResult:
        inner = self._settings.timeouts.verify_s

        def on_timeout(raw: RawOutput) -> VerifyResult:
            return VerifyResult(
                status="timeout",
                message=f"verification did not finish within {inner} s",
                duration_ms=raw.duration_ms,
            )

        return await self._run(
            "verify",
            pack,
            {"dut.v": rtl.data},
            inner,
            lambda payload: parse_verify(payload, expected_total=pack.test_count),
            on_timeout,
        )

    async def measure(self, rtl: Rtl, pack: TaskPack) -> MeasureResult:
        key = (pack.id, pack.sha256, rtl.sha256)
        cached = self._measure_cache.get(key)
        if cached is not None:
            self._measure_cache.move_to_end(key)
            return cached.model_copy(deep=True)
        task = self._measure_inflight.get(key)
        if task is None:
            task = asyncio.ensure_future(self._measure_uncached(rtl, pack))
            self._measure_inflight[key] = task
            task.add_done_callback(lambda done, k=key: self._measure_done(k, done))
        # shield: one caller being cancelled (Stop) must not cancel the call another caller is waiting on.
        result = await asyncio.shield(task)
        return result.model_copy(deep=True)

    def _measure_done(self, key: tuple[str, str, str], task: "asyncio.Task[MeasureResult]") -> None:
        self._measure_inflight.pop(key, None)
        if task.cancelled() or task.exception() is not None:  # exception() also marks it as retrieved
            return
        result = task.result()
        if result.status in _CACHEABLE_MEASURE:
            self._measure_cache[key] = result
            while len(self._measure_cache) > MEASURE_CACHE_SIZE:
                self._measure_cache.popitem(last=False)

    async def _measure_uncached(self, rtl: Rtl, pack: TaskPack) -> MeasureResult:
        inner = self._settings.timeouts.measure_s

        def on_timeout(raw: RawOutput) -> MeasureResult:
            return MeasureResult(
                status="timeout",
                message=f"synthesis and timing did not finish within {inner} s",
                duration_ms=raw.duration_ms,
            )

        return await self._run("measure", pack, {"dut.v": rtl.data}, inner, parse_measure, on_timeout)

    async def check_equivalence(self, gold: Rtl, gate: Rtl, pack: TaskPack) -> EquivalenceResult:
        inner = self._settings.timeouts.eqy_s

        def on_timeout(raw: RawOutput) -> EquivalenceResult:
            return EquivalenceResult(
                status="timeout",
                message=f"equivalence check did not finish within {inner} s",
                duration_ms=raw.duration_ms,
            )

        # v1 (gold) is /work/dut.v, the candidate (gate) is /work/b.v (CONTRACTS 3.7).
        return await self._run("eqy", pack, {"dut.v": gold.data, "b.v": gate.data}, inner, parse_eqy, on_timeout)

    # ---------- one sandbox call with retry ----------
    async def _run(
        self,
        script: Script,
        pack: TaskPack,
        work_files: Mapping[str, bytes],
        inner_s: int,
        parse: Callable[[dict[str, Any]], T],
        on_timeout: Callable[[RawOutput], T],
    ) -> T:
        call = SandboxCall(
            script=script,
            work_files=work_files,
            pack=pack,
            env=self._env,
            timeout_s=inner_s + self._settings.timeouts.sandbox_overhead_s,
        )
        failure: ToolInfraError | None = None
        for attempt in range(self._retries + 1):
            if attempt:
                await asyncio.sleep(RETRY_PAUSE_S)
            try:
                async with self._sem:
                    raw = await self._execute(call)
            except FatalToolError:
                raise
            except ToolInfraError as exc:
                log.warning("sandbox %s attempt %d failed: %s", script, attempt + 1, exc)
                failure = exc
                continue

            log.info("sandbox %s exit=%s timed_out=%s %d ms", script, raw.exit_code, raw.timed_out, raw.duration_ms)
            if raw.timed_out or raw.exit_code == 124:
                return on_timeout(raw)

            if raw.exit_code == 2:
                raise FatalToolError(
                    f"{script}: input error: {self._message_of(raw)}",
                    script=script,
                    exit_code=2,
                    stderr_tail=_tail(raw.stderr),
                )

            if raw.exit_code == 0:
                try:
                    payload = parse_stdout_json(raw.stdout)
                    status = payload.get("status")
                    if status == "input_error":
                        raise FatalToolError(
                            f"{script}: input error: {payload.get('message') or 'unspecified'}",
                            script=script,
                            exit_code=0,
                            stderr_tail=_tail(raw.stderr),
                        )
                    if status == "internal_error":
                        raise ToolInfraError(
                            f"{script}: internal error: {payload.get('message') or 'unspecified'}",
                            script=script,
                            exit_code=0,
                            stderr_tail=_tail(raw.stderr),
                        )
                    result = parse(payload)
                except FatalToolError:
                    raise
                except ToolInfraError as exc:
                    failure = exc
                    continue
                except (SandboxOutputError, ValueError, TypeError) as exc:
                    # ValueError covers pydantic.ValidationError. Output we cannot parse is infrastructure, not a test failure.
                    failure = ToolInfraError(
                        f"{script}: unusable output: {_tail(str(exc), 300)}",
                        script=script,
                        exit_code=0,
                        stderr_tail=_tail(raw.stderr),
                    )
                    continue
                if result.duration_ms == 0:
                    result = result.model_copy(update={"duration_ms": raw.duration_ms})
                return result

            failure = ToolInfraError(
                f"{script}: sandbox exited with code {raw.exit_code}: {self._message_of(raw)}",
                script=script,
                exit_code=raw.exit_code,
                stderr_tail=_tail(raw.stderr),
            )
            log.warning("%s", failure)

        assert failure is not None
        raise failure

    @staticmethod
    def _message_of(raw: RawOutput) -> str:
        """Best short reason for a failed call: the JSON message if there is one, else the stderr tail."""
        try:
            message = parse_stdout_json(raw.stdout).get("message")
            if message:
                return _tail(str(message), 300)
        except (SandboxOutputError, ValueError):
            pass
        return _tail(raw.stderr.strip() or raw.stdout.strip() or "no output", 300)

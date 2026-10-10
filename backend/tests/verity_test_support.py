"""Test doubles and helpers shared by the test files.

FakeToolRunner implements the ToolRunner protocol with no sandbox: a design passes `verify` when its text equals the
pack's reference.v (a leading `// verity-fake:` header line is ignored, which is how FakeProvider marks its variants),
`measure` returns deterministic numbers derived from the RTL hash, and `check_equivalence` returns a fixed status.
"""

import asyncio
import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from collections.abc import Callable
from typing import Any

from verity.config import AGENT_ROOT, Settings, load_settings
from verity.contracts import EventBase
from verity.core.budget import BudgetLimits
from verity.core.context import RunContext, RunOutcome
from verity.core.pack import TaskPack
from verity.core.records import RunRecord
from verity.core.results import (
    ContractResult,
    EquivalenceResult,
    LintResult,
    MeasureResult,
    SimCase,
    SimResult,
    SynthResult,
    TimingResult,
    VerifyResult,
)
from verity.core.rtl import Rtl, normalize_rtl_text
from verity.llm.fake import FakeProvider
from verity.llm.gateway import RunLLM
from verity.orchestrator import run_orchestrator
from verity.roles import default_roles
from verity.runs.hub import EventHub
from verity.runs.ledger import RunLedger
from verity.store import SqliteStore

REPO_ROOT = AGENT_ROOT.parent
WEB_ROOT = REPO_ROOT / "frontend"
GOLDEN_JSON = WEB_ROOT / "public" / "runs" / "golden.json"
FAKE_HEADER = "// verity-fake:"


def make_settings(data_dir: Path, *, gate_ms: int = 0, **top_level: Any) -> Settings:
    base = load_settings(provider="fake")
    plan = base.plan.model_copy(update={"gate_auto_continue_ms": gate_ms, "gate_after_replan_ms": 0})
    return base.model_copy(update={"data_dir": data_dir, "plan": plan, **top_level})


def tmp_cassettes(settings: Settings) -> Path:
    """An empty cassette folder next to the data dir, so a developer's real cassettes never leak into a test."""
    path = settings.data_dir.parent / "no-cassettes"
    path.mkdir(parents=True, exist_ok=True)
    return path


def strip_fake_header(text: str) -> str:
    return "\n".join(line for line in text.split("\n") if not line.startswith(FAKE_HEADER))


class FakeToolRunner:
    def __init__(self, *, eqy_status: str = "proven", delay_s: float = 0.0) -> None:
        self.eqy_status = eqy_status
        self.delay_s = delay_s
        self.verify_calls = 0
        self.measure_calls = 0
        self.eqy_calls = 0
        self._first_measure: str | None = None

    async def image_digest(self) -> str:
        return "sha256:fake-image"

    async def verify(self, rtl: Rtl, pack: TaskPack) -> VerifyResult:
        self.verify_calls += 1
        if self.delay_s:
            await asyncio.sleep(self.delay_s)
        reference = normalize_rtl_text(pack.reference_rtl() or "")
        ok = normalize_rtl_text(strip_fake_header(rtl.text)) == reference
        n = pack.test_count
        if ok:
            return VerifyResult(
                status="pass",
                contract=ContractResult(ok=True),
                lint=LintResult(ok=True, warnings=0, tool="fake lint"),
                sim=SimResult(ok=True, total=n, passed=n, tool="fake sim"),
                duration_ms=7,
            )
        case = SimCase(name="acc_case", inputs="a=[1,2,3,4]", expected="0x10", got="0x00", pass_=False, cycle=3)
        return VerifyResult(
            status="sim_fail",
            contract=ContractResult(ok=True),
            lint=LintResult(ok=True, warnings=0, tool="fake lint"),
            sim=SimResult(ok=False, total=n, passed=n - 2, failure_count=2, failures=[case], tool="fake sim"),
            duration_ms=7,
        )

    async def measure(self, rtl: Rtl, pack: TaskPack) -> MeasureResult:
        self.measure_calls += 1
        if self.delay_s:
            await asyncio.sleep(self.delay_s)
        if self._first_measure is None:
            self._first_measure = rtl.sha256
            area, clock = 1000.0, 3.0
        else:
            digest = hashlib.sha256(rtl.text.encode()).hexdigest()
            area = 1000.0 - 20 * (1 + int(digest[:2], 16) % 5)
            clock = 3.0 + (int(digest[2:4], 16) % 5) / 10
        return MeasureResult(
            status="ok",
            synth=SynthResult(ok=True, area_um2=area, cell_count=100, cells={"NAND2_X1": 100}, tool="fake yosys"),
            sta=TimingResult(
                ok=True,
                clock_period_ns=clock,
                wns_ns=pack.target_clock_ns - clock,
                target_period_ns=pack.target_clock_ns,
                tool="fake sta",
            ),
            duration_ms=9,
        )

    async def check_equivalence(self, gold: Rtl, gate: Rtl, pack: TaskPack) -> EquivalenceResult:
        self.eqy_calls += 1
        return EquivalenceResult(status=self.eqy_status, log="fake eqy log", duration_ms=11)  # type: ignore[arg-type]


@dataclass(slots=True)
class FakeRun:
    ctx: RunContext
    events: list[EventBase]
    outcome: RunOutcome | None
    store: SqliteStore
    run_id: str
    tools: FakeToolRunner
    error: BaseException | None = None
    extra: dict[str, Any] = field(default_factory=dict)


async def execute_fake_run(
    settings: Settings,
    pack: TaskPack,
    *,
    mode: str = "full",
    priority: str | None = None,
    steers: tuple[Any, ...] = (),
    tools: FakeToolRunner | None = None,
    provider: FakeProvider | None = None,
    cassette_dir: Path | None = None,
    on_ctx: Callable[[RunContext], None] | None = None,
) -> FakeRun:
    """Run the real orchestrator once with the fake provider and the fake tool runner. Steers are queued up front.

    The returned FakeRun keeps its store open (the caller may read more from it); call `await run.store.close()`.
    """
    store = SqliteStore(settings)
    await store.open()
    tools = tools or FakeToolRunner()
    provider = provider or FakeProvider(settings, delay_s=0.0, cassette_dir=cassette_dir or tmp_cassettes(settings))
    chosen = priority or pack.default_priority
    limits = BudgetLimits.from_settings(settings, pack.budget)
    ledger = RunLedger(limits, settings)
    hub = EventHub(store, settings)
    run_id = "r_test_" + uuid.uuid4().hex[:12]
    ctx = RunContext(
        run_id=run_id,
        session_id="test",
        pack=pack,
        priority=chosen,  # type: ignore[arg-type]
        mode=mode,  # type: ignore[arg-type]
        settings=settings,
        llm=RunLLM(provider, settings, ledger),
        roles=default_roles(),
        tools=tools,
        ledger=ledger,
        sink=hub,
        store=store,
    )
    now = datetime.now(UTC)
    await store.create_run(
        RunRecord(
            id=run_id,
            session_id="test",
            preset_id=pack.id,
            priority=chosen,  # type: ignore[arg-type]
            mode=mode,  # type: ignore[arg-type]
            status="running",
            created_at=now,
            started_at=now,
            budget=limits,
            task_pack_sha256=pack.sha256,
        )
    )
    hub.open_run(run_id, started_monotonic=ctx.started_monotonic, ledger=ledger, ctx=ctx)
    for steer in steers:
        ctx.steer.put_nowait(steer)
    if on_ctx is not None:
        on_ctx(ctx)
    error: BaseException | None = None
    try:
        await run_orchestrator(ctx)
    except Exception as exc:  # surfaced to the test through FakeRun.error
        error = exc
    events = await store.events_after(run_id, 0)
    hub.close_run(run_id)
    return FakeRun(ctx=ctx, events=events, outcome=ctx.outcome, store=store, run_id=run_id, tools=tools, error=error)

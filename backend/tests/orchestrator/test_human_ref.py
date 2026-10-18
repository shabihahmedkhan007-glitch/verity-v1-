"""human_ref: the reference.v measurement event (bench "Verity vs human")."""

import pytest

from verity.contracts import HumanRefEvent, RunPhaseEvent, WinnerEvent, event_to_wire
from verity.core.pack import TaskPack
from verity.core.rtl import normalize_rtl_text
from verity.core.types import ToolInfraError
from verity.orchestrator import human_ref
from verity.runs.ledger import RunLedger
from verity_test_support import FakeToolRunner, execute_fake_run, make_settings

pytestmark = pytest.mark.asyncio


class RefProbeTools(FakeToolRunner):
    """Fails measure or EQY for the reference only, and records every Rtl it was asked to measure."""

    def __init__(self, *, fail_ref_measure: bool = False, fail_eqy: bool = False, **kw) -> None:
        super().__init__(**kw)
        self.fail_ref_measure = fail_ref_measure
        self.fail_eqy = fail_eqy
        self.ref_text: str | None = None

    async def measure(self, rtl, pack):
        if self.ref_text is not None and rtl.text == self.ref_text and self.fail_ref_measure:
            raise ToolInfraError("measure sandbox died")
        return await super().measure(rtl, pack)

    async def check_equivalence(self, gold, gate, pack):
        if self.fail_eqy:
            raise ToolInfraError("eqy sandbox died")
        return await super().check_equivalence(gold, gate, pack)


def refs(events):
    return [e for e in events if isinstance(e, HumanRefEvent)]


def assert_order(events):
    ref = next(i for i, e in enumerate(events) if isinstance(e, HumanRefEvent))
    win = max(i for i, e in enumerate(events) if isinstance(e, WinnerEvent))
    term = next(i for i, e in enumerate(events) if isinstance(e, RunPhaseEvent) and e.phase == "done")
    assert win < ref < term


@pytest.mark.parametrize("mode", ["full", "fast"])
async def test_emitted_once_between_winner_and_terminal(settings, mac4: TaskPack, mode) -> None:
    tools = RefProbeTools()
    run = await execute_fake_run(settings, mac4, mode=mode, tools=tools)
    try:
        assert run.outcome is not None and run.outcome.status == "done"
        found = refs(run.events)
        assert len(found) == 1
        assert_order(run.events)
        ev = found[0]
        assert ev.ppa.area_um2 is not None and ev.ppa.pdk == "Nangate45"
        assert ev.eqy.status == "proven" and ev.eqy.tool == "yosys-eqy"
        winner = [e for e in run.events if isinstance(e, WinnerEvent)][-1]
        assert ev.eqy.against_id == winner.candidate_id
        wire = event_to_wire(ev)
        assert set(wire["ppa"]) >= {"areaUm2", "cellCount", "clockPeriodNs", "powerMw", "tools", "pdk"}
        assert wire["t"] == "human_ref"
    finally:
        await run.store.close()


async def test_measure_failure_gives_null_metrics_and_run_still_done(settings, mac4: TaskPack) -> None:
    tools = RefProbeTools(fail_ref_measure=True)
    tools.ref_text = normalize_rtl_text(mac4.reference_rtl())
    run = await execute_fake_run(settings, mac4, mode="full", tools=tools)
    try:
        assert run.outcome is not None and run.outcome.status == "done"
        (ev,) = refs(run.events)
        assert ev.ppa.area_um2 is None and ev.ppa.cell_count is None and ev.ppa.tools == []
        assert_order(run.events)
    finally:
        await run.store.close()


async def test_eqy_infra_error_is_inconclusive(settings, mac4: TaskPack) -> None:
    run = await execute_fake_run(settings, mac4, mode="fast", tools=RefProbeTools(fail_eqy=True))
    try:
        assert run.outcome is not None and run.outcome.status == "done"
        (ev,) = refs(run.events)
        assert ev.eqy.status == "inconclusive"
        assert ev.ppa.area_um2 is not None
    finally:
        await run.store.close()


async def test_pack_without_reference_emits_nothing(settings, mac4: TaskPack, monkeypatch) -> None:
    """The fake LLM needs reference.v to answer, so hide it only while the human_ref stage runs."""
    real_stage, real_ref = human_ref.measure_human_ref, TaskPack.reference_rtl

    async def hidden(st, winner_id):
        monkeypatch.setattr(TaskPack, "reference_rtl", lambda self: None)
        try:
            await real_stage(st, winner_id)
        finally:
            monkeypatch.setattr(TaskPack, "reference_rtl", real_ref)

    monkeypatch.setattr(human_ref, "measure_human_ref", hidden)
    run = await execute_fake_run(settings, mac4, mode="fast", tools=FakeToolRunner())
    try:
        assert run.outcome is not None and run.outcome.status == "done"
        assert refs(run.events) == []
    finally:
        await run.store.close()


async def test_wall_budget_exhausted_skips_tools_and_keeps_status(settings, mac4: TaskPack, monkeypatch) -> None:
    real = RunLedger.exhausted
    armed = {"on": False}
    real_stage = human_ref.measure_human_ref

    async def arm(st, winner_id):
        armed["on"] = True
        before = (st.ctx.tools.measure_calls, st.ctx.tools.eqy_calls)
        await real_stage(st, winner_id)
        assert (st.ctx.tools.measure_calls, st.ctx.tools.eqy_calls) == before

    monkeypatch.setattr(human_ref, "measure_human_ref", arm)
    monkeypatch.setattr(RunLedger, "exhausted", lambda self: "max_wall_s" if armed["on"] else real(self))
    run = await execute_fake_run(settings, mac4, mode="fast", tools=FakeToolRunner())
    try:
        (ev,) = refs(run.events)
        assert ev.ppa.area_um2 is None and ev.eqy.status == "not_run"
        assert ev.eqy.log == "Not run: the time limit was reached."
        assert run.outcome is not None and run.outcome.status in ("done", "cap_reached")
    finally:
        await run.store.close()


async def test_capped_run_with_a_winner_emits_human_ref(tmp_path, mac4: TaskPack) -> None:
    base = make_settings(tmp_path / "data")
    tight = base.budget.model_copy(update={"run": base.budget.run.model_copy(update={"max_llm_calls": 3})})
    run = await execute_fake_run(base.model_copy(update={"budget": tight}), mac4, mode="full")
    try:
        assert run.outcome is not None and run.outcome.status == "cap_reached" and run.outcome.winner_id
        assert len(refs(run.events)) == 1
        ref = next(i for i, e in enumerate(run.events) if isinstance(e, HumanRefEvent))
        term = next(i for i, e in enumerate(run.events) if isinstance(e, RunPhaseEvent) and e.phase == "cap_reached")
        assert ref < term
    finally:
        await run.store.close()

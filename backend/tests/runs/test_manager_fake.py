"""RunManager with the fake provider and the fake tool runner: admission, streaming, stop, restart recovery."""

import asyncio
from datetime import UTC, datetime

import pytest

from verity.contracts import CaptionEvent, HumanEvent, RunPhaseEvent
from verity.contracts.view_types import PinSteer
from verity.core.budget import BudgetLimits
from verity.core.errors import AdmissionDenied, Conflict, Forbidden, NotFound, UnknownPreset
from verity.core.records import RunRecord
from verity.llm.fake import FakeProvider
from verity.runs.manager import RunManager
from verity.store import SqliteStore
from verity_test_support import FakeToolRunner, make_settings, tmp_cassettes


async def make_manager(settings, packs, *, delay_s: float = 0.0):
    store = SqliteStore(settings)
    await store.open()
    provider = FakeProvider(settings, delay_s=0.0, cassette_dir=tmp_cassettes(settings))
    tools = FakeToolRunner(delay_s=delay_s)
    manager = RunManager(settings, store, provider, tools, packs)
    await manager.start()
    return manager, store


async def close(manager: RunManager, store: SqliteStore) -> None:
    await manager.shutdown()
    await store.close()


async def drain(manager: RunManager, run_id: str, after: int = 0) -> list:
    return [e async for e in manager.stream(run_id, after)]


async def test_a_run_streams_to_the_end_without_gaps_and_is_recorded(tmp_path, packs) -> None:
    settings = make_settings(tmp_path / "data")
    manager, store = await make_manager(settings, packs)
    try:
        run = await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        assert run.status == "queued" and run.id.startswith("r_")

        with pytest.raises(AdmissionDenied) as busy:
            await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        assert busy.value.reason == "busy"

        events = await asyncio.wait_for(drain(manager, run.id), timeout=60)
        assert [e.seq for e in events] == list(range(1, len(events) + 1))
        phases = [e.phase for e in events if isinstance(e, RunPhaseEvent)]
        assert phases == ["running", "done"]
        assert isinstance(events[-1], CaptionEvent) and events[-1].chapter == "Done", "the stream must include the last caption"

        stored = await store.events_after(run.id, 0)
        assert [e.seq for e in stored] == [e.seq for e in events]

        row = await manager.get_run(run.id)
        assert row is not None and row.status == "done" and row.winner_id == "c1"
        assert row.spent.llm_calls >= 2 and row.spent.usd >= 0
        assert row.tool_image_digest == "sha256:fake-image"
        assert row.started_at is not None and row.ended_at is not None
        # The fake provider's estimated tokens must not count against the daily dollar budget.
        assert await store.daily_spend(datetime.now(UTC).strftime("%Y-%m-%d")) == 0.0

        log = await manager.run_log(run.id)
        assert log.meta.run_id == run.id and log.meta.sample is False and log.meta.preset_id == "mac4"
        assert [c.label for c in log.meta.chapters][0] == "Spec"
        assert await store.read_run_file(run.id, "runlog.json")

        tail = await drain(manager, run.id, after=5)  # replay of a finished run from the middle
        assert tail and tail[0].seq == 6 and tail[-1].seq == events[-1].seq

        # The slot is free again for the same session.
        again = await manager.create_run(session_id="s1", preset_id="alu8", priority="area", mode="fast")
        await asyncio.wait_for(drain(manager, again.id), timeout=60)
    finally:
        await close(manager, store)


async def test_a_reader_joining_mid_run_gets_no_gap_and_no_duplicate(tmp_path, packs) -> None:
    settings = make_settings(tmp_path / "data")
    manager, store = await make_manager(settings, packs, delay_s=0.05)
    try:
        run = await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        await asyncio.sleep(0.2)  # let some events happen first
        events = await asyncio.wait_for(drain(manager, run.id), timeout=60)
        assert [e.seq for e in events] == list(range(1, len(events) + 1))
    finally:
        await close(manager, store)


async def test_stop_ends_the_run_with_a_stopped_event(tmp_path, packs) -> None:
    settings = make_settings(tmp_path / "data")
    manager, store = await make_manager(settings, packs, delay_s=0.4)
    try:
        run = await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="full")
        reader = asyncio.create_task(drain(manager, run.id))
        await asyncio.sleep(0.3)

        with pytest.raises(Forbidden):
            await manager.stop(run.id, "someone-else")
        with pytest.raises(NotFound):
            await manager.stop("r_unknown", "s1")

        await manager.stop(run.id, "s1")
        await manager.stop(run.id, "s1")  # idempotent
        events = await asyncio.wait_for(reader, timeout=30)

        phases = [e.phase for e in events if isinstance(e, RunPhaseEvent)]
        assert phases[-1] == "stopped" and phases.count("stopped") == 1
        assert any(isinstance(e, HumanEvent) and e.input.kind == "stop" for e in events)
        row = await manager.get_run(run.id)
        assert row is not None and row.status == "stopped"

        with pytest.raises(Conflict):
            await manager.steer(run.id, "s1", PinSteer(block_id="blk-x", pin="p"))
    finally:
        await close(manager, store)


async def test_admission_rules(tmp_path, packs) -> None:
    settings = make_settings(tmp_path / "data")
    manager, store = await make_manager(settings, packs, delay_s=0.5)
    try:
        with pytest.raises(UnknownPreset):
            await manager.create_run(session_id="s1", preset_id="add8", priority="area", mode="fast")  # eval_only pack
        with pytest.raises(UnknownPreset):
            await manager.create_run(session_id="s1", preset_id="mac4", priority="turbo", mode="fast")  # type: ignore[arg-type]
        assert set(manager.presets()) == {"mac4", "alu8", "matmul4"}

        first = await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        second = await manager.create_run(session_id="s2", preset_id="mac4", priority="area", mode="fast")
        with pytest.raises(AdmissionDenied) as err:  # global concurrency is 2
            await manager.create_run(session_id="s3", preset_id="mac4", priority="area", mode="fast")
        assert err.value.reason == "busy"
        health = await manager.health()
        assert health.live_enabled is False and health.reason == "busy"

        with pytest.raises(Forbidden):
            await manager.steer(first.id, "s2", PinSteer(block_id="blk-x", pin="p"))
        for run in (first, second):
            await manager.stop(run.id, run.session_id)
            await asyncio.wait_for(drain(manager, run.id), timeout=30)
    finally:
        await close(manager, store)


async def test_maintenance_and_daily_budget_are_reported(tmp_path, packs) -> None:
    base = make_settings(tmp_path / "data")
    no_key = base.model_copy(update={"provider": "nebius", "llm": base.llm.model_copy(update={"api_key": None})})
    manager, store = await make_manager(no_key, packs)
    try:
        health = await manager.health()
        assert health.live_enabled is False and health.reason == "maintenance"
        with pytest.raises(AdmissionDenied) as err:
            await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        assert err.value.reason == "maintenance"
    finally:
        await close(manager, store)

    spent = base.model_copy(update={"limits": base.limits.model_copy(update={"daily_usd": 0.0})})
    manager, store = await make_manager(spent, packs)
    try:
        assert (await manager.health()).reason == "budget_exhausted"
        with pytest.raises(AdmissionDenied) as err:
            await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast")
        assert err.value.reason == "budget_exhausted"
    finally:
        await close(manager, store)


async def test_startup_recovery_ends_orphaned_runs_as_errors(tmp_path, packs) -> None:
    settings = make_settings(tmp_path / "data")
    store = SqliteStore(settings)
    await store.open()
    now = datetime.now(UTC)
    await store.create_run(
        RunRecord(
            id="r_orphan",
            session_id="s1",
            preset_id="mac4",
            priority="area",
            mode="fast",
            status="running",
            created_at=now,
            started_at=now,
            budget=BudgetLimits.from_settings(settings),
            task_pack_sha256=packs["mac4"].sha256,
        )
    )
    provider = FakeProvider(settings, delay_s=0.0, cassette_dir=tmp_cassettes(settings))
    manager = RunManager(settings, store, provider, FakeToolRunner(), packs)
    await manager.start()
    try:
        row = await manager.get_run("r_orphan")
        assert row is not None and row.status == "error" and row.error_reason == "server restarted"
        events = await drain(manager, "r_orphan")
        assert [e.phase for e in events if isinstance(e, RunPhaseEvent)] == ["error"]
    finally:
        await close(manager, store)


async def test_params_render_the_pack_and_reach_the_spec_event(tmp_path, packs) -> None:
    from verity.contracts import SpecEvent
    from verity.core.family import ParamsError

    settings = make_settings(tmp_path / "data")
    manager, store = await make_manager(settings, packs)
    try:
        with pytest.raises(ParamsError) as bad:
            await manager.create_run(session_id="s1", preset_id="mac4", priority="area", mode="fast", params={"lanes": 9})
        assert "1 to 8" in str(bad.value)
        assert (await manager.health()).features == ["params"]

        run = await manager.create_run(
            session_id="s1", preset_id="mac4", priority="area", mode="fast", params={"lanes": 6, "width": 12, "cycles": 20}
        )
        events = await asyncio.wait_for(drain(manager, run.id), timeout=60)
        spec = next(e for e in events if isinstance(e, SpecEvent)).spec
        by_name = {p.name: p for p in spec.ports}
        assert (by_name["a"].count, by_name["a"].width, by_name["acc"].width) == (6, 12, 31)
        assert "6-lane" in spec.title
    finally:
        await close(manager, store)

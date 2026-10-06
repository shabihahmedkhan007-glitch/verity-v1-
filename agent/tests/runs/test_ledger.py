"""RunLedger: worst-case reservations, commits, counters (agent ARCHITECTURE 20). Written, not yet run."""

import pytest

from verity.config import load_settings
from verity.core.types import BudgetExhausted, BudgetLimits, Usage
from verity.runs.ledger import RunLedger

ULTRA = "nvidia/Nemotron-3-Ultra-550b-a55b"


def make_ledger(**overrides: float) -> RunLedger:
    settings = load_settings()
    limits = BudgetLimits.from_settings(settings, overrides)
    return RunLedger(limits, settings)


def test_reserve_commit_tracks_actual_usage() -> None:
    ledger = make_ledger()
    r = ledger.reserve(role="planner", model=ULTRA, max_input_tokens=1000, max_output_tokens=500)
    ledger.commit(r, Usage(model=ULTRA, input_tokens=800, output_tokens=300, usd=0.0017))
    snap = ledger.snapshot()
    assert snap.llm_calls == 1
    assert snap.input_tokens == 800
    assert snap.output_tokens == 300
    assert snap.usd == pytest.approx(0.0017)
    # A second commit of the same reservation is ignored.
    ledger.commit(r, Usage(model=ULTRA, input_tokens=800, output_tokens=300, usd=0.0017))
    assert ledger.snapshot().llm_calls == 1


def test_open_reservations_count_against_the_limit() -> None:
    ledger = make_ledger(max_llm_calls=2)
    ledger.reserve(role="optimizer", model=ULTRA, max_input_tokens=10, max_output_tokens=10)
    ledger.reserve(role="optimizer", model=ULTRA, max_input_tokens=10, max_output_tokens=10)
    with pytest.raises(BudgetExhausted) as err:
        ledger.reserve(role="optimizer", model=ULTRA, max_input_tokens=10, max_output_tokens=10)
    assert err.value.limit == "max_llm_calls"


def test_release_frees_the_hold() -> None:
    ledger = make_ledger(max_llm_calls=1)
    r = ledger.reserve(role="planner", model=ULTRA, max_input_tokens=10, max_output_tokens=10)
    ledger.release(r)
    ledger.reserve(role="planner", model=ULTRA, max_input_tokens=10, max_output_tokens=10)


def test_worst_case_dollars_are_checked() -> None:
    ledger = make_ledger(max_usd=0.01)
    # 12k input at $1/M plus 4k output at $3/M is 0.024 > 0.01.
    with pytest.raises(BudgetExhausted) as err:
        ledger.reserve(role="rtl_gen", model=ULTRA, max_input_tokens=12_000, max_output_tokens=4_000)
    assert err.value.limit == "max_usd"


def test_exhausted_reports_the_first_used_up_limit() -> None:
    ledger = make_ledger(max_llm_calls=1)
    assert ledger.exhausted() is None
    r = ledger.reserve(role="planner", model=ULTRA, max_input_tokens=10, max_output_tokens=10)
    ledger.commit(r, Usage(model=ULTRA, input_tokens=10, output_tokens=10, usd=0.0001))
    assert ledger.exhausted() == "max_llm_calls"


def test_counters() -> None:
    ledger = make_ledger(max_candidates=2, max_rounds=1)
    assert ledger.can_count("candidate")
    ledger.count("candidate")
    ledger.count("candidate")
    assert not ledger.can_count("candidate")
    ledger.count("round")
    assert not ledger.can_count("round")
    assert ledger.can_count("repair")
    ledger.count("repair")
    assert ledger.snapshot().repairs == 1

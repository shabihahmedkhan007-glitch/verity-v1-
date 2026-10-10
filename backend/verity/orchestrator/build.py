"""Build one candidate: validate, lint, simulate, repair (bounded), then synthesize (CONTRACTS 6.2 steps 7, 8, 10).

`evaluate` and `measure` serve both the baseline (v1, with per-stage events) and the evolve children (only
candidate events and captions, no stage events, CONTRACTS 6.2 step 10). Every branch is an `if` on tool output;
no model text decides anything.
"""

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from ..contracts import Attempt, AttemptBy, Verification, to_json
from ..core import captions as cap
from ..core.types import (
    AttemptMeta,
    BudgetExhausted,
    MeasureResult,
    RtlOut,
    RtlRejected,
    Rtl,
    VerifyResult,
)
from . import judge
from .candidates import FIRST_VERSION_REASON, Cand
from .state import RunState, meta_dict

log = logging.getLogger("verity.orchestrator")


@dataclass(slots=True)
class _Checked:
    verification: Verification | None
    passed: bool = False
    rtl: Rtl | None = None
    result: VerifyResult | None = None
    rules_problem: str | None = None  # first RtlRejected problem
    duplicate_of: str | None = None  # id of the candidate that already used this exact RTL


def _default_reason(st: RunState, c: Cand) -> str:
    if c.created_by == "INIT" or c.parent_id is None:
        return FIRST_VERSION_REASON
    parent = st.cands.get(c.parent_id)
    return f"{c.created_by.title()} version of {parent.label if parent else c.parent_id}"


def _chapter(c: Cand, baseline: bool) -> str:
    return cap.CH_BUILD if baseline else cap.round_chapter(c.round)


# ======================================================================
# verify loop
# ======================================================================
async def evaluate(st: RunState, c: Cand, out: RtlOut, *, baseline: bool) -> bool:
    """Run attempt 1 (`out`) and then FIX attempts until the candidate passes or its repair budget is spent.

    Returns True when all tests pass (c.status "pass"). On failure the baseline keeps status "fail" (the caller ends
    the run) and a child becomes "rejected". Raises RunStopped / CancelledError, LLMError, RoleOutputError and
    ToolInfraError to the caller.
    """
    ctx, em, pack = st.ctx, st.em, st.ctx.pack
    limits = ctx.ledger.limits
    max_fixes = limits.max_repairs_baseline if baseline else limits.max_repairs_child
    chapter = _chapter(c, baseline)
    by: AttemptBy = c.created_by
    c.reason = out.reason.strip() or _default_reason(st, c)

    while True:
        ctx.check_stop()
        n = len(c.attempts) + 1
        c.rtl = out.text
        await st.record_meta(out.meta)

        checked = await _check_attempt(st, c, out.text, baseline=baseline)

        if checked.duplicate_of is not None:
            same_as = st.cands[checked.duplicate_of]
            c.reject()
            await em.candidate(c)
            await em.caption(cap.child_duplicate(c.label, same_as.label), chapter)
            return False

        assert checked.verification is not None
        verification = checked.verification
        attempt = Attempt(
            n=n,
            by=by,
            reason=out.reason.strip() or (FIRST_VERSION_REASON if n == 1 else "Fix attempt"),
            rtl=checked.rtl.text if checked.rtl is not None else out.text,
            verification=verification,
        )
        c.attempts.append(attempt)
        c.verification = verification
        c.rtl = attempt.rtl
        attempt_meta = await _persist_attempt(st, c, attempt, out, checked)

        if checked.passed and checked.rtl is not None:
            c.status = "pass"
            c.rtl_obj = checked.rtl
            if baseline:
                c.is_baseline = True
                await em.stage("sim", "done")
                if c.fix_count:
                    await em.stage("fix", "done", detail=f"{c.fix_count} fix" + ("" if c.fix_count == 1 else "es"))
            await em.candidate(c)
            if baseline:
                await em.caption(cap.baseline_passes(c.label, pack.test_count), chapter)
            return True

        # ---------- failed ----------
        c.status = "fail"
        await em.candidate(c)
        if baseline and checked.rules_problem is None and verification.lint == "pass":
            await em.stage("sim", "failed")

        can_fix = c.fix_count < max_fixes and not ctx.stopped
        if can_fix and st.budget_blocked():
            can_fix = False
        if baseline or can_fix:
            await em.caption(_fail_caption(c, verification, checked, baseline), chapter)
        if can_fix:
            try:
                repaired = await _repair(st, c, attempt.rtl, verification, n + 1, baseline=baseline)
            except BudgetExhausted as exc:
                st.note_budget(exc.limit)
                c.status = "fail"
                await em.candidate(c)
                repaired = None
            if repaired is not None:
                out, by = repaired, "FIX"
                # Attach the diagnosis to the failed attempt and show the fix in flight.
                await _attach_diagnosis(st, c, attempt, attempt_meta, repaired, baseline=baseline)
                c.fix_count += 1
                continue

        # No more repairs (or none allowed): baseline stops the run, a child is rejected.
        if baseline:
            if c.fix_count:
                await em.stage("fix", "failed", detail=f"{c.fix_count} fix" + ("" if c.fix_count == 1 else "es"))
            await em.caption(cap.no_baseline(c.fix_count), chapter)
        else:
            c.reject()
            await em.candidate(c)
            await em.caption(cap.child_rejected(c.label), chapter)
        return False


def _fail_caption(c: Cand, v: Verification, checked: _Checked, baseline: bool) -> str:
    if checked.rules_problem is not None:
        return cap.rejected_rules(c.label, checked.rules_problem)
    if v.lint == "fail":
        return cap.failed_lint(c.label)
    failed = max(1, v.total - v.passed)
    return cap.failed_tests(c.label, failed, v.total) if baseline else cap.child_failed(c.label, failed, v.total)


async def _check_attempt(st: RunState, c: Cand, text: str, *, baseline: bool) -> _Checked:
    """Validate the RTL, then (if it is new) run one sandbox verify call and map it to a Verification."""
    ctx, em, pack = st.ctx, st.em, st.ctx.pack

    try:
        rtl = pack.validate_rtl(text, max_bytes=ctx.settings.rtl.max_bytes)
    except RtlRejected as exc:
        problems = exc.problems
        verification = Verification(
            lint="fail",
            lint_log="Rejected before simulation:\n" + "\n".join(f"- {p}" for p in problems),
            passed=0,
            total=pack.test_count,
            failures=[],
            tool="Verity RTL rules",
            duration_ms=0,
        )
        if baseline:
            await em.stage("lint", "failed")
        return _Checked(verification, rules_problem=problems[0] if problems else "invalid RTL")

    owner = st.sha_owner.get(rtl.sha256)
    if owner is not None and owner != c.id:
        return _Checked(None, rtl=rtl, duplicate_of=owner)
    if owner == c.id and c.verification is not None:
        # A "fix" that returned the same RTL again: no sandbox call, it fails exactly like before.
        return _Checked(c.verification, rtl=rtl)
    st.sha_owner[rtl.sha256] = c.id

    if baseline:
        await em.stage("lint", "active")
    c.status = "linting"
    await em.candidate(c)

    with ctx.busy():
        result = await ctx.tools.verify(rtl, pack)
    verification = result.to_verification(pack.test_count, timeout_s=ctx.settings.timeouts.sim_s)
    passed = result.passed_all(pack.test_count)

    if verification.lint == "pass":
        if baseline:
            await em.stage("lint", "done")
            await em.stage("sim", "active")
        c.status = "simulating"
        await em.candidate(c)
        if baseline:
            await em.caption(cap.simulating(pack.test_count), cap.CH_BUILD)
    elif baseline:
        await em.stage("lint", "failed")
    return _Checked(verification, passed=passed, rtl=rtl, result=result)


async def _persist_attempt(st: RunState, c: Cand, attempt: Attempt, out: RtlOut, checked: _Checked) -> AttemptMeta:
    ctx = st.ctx
    sha = checked.rtl.sha256 if checked.rtl is not None else hashlib.sha256(out.text.encode("utf-8", "replace")).hexdigest()
    base = f"candidates/{c.id}/attempt-{attempt.n}"
    meta = AttemptMeta(
        model_id=out.meta.model,
        prompt_version=out.meta.prompt_version,
        llm_request_id=out.meta.request_id,
        input_tokens=out.meta.input_tokens,
        output_tokens=out.meta.output_tokens,
        rtl_sha256=sha,
        rtl_artifact=f"{base}.v",
        tool_image_digest=st.image_digest or None,
        created_at=datetime.now(UTC),
    )
    try:
        await ctx.store.add_attempt(ctx.run_id, c.id, attempt, meta)
    except Exception:
        # Store trouble must not kill a run whose events are already streaming.
        log.exception("run %s: add_attempt failed", ctx.run_id)
    await st.save(f"{base}.v", attempt.rtl, "text/x-verilog")
    if checked.result is not None:
        await st.save(f"{base}.verify.json", checked.result.model_dump_json(by_alias=True, indent=2), "application/json")
    else:
        await st.save(f"{base}.verify.json", to_json(attempt.verification), "application/json")
    await st.save(
        f"{base}.llm.json", json.dumps({"raw": out.raw, "meta": meta_dict(out.meta)}, indent=2), "application/json"
    )
    return meta


async def _repair(
    st: RunState, c: Cand, rtl_text: str, verification: Verification, attempt_n: int, *, baseline: bool
) -> RtlOut | None:
    ctx, em = st.ctx, st.em
    if baseline:
        await em.stage("fix", "active")
    c.status = "fixing"
    await em.candidate(c)
    with ctx.busy():
        repaired = await ctx.roles.repair(ctx.llm, ctx.pack, rtl_text, verification, attempt_n=attempt_n)
    ctx.ledger.count("repair")
    await st.credits()
    return repaired


async def _attach_diagnosis(
    st: RunState, c: Cand, attempt: Attempt, meta: AttemptMeta, repaired: RtlOut, *, baseline: bool
) -> None:
    """Put the repair role's diagnosis on the attempt it was about, and re-upsert (CONTRACTS 6.2 step 7)."""
    if not repaired.diagnosis:
        return
    text = cap.clean(repaired.diagnosis, 300)
    if not text:
        return
    verification = attempt.verification.model_copy(update={"diagnosis": text})
    updated = attempt.model_copy(update={"verification": verification})
    c.attempts[-1] = updated
    c.verification = verification
    try:
        await st.ctx.store.add_attempt(st.ctx.run_id, c.id, updated, meta)
    except Exception:
        log.exception("run %s: could not store the diagnosis", st.ctx.run_id)
    await st.em.candidate(c)
    if baseline:
        await st.em.caption(cap.diagnosis(text), cap.CH_BUILD)


# ======================================================================
# measure
# ======================================================================
async def measure(st: RunState, c: Cand, *, baseline: bool) -> bool:
    """Synthesize a passing candidate (Yosys + OpenSTA). True when it is measured and ranked.

    Baseline failure leaves the status "synthesizing" (the caller ends the run). A child that does not synthesize is
    rejected.
    """
    ctx, em, pack = st.ctx, st.em, st.ctx.pack
    assert c.rtl_obj is not None, "measure() needs a passing candidate"
    chapter = _chapter(c, baseline)

    ctx.check_stop()
    if baseline:
        await em.stage("synth", "active")
    c.status = "synthesizing"
    await em.candidate(c)

    with ctx.busy():
        result = await ctx.tools.measure(c.rtl_obj, pack)
    c.measure = result

    if not result.measured:
        await st.save_json(f"candidates/{c.id}/synth-failure.json", {"status": result.status, "message": result.message})
        if baseline:
            await em.stage("synth", "failed")
            await em.caption(cap.baseline_synth_failed(c.label), chapter)
        else:
            c.reject()
            await em.candidate(c)
            await em.caption(cap.child_synth_failed(c.label), chapter)
        return False

    ppa = result.to_ppa()
    c.ppa = ppa
    if baseline:
        c.fitness = judge.baseline_fitness(ppa, ctx.priority, c.id)
    else:
        base = st.baseline
        assert base is not None and base.ppa is not None
        c.fitness = judge.candidate_fitness(base.ppa, ppa, ctx.priority, base.id)
    c.status = "measured"
    await em.candidate(c)
    if baseline:
        await em.stage("synth", "done")
    return True


async def publish_reports(st: RunState, c: Cand) -> None:
    """Artifact events and files for a measured candidate: synth report, STA report, circuit graph."""
    em = st.em
    result = c.measure
    if result is None or c.ppa is None:
        return
    synth_text = _synth_report(result)
    await em.artifact(f"reports/synth_{c.label}.txt", synth_text)
    await st.save(f"candidates/{c.id}/synth.log", synth_text)
    if result.sta is not None:
        sta_text = _sta_report(result)
        await em.artifact(f"reports/sta_{c.label}.txt", sta_text)
        await st.save(f"candidates/{c.id}/sta.log", sta_text)
    circuit = result.circuit_for(c.id)
    if circuit is not None:
        body = to_json(circuit)
        await em.artifact(f"circuit/{c.id}.json", body)
        await st.save(f"candidates/{c.id}/circuit.json", body, "application/json")
    await st.save(f"candidates/{c.id}/ppa.json", to_json(c.ppa), "application/json")


def _synth_report(result: MeasureResult) -> str:
    synth = result.synth
    lines = [
        f"Tool: {synth.tool if synth else 'Yosys'}",
        f"Library: {result.pdk}, post-synthesis estimate (no wires)",
    ]
    if synth is not None:
        if synth.area_um2 is not None:
            lines.append(f"Area: {synth.area_um2:.2f} um2")
        if synth.cell_count is not None:
            lines.append(f"Cells: {synth.cell_count}")
        for name, count in sorted(synth.cells.items(), key=lambda kv: (-kv[1], kv[0])):
            lines.append(f"  {name}: {count}")
        if synth.log:
            lines += ["", "--- log (tail) ---", synth.log]
    return "\n".join(lines) + "\n"


def _sta_report(result: MeasureResult) -> str:
    sta = result.sta
    assert sta is not None
    lines = [f"Tool: {sta.tool}", f"Library: {result.pdk}, post-synthesis timing estimate (no wires)"]
    if sta.ok and sta.clock_period_ns is not None:
        kind = "clock" if sta.clocked else "virtual clock (combinational design)"
        lines.append(f"Minimum clock period: {sta.clock_period_ns:.3f} ns ({kind})")
        if sta.target_period_ns is not None and sta.wns_ns is not None:
            lines.append(f"Target period {sta.target_period_ns:.3f} ns, worst setup slack {sta.wns_ns:.3f} ns")
    else:
        lines.append("Timing was not measured.")
    if sta.log:
        lines += ["", "--- log (tail) ---", sta.log]
    return "\n".join(lines) + "\n"

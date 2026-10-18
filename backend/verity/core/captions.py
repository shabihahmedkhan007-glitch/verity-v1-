"""Caption templates (ARCHITECTURE 9.1: template strings from code, not LLM prose) and chapter labels.

Wording follows frontend/public/runs/golden.json. Only two templates embed model text, both truncated and
ASCII-cleaned: `diagnosis()` (the repair role's one-sentence reading) and nothing else. Numbers come from run data.
"""

import re

from ..contracts import PPA, Priority

# Chapter labels in timeline order. RunLog.meta.chapters uses (id, label, first tMs where a caption used it).
CHAPTERS: tuple[tuple[str, str], ...] = (
    ("spec", "Spec"),
    ("plan", "Plan"),
    ("lock", "Lock"),
    ("build", "Build and fix"),
    ("round1", "Round 1"),
    ("round2", "Round 2"),
    ("prove", "Prove"),
    ("done", "Done"),
)
CH_SPEC, CH_PLAN, CH_LOCK, CH_BUILD, CH_ROUND1, CH_ROUND2, CH_PROVE, CH_DONE = (label for _, label in CHAPTERS)
CHAPTER_ID_BY_LABEL: dict[str, str] = {label: cid for cid, label in CHAPTERS}


def round_chapter(round_n: int) -> str:
    return CH_ROUND1 if round_n <= 1 else CH_ROUND2

_WORDS = ("zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten")
_GOALS: dict[Priority, str] = {
    "area": "smallest area",
    "speed": "shortest clock period",
    "power": "lowest power",
}


def words(n: int) -> str:
    return _WORDS[n] if 0 <= n < len(_WORDS) else str(n)


def clean(text: str, limit: int = 200) -> str:
    """Single line, ASCII, no dashes other than '-', truncated on a word boundary."""
    text = text.replace("\u2014", ", ").replace("\u2013", "-").replace("\u2212", "-")
    text = re.sub(r"\s+", " ", text).strip()
    text = text.encode("ascii", errors="ignore").decode("ascii")
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:")
    return cut + "..."


def _num(value: float, decimals: int = 0) -> str:
    return f"{value:,.{decimals}f}"


def _pct(delta: float) -> str:
    return f"{'+' if delta >= 0 else '-'}{abs(delta):.1f}%"


# ---------- spec, plan, lock ----------
def spec_read(summary: str, priority: Priority) -> str:
    return f"Spec read: {summary}. Goal: {_GOALS[priority]}."


def drafting_plan() -> str:
    return "Drafting the plan."


def plan_drafted(blocks: int, auto_continue_ms: int) -> str:
    return f"Plan drafted: {blocks} blocks. Building in {round(auto_continue_ms / 1000)} s unless you steer."


def toggled(block_name: str, variant_label: str, value: str) -> str:
    return f"You set {variant_label.lower()} on {block_name} to {value}. Replanning."


def pinned(block_name: str, pin: str) -> str:
    return f"You pinned \"{pin}\" on {block_name}. Replanning."


def plan_updated(auto_continue_ms: int) -> str:
    return f"Plan updated. Building in {round(auto_continue_ms / 1000)} s."


def gate_held() -> str:
    return "Plan on hold. Building when you resume."


def building_now() -> str:
    return "Building now."


def plan_rejected(reason: str) -> str:
    return f"Plan rejected before any Verilog was written: {clean(reason, 160)}"


def locked(test_count: int) -> str:
    return f"Answer key locked: {test_count} tests from the golden model. The agent cannot edit them."


# ---------- build and fix ----------
def writing_v1() -> str:
    return "Writing v1 from the plan."


def auto_fixed(label: str, changes: str) -> str:
    return f"{label}: fixed declarations without asking the model ({clean(changes, 160)}). Re-checking."


def sampled(count: int, passed: int, total: int) -> str:
    return f"Wrote {count} first versions in parallel. Continuing with the one that passes {passed} of {total} tests."


def restarted(label: str) -> str:
    return f"{label} failed the same way twice. Rewriting it from the plan instead of patching."


def simulating(test_count: int) -> str:
    return f"Simulating {test_count} tests against the golden model."


def failed_tests(label: str, failed: int, total: int) -> str:
    return f"{label} failed {failed} of {total} tests. Reading the mismatches."


def failed_lint(label: str) -> str:
    return f"{label} did not pass lint. Reading the errors."


def rejected_rules(label: str, first_problem: str) -> str:
    return f"{label} broke the coding rules: {clean(first_problem, 120)}. Fixing it."


def diagnosis(text: str) -> str:
    return f"Diagnosis: {clean(text, 200)}"


def baseline_passes(label: str, total: int) -> str:
    return f"{label} passes {total} of {total}. This is the baseline."


def no_baseline(fixes: int) -> str:
    return f"No passing version after {fixes} fix{'es' if fixes != 1 else ''}. Stopping here."


def baseline_measured(label: str, ppa: PPA) -> str:
    parts = []
    parts.append(f"{_num(ppa.area_um2)} µm²" if ppa.area_um2 is not None else "area not measured")
    parts.append(f"{ppa.clock_period_ns:.2f} ns" if ppa.clock_period_ns is not None else "timing not measured")
    parts.append(f"{ppa.power_mw:.2f} mW" if ppa.power_mw is not None else "power not measured")
    return f"{label} measured: {', '.join(parts)}. Everything after is compared to this."


def baseline_synth_failed(label: str) -> str:
    return f"{label} passed the tests but did not synthesize. Stopping here."


# ---------- evolution ----------
def round_started(round_n: int, children: int, parent_labels: list[str], from_elites: bool) -> str:
    source = "the elites" if from_elites else " and ".join(parent_labels)
    return f"Round {round_n}: {words(children)} new version{'s' if children != 1 else ''} from {source}."


def child_failed(label: str, failed: int, total: int) -> str:
    return f"{label} failed {failed} of {total} tests. Fixing it before it can compete."


def child_rejected(label: str) -> str:
    return f"{label} failed again after a fix and was rejected."


def child_duplicate(label: str, same_as: str) -> str:
    return f"{label} was identical to {same_as} and was dropped."


def child_synth_failed(label: str) -> str:
    return f"{label} passed the tests but did not synthesize. Rejected."


def child_measured(label: str, baseline_label: str, ppa: PPA, baseline: PPA) -> str:
    def delta(b: float | None, c: float | None) -> float | None:
        return None if b is None or c is None or b == 0 else 100.0 * (c - b) / b

    parts = []
    d = delta(baseline.area_um2, ppa.area_um2)
    parts.append(f"area {_pct(d)} vs {baseline_label}" if d is not None else "area not measured")
    d = delta(baseline.clock_period_ns, ppa.clock_period_ns)
    parts.append(f"clock period {_pct(d)}" if d is not None else "timing not measured")
    d = delta(baseline.power_mw, ppa.power_mw)
    parts.append(f"power {_pct(d)}" if d is not None else "power not measured")
    return f"{label}: {', '.join(parts)}."


def elites_kept(labels: list[str]) -> str:
    if len(labels) == 1:
        return f"Kept the best: {labels[0]}."
    return f"Kept the {words(len(labels))} best: {' and '.join(labels)}."


def no_improvement(baseline_label: str = "v1") -> str:
    return f"No version beat {baseline_label} this round. Skipping round 2."


def winner(label: str) -> str:
    return f"Winner by fitness: {label}."


def baseline_wins(label: str = "v1") -> str:
    return f"No version beat {label}. {label} stands."


# ---------- prove ----------
def proving(label: str, baseline_label: str = "v1") -> str:
    return f"Checking {label} against {baseline_label} with Yosys EQY."


def proven(baseline_label: str = "v1") -> str:
    return f"Proven equal to {baseline_label}."


def measuring_human_reference() -> str:
    return "Measuring the human-written design with the same tools."


def not_proven() -> str:
    return "Tested, not proven: EQY could not decide in time."


def not_equivalent(label: str, next_label: str) -> str:
    return f"{label} is not equal to v1 and was rejected. Next best: {next_label}."


# ---------- end ----------
def budget_reached(limit: str) -> str:
    return f"Budget reached ({limit.replace('_', ' ')}). Finishing with what is measured."


def done(versions: int, fixes: int, rejected: int, human_inputs: int) -> str:
    return (
        f"Done. {versions} version{'s' if versions != 1 else ''}, {fixes} fix{'es' if fixes != 1 else ''}, "
        f"{rejected} rejected. Human inputs: {human_inputs}."
    )


def stopped() -> str:
    return "Run stopped by you."


def failed(reason: str) -> str:
    return f"Run ended: {clean(reason, 160)}"

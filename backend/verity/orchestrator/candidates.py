"""Mutable working state of one candidate while the orchestrator builds it. `to_model()` gives the wire Candidate."""

from dataclasses import dataclass, field

from ..contracts import PPA, Attempt, Candidate, CandidateStatus, CreatedBy, Equivalence, Fitness, Verification
from ..core.types import MeasureResult, Rtl

FIRST_VERSION_REASON = "First version, written from the plan"


@dataclass(slots=True)
class Cand:
    id: str
    label: str
    round: int
    parent_id: str | None
    created_by: CreatedBy
    reason: str = ""
    rtl: str = ""  # text of the attempt in flight, or of the last attempt
    attempts: list[Attempt] = field(default_factory=list)
    verification: Verification | None = None
    ppa: PPA | None = None
    fitness: Fitness | None = None
    status: CandidateStatus = "drafting"
    fix_count: int = 0
    is_baseline: bool = False
    is_elite: bool = False
    eqy: Equivalence | None = None
    # Backend-only (never on the wire):
    rtl_obj: Rtl | None = None  # the last RTL that passed validation (what the sandbox saw)
    measure: MeasureResult | None = None

    @property
    def number(self) -> int:
        return int(self.id[1:])

    def to_model(self) -> Candidate:
        return Candidate(
            id=self.id,
            label=self.label,
            round=self.round,
            parent_id=self.parent_id,
            created_by=self.created_by,
            reason=self.reason,
            rtl=self.rtl,
            attempts=list(self.attempts),
            verification=self.verification,
            ppa=self.ppa,
            fitness=self.fitness,
            status=self.status,
            fix_count=self.fix_count,
            is_baseline=self.is_baseline,
            is_elite=self.is_elite,
            eqy=self.eqy,
        )

    def reject(self) -> None:
        """Rejected candidates are never ranked and never elite."""
        self.status = "rejected"
        self.fitness = None
        self.is_elite = False

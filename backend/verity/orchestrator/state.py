"""RunState: everything the orchestrator stages share for one run."""

import json
import logging
from dataclasses import asdict, dataclass, field

from ..contracts import Candidate
from ..core.types import CallMeta, PlanOut, RunContext, RunPatch
from . import judge
from .candidates import Cand
from .events import Emitter

log = logging.getLogger("verity.orchestrator")

BASELINE_ID = "c1"


@dataclass(slots=True)
class RunState:
    ctx: RunContext
    em: Emitter
    cands: dict[str, Cand] = field(default_factory=dict)
    next_n: int = 1
    # RTL sha256 -> id of the candidate that first used it (identical-RTL dedupe, CONTRACTS 6.2 step 10).
    sha_owner: dict[str, str] = field(default_factory=dict)
    plan: PlanOut | None = None
    plan_revision: int = 0
    # Name of the budget limit that cut the run short (BudgetLimits field), or None. Decides cap_reached.
    budget_limit: str | None = None
    prompt_versions: dict[str, str] = field(default_factory=dict)
    image_digest: str = ""
    # Prove stage results, for the final summary.
    evolve_started: bool = False
    final_winner_id: str | None = None

    # ---------- candidates ----------
    def new_candidate(self, *, round_n: int, parent_id: str | None, created_by) -> Cand:
        """Allocate the next id (`c<n>`, label `v<n>`) and count it against max_candidates."""
        n = self.next_n
        self.next_n += 1
        self.ctx.ledger.count("candidate")
        cand = Cand(id=f"c{n}", label=f"v{n}", round=round_n, parent_id=parent_id, created_by=created_by)
        self.cands[cand.id] = cand
        return cand

    @property
    def baseline(self) -> Cand | None:
        return self.cands.get(BASELINE_ID)

    def models(self) -> list[Candidate]:
        return [c.to_model() for c in self.cands.values()]

    def current_elites(self) -> list[str]:
        """Best-k elites over all candidates right now, best first (v1 counts, at 0)."""
        return judge.elites(self.models(), self.ctx.settings.evolution.elites)

    async def apply_elites(self, elite_ids: list[str]) -> None:
        """Set isElite on every candidate and re-upsert the ones whose flag changed."""
        for cand in self.cands.values():
            should = cand.id in elite_ids
            if cand.is_elite != should:
                cand.is_elite = should
                await self.em.candidate(cand)

    async def refresh_elites(self) -> list[str]:
        elite_ids = self.current_elites()
        await self.apply_elites(elite_ids)
        return elite_ids

    # ---------- budget ----------
    def note_budget(self, limit: str) -> None:
        """Remember the first budget limit that cut work short."""
        if self.budget_limit is None:
            self.budget_limit = limit

    def budget_blocked(self) -> bool:
        """True (and remembered) when a budget limit is already used up, so no new LLM work may start."""
        limit = self.ctx.ledger.exhausted()
        if limit is not None:
            self.note_budget(limit)
            return True
        return False

    async def credits(self) -> None:
        await self.em.credits()

    # ---------- bookkeeping ----------
    async def record_meta(self, meta: CallMeta) -> None:
        """Remember the prompt version of each role on the run record (written only when it changes)."""
        if self.prompt_versions.get(meta.role) == meta.prompt_version:
            return
        self.prompt_versions[meta.role] = meta.prompt_version
        try:
            await self.ctx.store.update_run(self.ctx.run_id, RunPatch(prompt_versions=dict(self.prompt_versions)))
        except Exception:
            log.exception("run %s: could not record prompt versions", self.ctx.run_id)

    async def save(self, relpath: str, data: str | bytes, mime: str = "text/plain") -> None:
        """Write one write-once run file. A disk problem is logged and never fails the run."""
        raw = data.encode("utf-8") if isinstance(data, str) else data
        try:
            await self.ctx.store.write_run_file(self.ctx.run_id, relpath, raw, mime)
        except FileExistsError:
            log.warning("run %s: %s already exists, kept the first version", self.ctx.run_id, relpath)
        except Exception:
            log.exception("run %s: could not write %s", self.ctx.run_id, relpath)

    async def save_json(self, relpath: str, payload: object) -> None:
        await self.save(relpath, json.dumps(payload, indent=2, default=str), "application/json")


def meta_dict(meta: CallMeta) -> dict:
    return asdict(meta)

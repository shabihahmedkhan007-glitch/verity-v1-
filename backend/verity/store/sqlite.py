"""SqliteStore: implements core.protocols.Store (ARCHITECTURE 7 and 15).

One aiosqlite connection, WAL mode. Writes are serialized by an asyncio lock; reads are not. All SQL uses
bound parameters; the only interpolated pieces are column names and placeholder counts taken from static
tables in this file, never from input.
"""

import asyncio
import json
import re
import sqlite3
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from typing import Any

import aiosqlite

from ..config import Settings
from ..contracts import Attempt, Candidate, EventBase, event_to_json, parse_event_json, to_json
from ..core.budget import BudgetLimits, SpendSnapshot
from ..core.errors import NotFound
from ..core.records import ArtifactRef, AttemptMeta, EvalResultRow, RunPatch, RunRecord, RunStatus
from .files import ArtifactFiles, sha256_hex
from .migrations import MIGRATIONS

_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class DuplicateEvent(ValueError):
    """append_event was called with a (run_id, seq) that already exists (the events table is append-only)."""


# ---------- value helpers ----------
def _iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat(timespec="microseconds")


def _iso_opt(value: datetime | None) -> str | None:
    return None if value is None else _iso(value)


def _dt(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


def _dt_opt(value: str | None) -> datetime | None:
    return None if value is None else _dt(value)


def _json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True, default=str)


def _now_iso() -> str:
    return _iso(datetime.now(UTC))


# RunPatch field -> (column, converter). Column names come from this static table only.
_PATCH_COLUMNS: dict[str, tuple[str, Callable[[Any], Any]]] = {
    "status": ("status", lambda v: v),
    "started_at": ("started_at", _iso_opt),
    "ended_at": ("ended_at", _iso_opt),
    "heartbeat_at": ("heartbeat_at", _iso_opt),
    "spent": ("spent_json", lambda v: v.model_dump_json()),
    "tool_image_digest": ("tool_image_digest", lambda v: v or ""),
    "models": ("models_json", lambda v: _json(v)),
    "prompt_versions": ("prompt_versions_json", lambda v: _json(v)),
    "error_reason": ("error_reason", lambda v: v),
    "winner_id": ("winner_id", lambda v: v),
}


# Columns declared NOT NULL: an explicit None in the patch means "leave unchanged".
_NOT_NULLABLE = frozenset({"status", "spent", "models", "prompt_versions", "tool_image_digest"})


def _row_to_run(row: sqlite3.Row) -> RunRecord:
    return RunRecord(
        id=row["id"],
        session_id=row["session_id"],
        preset_id=row["preset_id"],
        priority=row["priority"],
        mode=row["mode"],
        status=row["status"],
        created_at=_dt(row["created_at"]),
        started_at=_dt_opt(row["started_at"]),
        ended_at=_dt_opt(row["ended_at"]),
        heartbeat_at=_dt_opt(row["heartbeat_at"]),
        budget=BudgetLimits.model_validate_json(row["budget_json"]),
        spent=SpendSnapshot.model_validate_json(row["spent_json"]),
        task_pack_sha256=row["task_pack_sha256"],
        tool_image_digest=row["tool_image_digest"] or "",
        models=json.loads(row["models_json"]),
        prompt_versions=json.loads(row["prompt_versions_json"]),
        error_reason=row["error_reason"],
        winner_id=row["winner_id"],
        git_sha=row["git_sha"],
    )


class SqliteStore:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._db_path = settings.data_dir / "verity.db"
        self._files = ArtifactFiles(settings.data_dir)
        self._db: aiosqlite.Connection | None = None
        self._lock = asyncio.Lock()

    # ---------- lifecycle ----------
    async def open(self) -> None:
        """Create folders and tables if missing, apply pending migrations. Idempotent."""
        if self._db is not None:
            return
        await asyncio.to_thread(self._files.ensure_dirs)
        db = await aiosqlite.connect(self._db_path)
        try:
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA synchronous=NORMAL")
            await db.execute("PRAGMA busy_timeout=5000")
            await self._migrate(db)
        except BaseException:
            await db.close()
            raise
        self._db = db

    @staticmethod
    async def _migrate(db: aiosqlite.Connection) -> None:
        async with db.execute("PRAGMA user_version") as cur:
            row = await cur.fetchone()
        current = int(row[0]) if row else 0
        if current > len(MIGRATIONS):
            raise RuntimeError(
                f"database schema version {current} is newer than this build supports ({len(MIGRATIONS)})"
            )
        # UNVERIFIED: executescript with an explicit BEGIN/COMMIT and PRAGMA user_version on the installed
        # Python and aiosqlite versions (check PRAGMA user_version is 1 after the first start).
        for script in MIGRATIONS[current:]:
            await db.executescript(script)
        await db.commit()

    async def close(self) -> None:
        db, self._db = self._db, None
        if db is not None:
            await db.close()

    def _conn(self) -> aiosqlite.Connection:
        if self._db is None:
            raise RuntimeError("store is not open: call await store.open() first")
        return self._db

    async def _write(self, sql: str, params: Sequence[Any] = ()) -> int:
        db = self._conn()
        async with self._lock:
            async with db.execute(sql, params) as cur:
                changed = cur.rowcount
            await db.commit()
            return changed

    async def _fetchone(self, sql: str, params: Sequence[Any] = ()) -> sqlite3.Row | None:
        async with self._conn().execute(sql, params) as cur:
            return await cur.fetchone()

    async def _fetchall(self, sql: str, params: Sequence[Any] = ()) -> list[sqlite3.Row]:
        async with self._conn().execute(sql, params) as cur:
            return list(await cur.fetchall())

    # ---------- runs ----------
    async def create_run(self, run: RunRecord) -> None:
        await self._write(
            """
            INSERT INTO runs (
                id, session_id, preset_id, priority, mode, status, created_at, started_at, ended_at, heartbeat_at,
                budget_json, spent_json, task_pack_sha256, tool_image_digest, models_json, prompt_versions_json,
                error_reason, winner_id, git_sha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run.id,
                run.session_id,
                run.preset_id,
                run.priority,
                run.mode,
                run.status,
                _iso(run.created_at),
                _iso_opt(run.started_at),
                _iso_opt(run.ended_at),
                _iso_opt(run.heartbeat_at),
                run.budget.model_dump_json(),
                run.spent.model_dump_json(),
                run.task_pack_sha256,
                run.tool_image_digest,
                _json(run.models),
                _json(run.prompt_versions),
                run.error_reason,
                run.winner_id,
                run.git_sha,
            ),
        )

    async def get_run(self, run_id: str) -> RunRecord | None:
        row = await self._fetchone("SELECT * FROM runs WHERE id = ?", (run_id,))
        return None if row is None else _row_to_run(row)

    async def update_run(self, run_id: str, patch: RunPatch) -> None:
        """Writes only patch.model_fields_set. An explicit None on a nullable field writes NULL."""
        fields = [
            name
            for name in _PATCH_COLUMNS
            if name in patch.model_fields_set and (getattr(patch, name) is not None or name not in _NOT_NULLABLE)
        ]
        if not fields:
            return
        assignments = ", ".join(f"{_PATCH_COLUMNS[name][0]} = ?" for name in fields)
        params = [_PATCH_COLUMNS[name][1](getattr(patch, name)) for name in fields]
        changed = await self._write(f"UPDATE runs SET {assignments} WHERE id = ?", (*params, run_id))
        if changed == 0:
            raise NotFound(f"run {run_id} does not exist")

    async def touch_heartbeat(self, run_id: str, at: datetime) -> None:
        await self._write("UPDATE runs SET heartbeat_at = ? WHERE id = ?", (_iso(at), run_id))

    async def runs_with_status(self, statuses: Sequence[RunStatus]) -> list[RunRecord]:
        if not statuses:
            return []
        marks = ", ".join("?" for _ in statuses)
        rows = await self._fetchall(
            f"SELECT * FROM runs WHERE status IN ({marks}) ORDER BY created_at, id", tuple(statuses)
        )
        return [_row_to_run(row) for row in rows]

    async def count_runs(
        self,
        *,
        statuses: Sequence[RunStatus] | None = None,
        session_id: str | None = None,
        created_since: datetime | None = None,
    ) -> int:
        clauses: list[str] = []
        params: list[Any] = []
        if statuses is not None:
            if not statuses:
                return 0
            clauses.append(f"status IN ({', '.join('?' for _ in statuses)})")
            params.extend(statuses)
        if session_id is not None:
            clauses.append("session_id = ?")
            params.append(session_id)
        if created_since is not None:
            clauses.append("created_at >= ?")
            params.append(_iso(created_since))
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        row = await self._fetchone(f"SELECT COUNT(*) FROM runs{where}", params)
        return int(row[0]) if row else 0

    # ---------- candidates and attempts ----------
    async def upsert_candidate(self, run_id: str, candidate: Candidate) -> None:
        await self._write(
            """
            INSERT INTO candidates (
                run_id, id, label, parent_id, round, created_by, status, fitness, fitness_json, ppa_json,
                verification_json, eqy_json, reason, fix_count, is_baseline, is_elite, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (run_id, id) DO UPDATE SET
                label = excluded.label,
                parent_id = excluded.parent_id,
                round = excluded.round,
                created_by = excluded.created_by,
                status = excluded.status,
                fitness = excluded.fitness,
                fitness_json = excluded.fitness_json,
                ppa_json = excluded.ppa_json,
                verification_json = excluded.verification_json,
                eqy_json = excluded.eqy_json,
                reason = excluded.reason,
                fix_count = excluded.fix_count,
                is_baseline = excluded.is_baseline,
                is_elite = excluded.is_elite,
                updated_at = excluded.updated_at
            """,
            (
                run_id,
                candidate.id,
                candidate.label,
                candidate.parent_id,
                candidate.round,
                candidate.created_by,
                candidate.status,
                None if candidate.fitness is None else candidate.fitness.score,
                None if candidate.fitness is None else to_json(candidate.fitness),
                None if candidate.ppa is None else to_json(candidate.ppa),
                None if candidate.verification is None else to_json(candidate.verification),
                None if candidate.eqy is None else to_json(candidate.eqy),
                candidate.reason,
                candidate.fix_count,
                int(candidate.is_baseline),
                int(candidate.is_elite),
                _now_iso(),
            ),
        )

    async def add_attempt(self, run_id: str, candidate_id: str, attempt: Attempt, meta: AttemptMeta) -> None:
        """Insert keyed by (run_id, candidate_id, n). Re-adding the same n replaces the verification and the
        attempt fields; meta fields that are unset in the new call keep their stored value."""
        await self._write(
            """
            INSERT INTO attempts (
                run_id, candidate_id, n, attempt_by, reason, rtl_artifact, rtl_sha256, verification_json, model_id,
                prompt_version, llm_request_id, input_tokens, output_tokens, tool_image_digest, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (run_id, candidate_id, n) DO UPDATE SET
                attempt_by = excluded.attempt_by,
                reason = excluded.reason,
                verification_json = excluded.verification_json,
                rtl_artifact = COALESCE(excluded.rtl_artifact, attempts.rtl_artifact),
                rtl_sha256 = COALESCE(excluded.rtl_sha256, attempts.rtl_sha256),
                model_id = COALESCE(excluded.model_id, attempts.model_id),
                prompt_version = COALESCE(excluded.prompt_version, attempts.prompt_version),
                llm_request_id = COALESCE(excluded.llm_request_id, attempts.llm_request_id),
                input_tokens = CASE WHEN excluded.input_tokens > 0 THEN excluded.input_tokens
                                    ELSE attempts.input_tokens END,
                output_tokens = CASE WHEN excluded.output_tokens > 0 THEN excluded.output_tokens
                                     ELSE attempts.output_tokens END,
                tool_image_digest = COALESCE(excluded.tool_image_digest, attempts.tool_image_digest)
            """,
            (
                run_id,
                candidate_id,
                attempt.n,
                attempt.by,
                attempt.reason,
                meta.rtl_artifact,
                meta.rtl_sha256 or (sha256_hex(attempt.rtl.encode("utf-8")) if attempt.rtl else None),
                to_json(attempt.verification),
                meta.model_id,
                meta.prompt_version,
                meta.llm_request_id,
                meta.input_tokens,
                meta.output_tokens,
                meta.tool_image_digest,
                _iso(meta.created_at),
            ),
        )

    # ---------- events ----------
    async def append_event(self, run_id: str, event: EventBase) -> None:
        """event is already stamped. Raises DuplicateEvent if (run_id, seq) exists."""
        try:
            await self._write(
                "INSERT INTO events (run_id, seq, t_ms, json) VALUES (?, ?, ?, ?)",
                (run_id, event.seq, event.t_ms, event_to_json(event)),
            )
        except sqlite3.IntegrityError as exc:
            raise DuplicateEvent(f"event seq {event.seq} already exists for run {run_id}") from exc

    async def events_after(self, run_id: str, after_seq: int = 0) -> list[EventBase]:
        rows = await self._fetchall(
            "SELECT json FROM events WHERE run_id = ? AND seq > ? ORDER BY seq", (run_id, after_seq)
        )
        return [parse_event_json(row["json"]) for row in rows]

    async def last_seq(self, run_id: str) -> int:
        row = await self._fetchone("SELECT COALESCE(MAX(seq), 0) FROM events WHERE run_id = ?", (run_id,))
        return int(row[0]) if row else 0

    # ---------- artifacts (write-once) ----------
    async def put_blob(self, data: bytes, mime: str) -> ArtifactRef:
        sha, path = await asyncio.to_thread(self._files.put_blob, data)
        await self._write(
            "INSERT OR IGNORE INTO artifacts (sha256, path, bytes, mime, created_at) VALUES (?, ?, ?, ?, ?)",
            (sha, str(path), len(data), mime, _now_iso()),
        )
        return ArtifactRef(sha256=sha, path=str(path), size_bytes=len(data), mime=mime)

    async def write_run_file(self, run_id: str, relpath: str, data: bytes, mime: str) -> ArtifactRef:
        sha, path = await asyncio.to_thread(self._files.write_run_file, run_id, relpath, data)
        await self._write(
            "INSERT OR IGNORE INTO artifacts (sha256, path, bytes, mime, created_at) VALUES (?, ?, ?, ?, ?)",
            (sha, str(self._files.blob_path(sha)), len(data), mime, _now_iso()),
        )
        return ArtifactRef(sha256=sha, path=str(path), size_bytes=len(data), mime=mime)

    async def read_run_file(self, run_id: str, relpath: str) -> bytes | None:
        return await asyncio.to_thread(self._files.read_run_file, run_id, relpath)

    # ---------- evals and spend ----------
    async def add_eval_result(self, row: EvalResultRow) -> None:
        await self._write(
            """
            INSERT INTO eval_results (eval_run_id, task_id, suite, metrics_json, git_sha, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (row.eval_run_id, row.task_id, row.suite, _json(row.metrics), row.git_sha, _iso(row.created_at)),
        )

    async def add_daily_spend(self, day: str, usd: float) -> None:
        """day = UTC 'YYYY-MM-DD'. Adds (not sets)."""
        if not _DAY_RE.fullmatch(day):
            raise ValueError(f"invalid day {day!r}, expected YYYY-MM-DD")
        await self._write(
            """
            INSERT INTO daily_spend (day, usd) VALUES (?, ?)
            ON CONFLICT (day) DO UPDATE SET usd = daily_spend.usd + excluded.usd
            """,
            (day, usd),
        )

    async def daily_spend(self, day: str) -> float:
        row = await self._fetchone("SELECT usd FROM daily_spend WHERE day = ?", (day,))
        return float(row[0]) if row else 0.0

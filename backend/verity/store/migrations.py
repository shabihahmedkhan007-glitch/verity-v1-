"""SQLite schema (ARCHITECTURE 7) plus the daily_spend table.

Migrations run in order on startup. The applied version lives in PRAGMA user_version, and every script is
written to be safe to re-run. To change the schema, append a new script; never edit an applied one.
"""

MIGRATIONS: tuple[str, ...] = (
    # ---- 1: initial schema ----
    """
    BEGIN;

    CREATE TABLE IF NOT EXISTS runs (
        id                    TEXT PRIMARY KEY,
        session_id            TEXT NOT NULL,
        preset_id             TEXT NOT NULL,
        priority              TEXT NOT NULL,
        mode                  TEXT NOT NULL,
        status                TEXT NOT NULL,
        created_at            TEXT NOT NULL,
        started_at            TEXT,
        ended_at              TEXT,
        heartbeat_at          TEXT,
        budget_json           TEXT NOT NULL,
        spent_json            TEXT NOT NULL,
        task_pack_sha256      TEXT NOT NULL,
        tool_image_digest     TEXT NOT NULL DEFAULT '',
        models_json           TEXT NOT NULL DEFAULT '{}',
        prompt_versions_json  TEXT NOT NULL DEFAULT '{}',
        error_reason          TEXT,
        winner_id             TEXT,
        git_sha               TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_session ON runs (session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs (status);

    CREATE TABLE IF NOT EXISTS candidates (
        run_id             TEXT NOT NULL,
        id                 TEXT NOT NULL,
        label              TEXT NOT NULL,
        parent_id          TEXT,
        round              INTEGER NOT NULL,
        created_by         TEXT NOT NULL,
        status             TEXT NOT NULL,
        fitness            REAL,
        fitness_json       TEXT,
        ppa_json           TEXT,
        verification_json  TEXT,
        eqy_json           TEXT,
        reason             TEXT NOT NULL,
        fix_count          INTEGER NOT NULL DEFAULT 0,
        is_baseline        INTEGER NOT NULL DEFAULT 0,
        is_elite           INTEGER NOT NULL DEFAULT 0,
        updated_at         TEXT NOT NULL,
        PRIMARY KEY (run_id, id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
        run_id             TEXT NOT NULL,
        candidate_id       TEXT NOT NULL,
        n                  INTEGER NOT NULL,
        attempt_by         TEXT NOT NULL,
        reason             TEXT NOT NULL,
        rtl_artifact       TEXT,
        rtl_sha256         TEXT,
        verification_json  TEXT NOT NULL,
        model_id           TEXT,
        prompt_version     TEXT,
        llm_request_id     TEXT,
        input_tokens       INTEGER NOT NULL DEFAULT 0,
        output_tokens      INTEGER NOT NULL DEFAULT 0,
        tool_image_digest  TEXT,
        created_at         TEXT NOT NULL,
        PRIMARY KEY (run_id, candidate_id, n)
    );

    CREATE TABLE IF NOT EXISTS events (
        run_id  TEXT NOT NULL,
        seq     INTEGER NOT NULL,
        t_ms    INTEGER NOT NULL,
        json    TEXT NOT NULL,
        PRIMARY KEY (run_id, seq)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
        sha256      TEXT PRIMARY KEY,
        path        TEXT NOT NULL,
        bytes       INTEGER NOT NULL,
        mime        TEXT NOT NULL,
        created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS eval_results (
        eval_run_id   TEXT NOT NULL,
        task_id       TEXT NOT NULL,
        suite         TEXT NOT NULL,
        metrics_json  TEXT NOT NULL,
        git_sha       TEXT,
        created_at    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eval_results_run ON eval_results (eval_run_id);

    CREATE TABLE IF NOT EXISTS daily_spend (
        day  TEXT PRIMARY KEY,
        usd  REAL NOT NULL DEFAULT 0
    );

    PRAGMA user_version = 1;
    COMMIT;
    """,
    # ---- 2: params and title on runs ----
    """
    BEGIN;
    ALTER TABLE runs ADD COLUMN params_json TEXT;
    ALTER TABLE runs ADD COLUMN title TEXT;
    PRAGMA user_version = 2;
    COMMIT;
    """,
)

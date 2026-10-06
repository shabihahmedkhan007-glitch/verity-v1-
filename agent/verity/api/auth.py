"""Single-login auth (ARCHITECTURE 12.1, CONTRACTS section 9).

    POST /auth/session {accessCode}  -> constant-time compare against sha256 hashes from env
                                     -> HMAC-signed session token {sid, role}, max age auth.session_ttl_s (12 h)
    REST:  Authorization: Bearer <session token>
    SSE:   ?st=<stream token>, signed {runId, sid}, max age auth.stream_ttl_s (30 min), one run, read-only

When auth.required is false (development, and until web/ sends tokens) a request with no valid token is an
anonymous session whose id is "anon-" + sha256(client ip)[:16].
"""

import hashlib
import hmac
import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from itsdangerous import BadData, URLSafeTimedSerializer

from ..config import Settings

log = logging.getLogger("verity.api")

SESSION_SALT = "verity.session"
STREAM_SALT = "verity.stream"
MAX_ACCESS_CODE_CHARS = 256


@dataclass(frozen=True, slots=True)
class Principal:
    sid: str
    role: str
    anonymous: bool = False


def anonymous_sid(client_ip: str) -> str:
    return "anon-" + hashlib.sha256(client_ip.encode("utf-8")).hexdigest()[:16]


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        configured = settings.signing_secret.get_secret_value() if settings.signing_secret else ""
        if configured:
            secret = configured
        else:
            secret = secrets.token_urlsafe(48)
            log.warning("VERITY_SIGNING_SECRET is not set: using a random secret, tokens will not survive a restart")
        self._session = URLSafeTimedSerializer(secret, salt=SESSION_SALT)
        self._stream = URLSafeTimedSerializer(secret, salt=STREAM_SALT)
        self._codes = settings.access_codes  # [(role, sha256 hex)]

    @property
    def required(self) -> bool:
        return self._settings.auth.required

    # ---------- access codes ----------
    def check_access_code(self, code: str) -> str | None:
        """Role for a valid access code, else None. Compares against every stored hash (no early exit), and
        compare_digest is constant-time per comparison."""
        digest = hashlib.sha256(code[:MAX_ACCESS_CODE_CHARS].encode("utf-8")).hexdigest().encode("ascii")
        matched: str | None = None
        for role, stored in self._codes:
            if hmac.compare_digest(digest, stored.encode("utf-8")) and matched is None:
                matched = role
        return matched

    # ---------- session tokens ----------
    def issue_session(self, role: str) -> tuple[str, datetime]:
        sid = "s_" + secrets.token_hex(12)
        token = self._session.dumps({"sid": sid, "role": role})
        expires = datetime.now(UTC) + timedelta(seconds=self._settings.auth.session_ttl_s)
        return token, expires

    def read_session(self, token: str) -> Principal | None:
        try:
            data = self._session.loads(token, max_age=self._settings.auth.session_ttl_s)
        except BadData:
            return None
        if not isinstance(data, dict):
            return None
        sid, role = data.get("sid"), data.get("role")
        if not isinstance(sid, str) or not sid or not isinstance(role, str):
            return None
        return Principal(sid=sid, role=role)

    # ---------- stream tokens ----------
    def issue_stream_token(self, run_id: str, sid: str) -> str:
        return self._stream.dumps({"runId": run_id, "sid": sid})

    def read_stream_token(self, token: str) -> tuple[str, str] | None:
        """(run_id, sid) for a valid, unexpired stream token."""
        try:
            data = self._stream.loads(token, max_age=self._settings.auth.stream_ttl_s)
        except BadData:
            return None
        if not isinstance(data, dict):
            return None
        run_id, sid = data.get("runId"), data.get("sid")
        if not isinstance(run_id, str) or not isinstance(sid, str):
            return None
        return run_id, sid


def iso_z(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

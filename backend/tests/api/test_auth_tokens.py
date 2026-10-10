"""Auth (ARCHITECTURE 12.1): access codes, signed session tokens, signed stream tokens."""

import hashlib

from pydantic import SecretStr

from verity.api.auth import AuthService, anonymous_sid, iso_z
from verity.config import AuthConfig, load_settings


def hashed(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def make_auth(**overrides) -> AuthService:
    base = load_settings(provider="fake")
    update = {
        "signing_secret": SecretStr("s" * 40),
        "access_code_hashes": SecretStr(f"team:{hashed('open sesame')},judge:{hashed('second code')}"),
        **overrides,
    }
    return AuthService(base.model_copy(update=update))


def test_access_codes_map_to_roles() -> None:
    auth = make_auth()
    assert auth.check_access_code("open sesame") == "team"
    assert auth.check_access_code("second code") == "judge"
    assert auth.check_access_code("wrong") is None
    assert auth.check_access_code("") is None
    assert auth.check_access_code("x" * 5000) is None  # long input is cut, never crashes


def test_no_configured_codes_means_nobody_logs_in() -> None:
    auth = make_auth(access_code_hashes=None)
    assert auth.check_access_code("anything") is None


def test_session_token_round_trip() -> None:
    auth = make_auth()
    token, expires = auth.issue_session("team")
    principal = auth.read_session(token)
    assert principal is not None and principal.role == "team" and principal.sid.startswith("s_")
    assert principal.anonymous is False
    assert iso_z(expires).endswith("Z")


def test_session_tokens_are_unique_per_login() -> None:
    auth = make_auth()
    first, _ = auth.issue_session("team")
    second, _ = auth.issue_session("team")
    p1, p2 = auth.read_session(first), auth.read_session(second)
    assert p1 and p2 and p1.sid != p2.sid


def test_expired_and_tampered_session_tokens_are_rejected() -> None:
    expired = make_auth(auth=AuthConfig(session_ttl_s=-1))
    token, _ = expired.issue_session("team")
    assert expired.read_session(token) is None

    auth = make_auth()
    token, _ = auth.issue_session("team")
    assert auth.read_session(token + "x") is None
    assert auth.read_session("not-a-token") is None
    assert auth.read_session("") is None


def test_a_token_signed_with_another_secret_is_rejected() -> None:
    token, _ = make_auth().issue_session("team")
    other = make_auth(signing_secret=SecretStr("o" * 40))
    assert other.read_session(token) is None


def test_stream_token_is_scoped_to_one_run_and_not_a_session() -> None:
    auth = make_auth()
    stream = auth.issue_stream_token("r_abc", "s_123")
    assert auth.read_stream_token(stream) == ("r_abc", "s_123")
    assert auth.read_session(stream) is None  # different salt: cannot be used as a session token
    session, _ = auth.issue_session("team")
    assert auth.read_stream_token(session) is None
    assert auth.read_stream_token(stream + "x") is None


def test_expired_stream_token() -> None:
    auth = make_auth(auth=AuthConfig(stream_ttl_s=-1))
    assert auth.read_stream_token(auth.issue_stream_token("r_abc", "s_1")) is None


def test_anonymous_session_id_is_stable_per_ip_and_hides_the_ip() -> None:
    a = anonymous_sid("203.0.113.9")
    assert a == anonymous_sid("203.0.113.9")
    assert a != anonymous_sid("203.0.113.10")
    assert a.startswith("anon-") and "203.0.113.9" not in a


def test_missing_secret_still_works_with_a_random_one() -> None:
    auth = make_auth(signing_secret=None)
    token, _ = auth.issue_session("team")
    assert auth.read_session(token) is not None


def clean_production(**extra):
    """Production settings with nothing configured, whatever the developer's shell environment holds."""
    base = load_settings(provider="fake")
    return base.model_copy(
        update={
            "env": "production",
            "provider": "fake",
            "llm": base.llm.model_copy(update={"api_key": None}),
            "signing_secret": None,
            "access_code_hashes": None,
            "auth": AuthConfig(required=False),
            "cors_origins": "http://localhost:3000",
            **extra,
        }
    )


def test_production_guard_lists_every_problem() -> None:
    text = " ".join(clean_production().production_problems())
    for needle in ("provider must be 'nebius'", "LLM_API_KEY", "auth.required", "VERITY_SIGNING_SECRET", "ACCESS_CODE"):
        assert needle in text, needle
    development = clean_production(env="development")
    assert development.production_problems() == []  # development is never blocked


def test_wrong_llm_host_is_a_production_problem() -> None:
    base = clean_production()
    settings = base.model_copy(update={"llm": base.llm.model_copy(update={"base_url": "http://localhost:11434/v1"})})
    assert any("LLM_BASE_URL host" in p for p in settings.production_problems())


def test_wildcard_cors_is_a_production_problem() -> None:
    assert any("CORS" in p for p in clean_production(cors_origins="*").production_problems())

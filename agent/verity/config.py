"""Settings: agent/config.toml, then .env, then process env (highest wins after init kwargs).

Precedence (high to low): init kwargs > VERITY_* env (nested with "__") > named env (LLM_*, SANDBOX_*)
> agent/.env file > config.toml > field defaults.

Use `load_settings()`; never read os.environ for config anywhere else.
"""

import copy
import os
import tomllib
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, SecretStr, model_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict

AGENT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_PATH = AGENT_ROOT / "config.toml"

EnvName = Literal["development", "production", "test"]
ProviderName = Literal["fake", "nebius", "openai_compat"]
ToolBackendName = Literal["local_docker", "nebius_sandbox"]
RoleName = Literal["planner", "rtl_gen", "repair", "optimizer"]
Tier = Literal["ultra", "super"]
PathMode = Literal["fast", "full"]
StrategyName = Literal["SIMPLIFY", "OPTIMIZE", "EXPLORE"]


# ---------- sections ----------
class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8000


class LLMConfig(BaseModel):
    base_url: str = "https://api.tokenfactory.nebius.com/v1"
    api_key: SecretStr | None = None
    model_ultra: str = "nvidia/Nemotron-3-Ultra-550b-a55b"
    model_super: str = "nvidia/nemotron-3-super-120b-a12b"
    retries: int = 2
    backoff_s: float = 2.0
    cache_responses: bool = False
    production_host: str = "api.tokenfactory.nebius.com"


class RouteConfig(BaseModel):
    tier: Tier
    temperature: float = 0.2


def _default_routes() -> dict[RoleName, RouteConfig]:
    return {
        "planner": RouteConfig(tier="ultra", temperature=0.2),
        "rtl_gen": RouteConfig(tier="ultra", temperature=0.2),
        "repair": RouteConfig(tier="ultra", temperature=0.1),
        "optimizer": RouteConfig(tier="super", temperature=0.6),
    }


class Price(BaseModel):
    input_per_m: float
    output_per_m: float


def _default_prices() -> dict[str, Price]:
    return {
        "nvidia/Nemotron-3-Ultra-550b-a55b": Price(input_per_m=1.0, output_per_m=3.0),
        "nvidia/nemotron-3-super-120b-a12b": Price(input_per_m=0.3, output_per_m=0.9),
        "fallback": Price(input_per_m=1.0, output_per_m=3.0),
    }


class RunBudget(BaseModel):
    max_llm_calls: int = 16
    max_input_tokens: int = 150_000
    max_output_tokens: int = 200_000
    max_usd: float = 0.50
    max_candidates: int = 6
    max_repairs_baseline: int = 3
    max_repairs_child: int = 1
    max_rounds: int = 2
    max_wall_s: int = 900


class CallBudget(BaseModel):
    plan_max_output: int = 6_000
    rtl_max_output: int = 12_000
    max_prompt_tokens: int = 12_000


class BudgetConfig(BaseModel):
    run: RunBudget = Field(default_factory=RunBudget)
    call: CallBudget = Field(default_factory=CallBudget)


class LimitsConfig(BaseModel):
    auth_per_ip: int = 10
    auth_window_s: int = 600
    api_per_session_per_min: int = 60
    runs_per_session_per_hour: int = 3
    concurrent_per_session: int = 1
    concurrent_global: int = 2
    daily_usd: float = 5.0
    default_mode: PathMode = "full"


class TimeoutsConfig(BaseModel):
    lint_s: int = 20
    sim_s: int = 60
    synth_s: int = 120
    sta_s: int = 60
    eqy_s: int = 180
    sandbox_overhead_s: int = 15
    llm_ultra_s: int = 120
    llm_super_s: int = 60

    @property
    def verify_s(self) -> int:
        """Inner budget of /verity/bin/verify (contract + lint + sim)."""
        return self.lint_s + self.sim_s

    @property
    def measure_s(self) -> int:
        """Inner budget of /verity/bin/measure (synth + sta + circuit)."""
        return self.synth_s + self.sta_s


class AuthConfig(BaseModel):
    required: bool = False
    session_ttl_s: int = 43_200
    stream_ttl_s: int = 1_800


class SSEConfig(BaseModel):
    ping_s: int = 15
    max_event_bytes: int = 65_536


class WatchdogConfig(BaseModel):
    interval_s: int = 30
    stall_s: int = 90
    heartbeat_s: int = 10


class PlanConfig(BaseModel):
    gate_auto_continue_ms: int = 10_000
    gate_after_replan_ms: int = 6_000
    max_hold_s: int = 120
    max_replans: int = 1
    max_blocks: int = 8
    json_retries: int = 1


class RtlConfig(BaseModel):
    max_bytes: int = 20_000


class EvolutionConfig(BaseModel):
    round1_children: int = 3
    round1_strategies: list[StrategyName] = Field(
        default_factory=lambda: ["SIMPLIFY", "OPTIMIZE", "EXPLORE"]
    )
    round2_children: int = 2
    elites: int = 2
    round2_requires_improvement: bool = True
    max_prove_attempts: int = 2


class NebiusSandboxConfig(BaseModel):
    base_url: str = ""
    api_key: SecretStr | None = None
    image_ref: str = ""


class ToolsConfig(BaseModel):
    image: str = "verity-tools:0.1"
    docker_bin: str = "docker"
    docker_user: str = "1000:1000"  # "" omits --user (Docker Desktop bind mounts may need it, see README)
    memory: str = "2g"
    cpus: str = "2"
    pids_limit: int = 256
    output_cap_bytes: int = 65_536
    infra_retries: int = 1
    nebius_sandbox: NebiusSandboxConfig = Field(default_factory=NebiusSandboxConfig)


# ---------- custom sources ----------
_TOML_DATA: ContextVar[dict[str, Any]] = ContextVar("verity_toml_data", default={})
_DOTENV_DATA: ContextVar[dict[str, str]] = ContextVar("verity_dotenv_data", default={})

# Named env vars from MEETING section 7 / ARCHITECTURE 21 that do not carry the VERITY_ prefix.
NAMED_ENV: dict[str, tuple[str, ...]] = {
    "LLM_BASE_URL": ("llm", "base_url"),
    "LLM_API_KEY": ("llm", "api_key"),
    "LLM_MODEL_ULTRA": ("llm", "model_ultra"),
    "LLM_MODEL_SUPER": ("llm", "model_super"),
    "SANDBOX_BASE_URL": ("tools", "nebius_sandbox", "base_url"),
    "SANDBOX_API_KEY": ("tools", "nebius_sandbox", "api_key"),
}


class _TomlSource(PydanticBaseSettingsSource):
    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        return copy.deepcopy(_TOML_DATA.get())


class _NamedEnvSource(PydanticBaseSettingsSource):
    """LLM_* and SANDBOX_* names. Process env wins over agent/.env. Empty values are ignored."""

    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        out: dict[str, Any] = {}
        dotenv = _DOTENV_DATA.get()
        for name, path in NAMED_ENV.items():
            value = os.environ.get(name) or dotenv.get(name)
            if not value:
                continue
            node = out
            for key in path[:-1]:
                node = node.setdefault(key, {})
            node[path[-1]] = value
        return out


# ---------- settings ----------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VERITY_",
        env_nested_delimiter="__",
        extra="ignore",
        case_sensitive=False,
    )

    env: EnvName = "development"
    provider: ProviderName = "fake"
    tool_backend: ToolBackendName = "local_docker"
    data_dir: Path = Path("data")
    tasks_dir: Path = Path("tasks")
    cors_origins: str = "http://localhost:3000"
    access_code_hashes: SecretStr | None = None  # "role:sha256hex,role:sha256hex"
    signing_secret: SecretStr | None = None
    git_sha: str | None = None

    server: ServerConfig = Field(default_factory=ServerConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    routes: dict[RoleName, RouteConfig] = Field(default_factory=_default_routes)
    prices: dict[str, Price] = Field(default_factory=_default_prices)
    budget: BudgetConfig = Field(default_factory=BudgetConfig)
    limits: LimitsConfig = Field(default_factory=LimitsConfig)
    timeouts: TimeoutsConfig = Field(default_factory=TimeoutsConfig)
    auth: AuthConfig = Field(default_factory=AuthConfig)
    sse: SSEConfig = Field(default_factory=SSEConfig)
    watchdog: WatchdogConfig = Field(default_factory=WatchdogConfig)
    plan: PlanConfig = Field(default_factory=PlanConfig)
    rtl: RtlConfig = Field(default_factory=RtlConfig)
    evolution: EvolutionConfig = Field(default_factory=EvolutionConfig)
    tools: ToolsConfig = Field(default_factory=ToolsConfig)

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # Earlier entries win.
        return (
            init_settings,
            env_settings,
            _NamedEnvSource(settings_cls),
            dotenv_settings,
            _TomlSource(settings_cls),
        )

    @model_validator(mode="after")
    def _resolve_paths(self) -> "Settings":
        if not self.data_dir.is_absolute():
            self.data_dir = (AGENT_ROOT / self.data_dir).resolve()
        if not self.tasks_dir.is_absolute():
            self.tasks_dir = (AGENT_ROOT / self.tasks_dir).resolve()
        missing = {"planner", "rtl_gen", "repair", "optimizer"} - set(self.routes)
        if missing:
            raise ValueError(f"routes missing for roles: {sorted(missing)}")
        if "fallback" not in self.prices:
            raise ValueError("prices.fallback is required")
        return self

    # ---------- derived values ----------
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def access_codes(self) -> list[tuple[str, str]]:
        """[(role, sha256 hex of the access code)]. Format: "team:abc...,judge:def..."."""
        if self.access_code_hashes is None:
            return []
        out: list[tuple[str, str]] = []
        for item in self.access_code_hashes.get_secret_value().split(","):
            item = item.strip()
            if not item:
                continue
            role, _, digest = item.partition(":")
            if not digest:
                role, digest = "user", role
            out.append((role.strip(), digest.strip().lower()))
        return out

    @property
    def run_cap_usd(self) -> float:
        return self.budget.run.max_usd

    def model_for(self, role: RoleName) -> str:
        tier = self.routes[role].tier
        return self.llm.model_ultra if tier == "ultra" else self.llm.model_super

    def temperature_for(self, role: RoleName) -> float:
        return self.routes[role].temperature

    def max_output_for(self, role: RoleName) -> int:
        return self.budget.call.plan_max_output if role == "planner" else self.budget.call.rtl_max_output

    def llm_timeout_for(self, role: RoleName) -> int:
        tier = self.routes[role].tier
        return self.timeouts.llm_ultra_s if tier == "ultra" else self.timeouts.llm_super_s

    def price_for(self, model: str) -> Price:
        return self.prices.get(model) or self.prices["fallback"]

    def models_by_role(self) -> dict[str, str]:
        return {role: self.model_for(role) for role in ("planner", "rtl_gen", "repair", "optimizer")}

    def sandbox_api_key(self) -> SecretStr | None:
        return self.tools.nebius_sandbox.api_key or self.llm.api_key

    def production_problems(self) -> list[str]:
        """Submission guard (ARCHITECTURE 21). main() refuses to start if this is non-empty in production."""
        if self.env != "production":
            return []
        problems: list[str] = []
        if self.provider != "nebius":
            problems.append(f"provider must be 'nebius' in production, got '{self.provider}'")
        host = urlparse(self.llm.base_url).hostname or ""
        if host != self.llm.production_host:
            problems.append(f"LLM_BASE_URL host must be {self.llm.production_host}, got '{host}'")
        if self.llm.api_key is None or not self.llm.api_key.get_secret_value():
            problems.append("LLM_API_KEY is not set")
        if not self.auth.required:
            problems.append("auth.required must be true in production")
        if self.signing_secret is None or len(self.signing_secret.get_secret_value()) < 32:
            problems.append("VERITY_SIGNING_SECRET must be set (32+ chars)")
        if not self.access_codes:
            problems.append("VERITY_ACCESS_CODE_HASHES must list at least one code hash")
        if any(o == "*" for o in self.cors_origin_list):
            problems.append("CORS origin '*' is not allowed in production")
        return problems


def _read_dotenv(path: Path) -> dict[str, str]:
    """Minimal KEY=VALUE parser for agent/.env (no interpolation)."""
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        out[key.strip()] = value
    return out


def load_settings(config_path: Path | None = None, **overrides: Any) -> Settings:
    """Load config.toml (or $VERITY_CONFIG), agent/.env, and env. `overrides` win over everything."""
    path = config_path or Path(os.environ.get("VERITY_CONFIG", DEFAULT_CONFIG_PATH))
    data: dict[str, Any] = {}
    if path.is_file():
        with path.open("rb") as fh:
            data = tomllib.load(fh)
    dotenv_path = AGENT_ROOT / ".env"
    toml_token = _TOML_DATA.set(data)
    dotenv_token = _DOTENV_DATA.set(_read_dotenv(dotenv_path))
    try:
        env_file = dotenv_path if dotenv_path.is_file() else None
        return Settings(_env_file=env_file, **overrides)  # type: ignore[call-arg]
    finally:
        _TOML_DATA.reset(toml_token)
        _DOTENV_DATA.reset(dotenv_token)

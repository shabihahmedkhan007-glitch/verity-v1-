"""One provider class over the OpenAI chat completions API (Nebius Token Factory and any compatible endpoint).

This is the ONLY module that reads the LLM base URL and API key (through Settings). It makes one request per
`complete()` call. It does not retry and does not touch the ledger: the gateway (verity.llm.gateway) does both.
"""

import asyncio
import inspect
import time
from typing import Any

import openai
from openai import AsyncOpenAI

from ..config import Settings
from ..core.budget import estimate_tokens
from ..core.errors import LLMError
from ..core.llm_types import LLMRequest, LLMResponse

_RETRYABLE_STATUS = frozenset({408, 409, 425, 429})
_PLACEHOLDER_KEY = "not-needed"  # local endpoints (Ollama) ignore the key but the SDK insists on one


class OpenAICompatProvider:
    """openai.AsyncOpenAI against settings.llm.base_url. Key is optional (local endpoints)."""

    name = "openai_compat"
    require_key = False

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.llm.base_url
        secret = settings.llm.api_key
        self._api_key: str = secret.get_secret_value() if secret is not None else ""
        self._client: AsyncOpenAI | None = None
        self._json_mode_unsupported = False

    def __repr__(self) -> str:  # never print the key
        return f"{type(self).__name__}(base_url={self._base_url!r})"

    # ---------- client ----------
    def _get_client(self) -> AsyncOpenAI:
        """Created lazily so a missing key is a per-call LLMError (health shows maintenance), not a startup crash."""
        if self._client is None:
            key = self._api_key
            if not key:
                if self.require_key:
                    raise LLMError("LLM_API_KEY is not set", retryable=False)
                key = _PLACEHOLDER_KEY
            # max_retries=0: the gateway owns retry and backoff so every attempt is visible to the ledger.
            self._client = AsyncOpenAI(base_url=self._base_url, api_key=key, max_retries=0)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None

    # ---------- one call ----------
    async def complete(self, req: LLMRequest) -> LLMResponse:
        client = self._get_client()
        kwargs: dict[str, Any] = {
            "model": req.model,
            "messages": [
                {"role": "system", "content": req.system},
                {"role": "user", "content": req.user},
            ],
            # UNVERIFIED: Nebius accepts `max_tokens` for Nemotron (some OpenAI-compatible servers want
            # `max_completion_tokens`), and whether the cap includes reasoning tokens.
            "max_tokens": req.max_output_tokens,
            "temperature": req.temperature,
        }
        if req.top_p is not None:
            kwargs["top_p"] = req.top_p
        if req.thinking is not None:
            # Measured on Nebius 2026-10-16 (backend/README.md): both models honour enable_thinking false.
            kwargs["extra_body"] = {"chat_template_kwargs": {"enable_thinking": req.thinking}}
        use_json = req.response_format == "json" and not self._json_mode_unsupported
        if use_json:
            # UNVERIFIED: JSON mode (response_format json_object) on Nebius for Nemotron. If the server rejects it
            # with a 400 we remember that and ask again without it; the planner parser tolerates plain text.
            kwargs["response_format"] = {"type": "json_object"}

        started = time.monotonic()
        try:
            try:
                raw = await self._create(client, kwargs, req.timeout_s)
            except openai.BadRequestError as exc:
                lowered = str(exc).lower()
                if not use_json or ("response_format" not in lowered and "json" not in lowered):
                    raise
                self._json_mode_unsupported = True
                kwargs.pop("response_format", None)
                raw = await self._create(client, kwargs, req.timeout_s)
        except LLMError:
            raise
        except TimeoutError as exc:
            raise LLMError(f"model call timed out after {req.timeout_s:.0f} s", retryable=True) from exc
        except openai.OpenAIError as exc:
            raise self._map_error(exc) from exc
        latency_ms = int((time.monotonic() - started) * 1000)

        completion = raw.parse()
        # UNVERIFIED: LegacyAPIResponse.parse() is synchronous in openai 1.x; newer SDKs may return an awaitable.
        if inspect.isawaitable(completion):
            completion = await completion
        # UNVERIFIED: Nebius sends x-request-id; if not, the completion id is used.
        request_id = raw.headers.get("x-request-id") or getattr(completion, "id", "") or ""
        if not completion.choices:
            raise LLMError("model returned no choices", retryable=True)
        choice = completion.choices[0]
        text = choice.message.content or ""

        input_tokens, output_tokens, reasoning = self._usage(completion, req, text)
        return LLMResponse(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=getattr(completion, "model", "") or req.model,
            request_id=request_id,
            latency_ms=latency_ms,
            reasoning_tokens=reasoning,
            finish_reason=choice.finish_reason or "",
        )

    @staticmethod
    async def _create(client: AsyncOpenAI, kwargs: dict[str, Any], timeout_s: float) -> Any:
        # UNVERIFIED: a long Nemotron reasoning call (up to 120 s) may be cut by an idle proxy timeout on a
        # non-streaming request. If so, switch this call to stream=True and accumulate the deltas.
        return await asyncio.wait_for(
            client.chat.completions.with_raw_response.create(**kwargs, timeout=timeout_s),
            timeout=timeout_s + 10,
        )

    @staticmethod
    def _usage(completion: Any, req: LLMRequest, text: str) -> tuple[int, int, int]:
        usage = getattr(completion, "usage", None)
        if usage is None:
            return estimate_tokens(req.system + req.user), estimate_tokens(text), 0
        input_tokens = int(getattr(usage, "prompt_tokens", 0) or 0)
        output_tokens = int(getattr(usage, "completion_tokens", 0) or 0)
        details = getattr(usage, "completion_tokens_details", None)
        reasoning = int(getattr(details, "reasoning_tokens", 0) or 0) if details is not None else 0
        # UNVERIFIED: whether Nemotron on Nebius counts reasoning tokens inside completion_tokens (OpenAI
        # semantics) or reports them on top. If the reasoning count is larger than the whole completion count it
        # cannot be a subset, so add it; otherwise assume it is already included.
        if reasoning > output_tokens:
            output_tokens += reasoning
        return input_tokens, output_tokens, reasoning

    # ---------- errors ----------
    def _map_error(self, exc: openai.OpenAIError) -> LLMError:
        if isinstance(exc, openai.APITimeoutError):
            return LLMError("model call timed out", retryable=True)
        if isinstance(exc, openai.APIConnectionError):
            return LLMError("could not reach the model endpoint", retryable=True)
        if isinstance(exc, openai.APIStatusError):
            status = exc.status_code
            retryable = status >= 500 or status in _RETRYABLE_STATUS
            if status in (401, 403):
                return LLMError(
                    f"model endpoint refused the credentials (HTTP {status})", retryable=False, status=status
                )
            return LLMError(
                f"model endpoint error HTTP {status}: {self._clean(str(exc.message))}",
                retryable=retryable,
                status=status,
            )
        return LLMError(f"model call failed: {type(exc).__name__}", retryable=False)

    def _clean(self, message: str) -> str:
        if self._api_key:
            message = message.replace(self._api_key, "***")
        return " ".join(message.split())[:300]

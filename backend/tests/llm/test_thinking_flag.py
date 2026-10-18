"""LLMRequest.thinking: sent to the endpoint only when set (parse), never for the run roles."""

from types import SimpleNamespace

from verity.core.llm_types import LLMRequest
from verity.llm.openai_compat import OpenAICompatProvider
from verity_test_support import make_settings


class StubClient:
    def __init__(self) -> None:
        self.kwargs: dict = {}
        self.chat = SimpleNamespace(completions=SimpleNamespace(with_raw_response=SimpleNamespace(create=self._create)))

    async def _create(self, **kwargs):  # noqa: ANN003, ANN202
        self.kwargs = kwargs
        completion = SimpleNamespace(
            id="c1",
            model="m",
            choices=[SimpleNamespace(message=SimpleNamespace(content="{}"), finish_reason="stop")],
            usage=SimpleNamespace(prompt_tokens=1, completion_tokens=1, completion_tokens_details=None),
        )
        return SimpleNamespace(parse=lambda: completion, headers={})


def request(**extra) -> LLMRequest:
    return LLMRequest(role="planner", model="m", system="s", user="u", max_output_tokens=10, temperature=0.0, **extra)


async def test_thinking_false_is_sent_as_chat_template_kwargs(tmp_path) -> None:
    provider = OpenAICompatProvider(make_settings(tmp_path))
    client = provider._client = StubClient()  # type: ignore[assignment]
    await provider.complete(request(thinking=False))
    assert client.kwargs["extra_body"] == {"chat_template_kwargs": {"enable_thinking": False}}


async def test_default_request_sends_no_thinking_field(tmp_path) -> None:
    provider = OpenAICompatProvider(make_settings(tmp_path))
    client = provider._client = StubClient()  # type: ignore[assignment]
    await provider.complete(request())
    assert "extra_body" not in client.kwargs

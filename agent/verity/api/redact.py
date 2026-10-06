"""Log redaction (ARCHITECTURE 12.4): Authorization headers, bearer tokens and stream tokens never reach a log.

The uvicorn access log prints the full request path, which includes `?st=<stream token>`. `log_config()` returns
a uvicorn logging config whose handlers scrub those values.
"""

import copy
import logging
import re
from typing import Any

_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"([?&](?:st|token|access_?code)=)[^&\s\"']+", re.IGNORECASE), r"\1[redacted]"),
    (re.compile(r"(\bBearer\s+)[A-Za-z0-9._~+/=-]+", re.IGNORECASE), r"\1[redacted]"),
    (re.compile(r"(\bAuthorization['\"]?\s*[:=]\s*)[^\r\n,}]+", re.IGNORECASE), r"\1[redacted]"),
)


def redact(text: str) -> str:
    for pattern, repl in _PATTERNS:
        text = pattern.sub(repl, text)
    return text


class RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact(record.msg)
        if isinstance(record.args, tuple):
            record.args = tuple(redact(a) if isinstance(a, str) else a for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: redact(v) if isinstance(v, str) else v for k, v in record.args.items()}
        return True


def log_config() -> dict[str, Any]:
    # UNVERIFIED: that uvicorn applies the handler-level filter (check `?st=` shows as [redacted] in the access log).
    """uvicorn's default logging config with RedactFilter on every handler."""
    from uvicorn.config import LOGGING_CONFIG

    config = copy.deepcopy(LOGGING_CONFIG)
    config.setdefault("filters", {})["redact"] = {"()": "verity.api.redact.RedactFilter"}
    for handler in config.get("handlers", {}).values():
        handler["filters"] = [*handler.get("filters", []), "redact"]
    return config

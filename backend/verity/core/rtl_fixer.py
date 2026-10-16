"""R2/R5 helpers, pure text, no tools and no model: lint tag parsing, guidance, the declaration fixer, failure signatures.

The fixer is deliberately conservative. It only rewrites declarations (wire/reg to logic, a body redeclaration of a
port or signal, stray generate/endgenerate keywords). It never touches an expression, an assignment or a block.
"""

import re
from dataclasses import dataclass

from .rtl import strip_comments

MAX_GUIDANCE = 4
APPLY_EVERYWHERE = "Apply this fix to every module and signal with the same pattern, not only the one named."

# Tag -> one guidance line. Tags are Verilator tags, or Verity names for untagged messages and structural findings.
GUIDANCE: dict[str, str] = {
    "PROCASSWIRE": (
        "Procedural assignment to a wire: declare that signal as `logic` (never `wire` or `reg`) and drive it only "
        "from an always_ff or always_comb block."
    ),
    "DUPLICATE": (
        "Duplicate declaration: a port declared in the header must not be declared again in the body. "
        "Delete the second declaration and keep one `logic` declaration per name."
    ),
    "GENERATE": (
        "Unexpected generate or endgenerate: do not use generate or genvar. Write the logic with plain always_comb "
        "and always_ff blocks and `for` loops over an int variable."
    ),
    "MULTIDRIVEN": "A signal is driven from more than one block: drive each signal from exactly one always_ff or always_comb block.",
    "BLKANDNBLK": (
        "Blocking and non-blocking assignments to the same signal: use `<=` only in always_ff and `=` only in "
        "always_comb, and never mix them for one signal."
    ),
    "WIDTH": (
        "Width mismatch: make both sides of the assignment the same width with an explicit slice, concatenation or "
        "extension; do not rely on silent truncation."
    ),
    "UNDECLARED": (
        "Undeclared identifier: declare every internal signal as `logic` with its width before use, and check the "
        "spelling against the port list."
    ),
    "MULTIMODULE": "The file must contain exactly one module: inline every helper module into the top module.",
}

_TAG_ALIASES = {
    "WIDTHTRUNC": "WIDTH",
    "WIDTHEXPAND": "WIDTH",
    "WIDTHCONCAT": "WIDTH",
    "PROCASSWIRE": "PROCASSWIRE",
    "MULTIDRIVEN": "MULTIDRIVEN",
    "BLKANDNBLK": "BLKANDNBLK",
    "WIDTH": "WIDTH",
}
_TAGGED_RE = re.compile(r"^%(?:Error|Warning)-([A-Z0-9_]+):\s*(.*)$", re.MULTILINE)
_UNTAGGED_RE = re.compile(r"^%Error:\s*(.*)$", re.MULTILINE)
_SIGNAL_RE = re.compile(r"'([A-Za-z_][A-Za-z0-9_$]*)'")
_LOCATION_RE = re.compile(r"^[^\s:]+:\d+(?::\d+)?:\s*")


@dataclass(frozen=True, slots=True)
class LintIssue:
    tag: str
    signal: str = ""


def lint_issues(log: str | None) -> list[LintIssue]:
    """Known issues named by a Verilator log, in log order, one per (tag, signal)."""
    if not log:
        return []
    found: list[tuple[int, LintIssue]] = []
    for m in _TAGGED_RE.finditer(log):
        tag = _TAG_ALIASES.get(m.group(1))
        if tag:
            found.append((m.start(), _issue(tag, m.group(2))))
    for m in _UNTAGGED_RE.finditer(log):
        message = _LOCATION_RE.sub("", m.group(1))
        lower = message.lower()
        tag = ""
        if "duplicate declaration" in lower:
            tag = "DUPLICATE"
        elif re.search(r"unexpected\s+(end)?generate\b|unexpected\s+genvar\b", lower):
            tag = "GENERATE"
        elif "can't find definition" in lower or "not declared" in lower or "undeclared" in lower:
            tag = "UNDECLARED"
        if tag:
            found.append((m.start(), _issue(tag, message)))
    seen: set[LintIssue] = set()
    out: list[LintIssue] = []
    for _, issue in sorted(found, key=lambda pair: pair[0]):
        if issue not in seen:
            seen.add(issue)
            out.append(issue)
    return out


def _issue(tag: str, message: str) -> LintIssue:
    m = _SIGNAL_RE.search(_LOCATION_RE.sub("", message))
    return LintIssue(tag, m.group(1) if m else "")


def structural_tags(text: str) -> list[str]:
    """Cheap structural check on the RTL text: more than one module, generate present."""
    code = strip_comments(text)
    tags: list[str] = []
    if len(re.findall(r"\b(?:module|macromodule)\b", code)) > 1:
        tags.append("MULTIMODULE")
    if re.search(r"\b(?:generate|endgenerate|genvar)\b", code):
        tags.append("GENERATE")
    return tags


def guidance_for(lint_log: str | None, rtl_text: str) -> list[str]:
    """Up to 4 guidance lines for the tags the log and the structure show (fewer if fewer matched)."""
    tags: list[str] = []
    for tag in [i.tag for i in lint_issues(lint_log)] + structural_tags(rtl_text):
        if tag not in tags:
            tags.append(tag)
    return [GUIDANCE[t] for t in tags[:MAX_GUIDANCE]]


def guidance_block(lint_log: str | None, rtl_text: str) -> str:
    """Prompt text for the repair role, or "" when no known tag matched."""
    lines = guidance_for(lint_log, rtl_text)
    if not lines:
        return ""
    return "Known fixes for these errors:\n" + "\n".join(f"- {line}" for line in lines) + "\n" + APPLY_EVERYWHERE


# ======================================================================
# failure signature (R5)
# ======================================================================
def failure_signature(lint: str, lint_log: str | None, failing_case: str | None) -> str:
    """Stable id of why an attempt failed: lint tag and signal, else the first failing test name."""
    if lint == "fail":
        issues = lint_issues(lint_log)
        if issues:
            return f"lint:{issues[0].tag}:{issues[0].signal}"
        log = (lint_log or "").strip()
        bullet = re.search(r"^- (.+)$", log, re.MULTILINE)
        if bullet:
            return "rules:" + re.sub(r"\d+", "N", bullet.group(1))[:80]
        first = _UNTAGGED_RE.search(log)
        message = _LOCATION_RE.sub("", first.group(1)) if first else log.split("\n")[0]
        return "lint:other:" + re.sub(r"\d+", "N", message)[:80]
    return f"test:{failing_case or 'unknown'}"


# ======================================================================
# deterministic declaration fixer (R2)
# ======================================================================
@dataclass(frozen=True, slots=True)
class FixResult:
    text: str
    changes: list[str]

    @property
    def changed(self) -> bool:
        return bool(self.changes)


_WIRE_INIT_RE = re.compile(
    r"^(\s*)wire\s+(signed\s+)?(\[[^\]]*\]\s*)?([A-Za-z_]\w*)\s*=\s*([^;]+);[ \t]*$", re.MULTILINE
)
_KEYWORD_RE = re.compile(r'(//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\])*")|\b(wire|reg)\b', re.DOTALL)
_PORT_RE = re.compile(r"\b(?:input|output|inout)\s+(logic\s+)?(signed\s+)?(\[[^\]]*\])?\s*([A-Za-z_]\w*)")
_BODY_DECL_RE = re.compile(r"^\s*logic\s+(signed\s+)?(\[[^\]]*\]\s*)?([A-Za-z_]\w*)\s*;\s*(?://.*)?$")
_GEN_LINE_RE = re.compile(r"^\s*(?:generate|endgenerate)\s*(?://.*)?$")


# Lint tags the declaration fixer can act on. Any other lint failure goes straight to the repair role.
FIXABLE_TAGS = frozenset({"PROCASSWIRE", "DUPLICATE", "GENERATE"})


def fixer_applies(lint_log: str | None) -> bool:
    return any(i.tag in FIXABLE_TAGS for i in lint_issues(lint_log))


def fix_declarations(text: str) -> FixResult:
    """Text-level declaration fixes. Idempotent. Returns the input unchanged when nothing applies."""
    changes: list[str] = []
    out = text

    # 1. `wire x = expr;` is a continuous assign; keep that meaning as `logic x; assign x = expr;`.
    def _split_init(m: re.Match[str]) -> str:
        indent, signed, rng, name, expr = m.groups()
        return f"{indent}logic {signed or ''}{rng or ''}{name};\n{indent}assign {name} = {expr.strip()};"

    out, n = _WIRE_INIT_RE.subn(_split_init, out)
    if n:
        changes.append(f"split {n} wire declaration{'s' if n != 1 else ''} with an initializer into logic plus assign")

    # 2. wire / reg become logic (comments and strings are left alone).
    count = 0

    def _to_logic(m: re.Match[str]) -> str:
        nonlocal count
        if m.group(1) is not None:
            return m.group(1)
        count += 1
        return "logic"

    out = _KEYWORD_RE.sub(_to_logic, out)
    if count:
        changes.append(f"changed {count} wire/reg declaration{'s' if count != 1 else ''} to logic")

    # 3. A body declaration that repeats a port or an earlier signal of the same type is dropped.
    declared: dict[str, tuple[str, bool]] = {}
    for m in _PORT_RE.finditer(strip_comments(out)):
        if m.group(1):  # ANSI port already declared `logic`
            declared[m.group(4)] = (_norm_range(m.group(3)), bool(m.group(2)))
    kept: list[str] = []
    for line in out.split("\n"):
        m = _BODY_DECL_RE.match(line)
        if m:
            name, key = m.group(3), (_norm_range(m.group(2)), bool(m.group(1)))
            if declared.get(name) == key:
                changes.append(f"removed the duplicate declaration of {name}")
                continue
            declared.setdefault(name, key)
        kept.append(line)
    out = "\n".join(kept)

    # 4. Bare generate / endgenerate keywords are optional in SystemVerilog; unwrap them unless genvar is used.
    if not re.search(r"\bgenvar\b", strip_comments(out)):
        lines = out.split("\n")
        stripped = [ln for ln in lines if not _GEN_LINE_RE.match(ln)]
        if len(stripped) != len(lines):
            changes.append(f"removed {len(lines) - len(stripped)} generate/endgenerate keyword line(s)")
            out = "\n".join(stripped)

    return FixResult(out if changes else text, changes)


def _norm_range(rng: str | None) -> str:
    return re.sub(r"\s+", "", rng or "")

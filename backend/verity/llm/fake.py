"""FakeProvider: zero network, deterministic, so the whole pipeline (and the web app) runs at $0.

Answer source, in order:
  1. A hand-curated cassette: backend/evals/cassettes/<task_id>/<role>[.<strategy>][.<n>].txt (the raw model text).
  2. A canned answer built from the task pack. This is the ONLY place reference.v is read at run time (it never
     reaches a real prompt or a sandbox). Behavior is chosen so every path of the loop is exercised:
       planner    a plausible plan for the pack's family; replans apply the steering carried in tags
       rtl_gen    reference.v with one deliberate small bug, so verify fails and the FIX path runs
       repair     reference.v (distinct text per failing input, so it is never a duplicate)
       optimizer  SIMPLIFY and OPTIMIZE: reference.v with a variant comment (valid, distinct hash);
                  EXPLORE: a buggy variant, so the child repair path runs once per EXPLORE child

Variants differ only textually, so the fake children have the same area and clock period as v1. Record
cassettes of real model answers to see evolution with real PPA differences.

Tags read from LLMRequest.tags (set by the roles): task_id, strategy, attempt, priority, steering (JSON),
source_sha (repair), parent_sha (optimizer), call_seq (set by the gateway).
"""

import asyncio
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from ..config import AGENT_ROOT, Settings
from ..core.budget import estimate_tokens
from ..core.errors import LLMError, VerityError
from ..core.llm_types import LLMRequest, LLMResponse
from ..core.pack import TaskPack

DEFAULT_CASSETTE_DIR = AGENT_ROOT / "evals" / "cassettes"

_NO_CODE_LINE = re.compile(r"\s*(localparam|parameter|input|output|genvar|integer)\b")
_BUG_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(?<=\S) \+ (?=\S)"), " - "),
    (re.compile(r"(?<=\S) & (?=\S)"), " | "),
    (re.compile(r"(?<=\S) \| (?=\S)"), " & "),
)


class FakeProvider:
    name = "fake"

    def __init__(
        self,
        settings: Settings,
        *,
        delay_s: float = 0.2,
        inject_bug: bool = True,
        cassette_dir: Path | None = None,
    ) -> None:
        self._tasks_dir = settings.tasks_dir
        self._delay_s = delay_s
        self._inject_bug = inject_bug
        self._cassette_dir = cassette_dir or DEFAULT_CASSETTE_DIR
        self._packs: dict[str, TaskPack] = {}

    async def aclose(self) -> None:
        return None

    # ---------- entry ----------
    async def complete(self, req: LLMRequest) -> LLMResponse:
        tags = req.tags
        task_id = tags.get("task_id", "")
        if not task_id:
            raise LLMError("fake provider needs the task_id tag", retryable=False)
        pack = self._pack(task_id)
        strategy = tags.get("strategy", "")
        attempt = tags.get("attempt", "")

        text = self._cassette(task_id, req.role, strategy, attempt)
        if text is None:
            text = self._canned(req, pack)

        if self._delay_s > 0:
            await asyncio.sleep(self._delay_s)
        digest = hashlib.sha256(
            "|".join([task_id, req.role, strategy, attempt, tags.get("call_seq", "")]).encode("utf-8")
        ).hexdigest()
        return LLMResponse(
            text=text,
            input_tokens=estimate_tokens(req.system + req.user),
            output_tokens=estimate_tokens(text),
            model=req.model,
            request_id=f"fake-{digest[:12]}",
            latency_ms=int(self._delay_s * 1000),
            finish_reason="stop",
        )

    # ---------- sources ----------
    def _pack(self, task_id: str) -> TaskPack:
        pack = self._packs.get(task_id)
        if pack is None:
            if not re.fullmatch(r"[a-z0-9_]+", task_id):
                raise LLMError(f"bad task id {task_id!r}", retryable=False)
            try:
                pack = TaskPack.load(self._tasks_dir / task_id)
            except (VerityError, OSError) as exc:
                raise LLMError(f"fake provider cannot load task pack {task_id}: {exc}", retryable=False) from exc
            self._packs[task_id] = pack
        return pack

    def _cassette(self, task_id: str, role: str, strategy: str, attempt: str) -> str | None:
        folder = self._cassette_dir / task_id
        names: list[str] = []
        if strategy and attempt:
            names.append(f"{role}.{strategy}.{attempt}.txt")
        if strategy:
            names.append(f"{role}.{strategy}.txt")
        if attempt:
            names.append(f"{role}.{attempt}.txt")
        names.append(f"{role}.txt")
        for name in names:
            path = folder / name
            if path.is_file():
                return path.read_text(encoding="utf-8")
        return None

    # ---------- canned answers ----------
    def _canned(self, req: LLMRequest, pack: TaskPack) -> str:
        if req.role == "planner":
            return json.dumps(_plan_json(pack, req.tags), indent=1)

        reference = pack.reference_rtl()
        if reference is None:
            raise LLMError(
                f"fake provider has no reference.v for task {pack.id}; add a cassette under {self._cassette_dir / pack.id}",
                retryable=False,
            )
        reference = reference.replace("\r\n", "\n").strip("\n")
        tags = req.tags
        call_seq = tags.get("call_seq", "0")

        if req.role == "rtl_gen":
            body = _inject_bug(reference) if self._inject_bug else reference
            return _answer(
                "Straightforward datapath that follows the plan block by block.",
                body,
            )
        if req.role == "repair":
            source = tags.get("source_sha", "x")[:8]
            fixed = f"// verity-fake: repaired copy of {source}\n{reference}"
            return _answer(
                "Restored the intended behavior of the datapath.",
                fixed,
                diagnosis="The arithmetic in the datapath did not match the expected values, so the operator was corrected.",
            )
        # optimizer
        strategy = tags.get("strategy", "OPTIMIZE")
        parent = tags.get("parent_sha", "x")[:8]
        header = f"// verity-fake: {strategy} variant {call_seq} of {parent}\n"
        if strategy == "EXPLORE" and self._inject_bug:
            return _answer(
                "Tried a different structure for the datapath.",
                header + _inject_bug(reference),
            )
        reasons = {
            "SIMPLIFY": "Removed redundant structure while keeping the same behavior.",
            "OPTIMIZE": "Tightened the datapath for the chosen priority while keeping the same latency.",
            "EXPLORE": "Tried a different structure for the datapath.",
        }
        return _answer(reasons.get(strategy, "Variant of the parent design."), header + reference)


# ======================================================================
# helpers
# ======================================================================
def _answer(reason: str, rtl: str, *, diagnosis: str | None = None) -> str:
    parts = []
    if diagnosis is not None:
        parts.append(f"DIAGNOSIS: {diagnosis}")
    parts.append(f"REASON: {reason}")
    parts.append("")
    parts.append("```verilog")
    parts.append(rtl.rstrip("\n"))
    parts.append("```")
    return "\n".join(parts) + "\n"


def _inject_bug(text: str) -> str:
    """Flip the first suitable operator after the port list. Returns the text unchanged if none is found."""
    lines = text.split("\n")
    start = next((i + 1 for i, line in enumerate(lines) if ");" in line.split("//")[0]), 0)
    for pattern, replacement in _BUG_RULES:
        for i in range(start, len(lines)):
            line = lines[i]
            code = line.split("//")[0]
            if not code.strip() or _NO_CODE_LINE.match(code):
                continue
            if pattern.search(code):
                lines[i] = pattern.sub(replacement, line, count=1)
                return "\n".join(lines)
    return text


# ---------- plans ----------
def _block(
    block_id: str,
    name: str,
    reason: str,
    pin_options: list[str],
    variants: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "id": block_id,
        "name": name,
        "reason": reason,
        "pinOptions": pin_options,
        "pins": [],
        "variants": variants or [],
    }


def _variant(variant_id: str, label: str, options: list[str], value: str) -> dict[str, Any]:
    return {"id": variant_id, "label": label, "options": options, "value": value}


def _blocks_for(pack: TaskPack) -> list[dict[str, Any]]:
    if pack.family == "mac":
        return [
            _block("in", "Input registers", "Capture the input pairs once per cycle.", ["Minimize registers"]),
            _block(
                "mult",
                "Multiplier array (4 lanes)",
                "One multiplier per lane.",
                ["Minimize area", "Share one multiplier"],
                [_variant("pipeline", "Pipeline", ["none", "2-stage"], "none")],
            ),
            _block("add", "Adder tree", "Add the lane products into one sum.", ["Minimize area", "Minimize registers"]),
            _block(
                "acc",
                "Accumulator and control",
                "Keep the running sum, count the cycles, raise done.",
                ["Minimize registers"],
                [_variant("width", "Accumulator width", ["auto", "exact"], "auto")],
            ),
        ]
    if pack.family == "alu":
        return [
            _block("decode", "Operation decode", "Turn the opcode into datapath controls.", ["Minimize area"]),
            _block(
                "arith",
                "Add and subtract unit",
                "One shared adder handles add, subtract and compare.",
                ["Minimize area", "Shorten the carry path"],
            ),
            _block("logic", "Logic and shift unit", "AND, OR, XOR and the two shifts.", ["Minimize area"]),
            _block("flags", "Result register and flags", "Register the result and set zero and carry.", ["Minimize registers"]),
        ]
    if pack.family == "matmul":
        return [
            _block("in", "Row input registers", "Capture one row of each matrix per cycle.", ["Minimize registers"]),
            _block(
                "mac",
                "Multiply-accumulate lanes",
                "Compute the dot products from the captured rows.",
                ["Minimize area", "Share one multiplier"],
                [_variant("pipeline", "Pipeline", ["none", "2-stage"], "none")],
            ),
            _block("ctl", "Loop control", "Count rows and columns, raise done at the end.", ["Minimize registers"]),
            _block("out", "Result registers", "Hold the results until reset.", ["Minimize registers"]),
        ]
    return [
        _block("in", "Input stage", "Capture and align the inputs.", ["Minimize registers"]),
        _block("core", "Core logic", "Compute the result described in the spec.", ["Minimize area"]),
        _block("out", "Output stage", "Register the outputs and signal completion.", ["Minimize registers"]),
    ]


def _port_text(pack: TaskPack) -> str:
    items = []
    for p in pack.ports:
        shape = f"{p.count} x {p.width} bits" if p.count > 1 else f"{p.width} bits"
        items.append(f"{p.name} ({p.dir}, {shape})")
    return ", ".join(items)


def _plan_json(pack: TaskPack, tags: Any) -> dict[str, Any]:
    blocks = _blocks_for(pack)
    steering: list[dict[str, Any]] = []
    raw = tags.get("steering", "")
    if raw:
        try:
            decoded = json.loads(raw)
            steering = [s for s in decoded if isinstance(s, dict)] if isinstance(decoded, list) else []
        except ValueError:
            steering = []
    for item in steering:
        block = next((b for b in blocks if b["id"] == item.get("blockId")), None)
        if block is None:
            continue
        if item.get("kind") == "pin" and item.get("pin") and item["pin"] not in block["pins"]:
            block["pins"].append(item["pin"])
        elif item.get("kind") == "toggle":
            variant = next((v for v in block["variants"] if v["id"] == item.get("variantId")), None)
            if variant is not None and item.get("value") in variant["options"]:
                variant["value"] = item["value"]
    priority = tags.get("priority", pack.default_priority)
    return {
        "summary": f"{pack.title}: {len(blocks)} blocks, fixed latency of {pack.latency_cycles} cycles, tuned for {priority}.",
        "blocks": blocks,
        "interfaces": _port_text(pack),
        "dataWidths": f"element type {pack.element_type}; widths as in the port list",
        "latencyCycles": pack.latency_cycles,
        "verification": f"Checked against the locked golden model on {pack.test_count} cases.",
        "risks": ["Accumulator or result width could be too small for the worst case."],
        "estimatedLines": min(pack.max_lines, 90),
    }

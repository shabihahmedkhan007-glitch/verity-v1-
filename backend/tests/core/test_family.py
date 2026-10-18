"""Knob params: validation, render_pack, and the render cache (mac4 is the first family)."""

import os
import re
from pathlib import Path

import pytest

from verity.config import AGENT_ROOT
from verity.core.family import Knob, ParamsError, family_module, render_pack, validate_params
from verity.core.pack import TaskPack

DEFAULTS = {"lanes": 4, "width": 8, "cycles": 16}


@pytest.fixture(scope="module")
def mac4() -> TaskPack:
    return TaskPack.load(AGENT_ROOT / "tasks" / "mac4")


def knobs(pack: TaskPack) -> list[Knob]:
    module = family_module(pack)
    assert module is not None
    return [Knob(**k) for k in module.KNOBS]


def test_validate_defaults(mac4: TaskPack) -> None:
    assert validate_params(knobs(mac4), {}) == DEFAULTS
    assert validate_params(knobs(mac4), None) == DEFAULTS


def test_validate_rejects_unknown_key(mac4: TaskPack) -> None:
    with pytest.raises(ParamsError):
        validate_params(knobs(mac4), {"depth": 3})


def test_validate_rejects_bool_for_int(mac4: TaskPack) -> None:
    with pytest.raises(ParamsError):
        validate_params(knobs(mac4), {"lanes": True})


def test_validate_rejects_out_of_range(mac4: TaskPack) -> None:
    with pytest.raises(ParamsError) as err:
        validate_params(knobs(mac4), {"lanes": 9})
    assert "1 to 8" in str(err.value)


def test_validate_bits_and_bool() -> None:
    ks = [
        Knob(id="pattern", kind="bits", default="1011", min_len=3, max_len=8),
        Knob(id="overlap", kind="bool", default=True),
    ]
    assert validate_params(ks, {"pattern": "110"}) == {"pattern": "110", "overlap": True}
    for bad in ({"pattern": "11"}, {"pattern": "10x1"}, {"pattern": 101}, {"overlap": 1}):
        with pytest.raises(ParamsError):
            validate_params(ks, bad)


def test_render_defaults_returns_base_pack(mac4: TaskPack, tmp_path: Path) -> None:
    assert render_pack(mac4, {}, tmp_path) is mac4
    assert render_pack(mac4, DEFAULTS, tmp_path) is mac4
    assert render_pack(mac4, None, tmp_path) is mac4
    assert list(tmp_path.iterdir()) == []


def test_render_mac4_6x12x20(mac4: TaskPack, tmp_path: Path) -> None:
    pack = render_pack(mac4, {"lanes": 6, "width": 12, "cycles": 20}, tmp_path)
    assert pack is not mac4 and pack.id == "mac4"
    a, b, acc = pack.port("a"), pack.port("b"), pack.port("acc")
    assert (a.width, a.count, b.width, b.count) == (12, 6, 12, 6)
    assert acc.width == 2 * 12 + 7 == 31
    assert pack.latency_cycles == 20
    files = pack.sandbox_files()
    assert "params.json" in files and "reference.v" not in files and "family.py" not in files
    assert pack.reference_rtl() is not None
    assert pack.root.parent.parent == tmp_path.resolve()


def test_render_cache_reused(mac4: TaskPack, tmp_path: Path) -> None:
    params = {"lanes": 2, "width": 5, "cycles": 8}
    first = render_pack(mac4, params, tmp_path)
    stamp = (first.root / "task.toml").stat().st_mtime_ns
    os.utime(first.root / "task.toml", ns=(stamp - 10**9, stamp - 10**9))
    before = (first.root / "task.toml").stat().st_mtime_ns
    second = render_pack(mac4, params, tmp_path)
    assert second.root == first.root
    assert (second.root / "task.toml").stat().st_mtime_ns == before
    assert second.sha256 == first.sha256


def test_render_cache_tampered_rerenders(mac4: TaskPack, tmp_path: Path) -> None:
    params = {"lanes": 3, "width": 6, "cycles": 10}
    first = render_pack(mac4, params, tmp_path)
    task = first.root / "task.toml"
    task.write_text(task.read_text(encoding="utf-8") + "\n# tampered\n", encoding="utf-8")
    again = render_pack(mac4, params, tmp_path)
    assert again.latency_cycles == 10
    assert "tampered" not in (again.root / "task.toml").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def add8() -> TaskPack:
    return TaskPack.load(AGENT_ROOT / "tasks" / "add8")


@pytest.fixture(scope="module")
def cnt8() -> TaskPack:
    return TaskPack.load(AGENT_ROOT / "tasks" / "cnt8")


def test_render_add8_width_32(add8: TaskPack, tmp_path: Path) -> None:
    pack = render_pack(add8, {"width": 32}, tmp_path)
    assert pack is not add8 and pack.id == "add8" and pack.top == "add8"
    assert [(p.name, p.width) for p in pack.ports] == [("a", 32), ("b", 32), ("cin", 1), ("sum", 32), ("cout", 1)]
    assert pack.latency_cycles == 0 and pack.test_count == 12 and pack.live_preset
    assert "carry out of bit 31" in pack.spec_text
    assert "[31:0] sum" in (pack.reference_rtl() or "")


def test_render_cnt8_no_enable(cnt8: TaskPack, tmp_path: Path) -> None:
    pack = render_pack(cnt8, {"width": 16, "enable": False}, tmp_path)
    assert pack.id == "cnt8" and pack.top == "cnt8"
    assert [(p.name, p.width) for p in pack.ports] == [("clk", 1), ("rst_n", 1), ("q", 16)]
    text = " ".join([pack.spec_text, *pack.coding_rules])
    assert not re.search(r"en", text) and "enable" not in text and "wraps from 65535 to 0" in pack.spec_text
    assert not re.search(r"en", pack.reference_rtl() or "")
    assert pack.latency_cycles == 1 and pack.test_count == 10 and pack.live_preset


def test_render_cnt8_with_enable_width_12(cnt8: TaskPack, tmp_path: Path) -> None:
    pack = render_pack(cnt8, {"width": 12}, tmp_path)
    assert [p.name for p in pack.ports] == ["clk", "rst_n", "en", "q"]
    assert pack.port("q").width == 12 and "enable" in pack.spec_text


def test_add8_cnt8_defaults_are_the_base_pack(add8: TaskPack, cnt8: TaskPack, tmp_path: Path) -> None:
    assert render_pack(add8, {"width": 8}, tmp_path) is add8
    assert render_pack(cnt8, {"width": 8, "enable": True}, tmp_path) is cnt8
    assert list(tmp_path.iterdir()) == []


def test_add8_cnt8_knob_bounds(add8: TaskPack, cnt8: TaskPack, tmp_path: Path) -> None:
    for pack, bad in ((add8, {"width": 3}), (add8, {"width": 33}), (cnt8, {"width": 33}), (cnt8, {"enable": 1})):
        with pytest.raises(ParamsError):
            render_pack(pack, bad, tmp_path)


def test_add8_cnt8_rendered_defaults_match_checked_in_files(add8: TaskPack, cnt8: TaskPack) -> None:
    for pack in (add8, cnt8):
        module = family_module(pack)
        assert module is not None
        rendered = module.render({k["id"]: k["default"] for k in module.KNOBS})
        assert rendered["reference.v"] == (pack.root / "reference.v").read_text(encoding="utf-8")
        assert rendered["params.json"] == (pack.root / "params.json").read_text(encoding="utf-8")
        assert rendered["task.toml"] == (pack.root / "task.toml").read_text(encoding="utf-8")

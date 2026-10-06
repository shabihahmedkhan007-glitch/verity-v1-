"""LocalDockerRunner: one `docker run` per sandbox call (CONTRACTS 3.3, ARCHITECTURE 11.6).

Isolation per call: no network, read-only root, tmpfs /tmp, memory and CPU and pid limits, uid 1000, all
capabilities dropped, no-new-privileges. The pack is mounted read-only from a FRESH copy (reference.v and the
manifest are never copied). dut.v (and b.v) are written as files; the command line is a constant template, no
model text is ever interpolated.

Windows: bind mounts use `--mount` (the `-v C:\\path:/x` form is ambiguous because of the drive colon) and the
temp paths are resolved to their long form.
"""

import asyncio
import contextlib
import logging
import os
import secrets
import shutil
import tempfile
import time
from pathlib import Path

from ..config import Settings
from ..core.errors import ToolInfraError
from .base import SCRIPT_PATHS, FatalToolError, RawOutput, SandboxCall, SandboxRunner
from .process import ProcessResult, run_process

log = logging.getLogger("verity.tools")

MAX_PARALLEL_CONTAINERS = 4  # each container may use 2 CPUs and 2 GB; evolve rounds run up to 3 children at once
_TMPFS = "/tmp:rw,exec,size=512m"
_KILL_TIMEOUT_S = 15


class LocalDockerRunner(SandboxRunner):
    def __init__(self, settings: Settings) -> None:
        super().__init__(settings, max_parallel=MAX_PARALLEL_CONTAINERS)
        self._digest: str | None = None

    # ---------- image digest ----------
    async def image_digest(self) -> str:
        """Local image id (the sha256 of the image config), cached. "" if docker or the image is unavailable."""
        if self._digest is not None:
            return self._digest
        tools = self._settings.tools
        try:
            result = await run_process(
                [tools.docker_bin, "image", "inspect", "--format", "{{.Id}}", tools.image], timeout_s=20, cap=4_096
            )
        except (OSError, asyncio.TimeoutError):
            return ""
        if result.exit_code != 0:
            return ""
        self._digest = result.stdout.decode("utf-8", errors="replace").strip()
        return self._digest

    # ---------- one call ----------
    async def _execute(self, call: SandboxCall) -> RawOutput:
        tools = self._settings.tools
        name = f"verity-{secrets.token_hex(6)}"
        started = time.monotonic()
        tmp = Path(tempfile.mkdtemp(prefix="verity-")).resolve()
        try:
            work = tmp / "work"
            pack_dir = tmp / "pack"
            work.mkdir()
            for filename, data in call.work_files.items():
                (work / filename).write_bytes(data)
            if os.name != "nt":
                # uid 1000 inside the container must be able to write /work whoever owns the host temp dir.
                work.chmod(0o777)
                for path in work.iterdir():
                    path.chmod(0o666)
            await asyncio.to_thread(call.pack.copy_for_sandbox, pack_dir)  # re-verifies the manifest first

            # UNVERIFIED: Docker Desktop on Windows with bind mounts, --read-only and --user 1000:1000 (CONTRACTS 12.5).
            cmd = self._command(name, work, pack_dir, call)
            try:
                result = await run_process(cmd, timeout_s=call.timeout_s, cap=tools.output_cap_bytes)
            except (FileNotFoundError, PermissionError) as exc:
                raise FatalToolError(
                    f"cannot start docker ({tools.docker_bin!r}): {exc}", script=call.script
                ) from exc
            except (OSError, asyncio.TimeoutError) as exc:
                raise ToolInfraError(f"docker call failed: {exc}", script=call.script) from exc
            if result.timed_out:
                await asyncio.shield(self._kill(name))  # before the temp dir is removed
        except asyncio.CancelledError:
            await asyncio.shield(self._kill(name))
            raise
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

        return self._raw(result, started)

    @staticmethod
    def _raw(result: ProcessResult, started: float) -> RawOutput:
        return RawOutput(
            exit_code=result.exit_code,
            stdout=result.stdout.decode("utf-8", errors="replace"),
            stderr=result.stderr.decode("utf-8", errors="replace"),
            duration_ms=int((time.monotonic() - started) * 1000),
            timed_out=result.timed_out,
        )

    def _command(self, name: str, work: Path, pack_dir: Path, call: SandboxCall) -> list[str]:
        tools = self._settings.tools
        for path in (work, pack_dir):
            if "," in str(path):  # --mount is comma separated
                raise FatalToolError(f"temp path contains a comma, set TMP to another folder: {path}", script=call.script)
        cmd = [
            tools.docker_bin,
            "run",
            "--rm",
            "--name",
            name,
            "--pull",
            "never",
            "--network",
            "none",
            "--read-only",
            "--tmpfs",
            _TMPFS,
            "--memory",
            tools.memory,
            "--memory-swap",
            tools.memory,
            "--cpus",
            tools.cpus,
            "--pids-limit",
            str(tools.pids_limit),
            *(["--user", tools.docker_user] if tools.docker_user else []),
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--mount",
            f"type=bind,source={work},target=/work",
            "--mount",
            f"type=bind,source={pack_dir},target=/pack,readonly",
            "-e",
            "HOME=/tmp",
        ]
        for key, value in call.env.items():
            cmd += ["-e", f"{key}={value}"]
        cmd += [tools.image, SCRIPT_PATHS[call.script]]
        return cmd

    async def _kill(self, name: str) -> None:
        """Stop the container after an outer timeout or a cancel. Best effort: --rm removes it once it dies."""
        with contextlib.suppress(Exception):
            await run_process([self._settings.tools.docker_bin, "kill", name], timeout_s=_KILL_TIMEOUT_S, cap=2_048)

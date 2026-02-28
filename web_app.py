#!/usr/bin/env python3
"""Local web UI for recover_media.py."""

from __future__ import annotations

import json
import shlex
import subprocess
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"


class RecoveryUIHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/recover":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length)

        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"ok": False, "error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            result = self._run_recovery(payload)
            self._send_json({"ok": True, **result})
        except ValueError as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

    def _run_recovery(self, payload: dict) -> dict:
        input_path = Path(str(payload.get("input", "")).strip())
        output_path = Path(str(payload.get("output", "")).strip())

        if not input_path.exists():
            raise ValueError(f"Input file does not exist: {input_path}")

        if not output_path:
            raise ValueError("Output directory is required")

        cmd = [
            "python3",
            str(ROOT / "recover_media.py"),
            str(input_path),
            str(output_path),
        ]

        types = str(payload.get("types", "")).strip()
        if types:
            cmd.extend(["--types", types])

        min_size_kb = str(payload.get("min_size_kb", "")).strip()
        if min_size_kb:
            cmd.extend(["--min-size-kb", min_size_kb])

        max_files = str(payload.get("max_files", "")).strip()
        if max_files:
            cmd.extend(["--max-files", max_files])

        chunk_size_mb = str(payload.get("chunk_size_mb", "")).strip()
        if chunk_size_mb:
            cmd.extend(["--chunk-size-mb", chunk_size_mb])

        aggressive_level = str(payload.get("aggressive_level", "")).strip()
        if aggressive_level:
            cmd.extend(["--aggressive-level", aggressive_level])

        report_prefix = str(payload.get("report_prefix", "")).strip()
        if report_prefix:
            cmd.extend(["--report-prefix", report_prefix])

        if payload.get("dry_run"):
            cmd.append("--dry-run")
        if payload.get("verbose"):
            cmd.append("--verbose")
        if payload.get("no_dedupe"):
            cmd.append("--no-dedupe")

        process = subprocess.run(cmd, capture_output=True, text=True)

        return {
            "command": " ".join(shlex.quote(part) for part in cmd),
            "returncode": process.returncode,
            "stdout": process.stdout,
            "stderr": process.stderr,
        }

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", 8000), RecoveryUIHandler)
    print("Recovery UI running at http://localhost:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()

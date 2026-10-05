# /// script
# requires-python = ">=3.9"
# dependencies = ["runwayml", "requests"]
# ///
"""Shared helpers for Runway Studio Skills scripts."""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from runwayml import RunwayML


def get_client(api_key: str | None = None) -> RunwayML:
    key = api_key or os.environ.get("RUNWAYML_API_SECRET")
    if not key:
        print("Error: No API key. Set RUNWAYML_API_SECRET or pass --api-key.", file=sys.stderr)
        sys.exit(1)
    return RunwayML(api_key=key)


def poll_task(client: RunwayML, task_id: str, interval: float = 5.0) -> dict:
    """Poll a task until it reaches a terminal state. Returns the final task dict."""
    print(f"Polling task {task_id} ...", file=sys.stderr)
    while True:
        task = client.tasks.retrieve(id=task_id)
        status = task.status

        if status == "RUNNING":
            progress = getattr(task, "progress", None)
            pct = f" ({progress:.0%})" if progress is not None else ""
            print(f"  status: RUNNING{pct}", file=sys.stderr)
        elif status in ("PENDING", "THROTTLED"):
            print(f"  status: {status}", file=sys.stderr)
        elif status == "SUCCEEDED":
            print(f"  status: SUCCEEDED", file=sys.stderr)
            return {
                "id": task.id,
                "status": "SUCCEEDED",
                "output": list(task.output),
            }
        elif status == "FAILED":
            failure = getattr(task, "failure", "Unknown error")
            failure_code = getattr(task, "failure_code", None) or getattr(task, "failureCode", None)
            print(f"  status: FAILED — {failure}", file=sys.stderr)
            return {
                "id": task.id,
                "status": "FAILED",
                "failure": failure,
                "failureCode": failure_code,
            }
        elif status == "CANCELLED":
            print(f"  status: CANCELLED", file=sys.stderr)
            return {"id": task.id, "status": "CANCELLED"}
        else:
            print(f"  status: {status}", file=sys.stderr)

        time.sleep(interval)


def download_file(url: str, filename: str, output_dir: str = "output") -> str:
    """Download a URL to output_dir/filename. Returns the local path."""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    dest = out / filename
    resp = requests.get(url, stream=True, timeout=300)
    resp.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    return str(dest)


def upload_local_file(client: RunwayML, filepath: str) -> str:
    """Upload a local file via the Runway uploads API. Returns a runway:// URI."""
    p = Path(filepath)
    if not p.exists():
        print(f"Error: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    resp = client.uploads.create_ephemeral(file=p)
    uri = resp.uri
    print(f"Uploaded {filepath} -> {uri}", file=sys.stderr)
    return uri


def resolve_image_input(client: RunwayML, value: str) -> str:
    """If value is a local path, upload it. Otherwise return as-is (URL or data URI)."""
    if value.startswith("https://") or value.startswith("data:") or value.startswith("runway://"):
        return value
    return upload_local_file(client, value)


def make_filename(name: str, ext: str) -> str:
    """Generate a timestamped filename: YYYY-MM-DD-HH-MM-SS-name.ext"""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H-%M-%S")
    return f"{ts}-{name}.{ext}"


def emit_structured(event: str, data: dict):
    """Print a structured JSON line to stdout for machine consumption."""
    print(json.dumps({"event": event, **data}))


def guess_extension(url: str, fallback: str = "mp4") -> str:
    """Guess a file extension from a URL path."""
    path = url.split("?")[0]
    if "." in path.split("/")[-1]:
        return path.split(".")[-1].lower()
    return fallback


def download_task_outputs(
    outputs: list[str],
    name: str,
    output_dir: str = "output",
    ext_fallback: str = "mp4",
) -> list[str]:
    """Download all output URLs from a completed task. Returns list of local paths."""
    paths = []
    for i, url in enumerate(outputs):
        ext = guess_extension(url, ext_fallback)
        suffix = f"-{i + 1}" if len(outputs) > 1 else ""
        fname = make_filename(f"{name}{suffix}", ext)
        p = download_file(url, fname, output_dir)
        print(f"Downloaded: {p}", file=sys.stderr)
        paths.append(p)
    return paths


def format_error(e: Exception) -> str:
    """Return a human-friendly error message."""
    msg = str(e)
    if "429" in msg or "rate" in msg.lower():
        return f"Rate limited. Wait a moment and retry. ({msg})"
    if "402" in msg or "credit" in msg.lower() or "balance" in msg.lower():
        return f"Insufficient credits. Top up at runway.com. ({msg})"
    if "moderation" in msg.lower() or "safety" in msg.lower():
        return f"Content moderation blocked the request. Revise your prompt or input. ({msg})"
    return msg

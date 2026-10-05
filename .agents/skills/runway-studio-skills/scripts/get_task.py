# /// script
# requires-python = ">=3.9"
# dependencies = ["runwayml", "requests"]
# ///
"""Retrieve, poll, or delete a Runway task."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from runway_helpers import (
    download_task_outputs,
    format_error,
    get_client,
    poll_task,
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Get, poll, or delete a Runway task")
    p.add_argument("--task-id", type=str, required=True, help="Task UUID")
    p.add_argument("--poll", action="store_true", help="Keep polling until the task completes")
    p.add_argument("--delete", action="store_true", help="Cancel or delete the task")
    p.add_argument("--download", action="store_true", help="Download output files if task succeeded")
    p.add_argument("--output-dir", type=str, default="output", help="Directory to save downloaded files")
    p.add_argument("--filename", type=str, default="task-output", help="Base name for downloaded files")
    p.add_argument("--api-key", type=str, help="Runway API key (or set RUNWAYML_API_SECRET)")
    return p


def main():
    args = build_parser().parse_args()
    client = get_client(args.api_key)

    if args.delete:
        try:
            client.tasks.delete(id=args.task_id)
            print(f"Task {args.task_id} cancelled/deleted.")
        except Exception as e:
            print(f"Error: {format_error(e)}", file=sys.stderr)
            sys.exit(1)
        return

    if args.poll:
        try:
            result = poll_task(client, args.task_id)
        except Exception as e:
            print(f"Error: {format_error(e)}", file=sys.stderr)
            sys.exit(1)

        print(json.dumps(result, indent=2))

        if result["status"] == "SUCCEEDED" and args.download:
            paths = download_task_outputs(result["output"], args.filename, args.output_dir)
            for p in paths:
                print(p)
        return

    try:
        task = client.tasks.retrieve(id=args.task_id)
    except Exception as e:
        print(f"Error: {format_error(e)}", file=sys.stderr)
        sys.exit(1)

    info = {"id": task.id, "status": task.status}
    if task.status == "RUNNING":
        info["progress"] = getattr(task, "progress", None)
    elif task.status == "SUCCEEDED":
        info["output"] = list(task.output)
    elif task.status == "FAILED":
        info["failure"] = getattr(task, "failure", None)

    print(json.dumps(info, indent=2))

    if task.status == "SUCCEEDED" and args.download:
        paths = download_task_outputs(list(task.output), args.filename, args.output_dir)
        for p in paths:
            print(p)


if __name__ == "__main__":
    main()

# /// script
# requires-python = ">=3.9"
# dependencies = ["runwayml", "requests"]
# ///
"""Generate images using the Runway API.

Models: gen4_image (default), gen4_image_turbo, gemini_2.5_flash
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from runway_helpers import (
    download_task_outputs,
    emit_structured,
    format_error,
    get_client,
    poll_task,
    resolve_image_input,
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate images with Runway API")
    p.add_argument("--prompt", type=str, required=True, help="Text prompt describing the image")
    p.add_argument(
        "--model",
        type=str,
        default="gen4_image",
        choices=["gen4_image", "gen4_image_turbo", "gemini_2.5_flash"],
        help="Model to use (default: gen4_image)",
    )
    p.add_argument("--ratio", type=str, default="1080:1080", help="Output resolution ratio (e.g. 1080:1080, 1920:1080)")
    p.add_argument(
        "--reference-images",
        nargs="+",
        help="Up to 3 reference image URLs or local paths",
    )
    p.add_argument("--seed", type=int, help="Seed for reproducibility")
    p.add_argument("--output-dir", type=str, default="output", help="Directory to save output files")
    p.add_argument("--filename", type=str, default="image", help="Base name for output files")
    p.add_argument("--no-poll", action="store_true", help="Don't poll — just print the task ID")
    p.add_argument("--api-key", type=str, help="Runway API key (or set RUNWAYML_API_SECRET)")
    return p


def main():
    args = build_parser().parse_args()
    client = get_client(args.api_key)

    params = {
        "model": args.model,
        "prompt_text": args.prompt,
        "ratio": args.ratio,
    }

    if args.seed is not None:
        params["seed"] = args.seed

    if args.reference_images:
        refs = []
        for img in args.reference_images:
            uri = resolve_image_input(client, img)
            refs.append({"uri": uri})
        params["reference_images"] = refs

    try:
        task = client.text_to_image.create(**params)
    except Exception as e:
        print(f"Error: {format_error(e)}", file=sys.stderr)
        sys.exit(1)

    task_id = task.id
    emit_structured("runway_task", {"taskId": task_id})
    print(f"Task created: {task_id}", file=sys.stderr)

    if args.no_poll:
        return

    result = poll_task(client, task_id)

    if result["status"] == "SUCCEEDED":
        paths = download_task_outputs(result["output"], args.filename, args.output_dir, ext_fallback="png")
        emit_structured("runway_result", {"taskId": task_id, "files": paths})
        for p in paths:
            print(p)
    else:
        print(f"Task {result['status']}: {result.get('failure', '')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

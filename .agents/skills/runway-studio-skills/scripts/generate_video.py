# /// script
# requires-python = ">=3.9"
# dependencies = ["runwayml", "requests"]
# ///
"""Generate videos using the Runway API.

Automatically routes to the correct endpoint based on inputs:
  - --prompt only                     -> text_to_video
  - --prompt + --image                -> image_to_video
  - --video (+ optional --prompt)     -> video_to_video
  - --character + --reference-perf    -> character_performance
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
    upload_local_file,
)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate video with Runway API")
    p.add_argument("--prompt", type=str, help="Text prompt describing the video")
    p.add_argument("--image", type=str, help="Image URL or local path (triggers image-to-video)")
    p.add_argument("--video", type=str, help="Video URL or local path (triggers video-to-video)")
    p.add_argument(
        "--model",
        type=str,
        default="seedance2",
        help="Model to use (default: seedance2). Options: gen4.5, gen4_turbo, seedance2, veo3, veo3.1, veo3.1_fast, gen4_aleph (v2v), act_two (character perf)",
    )
    p.add_argument("--duration", type=int, help="Duration in seconds")
    p.add_argument("--ratio", type=str, help="Output resolution ratio (e.g. 1280:720, 720:1280)")
    p.add_argument("--audio", type=str, choices=["true", "false"], help="Generate audio (for models that support it)")
    p.add_argument("--output-count", type=int, help="Number of outputs (seedance2 only, 1-4)")
    p.add_argument("--seed", type=int, help="Seed for reproducibility")

    # image-to-video: prompt image position
    p.add_argument(
        "--image-position",
        type=str,
        choices=["first", "last"],
        default="first",
        help="Position of the prompt image in the video (default: first)",
    )

    # video-to-video specific
    p.add_argument("--references", nargs="+", help="Reference image URLs for video-to-video (gen4_aleph)")

    # character performance specific
    p.add_argument("--character", type=str, help="Character image/video URL or local path (triggers act_two)")
    p.add_argument("--character-type", type=str, choices=["image", "video"], default="image")
    p.add_argument("--reference-perf", type=str, help="Reference performance video URL or local path (act_two)")
    p.add_argument("--body-control", action="store_true", help="Enable body control (act_two)")
    p.add_argument("--expression-intensity", type=int, choices=[1, 2, 3, 4, 5], help="Expression intensity 1-5 (act_two)")

    p.add_argument("--output-dir", type=str, default="output", help="Directory to save output files")
    p.add_argument("--filename", type=str, default="video", help="Base name for output files")
    p.add_argument("--no-poll", action="store_true", help="Don't poll — just print the task ID")
    p.add_argument("--api-key", type=str, help="Runway API key (or set RUNWAYML_API_SECRET)")
    return p


def create_character_performance(client, args):
    if not args.reference_perf:
        print("Error: --reference-perf is required for character performance (act_two)", file=sys.stderr)
        sys.exit(1)

    char_uri = resolve_image_input(client, args.character) if args.character_type == "image" else args.character
    if args.character_type == "video" and not char_uri.startswith(("https://", "runway://", "data:")):
        char_uri = upload_local_file(client, char_uri)

    ref_uri = args.reference_perf
    if not ref_uri.startswith(("https://", "runway://", "data:")):
        ref_uri = upload_local_file(client, ref_uri)

    params = {
        "model": "act_two",
        "character": {"type": args.character_type, "uri": char_uri},
        "reference": {"type": "video", "uri": ref_uri},
    }
    if args.ratio:
        params["ratio"] = args.ratio
    if args.seed is not None:
        params["seed"] = args.seed
    if args.body_control:
        params["bodyControl"] = True
    if args.expression_intensity:
        params["expressionIntensity"] = args.expression_intensity

    return client.character_performance.create(**params)


def create_video_to_video(client, args):
    video_uri = args.video
    if not video_uri.startswith(("https://", "runway://", "data:")):
        video_uri = upload_local_file(client, video_uri)

    params = {
        "model": args.model if args.model != "seedance2" else "gen4_aleph",
        "video_uri": video_uri,
    }
    if args.prompt:
        params["prompt_text"] = args.prompt
    if args.ratio:
        params["ratio"] = args.ratio
    if args.references:
        params["references"] = [{"type": "image", "uri": u} for u in args.references]

    return client.video_to_video.create(**params)


def create_image_to_video(client, args):
    image_uri = resolve_image_input(client, args.image)

    params = {"model": args.model}

    # seedance2 supports reference images (no position) and keyframe images (with position)
    if args.model == "seedance2":
        params["prompt_image"] = [{"uri": image_uri, "position": args.image_position}]
    else:
        params["prompt_image"] = image_uri

    if args.prompt:
        params["prompt_text"] = args.prompt
    if args.duration:
        params["duration"] = args.duration
    if args.ratio:
        params["ratio"] = args.ratio
    if args.seed is not None:
        params["seed"] = args.seed
    if args.audio is not None:
        params["audio"] = args.audio == "true"
    if args.output_count and args.model == "seedance2":
        params["output_count"] = args.output_count

    return client.image_to_video.create(**params)


def create_text_to_video(client, args):
    if not args.prompt:
        print("Error: --prompt is required for text-to-video", file=sys.stderr)
        sys.exit(1)

    params = {
        "model": args.model,
        "prompt_text": args.prompt,
    }
    if args.duration:
        params["duration"] = args.duration
    if args.ratio:
        params["ratio"] = args.ratio
    if args.seed is not None:
        params["seed"] = args.seed
    if args.audio is not None:
        params["audio"] = args.audio == "true"
    if args.output_count and args.model == "seedance2":
        params["output_count"] = args.output_count

    return client.text_to_video.create(**params)


def main():
    args = build_parser().parse_args()
    client = get_client(args.api_key)

    try:
        if args.character:
            task = create_character_performance(client, args)
        elif args.video:
            task = create_video_to_video(client, args)
        elif args.image:
            task = create_image_to_video(client, args)
        else:
            task = create_text_to_video(client, args)
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
        paths = download_task_outputs(result["output"], args.filename, args.output_dir)
        emit_structured("runway_result", {"taskId": task_id, "files": paths})
        for p in paths:
            print(p)
    else:
        print(f"Task {result['status']}: {result.get('failure', '')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

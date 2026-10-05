# /// script
# requires-python = ">=3.9"
# dependencies = ["runwayml", "requests"]
# ///
"""Generate audio using the Runway API.

Subcommands:
  sound-effect       Generate sound effects from text
  tts                Text to speech
  speech-to-speech   Convert voice in audio/video
  voice-dub          Dub audio to another language
  voice-isolate      Isolate voice from background audio
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
    upload_local_file,
)


VOICE_PRESETS = [
    "Maya", "Arjun", "Serene", "Bernard", "Billy", "Mark", "Clint", "Mabel",
    "Chad", "Leslie", "Eleanor", "Elias", "Elliot", "Grungle", "Brodie",
    "Sandra", "Kirk", "Kylie", "Lara", "Lisa", "Malachi", "Marlene", "Martin",
    "Miriam", "Monster", "Paula", "Pip", "Rusty", "Ragnar", "Xylar", "Maggie",
    "Jack", "Katie", "Noah", "James", "Rina", "Ella", "Mariah", "Frank",
    "Claudia", "Niki", "Vincent", "Kendrick", "Myrna", "Tom", "Wanda",
    "Benjamin", "Kiana", "Rachel",
]

DUBBING_LANGUAGES = [
    "en", "hi", "pt", "zh", "es", "fr", "de", "ja", "ar", "ru", "ko", "id",
    "it", "nl", "tr", "pl", "sv", "fil", "ms", "ro", "uk", "el", "cs", "da",
    "fi", "bg", "hr", "sk", "ta",
]


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Generate audio with Runway API")
    p.add_argument("--api-key", type=str, help="Runway API key (or set RUNWAYML_API_SECRET)")
    p.add_argument("--output-dir", type=str, default="output", help="Directory to save output files")
    p.add_argument("--no-poll", action="store_true", help="Don't poll — just print the task ID")

    sub = p.add_subparsers(dest="command", required=True)

    # sound-effect
    se = sub.add_parser("sound-effect", help="Generate sound effects from text")
    se.add_argument("--prompt", type=str, required=True, help="Text description of the sound")
    se.add_argument("--duration", type=float, help="Duration in seconds (0.5-30)")
    se.add_argument("--loop", action="store_true", help="Design output to loop seamlessly")
    se.add_argument("--filename", type=str, default="sound-effect")

    # tts
    tts = sub.add_parser("tts", help="Text to speech")
    tts.add_argument("--prompt", type=str, required=True, help="Text to speak")
    tts.add_argument("--voice", type=str, required=True, choices=VOICE_PRESETS, help="Voice preset name")
    tts.add_argument("--filename", type=str, default="speech")

    # speech-to-speech
    sts = sub.add_parser("speech-to-speech", help="Convert voice in audio/video")
    sts.add_argument("--media", type=str, required=True, help="Audio/video URL or local path")
    sts.add_argument("--media-type", type=str, choices=["audio", "video"], required=True)
    sts.add_argument("--voice", type=str, required=True, choices=VOICE_PRESETS, help="Target voice preset")
    sts.add_argument("--remove-noise", action="store_true", help="Remove background noise")
    sts.add_argument("--filename", type=str, default="speech-converted")

    # voice-dub
    vd = sub.add_parser("voice-dub", help="Dub audio to another language")
    vd.add_argument("--audio", type=str, required=True, help="Audio URL or local path")
    vd.add_argument("--target-lang", type=str, required=True, choices=DUBBING_LANGUAGES, help="Target language code")
    vd.add_argument("--disable-cloning", action="store_true", help="Use generic voice instead of cloning")
    vd.add_argument("--drop-background", action="store_true", help="Remove background audio from output")
    vd.add_argument("--num-speakers", type=int, help="Number of speakers (auto-detected if omitted)")
    vd.add_argument("--filename", type=str, default="dubbed")

    # voice-isolate
    vi = sub.add_parser("voice-isolate", help="Isolate voice from background audio")
    vi.add_argument("--audio", type=str, required=True, help="Audio URL or local path")
    vi.add_argument("--filename", type=str, default="voice-isolated")

    return p


def resolve_media(client, value: str) -> str:
    if value.startswith(("https://", "data:", "runway://")):
        return value
    return upload_local_file(client, value)


def run_sound_effect(client, args):
    params = {
        "model": "eleven_text_to_sound_v2",
        "prompt_text": args.prompt,
    }
    if args.duration is not None:
        params["duration"] = args.duration
    if args.loop:
        params["loop"] = True
    return client.sound_effect.create(**params)


def run_tts(client, args):
    return client.text_to_speech.create(
        model="eleven_multilingual_v2",
        prompt_text=args.prompt,
        voice={"type": "runway-preset", "presetId": args.voice},
    )


def run_speech_to_speech(client, args):
    media_uri = resolve_media(client, args.media)
    params = {
        "model": "eleven_multilingual_sts_v2",
        "media": {"type": args.media_type, "uri": media_uri},
        "voice": {"type": "runway-preset", "presetId": args.voice},
    }
    if args.remove_noise:
        params["remove_background_noise"] = True
    return client.speech_to_speech.create(**params)


def run_voice_dub(client, args):
    audio_uri = resolve_media(client, args.audio)
    params = {
        "model": "eleven_voice_dubbing",
        "audio_uri": audio_uri,
        "target_lang": args.target_lang,
    }
    if args.disable_cloning:
        params["disable_voice_cloning"] = True
    if args.drop_background:
        params["drop_background_audio"] = True
    if args.num_speakers is not None:
        params["num_speakers"] = args.num_speakers
    return client.voice_dubbing.create(**params)


def run_voice_isolate(client, args):
    audio_uri = resolve_media(client, args.audio)
    return client.voice_isolation.create(
        model="eleven_voice_isolation",
        audio_uri=audio_uri,
    )


HANDLERS = {
    "sound-effect": run_sound_effect,
    "tts": run_tts,
    "speech-to-speech": run_speech_to_speech,
    "voice-dub": run_voice_dub,
    "voice-isolate": run_voice_isolate,
}


def main():
    args = build_parser().parse_args()
    client = get_client(args.api_key)

    handler = HANDLERS[args.command]

    try:
        task = handler(client, args)
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
        ext = "mp4" if args.command in ("speech-to-speech", "voice-dub") and getattr(args, "media_type", None) == "video" else "mp3"
        filename = getattr(args, "filename", args.command)
        paths = download_task_outputs(result["output"], filename, args.output_dir, ext_fallback=ext)
        emit_structured("runway_result", {"taskId": task_id, "files": paths})
        for p in paths:
            print(p)
    else:
        print(f"Task {result['status']}: {result.get('failure', '')}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

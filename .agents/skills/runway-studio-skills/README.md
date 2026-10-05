# Runway Studio Skills

Generate studio-quality videos, images, and audio with the [Runway API](https://docs.dev.runwayml.com/) at scale. Works with Claude Code, Cursor, Copilot, Codex, Windsurf, and other AI agents.

## Install

### Agent Skills

```bash
npx skills add runwayml/runway-studio-skills
```

Works with Claude Code, Cursor, Copilot, Codex, Windsurf, and other agents.

### Manual

```bash
git clone https://github.com/runwayml/runway-studio-skills.git
export RUNWAYML_API_SECRET="your-api-key"
```

Then ask your agent: *"Generate a product ad video from this image"*

## Setup

1. Get your API key at [dev.runwayml.com](https://dev.runwayml.com/)
2. Set `RUNWAYML_API_SECRET` environment variable (or pass `--api-key` to any script)
3. Ensure `uv` is installed (`curl -LsSf https://astral.sh/uv/install.sh | sh`) — it ships with Claude Code

## Available Scripts

| Script | Description |
|--------|-------------|
| `scripts/generate_video.py` | Text-to-video, image-to-video, video-to-video, character performance |
| `scripts/generate_image.py` | Text/image to image generation (gen4_image, gen4_image_turbo, gemini_2.5_flash) |
| `scripts/generate_audio.py` | Sound effects, TTS, speech-to-speech, voice dubbing, voice isolation |
| `scripts/get_task.py` | Poll, retrieve, or delete tasks |
| `scripts/runway_helpers.py` | Shared helpers (API client, polling, downloads, error handling) |

All scripts use `uv run` (inline dependencies, no install needed).

## Quick Examples

```bash
# Generate a product ad video from an image
uv run scripts/generate_video.py \
  --prompt "Smooth camera orbit around the product, soft studio lighting" \
  --image "https://example.com/product.jpg" \
  --model seedance2 --ratio 720:1280 --duration 10

# Generate a video from text
uv run scripts/generate_video.py \
  --prompt "A product bottle rotating slowly on a marble surface" \
  --model seedance2 --ratio 1280:720

# Generate an image
uv run scripts/generate_image.py \
  --prompt "Minimal skincare bottle on white background" \
  --model gen4_image --ratio 1080:1080

# Generate a sound effect
uv run scripts/generate_audio.py sound-effect \
  --prompt "Soft whoosh transition sound" --duration 3

# Text to speech
uv run scripts/generate_audio.py tts \
  --prompt "Welcome to our product showcase" --voice Leslie

# Check task status
uv run scripts/get_task.py --task-id "your-task-uuid" --poll
```

## Documentation

- **[SKILL.md](SKILL.md)** — Full agent skill reference (models, parameters, ratios, error handling)
- **[COOKBOOK.md](COOKBOOK.md)** — End-to-end recipes for product ads and campaigns

## API Key

Get your key at [dev.runwayml.com](https://dev.runwayml.com/). Set as `RUNWAYML_API_SECRET` environment variable or pass `--api-key` to any script.

## License

MIT

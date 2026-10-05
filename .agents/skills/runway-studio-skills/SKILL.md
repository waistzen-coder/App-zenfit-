---
name: runway-studio-skills
description: |
  Use this skill when the user wants to generate videos, images, or audio using
  the Runway API. Covers product ad videos, text-to-video, image-to-video,
  video-to-video, character performance, image generation, sound effects, TTS,
  speech-to-speech, voice dubbing, and voice isolation.
license: MIT
---

# Runway Studio Skills

Generate studio-quality videos, images, and audio using the Runway API. All commands are standalone Python scripts run via `uv run` from the skill root directory.

## Setup

The user must set their Runway API key:

```bash
export RUNWAYML_API_SECRET="your-api-key"
```

All scripts accept `--api-key` as an alternative.

## Commands

All invocations use `uv run scripts/<script>.py` from the repo root. Dependencies install automatically on first run.

---

### generate_video.py — Video generation

Automatically routes to the correct Runway endpoint based on inputs provided.

```bash
# Text to video
uv run scripts/generate_video.py \
  --prompt "A product bottle rotating slowly on a marble surface" \
  --model seedance2 --ratio 720:1280 --duration 10

# Image to video
uv run scripts/generate_video.py \
  --prompt "Smooth camera push-in, soft ambient light" \
  --image "https://example.com/product.jpg" \
  --model seedance2 --duration 10 --ratio 720:1280

# Image to video from local file
uv run scripts/generate_video.py \
  --prompt "Product reveal" \
  --image ./product-photo.jpg \
  --model gen4_turbo

# Video to video
uv run scripts/generate_video.py \
  --video "https://example.com/source.mp4" \
  --prompt "Add cinematic color grading" \
  --model gen4_aleph --ratio 1280:720

# Character performance
uv run scripts/generate_video.py \
  --character ./spokesperson.jpg \
  --reference-perf "https://example.com/performance.mp4" \
  --ratio 1280:720
```

**Routing logic:**
- `--character` + `--reference-perf` → character_performance (act_two)
- `--video` → video_to_video
- `--image` → image_to_video
- prompt only → text_to_video

**Parameters:**

| Flag | Description | Default |
|------|-------------|---------|
| `--prompt` | Text prompt (up to 1000 chars; 3500 for seedance2) | — |
| `--image` | Image URL or local path | — |
| `--video` | Video URL or local path | — |
| `--model` | Model name (see table below) | `seedance2` |
| `--duration` | Duration in seconds | model default |
| `--ratio` | Resolution ratio (e.g. `1280:720`) | model default |
| `--audio` | `true`/`false` — generate audio | model default |
| `--output-count` | Number of outputs, 1-4 (seedance2 only) | 1 |
| `--seed` | Seed integer for reproducibility | random |
| `--image-position` | `first` or `last` — where the image appears in video | `first` |
| `--references` | Reference image URLs (video-to-video, gen4_aleph) | — |
| `--character` | Character image/video for act_two | — |
| `--character-type` | `image` or `video` | `image` |
| `--reference-perf` | Performance reference video for act_two | — |
| `--body-control` | Enable body control (act_two) | off |
| `--expression-intensity` | 1-5 expression intensity (act_two) | 3 |
| `--output-dir` | Output directory | `output` |
| `--filename` | Base name for saved files | `video` |
| `--no-poll` | Print task ID without waiting | off |

---

### generate_image.py — Image generation

```bash
uv run scripts/generate_image.py \
  --prompt "Minimal skincare bottle on white background, studio lighting" \
  --model gen4_image --ratio 1080:1080

# With reference images
uv run scripts/generate_image.py \
  --prompt "Product in the style of the reference" \
  --reference-images "https://example.com/brand-ref.jpg" ./local-ref.png \
  --model gen4_image --ratio 1920:1080
```

**Parameters:**

| Flag | Description | Default |
|------|-------------|---------|
| `--prompt` | Text prompt (required) | — |
| `--model` | `gen4_image`, `gen4_image_turbo`, `gemini_2.5_flash` | `gen4_image` |
| `--ratio` | Resolution ratio | `1080:1080` |
| `--reference-images` | Up to 3 reference image URLs or local paths | — |
| `--seed` | Seed integer | random |
| `--output-dir` | Output directory | `output` |
| `--filename` | Base name for saved files | `image` |

---

### generate_audio.py — Audio generation

Five subcommands mapping to Runway audio endpoints.

```bash
# Sound effect
uv run scripts/generate_audio.py sound-effect \
  --prompt "Soft whoosh transition sound" --duration 3

# Text to speech
uv run scripts/generate_audio.py tts \
  --prompt "Welcome to our product showcase" --voice Leslie

# Speech to speech (voice conversion)
uv run scripts/generate_audio.py speech-to-speech \
  --media ./recording.mp3 --media-type audio --voice Noah

# Voice dubbing
uv run scripts/generate_audio.py voice-dub \
  --audio "https://example.com/narration.mp3" --target-lang es

# Voice isolation
uv run scripts/generate_audio.py voice-isolate \
  --audio ./noisy-recording.mp3
```

**Subcommand parameters:**

**sound-effect:** `--prompt` (required), `--duration` (0.5-30s), `--loop`
**tts:** `--prompt` (required), `--voice` (required, see voice presets below)
**speech-to-speech:** `--media` (required), `--media-type` (`audio`/`video`), `--voice` (required), `--remove-noise`
**voice-dub:** `--audio` (required), `--target-lang` (required), `--disable-cloning`, `--drop-background`, `--num-speakers`
**voice-isolate:** `--audio` (required)

All subcommands also accept: `--output-dir`, `--filename`, `--no-poll`, `--api-key`

---

### get_task.py — Task management

```bash
# Check task status
uv run scripts/get_task.py --task-id "uuid-here"

# Poll until completion
uv run scripts/get_task.py --task-id "uuid-here" --poll

# Poll and download outputs
uv run scripts/get_task.py --task-id "uuid-here" --poll --download

# Cancel/delete a task
uv run scripts/get_task.py --task-id "uuid-here" --delete
```

---

## Model Selection Guide

### Video models

| Model | Best for | Duration | Audio | Key feature |
|-------|----------|----------|-------|-------------|
| `seedance2` | Product ads, reference-based video | 4-15s | yes | Reference image support, up to 4 outputs per call, 3500-char prompts |
| `gen4.5` | High quality text/image-to-video | 2-10s | no | Best visual quality |
| `gen4_turbo` | Fast image-to-video | 2-10s | no | Fastest Runway model |
| `veo3.1` | Cinematic with audio | 4/6/8s | yes | Built-in contextual audio, up to 1080p |
| `veo3.1_fast` | Fast cinematic with audio | 4/6/8s | yes | Faster veo3.1 |
| `veo3` | Cinematic with audio | 8s | no | Image-to-video with audio |
| `gen4_aleph` | Video-to-video restyling | — | — | Video input + reference images |
| `act_two` | Character performance | — | — | Transfer facial/body performance |

**For product ads, use `seedance2`.** It supports reference images (product photos fed directly), generates up to 4 variants per call, and produces up to 15s videos.

**For cinematic video with audio, use `veo3.1`.** It generates contextual ambient sound automatically.

### Image models

| Model | Best for | Key feature |
|-------|----------|-------------|
| `gen4_image` | General image generation | Up to 3 reference images, highest quality |
| `gen4_image_turbo` | Fast drafts | Requires at least 1 reference image |
| `gemini_2.5_flash` | Fast image generation | Google Gemini-based |

### Audio models

| Model | Endpoint | Purpose |
|-------|----------|---------|
| `eleven_text_to_sound_v2` | sound_effect | Sound effects from text description |
| `eleven_multilingual_v2` | text_to_speech | TTS with 50 voice presets |
| `eleven_multilingual_sts_v2` | speech_to_speech | Voice conversion in audio/video |
| `eleven_voice_dubbing` | voice_dubbing | Translate + dub to 28 languages |
| `eleven_voice_isolation` | voice_isolation | Separate voice from background |

### Voice presets (TTS and speech-to-speech)

Maya, Arjun, Serene, Bernard, Billy, Mark, Clint, Mabel, Chad, Leslie, Eleanor, Elias, Elliot, Grungle, Brodie, Sandra, Kirk, Kylie, Lara, Lisa, Malachi, Marlene, Martin, Miriam, Monster, Paula, Pip, Rusty, Ragnar, Xylar, Maggie, Jack, Katie, Noah, James, Rina, Ella, Mariah, Frank, Claudia, Niki, Vincent, Kendrick, Myrna, Tom, Wanda, Benjamin, Kiana, Rachel

---

## Supported Ratios

### Video ratios by model

**gen4.5 / gen4_turbo:** `1280:720`, `720:1280`, `1104:832`, `960:960`, `832:1104`, `1584:672`

**seedance2:** `992:432`, `864:496`, `752:560`, `640:640`, `560:752`, `496:864`, `1470:630`, `1280:720`, `1112:834`, `960:960`, `834:1112`, `720:1280`

**veo3.1 / veo3.1_fast / veo3:** `1280:720`, `720:1280`, `1080:1920`, `1920:1080`

### Common ad format ratios

| Platform | Ratio | seedance2 | gen4.5 |
|----------|-------|-----------|--------|
| TikTok / Reels (9:16) | `720:1280` | yes | yes |
| YouTube (16:9) | `1280:720` | yes | yes |
| Instagram Square (1:1) | `960:960` | yes | yes |
| Instagram Feed (4:3) | `1112:834` | yes (approx) | `1104:832` |

### Image ratios

**gen4_image / gen4_image_turbo:** `1024:1024`, `1080:1080`, `1168:880`, `1360:768`, `1440:1080`, `1080:1440`, `1808:768`, `1920:1080`, `1080:1920`, `2112:912`, `1280:720`, `720:1280`, `720:720`, `960:720`, `720:960`, `1680:720`

**gemini_2.5_flash:** `1344:768`, `768:1344`, `1024:1024`, `1184:864`, `864:1184`, `1536:672`, `832:1248`, `1248:832`, `896:1152`, `1152:896`

---

## Output Conventions

- Files are saved to `--output-dir` (default: `output/`).
- Filenames use the pattern: `YYYY-MM-DD-HH-MM-SS-<name>.ext`
- Scripts print the local file path to stdout on success.
- Scripts print structured JSON lines (`{"event": "runway_task", ...}` and `{"event": "runway_result", ...}`) to stdout for machine consumption.
- Status/progress messages go to stderr.
- Do NOT read generated media files back into the conversation — just report the file paths to the user.

---

## Local File Handling

All scripts accept local file paths for image, video, and audio inputs. Local files are automatically uploaded via the Runway uploads API (ephemeral, valid for 24h) before being used in generation requests.

---

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| 429 / rate limit | Too many requests | Wait and retry |
| 402 / insufficient credits | Not enough credits | User must top up at runway.com |
| SAFETY.INPUT.IMAGE | Input image flagged | Revise the input image |
| SAFETY.OUTPUT | Generated content flagged | Revise the prompt |
| Task FAILED | Generation failed | Check the failure message, adjust inputs |

---

## Prompt Tips for Product Ad Videos

- Describe camera movement explicitly: "slow dolly in", "smooth orbit around product", "camera pulls back to reveal"
- Specify lighting: "soft studio lighting", "golden hour warm light", "dramatic side light"
- Keep the product description concrete: material, color, size cues
- For seedance2, the reference image carries the visual identity — the prompt should describe *motion and scene*, not the product itself
- Shorter prompts (1-2 sentences) often produce better results than long descriptions

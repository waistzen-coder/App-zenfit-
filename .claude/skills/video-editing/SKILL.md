---
name: video-editing
description: AI-assisted workflows for cutting, structuring, reframing, and augmenting existing footage. Covers raw capture, edit planning, FFmpeg, Remotion, optional generated assets, captions, audio mixing, and final polish. Use when the user wants to edit footage, create a vlog or tutorial, extract short-form clips, add overlays or voiceover, or prepare video for multiple platforms.
---

# Video Editing

> Original workflow and concept credited to the original skill author. Preserve attribution when redistributing or adapting this skill.

Edit real footage efficiently with AI-assisted planning and deterministic tools. This skill is for transforming existing video, not generating an entire video from a prompt.

## When to Activate

Use this skill when the user wants to:

- Cut, trim, organize, or combine video footage
- Turn a long recording into short clips or a concise video
- Build a vlog, tutorial, interview, course, or product demo
- Remove pauses, tangents, mistakes, or repeated takes
- Add captions, titles, branding, music, sound effects, or voiceover
- Reframe footage for YouTube, TikTok, Instagram, or other platforms
- Create a repeatable video-editing workflow or template

Do not activate for prompt-only video generation when no source footage exists.

## Core Principle

Use AI to compress, organize, and augment real footage. Keep structural decisions inspectable and use deterministic tools for cuts, timing, composition, and export.

## Workflow

```text
Raw footage
  -> inspect and inventory
  -> transcribe and plan
  -> create an edit decision list
  -> cut and preprocess with FFmpeg
  -> add programmable elements with Remotion when useful
  -> add optional generated assets
  -> review and polish
  -> export and verify
```

Not every project needs every tool. Skip a layer when it adds no value, but always inspect the source, preserve the original files, and verify the final output.

## 1. Inspect and Preserve the Source

Before editing:

1. Keep source files unchanged.
2. Record each file's duration, resolution, frame rate, codecs, audio channels, and rotation metadata.
3. Identify variable-frame-rate footage, mismatched frame rates, missing audio, clipping, corruption, and orientation problems.
4. Confirm the target duration, aspect ratio, resolution, frame rate, caption style, and delivery platform.
5. Work in a separate output directory and avoid overwriting existing renders.

Inspect a file:

```bash
ffprobe -v error \
  -show_entries format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,sample_rate,channels:stream_tags=rotate \
  -of json input.mp4
```

If precise cuts or reliable synchronization matter, normalize variable-frame-rate footage before editing:

```bash
ffmpeg -i input.mp4 \
  -vf "fps=30" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  normalized.mp4
```

## 2. Transcribe and Plan

Use Claude Code or Codex to help:

- Label speakers, topics, takes, and sections
- Identify strong hooks, explanations, demonstrations, and conclusions
- Mark pauses, tangents, repetition, mistakes, and sensitive material
- Propose a narrative structure
- Produce an edit decision list, or EDL
- Generate reviewable FFmpeg commands or Remotion compositions

Do not treat transcript timestamps as frame-accurate. Validate important boundaries against the source audio and video.

Recommended EDL format:

```csv
source,start,end,label,notes
raw.mp4,00:00:12.400,00:00:24.850,hook,Open on the strongest claim
raw.mp4,00:03:41.200,00:04:18.000,demo,Remove pause at 00:03:58
raw.mp4,00:08:10.000,00:08:27.500,ending,Add CTA title
```

Example planning prompt:

```text
Using this transcript and the source-file durations, propose a 60-second edit.

Return:
1. A one-sentence story arc.
2. A CSV edit decision list with source, start, end, label, and notes.
3. Any timestamp uncertainty or continuity risk.
4. Suggested on-screen text, limited to 10 words per card.
5. No destructive commands and no generated footage.
```

Review the EDL before rendering when cuts could remove important context, alter a speaker's meaning, expose private information, or create a misleading sequence.

## 3. Cut and Preprocess with FFmpeg

FFmpeg handles trimming, concatenation, scaling, audio preparation, and final encoding.

### Fast approximate cut

Stream copying is fast but may begin on the nearest keyframe rather than the exact requested frame:

```bash
ffmpeg -ss 00:12:30 -to 00:15:45 -i raw.mp4 \
  -c copy segment_01.mp4
```

Use this for proxies and rough review cuts.

### Accurate cut

Re-encode when exact boundaries matter:

```bash
ffmpeg -ss 00:12:30 -to 00:15:45 -i raw.mp4 \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  segment_01.mp4
```

### Batch cut from an EDL

Quote paths and create the output directory first:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p segments

tail -n +2 cuts.csv |
while IFS=, read -r source start end label notes; do
  safe_label=$(printf '%s' "$label" | tr -cs 'A-Za-z0-9._-' '_')

  ffmpeg -y \
    -ss "$start" -to "$end" -i "$source" \
    -c:v libx264 -crf 18 -preset medium \
    -c:a aac -b:a 192k \
    "segments/${safe_label}.mp4"
done
```

This simple CSV parser does not support commas inside quoted fields. Use JSON, a proper CSV parser, or comma-free notes for complex EDLs.

### Concatenate compatible segments

The concat demuxer requires matching stream parameters:

```bash
find "$PWD/segments" -maxdepth 1 -type f -name '*.mp4' -print0 |
  sort -z |
  while IFS= read -r -d '' file; do
    escaped=${file//\'/\'\\\'\'}
    printf "file '%s'\n" "$escaped"
  done > concat.txt

ffmpeg -f concat -safe 0 -i concat.txt -c copy assembled.mp4
```

If concatenation fails or produces sync problems, normalize all segments to the same resolution, frame rate, pixel format, video codec, audio codec, sample rate, and channel layout, then concatenate with re-encoding.

### Create an editing proxy

```bash
ffmpeg -i raw.mp4 \
  -vf "scale=960:-2" \
  -c:v libx264 -preset ultrafast -crf 28 \
  -c:a aac -b:a 128k \
  proxy.mp4
```

Keep the proxy's timing identical to the source so EDL timestamps remain transferable.

### Extract audio for transcription

```bash
ffmpeg -i raw.mp4 \
  -vn -ac 1 -ar 16000 -c:a pcm_s16le \
  audio.wav
```

### Normalize loudness

For reliable loudness normalization, use FFmpeg's two-pass `loudnorm` workflow. A one-pass command is acceptable for a preview:

```bash
ffmpeg -i segment.mp4 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v copy -c:a aac -b:a 192k \
  normalized-preview.mp4
```

Do not use `-c:a copy` when applying an audio filter.

## 4. Add Programmable Composition with Remotion

Use Remotion when reusable code is more efficient than manual timeline editing.

Good uses include:

- Titles, lower thirds, captions, and branding
- Charts, counters, callouts, and annotated screenshots
- Reusable scene templates
- Consistent motion graphics across a video series
- Product demos with timed highlights

Prefer a traditional editor for irregular, subjective, one-off pacing adjustments.

### Basic composition

Place media in Remotion's public directory and reference it with `staticFile`:

```tsx
import {
  AbsoluteFill,
  Sequence,
  Video,
  staticFile,
} from "remotion";

export const VlogComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Sequence from={0} durationInFrames={300}>
        <Video src={staticFile("segments/intro.mp4")} />
      </Sequence>

      <Sequence from={30} durationInFrames={90}>
        <AbsoluteFill
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
          }}
        >
          <h1
            style={{
              color: "white",
              fontFamily: "sans-serif",
              fontSize: 72,
              textAlign: "center",
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            The AI Editing Stack
          </h1>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={300} durationInFrames={450}>
        <Video src={staticFile("segments/demo.mp4")} />
      </Sequence>
    </AbsoluteFill>
  );
};
```

Register the composition with explicit dimensions, frame rate, and duration. Ensure sequence durations match the actual media or intentionally trim them.

Render:

```bash
npx remotion render src/index.ts VlogComposition output.mp4
```

## 5. Add Optional Generated Assets

Generate only assets that fill a specific gap. Obtain permission before cloning a person's voice or likeness. Do not fabricate documentary evidence or present synthetic media as authentic footage.

Possible assets include:

- Narration recorded by the user or generated with an authorized voice
- Licensed or generated background music
- Transition sounds and ambient effects
- Clearly appropriate insert shots, illustrations, or thumbnails

External generation services are optional. Do not call them unless the user requests or authorizes external generation and the required service is already configured. Never expose API keys in commands, logs, source files, or output.

When adding music:

- Confirm the user has usage rights.
- Keep dialogue intelligible.
- Add short fades at edit boundaries.
- Avoid abrupt looping.
- Check the final mix on headphones and speakers.

## 6. Reframe for Each Platform

Choose the framing based on the subject, not only the center of the source.

| Destination | Aspect ratio | Common resolution |
|---|---:|---:|
| YouTube landscape | 16:9 | 1920x1080 |
| TikTok and Reels | 9:16 | 1080x1920 |
| Square feed post | 1:1 | 1080x1080 |

Platform specifications can change. Confirm current delivery requirements when they matter.

### Center crop

```bash
ffmpeg -i input.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  vertical.mp4
```

```bash
ffmpeg -i input.mp4 \
  -vf "crop=ih:ih,scale=1080:1080" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  square.mp4
```

A center crop can cut off faces, screen content, captions, or demonstrations. Preview the entire video. Use per-shot crop positions, keyframed motion, or subject tracking when the subject moves.

### Preserve the full frame with padding

Use padding when cropping would remove important content:

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  vertical-padded.mp4
```

## 7. Detect Scenes and Silence

Automated detection produces candidates, not final edit decisions.

### Scene detection

```bash
ffmpeg -i input.mp4 \
  -vf "select='gt(scene,0.3)',showinfo" \
  -fps_mode vfr -f null - 2>&1 |
  grep showinfo
```

Adjust the threshold after testing a representative section. Fast motion, flashes, screen changes, and camera cuts can create false positives.

### Silence detection

```bash
ffmpeg -i input.mp4 \
  -af "silencedetect=noise=-30dB:d=2" \
  -f null - 2>&1 |
  grep -E "silence_(start|end|duration)"
```

Do not remove every detected silence. Pauses may be intentional, and room noise can prevent silence detection. Add handles around proposed cuts to avoid clipped words and unnatural pacing.

## 8. Captions and Accessibility

For captions:

- Preserve the transcript as an editable source.
- Correct names, technical terms, punctuation, and speaker changes.
- Keep text inside platform-safe areas.
- Use high contrast and readable type.
- Avoid covering faces, controls, or essential visuals.
- Split captions at natural phrase boundaries.
- Verify caption timing after every structural edit.
- Provide a separate caption file when the delivery platform supports it.

Burn subtitles into a video:

```bash
ffmpeg -i input.mp4 \
  -vf "subtitles=captions.srt" \
  -c:v libx264 -crf 18 -preset medium \
  -c:a copy \
  captioned.mp4
```

Escape subtitle paths carefully, especially on Windows or when paths contain colons, quotes, or backslashes.

## 9. Final Review and Export

Use Descript, CapCut, another nonlinear editor, or a review render for the final human pass.

Review:

- Narrative clarity and pacing
- Cut continuity and jump cuts
- Lip synchronization
- Dialogue intelligibility
- Music and sound-effect levels
- Caption accuracy and safe placement
- Color and exposure consistency
- Cropping throughout every shot
- Spelling, names, dates, links, and calls to action
- Rights, consent, privacy, and accidental disclosure
- First and last frames
- Expected duration, resolution, frame rate, and audio channels

Create a broadly compatible H.264 export:

```bash
ffmpeg -i master.mp4 \
  -c:v libx264 -preset medium -crf 18 \
  -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  final.mp4
```

Verify the result:

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=index,codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate,channels \
  -of json final.mp4
```

Watch the exported file from beginning to end. A successful command does not guarantee a correct edit.

## Concrete Usage Example

User request:

```text
Turn interview.mp4 into a 60-second vertical Reel. Remove dead air, keep the
speaker's explanation intact, add readable captions, and do not use generated
footage.
```

Recommended response workflow:

1. Inspect `interview.mp4` with `ffprobe`.
2. Create a mono transcription WAV without modifying the source.
3. Transcribe and propose a timestamped EDL.
4. Confirm that the selected excerpts preserve the speaker's meaning.
5. Render accurate cuts with short handles around speech.
6. Assemble and normalize the result to a consistent frame rate.
7. Reframe each shot to 1080x1920, adjusting crop position when the speaker moves.
8. Generate and manually correct an SRT caption file.
9. Burn in captions within safe margins.
10. Normalize dialogue, export H.264/AAC with `faststart`, and inspect the final file.
11. Report the output path, duration, technical properties, and any unresolved review notes.

Example final command after the edit has been assembled and captions reviewed:

```bash
ffmpeg -i assembled.mp4 \
  -vf "crop=ih*9/16:ih,scale=1080:1920,subtitles=captions.srt" \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  interview-reel.mp4
```

If a center crop does not keep the speaker visible, replace it with a reviewed per-shot crop or padded layout before delivery.

## Operating Rules

- Preserve source footage and edit nondestructively.
- Inspect inputs before generating commands.
- Ask for target platform and duration only when they materially affect the edit and cannot be inferred.
- Treat transcript, scene, and silence timestamps as suggestions until verified.
- Explain when a fast stream-copy cut may be imprecise.
- Re-encode mismatched segments before concatenating them.
- Never overwrite source files unless the user explicitly requests it.
- Never expose secrets or embed credentials.
- Do not use external services without user authorization.
- Do not clone voices or likenesses without permission.
- Do not alter context in a way that misrepresents a speaker.
- Verify the complete exported file before declaring the edit finished.
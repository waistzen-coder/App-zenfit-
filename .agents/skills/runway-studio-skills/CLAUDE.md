# Agent Notes

- Always use `uv run scripts/<script>.py` from the repo root.
- Never hardcode API keys. Use `--api-key` or rely on `RUNWAYML_API_SECRET` env var.
- Runway generation is asynchronous: every create call returns a task ID. Poll with `get_task.py --poll` or pass `--poll` to generation scripts (they poll by default).
- Output URLs from completed tasks expire in 24-48 hours. Always download results immediately.
- Do not read generated media files back into the conversation — just report the file paths.
- When generating product ad videos, prefer `seedance2` for its reference image support and longer durations (up to 15s).
- For text-to-video with audio, prefer `veo3.1` — it generates contextual audio automatically.
- Credit costs vary by model and duration. Check `GET /v1/organization` if the user is concerned about spend.

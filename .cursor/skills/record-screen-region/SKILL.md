---
name: record-screen-region
description: >-
  Records a user-selected screen region on Linux/X11 with ffmpeg. Prompts for
  duration, runs the Shutter-like region overlay, then captures that area. Use
  when the user asks to record part of the screen, capture a browser panel,
  record a phone-frame preview, or run the region picker/recording workflow.
---

# Record Screen Region

Record a rectangle from the desktop with ffmpeg after the user draws it on a Shutter-like overlay.

## Scripts

| Script | Role |
|--------|------|
| `scripts/record-screen-region.py` | Entry point: ask duration, run picker, record |
| `scripts/pick-record-region.py` | Overlay picker + optional ffmpeg (called by wrapper) |

Run from the repository root.

## Agent workflow

1. **Ask duration** if the user did not give one.
   - Accept seconds (`75`) or `mm:ss` (`1:30`).
   - Pass it as `--duration`; do not rely on the terminal prompt when the user already answered in chat.

2. **Prepare the scene** when recording app UI (optional but usual here):
   - Open the target page in the Glass browser.
   - Start playback if the capture should show motion.

3. **Run the wrapper in the foreground** (user must drag the region):

```bash
python3 scripts/record-screen-region.py --duration 75
```

Optional output path:

```bash
python3 scripts/record-screen-region.py --duration 75 --output recordings/my-capture.mp4
```

Set `block_until_ms` to at least `(duration_seconds + 90) * 1000`.

4. **Verify** the file exists and is non-empty:

```bash
ffprobe -hide_banner -show_entries format=duration,size -show_entries stream=width,height -of default=noprint_wrappers=1 recordings/<file>.mp4
```

5. **Report** the output path, dimensions, and duration.

## Overlay behavior

- Backend default: `screenshot` (desktop snapshot + dim outside selection).
- User drags a rectangle and **releases the mouse to confirm** (no Enter key needed).
- **Cancel** uses the on-screen Cancel button (keyboard focus often stays in Cursor).
- For live-desktop selection like Shutter: `sudo apt install slop`, then `--backend slop`.

## Requirements

- Linux/X11 (`DISPLAY` set), `ffmpeg`, Python 3, `tkinter`, `Pillow`
- Output defaults to `recordings/capture-YYYYMMDD-HHMMSS.mp4`
- H.264 needs even width/height; the picker rounds down automatically

## Failures

| Symptom | Fix |
|---------|-----|
| Empty or corrupt mp4 | ffmpeg needs even dimensions; re-run with updated picker |
| Black fullscreen overlay | use `screenshot` backend, not alpha-only overlay |
| "Region too small" | drag a larger rectangle (>= 8 px) |
| Recording wrong area | re-run picker; coords come from release position |

## Direct picker (coords only)

```bash
python3 scripts/pick-record-region.py --backend screenshot
```

Add `--record --duration 75 --output recordings/capture.mp4` to record immediately after selection.

---
name: trim-warmup-video
description: >-
  Trim 10pwarmups deck videos under public/videos with ffmpeg, backups, and
  optional move-timestamp shifts. Use when the user asks to trim, chop, cut,
  or remove a start/end segment from a warmup video (A1-H4), or mentions
  trim out / trim off / everything after / everything before on an mp4.
---

# Trim warmup video

## Playbook

1. **Parse the keep window** - never guess keep vs discard.
   - "everything after T" / "trim after T" → keep `[0, T]`
   - "everything before T" / "chop first T" → keep `[T, end]`
   - "trim A to B and C to end, keeping middle" → keep `(A, C)` only after restating
   - Ambiguous phrasing → restate keep interval in seconds and confirm before cutting
2. **Normalize time** - `M:SS:mmm` (colon ms) → `M:SS.mmm`. Echo decimal seconds.
3. **Probe** current `public/videos/<DECK>.mp4` duration with ffprobe.
4. **Backup** (default yes; skip only if user says don't):
   `public/videos/backup/<DECK>-YYYYMMDD-pre-<cut>-{start|end|mid}-trim.mp4`
   Use today's date and the cut point(s) in the name. Prefer `backup/` (singular).
5. **Encode** - for millisecond tagger marks, **re-encode** (do not stop at stream copy):
   ```bash
   # end trim (keep [0, T])
   ffmpeg -y -i public/videos/<DECK>.mp4 -t <T> \
     -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k \
     -movflags +faststart public/videos/<DECK>-trimmed.mp4

   # start trim (keep [T, end]) - put -ss after -i for accuracy
   ffmpeg -y -i public/videos/<DECK>.mp4 -ss <T> \
     -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 128k \
     -movflags +faststart public/videos/<DECK>-trimmed.mp4
   ```
   Then `mv` over `public/videos/<DECK>.mp4`.
6. **Verify** with ffprobe; duration should be within ~1 frame (~0.033s at 30fps) of the keep length.
7. **Timestamps** (`src/data/moveTimestamps.ts`):
   - **Start trim**: subtract T from every non-null mark; clamp below 0 to `0`; leave nulls.
   - **End trim**: leave marks alone if all are `<= T`; otherwise tell the user which marks fall past the cut.
8. **dist** - if `dist/videos/<DECK>.mp4` exists, copy the trimmed file there too.
9. **Report** - deck, keep window, probed duration, backup path, whether timestamps/dist changed.

## Hard lessons (do not repeat)

- Confirm keep vs discard before cutting when language is ambiguous (B3: "keeping middle" was wrong intent).
- Stream copy end cuts land on keyframes; stream copy start cuts can fail to shorten - re-encode for ms cuts.
- After a start trim, later "end at M:SS" times are on the **new** timeline (or cut from the original backup and restate).
- Prefer cutting from a named pre-trim backup when still hunting the window across multiple tries.
- Watch file size on re-encode (crf 18 / preset fast is the project default).

## Non-goals

- Do not invent a GUI trimmer.
- Do not delete backups unless asked (use the Delete tool, never `rm`).
- Do not commit or push video changes unless asked.

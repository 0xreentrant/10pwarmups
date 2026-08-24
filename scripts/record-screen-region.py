#!/usr/bin/env python3
"""Ask duration, run region overlay, record selection with ffmpeg."""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PICKER = REPO_ROOT / "scripts" / "pick-record-region.py"
RECORDINGS = REPO_ROOT / "recordings"


def parse_duration(raw: str) -> float:
    text = raw.strip().lower().rstrip("s")
    if ":" in text:
        minutes, seconds = text.split(":", 1)
        value = int(minutes) * 60 + float(seconds)
    else:
        value = float(text)
    if value <= 0:
        raise ValueError("duration must be positive")
    return value


def prompt_duration() -> float:
    print("Record for how many seconds? (examples: 75, 1:30)", flush=True)
    while True:
        try:
            return parse_duration(input("> "))
        except (ValueError, EOFError):
            print("Enter a positive number, e.g. 75 or 1:30", file=sys.stderr)


def default_output() -> Path:
    RECORDINGS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return RECORDINGS / f"capture-{stamp}.mp4"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Pick a screen region and record it with ffmpeg.",
    )
    parser.add_argument(
        "-d",
        "--duration",
        type=float,
        help="seconds to record (prompts when omitted)",
    )
    parser.add_argument("-o", "--output", help="output mp4 path")
    parser.add_argument(
        "--backend",
        default="screenshot",
        choices=("auto", "slop", "screenshot"),
        help="region picker backend (default: screenshot)",
    )
    parser.add_argument("--fps", type=int, default=30)
    args = parser.parse_args()

    duration = args.duration if args.duration is not None else prompt_duration()
    output = Path(args.output) if args.output else default_output()
    output.parent.mkdir(parents=True, exist_ok=True)

    print(
        "\nRegion picker opening."
        "\n- Drag a rectangle, release to confirm"
        "\n- Cancel with the on-screen Cancel button"
        f"\n- Recording {duration:g}s to {output}\n",
        flush=True,
    )

    cmd = [
        sys.executable,
        str(PICKER),
        "--backend",
        args.backend,
        "--record",
        "--duration",
        str(duration),
        "--output",
        str(output),
        "--fps",
        str(args.fps),
    ]
    code = subprocess.call(cmd)
    if code == 0:
        print(f"\nWrote {output}", flush=True)
    return code


if __name__ == "__main__":
    raise SystemExit(main())

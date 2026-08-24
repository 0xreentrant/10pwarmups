#!/usr/bin/env python3
"""Pick a screen region and print (or run) an ffmpeg x11grab command.

Backends:
  slop       - live desktop, dimmed outside selection (like Shutter). Needs `slop`.
  screenshot - grabs desktop first, dims outside selection on that snapshot.
  auto       - slop if installed, else screenshot.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tkinter as tk
from pathlib import Path
from tkinter import messagebox

from PIL import ImageGrab, ImageTk


def x11grab_display() -> str:
    display = os.environ.get("DISPLAY", ":0")
    if display.startswith(":") and "." not in display[1:]:
        return f"{display}.0"
    return display


def normalize_box(x0: int, y0: int, x1: int, y1: int) -> tuple[int, int, int, int]:
    left = min(x0, x1)
    top = min(y0, y1)
    width = abs(x1 - x0)
    height = abs(y1 - y0)
    return left, top, width, height


def even(n: int) -> int:
    return n - (n % 2)


def ffmpeg_command(
    left: int,
    top: int,
    width: int,
    height: int,
    *,
    display: str,
    fps: int,
    duration: float | None,
    output: str,
) -> str:
    width = even(width)
    height = even(height)
    duration_flag = f" -t {duration}" if duration is not None else ""
    return (
        f"ffmpeg -y -f x11grab -video_size {width}x{height} -framerate {fps}"
        f"{duration_flag} -i {display}+{left},{top} "
        f"-c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p {output}"
    )


def pick_with_slop() -> tuple[int, int, int, int] | None:
    cmd = [
        "slop",
        "-f",
        "%x,%y,%w,%h",
        "-b",
        "2",
        "-c",
        "0.0,0.85,1.0,1.0",
        "-l",
        "0.35,0.35,0.35,0.65",
    ]
    try:
        completed = subprocess.run(cmd, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return None

    if completed.returncode != 0:
        return None

    parts = completed.stdout.strip().split(",")
    if len(parts) != 4:
        return None

    left, top, width, height = (int(part) for part in parts)
    if width < 2 or height < 2:
        return None
    return left, top, width, height


class ScreenshotRegionPicker:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.withdraw()

        self.vx = self.root.winfo_vrootx()
        self.vy = self.root.winfo_vrooty()
        self.vw = self.root.winfo_vrootwidth()
        self.vh = self.root.winfo_vrootheight()

        screenshot = ImageGrab.grab(bbox=(self.vx, self.vy, self.vx + self.vw, self.vy + self.vh))
        self.photo = ImageTk.PhotoImage(screenshot)

        self.overlay = tk.Toplevel(self.root)
        self.overlay.overrideredirect(True)
        self.overlay.attributes("-topmost", True)
        self.overlay.geometry(f"{self.vw}x{self.vh}+{self.vx}+{self.vy}")

        self.canvas = tk.Canvas(
            self.overlay,
            width=self.vw,
            height=self.vh,
            highlightthickness=0,
            cursor="crosshair",
        )
        self.canvas.pack(fill="both", expand=True)
        self.canvas.create_image(0, 0, anchor="nw", image=self.photo)

        self.hud = tk.Label(
            self.overlay,
            text="Drag to select  |  release to confirm  |  Cancel button or Esc",
            font=("DejaVu Sans Mono", 13, "bold"),
            fg="#ffffff",
            bg="#111111",
            padx=12,
            pady=8,
        )
        self.hud.place(x=16, y=16)

        btn_frame = tk.Frame(self.overlay, bg="#111111")
        btn_frame.place(relx=0.5, rely=1.0, anchor="s", y=-24)
        tk.Button(
            btn_frame,
            text="Cancel",
            command=self.cancel,
            padx=16,
            pady=8,
        ).pack(side="left", padx=8)
        self.confirm_btn = tk.Button(
            btn_frame,
            text="Confirm selection",
            command=self.confirm,
            padx=16,
            pady=8,
            state="disabled",
        )
        self.confirm_btn.pack(side="left", padx=8)

        self.selection: tuple[int, int, int, int] | None = None
        self.drag_start: tuple[int, int] | None = None
        self.shade_ids: list[int] = []
        self.rect_id: int | None = None
        self.size_id: int | None = None

        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.focus_set()
        self.bind_keys()

    def bind_keys(self) -> None:
        for sequence in ("<Escape>", "<Return>", "<KP_Enter>"):
            self.root.bind_all(sequence, self.on_key, add="+")

    def unbind_keys(self) -> None:
        for sequence in ("<Escape>", "<Return>", "<KP_Enter>"):
            self.root.unbind_all(sequence)

    def on_key(self, event: tk.Event) -> str | None:
        if event.keysym == "Escape":
            self.cancel()
            return "break"
        if event.keysym in ("Return", "KP_Enter"):
            self.confirm()
            return "break"
        return None

    def screen_coords(self, event: tk.Event) -> tuple[int, int]:
        return int(event.x_root), int(event.y_root)

    def set_hud(self, text: str) -> None:
        self.hud.configure(text=text)

    def clear_overlay(self) -> None:
        for item_id in self.shade_ids:
            self.canvas.delete(item_id)
        self.shade_ids.clear()
        if self.rect_id is not None:
            self.canvas.delete(self.rect_id)
            self.rect_id = None
        if self.size_id is not None:
            self.canvas.delete(self.size_id)
            self.size_id = None

    def draw_selection(self, left: int, top: int, width: int, height: int) -> None:
        self.clear_overlay()

        cx0 = left - self.vx
        cy0 = top - self.vy
        cx1 = cx0 + width
        cy1 = cy0 + height

        shade = dict(fill="black", stipple="gray50", outline="")
        self.shade_ids = [
            self.canvas.create_rectangle(0, 0, self.vw, cy0, **shade),
            self.canvas.create_rectangle(0, cy0, cx0, cy1, **shade),
            self.canvas.create_rectangle(cx1, cy0, self.vw, cy1, **shade),
            self.canvas.create_rectangle(0, cy1, self.vw, self.vh, **shade),
        ]
        self.rect_id = self.canvas.create_rectangle(
            cx0,
            cy0,
            cx1,
            cy1,
            outline="#00d4ff",
            width=2,
        )
        self.size_id = self.canvas.create_text(
            min(cx0 + 8, self.vw - 8),
            max(cy0 - 10, 48),
            anchor="sw",
            text=f"{width} x {height}   @ {left}, {top}",
            fill="#00d4ff",
            font=("DejaVu Sans Mono", 12, "bold"),
        )
        self.hud.lift()

    def start_drag_tracking(self) -> None:
        self.root.bind_all("<B1-Motion>", self.on_drag, add="+")
        self.root.bind_all("<ButtonRelease-1>", self.on_release, add="+")

    def stop_drag_tracking(self) -> None:
        self.root.unbind_all("<B1-Motion>")
        self.root.unbind_all("<ButtonRelease-1>")

    def apply_box(self, left: int, top: int, width: int, height: int, *, ready: bool) -> None:
        self.selection = (left, top, width, height)
        self.draw_selection(left, top, width, height)
        if ready:
            self.confirm_btn.configure(state="normal")
            self.set_hud(
                f"Selected {width}x{height} at ({left}, {top})  |  release or click Confirm  |  Cancel or Esc"
            )
        else:
            self.confirm_btn.configure(state="disabled")
            self.set_hud(
                f"Dragging {width}x{height} at ({left}, {top})"
            )

    def on_press(self, event: tk.Event) -> None:
        self.selection = None
        self.confirm_btn.configure(state="disabled")
        self.drag_start = self.screen_coords(event)
        self.clear_overlay()
        self.start_drag_tracking()
        self.canvas.focus_set()

    def on_drag(self, event: tk.Event) -> None:
        if self.drag_start is None:
            return

        x0, y0 = self.drag_start
        x1, y1 = self.screen_coords(event)
        left, top, width, height = normalize_box(x0, y0, x1, y1)
        if width < 8 or height < 8:
            return

        self.apply_box(left, top, width, height, ready=False)

    def on_release(self, event: tk.Event) -> None:
        self.stop_drag_tracking()
        if self.drag_start is None:
            return

        x0, y0 = self.drag_start
        x1, y1 = self.screen_coords(event)
        left, top, width, height = normalize_box(x0, y0, x1, y1)
        self.drag_start = None

        if width < 8 or height < 8:
            self.clear_overlay()
            self.selection = None
            self.confirm_btn.configure(state="disabled")
            self.set_hud("Drag a larger region  |  Cancel button or Esc")
            return

        self.apply_box(left, top, width, height, ready=True)
        self.confirm()

    def cancel(self, _event: tk.Event | None = None) -> None:
        self.stop_drag_tracking()
        self.unbind_keys()
        self.selection = None
        self.root.quit()

    def confirm(self, _event: tk.Event | None = None) -> None:
        if self.selection is None:
            return
        self.stop_drag_tracking()
        self.unbind_keys()
        self.root.quit()

    def run(self) -> tuple[int, int, int, int] | None:
        try:
            self.root.mainloop()
        finally:
            self.unbind_keys()
        region = self.selection
        self.root.destroy()
        return region


def pick_region(backend: str) -> tuple[int, int, int, int] | None:
    if backend == "slop":
        region = pick_with_slop()
        if region is None:
            print("slop failed or was cancelled", file=sys.stderr)
        return region

    if backend == "auto" and shutil.which("slop"):
        region = pick_with_slop()
        if region is not None:
            return region
        print("slop unavailable at runtime, falling back to screenshot picker", file=sys.stderr)

    return ScreenshotRegionPicker().run()


def run_ffmpeg(command: str) -> int:
    print(f"running: {command}", file=sys.stderr)
    return subprocess.call(command, shell=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Draw a screen region and print ffmpeg x11grab coordinates.",
    )
    parser.add_argument(
        "--backend",
        choices=("auto", "slop", "screenshot"),
        default="auto",
        help="auto tries slop first, else desktop screenshot overlay",
    )
    parser.add_argument("--fps", type=int, default=30, help="fps for generated ffmpeg command")
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        help="seconds for generated ffmpeg command (-t)",
    )
    parser.add_argument(
        "--output",
        default=str(Path.home() / "Downloads" / "capture.mp4"),
        help="output path for generated ffmpeg command",
    )
    parser.add_argument(
        "--record",
        action="store_true",
        help="run ffmpeg immediately after a region is selected",
    )
    args = parser.parse_args()

    if args.backend == "slop" and not shutil.which("slop"):
        messagebox.showerror(
            "slop not installed",
            "Install slop for live-desktop selection:\n  sudo apt install slop",
        )
        return 1

    region = pick_region(args.backend)
    if region is None:
        print("cancelled", file=sys.stderr)
        return 1

    left, top, width, height = region
    display = x11grab_display()
    command = ffmpeg_command(
        left,
        top,
        width,
        height,
        display=display,
        fps=args.fps,
        duration=args.duration,
        output=args.output,
    )

    print(f"left={left}")
    print(f"top={top}")
    print(f"width={width}")
    print(f"height={height}")
    print(f"region={left},{top},{width},{height}")
    print()
    print(command)

    if args.record:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        return run_ffmpeg(command)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

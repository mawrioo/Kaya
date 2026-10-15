"""Turn the isolated sample-data browser capture into Kaya's short portfolio demo.

Run from the repository with Python and Pillow installed. FFmpeg is discovered
in .nb-test/media-tools, or can be supplied with --ffmpeg. All inputs are local.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
WIDTH, HEIGHT, FPS = 1920, 1080, 30
APP_WIDTH, APP_HEIGHT = 1536, 960
CREAM = "#EDE5D7"
FOREST = "#1F3D2B"
PAPER = "#F7F2E7"
MUTED = "#536056"
SAGE = "#CBD7C8"
TITLE_SECONDS, END_SECONDS = 2.5, 2.0


def font(size: int, *, serif: bool = False) -> ImageFont.FreeTypeFont:
    name = "SourceSerif4.ttf" if serif else "Inter.ttf"
    return ImageFont.truetype(str(ROOT / "frontend/app/fonts" / name), size)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int,
             face: ImageFont.FreeTypeFont, fill: str) -> None:
    draw.text((WIDTH / 2, y), text, font=face, fill=fill, anchor="mt")


def make_title(path: Path) -> None:
    card = Image.new("RGB", (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(card)
    centered(draw, "Kaya", 275, font(140, serif=True), FOREST)
    centered(draw, "Everyday money, a little clearer.", 470,
             font(60, serif=True), FOREST)
    draw.line((650, 595, 1270, 595), fill="#CBC5B7", width=2)
    centered(draw, "BCA · Bank Jago · Superbank · Pluang", 640, font(32), MUTED)
    centered(draw, "Fictional sample data", 770, font(24), MUTED)
    card.save(path)


def make_ending(path: Path) -> None:
    card = Image.new("RGB", (WIDTH, HEIGHT), FOREST)
    draw = ImageDraw.Draw(card)
    centered(draw, "Know what you have.", 330, font(80, serif=True), PAPER)
    centered(draw, "See where it goes.", 440, font(80, serif=True), PAPER)
    draw.line((760, 605, 1160, 605), fill="#6F8674", width=2)
    centered(draw, "Kaya · Local personal finance", 660, font(32), SAGE)
    card.save(path)


def make_footer(path: Path, label: str, subtitle: str) -> None:
    footer = Image.new("RGB", (WIDTH, HEIGHT - APP_HEIGHT), FOREST)
    draw = ImageDraw.Draw(footer)
    draw.line((0, 0, WIDTH, 0), fill="#6F8674", width=1)
    left, right = (WIDTH - APP_WIDTH) // 2, WIDTH - (WIDTH - APP_WIDTH) // 2
    heading = font(37, serif=True)
    detail = font(24)
    badge = font(18)
    badge_text = "FICTIONAL SAMPLE DATA"
    available = right - left - draw.textlength(badge_text, font=badge) - 72
    if max(draw.textlength(label, font=heading), draw.textlength(subtitle, font=detail)) > available:
        raise ValueError(f"Caption is too long to display clearly: {label!r}")
    draw.text((left, 15), label, font=heading, fill=PAPER, anchor="lt")
    draw.text((left, 69), subtitle, font=detail, fill=SAGE, anchor="lt")
    draw.text((right, 51), badge_text, font=badge, fill=SAGE, anchor="rt")
    footer.save(path)


def find_ffmpeg(override: str | None) -> Path:
    if override:
        binary = Path(override).resolve()
        if not binary.is_file():
            raise FileNotFoundError(f"FFmpeg does not exist: {binary}")
        return binary
    bundle = ROOT / ".nb-test/media-tools/imageio_ffmpeg/binaries"
    candidates = sorted(bundle.glob("ffmpeg*.exe"))
    if candidates:
        return candidates[0]
    installed = shutil.which("ffmpeg")
    if installed:
        return Path(installed)
    raise FileNotFoundError("FFmpeg was not found in .nb-test/media-tools; supply --ffmpeg.")


def run_ffmpeg(binary: Path, arguments: list[str]) -> None:
    result = subprocess.run(
        [str(binary), "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *arguments],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if result.returncode:
        message = result.stderr[-6000:] or result.stdout[-6000:]
        raise RuntimeError(f"FFmpeg failed ({result.returncode}):\n{message}")


def encoding() -> list[str]:
    return [
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", str(FPS), "-threads", "4",
        "-video_track_timescale", "90000", "-movflags", "+faststart",
    ]


def encode_card(binary: Path, image: Path, output: Path, seconds: float) -> None:
    run_ffmpeg(binary, [
        "-loop", "1", "-framerate", str(FPS), "-i", str(image),
        "-vf", "setsar=1", "-frames:v", str(round(seconds * FPS)),
        *encoding(), str(output),
    ])


def inspect_duration(binary: Path, output: Path) -> float:
    # The imageio bundle contains FFmpeg but does not require a separate ffprobe.
    result = subprocess.run(
        [str(binary), "-hide_banner", "-i", str(output)],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    found = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not found:
        raise RuntimeError("Could not read the rendered video's duration.")
    hours, minutes, seconds = (float(value) for value in found.groups())
    return hours * 3600 + minutes * 60 + seconds


def render(args: argparse.Namespace) -> None:
    metadata_path = args.metadata.resolve()
    metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    raw = Path(metadata["raw"]).resolve()
    if not raw.is_file():
        raise FileNotFoundError(f"Browser recording is missing: {raw}")
    scenes = metadata.get("scenes", [])
    if not scenes:
        raise ValueError("Capture metadata has no scenes.")
    if metadata.get("errors"):
        raise ValueError("The capture reports browser errors; review them before rendering.")
    viewport = metadata.get("viewport", {})
    if viewport.get("width") != 1440 or viewport.get("height") != 900:
        raise ValueError("This layout expects the captured viewport to be 1440 × 900.")
    if not 35 <= args.target_seconds <= 45:
        raise ValueError("The short demo must be between 35 and 45 seconds.")
    previous_end = 0.0
    durations = []
    for scene in scenes:
        start, end = float(scene["start"]), float(scene["end"])
        if not all(math.isfinite(value) for value in (start, end)) or start < previous_end or end <= start:
            raise ValueError(f"Invalid or overlapping scene times: {scene!r}")
        if not scene.get("label") or not scene.get("subtitle"):
            raise ValueError("Every scene needs a heading and a subtitle.")
        durations.append(end - start)
        previous_end = end

    binary = find_ffmpeg(args.ffmpeg)
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    render_root = ROOT / ".nb-test/portfolio-media/render"
    render_root.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix="run-", dir=render_root)).resolve()

    # Hold the last frame briefly when the footage is short, keeping interactions
    # at their recorded speed. Longer captures are sped up uniformly to fit.
    scene_seconds = args.target_seconds - TITLE_SECONDS - END_SECONDS
    total_footage = sum(durations)
    speed = max(1.0, total_footage / scene_seconds)
    pause = max(0.0, scene_seconds - total_footage) / len(scenes)
    frames = [round((duration / speed + pause) * FPS) for duration in durations]
    frames[-1] += round(scene_seconds * FPS) - sum(frames)
    if min(frames) < 1:
        raise ValueError("A scene is too short to fit in the requested duration.")

    try:
        title_image, end_image = work / "title.png", work / "ending.png"
        make_title(title_image)
        make_ending(end_image)
        segments = [work / "00-title.mp4"]
        print("Rendering title card…", flush=True)
        encode_card(binary, title_image, segments[0], TITLE_SECONDS)

        for index, (scene, duration, frame_count) in enumerate(zip(scenes, durations, frames), start=1):
            print(f"Rendering scene {index}/{len(scenes)}: {scene['label']}", flush=True)
            footer, segment = work / f"footer-{index:02d}.png", work / f"{index:02d}-scene.mp4"
            make_footer(footer, scene["label"], scene["subtitle"])
            hold = max(0.0, frame_count / FPS - duration / speed) + 1 / FPS
            filters = (
                f"[0:v]setpts=(PTS-STARTPTS)/{speed:.9f},fps={FPS},"
                f"scale={APP_WIDTH}:{APP_HEIGHT}:flags=lanczos,setsar=1,"
                f"pad={WIDTH}:{HEIGHT}:{(WIDTH - APP_WIDTH) // 2}:0:color={CREAM},"
                f"tpad=stop_mode=clone:stop_duration={hold:.6f}[app];"
                f"[app][1:v]overlay=0:{APP_HEIGHT}:shortest=1,format=yuv420p[out]"
            )
            run_ffmpeg(binary, [
                "-ss", f"{float(scene['start']):.6f}", "-t", f"{duration:.6f}", "-i", str(raw),
                "-loop", "1", "-framerate", str(FPS), "-i", str(footer),
                "-filter_complex", filters, "-map", "[out]", "-frames:v", str(frame_count),
                *encoding(), str(segment),
            ])
            segments.append(segment)

        ending = work / f"{len(scenes) + 1:02d}-ending.mp4"
        print("Rendering end card…", flush=True)
        encode_card(binary, end_image, ending, END_SECONDS)
        segments.append(ending)

        # Relative filenames avoid Windows drive-letter and quoting problems.
        manifest = work / "segments.txt"
        manifest.write_text("".join(f"file '{part.name}'\n" for part in segments), encoding="utf-8")
        assembled = work / "kaya-demo.mp4"
        print("Assembling the demo…", flush=True)
        run_ffmpeg(binary, [
            "-f", "concat", "-safe", "1", "-i", str(manifest), "-c", "copy",
            "-an", "-movflags", "+faststart", str(assembled),
        ])
        duration = inspect_duration(binary, assembled)
        if abs(duration - args.target_seconds) > 0.15 or not 35 <= duration <= 45:
            raise RuntimeError(f"Unexpected final duration: {duration:.3f} seconds.")
        # Publish only after a complete, validated render; keep older output on failure.
        shutil.copyfile(assembled, output)
        size_mb = output.stat().st_size / (1024 * 1024)
        timeline = [{"label": "Title", "start": 0.0, "end": TITLE_SECONDS}]
        cursor = TITLE_SECONDS
        for scene, frame_count in zip(scenes, frames):
            next_time = cursor + frame_count / FPS
            timeline.append({
                "label": scene["label"], "subtitle": scene["subtitle"],
                "start": round(cursor, 6), "end": round(next_time, 6),
                "sourceStart": scene["start"], "sourceEnd": scene["end"],
                "playbackSpeed": round(speed, 6),
            })
            cursor = next_time
        timeline.append({"label": "End card", "start": round(cursor, 6), "end": duration})
        manifest_output = metadata_path.parent / "render.json"
        manifest_output.write_text(json.dumps({
            "output": str(output), "duration": duration, "sizeBytes": output.stat().st_size,
            "width": WIDTH, "height": HEIGHT, "fps": FPS, "silent": True,
            "scenes": timeline, "sample": metadata.get("sample"),
        }, indent=2) + "\n", encoding="utf-8")
        print(f"Saved {output}\n{duration:.2f} seconds · {size_mb:.2f} MiB · 1920×1080 · 30 fps · silent")
        print(f"Timing manifest: {manifest_output}")
    except Exception:
        print(f"Render files kept for inspection: {work}", file=sys.stderr)
        raise
    else:
        # Only this run's verified directory inside the disposable workspace is removed.
        if work.is_relative_to(render_root.resolve()) and work != render_root.resolve():
            shutil.rmtree(work)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata", type=Path, default=ROOT / ".nb-test/portfolio-media/capture.json")
    parser.add_argument("--output", type=Path, default=ROOT / "docs/portfolio/kaya-demo.mp4")
    parser.add_argument("--target-seconds", type=float, default=38.0)
    parser.add_argument("--ffmpeg", help="Path to the full FFmpeg executable")
    args = parser.parse_args()
    try:
        render(args)
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        parser.exit(1, f"Render failed: {error}\n")


if __name__ == "__main__":
    main()

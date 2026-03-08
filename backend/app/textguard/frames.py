import os
import subprocess
import glob


def extract_frames(video_path: str, frames_dir: str, fps: int = 1):
    """Extract frames from video at specified fps."""
    os.makedirs(frames_dir, exist_ok=True)
    output_pattern = os.path.join(frames_dir, "%04d.jpg")
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"fps={fps}",
        output_pattern
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return sorted(glob.glob(os.path.join(frames_dir, "*.jpg")))

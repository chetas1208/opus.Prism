import os
import subprocess
import glob
import cv2
import numpy as np


def _overlay_text(frame: np.ndarray, text: str) -> np.ndarray:
    """Draw centred white text with a dark background bar on the bottom of a frame."""
    h, w = frame.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = min(w, h) / 600.0
    thickness = max(1, int(font_scale * 2))

    (tw, th), baseline = cv2.getTextSize(text, font, font_scale, thickness)

    bar_y1 = h - th - baseline - 30
    bar_y2 = h
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, bar_y1), (w, bar_y2), (0, 0, 0), -1)
    frame = cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)

    text_x = (w - tw) // 2
    text_y = h - baseline - 15
    cv2.putText(frame, text, (text_x, text_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)
    return frame


def create_patched_video(video_path: str, expected_data: list, output_path: str):
    """Create a patched video with expected text overlaid using OpenCV + ffmpeg."""
    try:
        if not expected_data:
            subprocess.run(
                ["ffmpeg", "-y", "-i", video_path, "-c", "copy", output_path],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
            )
            return

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print("[TextGuard Patch] Cannot open video")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        tmp_dir = os.path.dirname(output_path)
        raw_path = os.path.join(tmp_dir, "_patched_raw.mp4")

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(raw_path, fourcc, fps, (w, h))

        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            t = frame_idx / fps
            text_to_show = ""
            for seg in expected_data:
                if seg.get("t_start", 0) <= t < seg.get("t_end", 0):
                    text_to_show = seg.get("text", "")
                    break

            if text_to_show:
                frame = _overlay_text(frame, text_to_show)

            writer.write(frame)
            frame_idx += 1

        cap.release()
        writer.release()

        subprocess.run(
            ["ffmpeg", "-y", "-i", raw_path, "-c:v", "libx264", "-pix_fmt", "yuv420p", output_path],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True,
        )
        os.remove(raw_path)

    except Exception as e:
        print(f"[TextGuard Patch] Error: {e}")
        import traceback
        traceback.print_exc()

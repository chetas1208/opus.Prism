import subprocess


def create_patched_video(video_path: str, expected_data: list, output_path: str):
    """Create a patched video with expected text overlaid using ffmpeg drawtext."""
    try:
        filters = []
        for segment in expected_data:
            t_start = segment.get("t_start", 0)
            t_end = segment.get("t_end", 0)
            text = segment.get("text", "").replace("'", "\\'").replace(":", "\\:")
            if text:
                filters.append(
                    f"drawtext=text='{text}':"
                    f"enable='between(t,{t_start},{t_end})':"
                    f"x=(w-text_w)/2:y=h-th-20:"
                    f"fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5"
                )

        if filters:
            cmd = ["ffmpeg", "-y", "-i", video_path, "-vf", ",".join(filters), output_path]
        else:
            cmd = ["ffmpeg", "-y", "-i", video_path, "-c", "copy", output_path]

        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception as e:
        print(f"[TextGuard Patch] Error: {e}")

import os
import json

from .frames import extract_frames
from .ocr import get_ocr_engine
from .compare import compare_text
from ..llm.router import qa_verdict
from .patch import create_patched_video


def update_status(job_path: str, status: str, progress: int, message: str):
    with open(os.path.join(job_path, "status.json"), "w") as f:
        json.dump({"status": status, "progress": progress, "message": message}, f)


async def run_textguard(
    job_id: str,
    job_path: str,
    video_path: str,
    expected_data: list,
    variant_id: str = "",
    fps: int = 1,
    do_patch: bool = True,
):
    """Run the full TextGuard QA pipeline on a video."""
    try:
        update_status(job_path, "running", 10, "Extracting frames...")

        frames_dir = os.path.join(job_path, "frames")
        frame_files = extract_frames(video_path, frames_dir, fps)
        total_frames = len(frame_files)

        reports = []
        issues_found = 0
        overall_similarity = 0.0

        update_status(job_path, "running", 30, f"Processing {total_frames} frames...")

        for i, frame_file in enumerate(frame_files):
            t = float(i) / fps

            expected_text = ""
            for seg in expected_data:
                if seg.get("t_start", 0) <= t < seg.get("t_end", 0):
                    expected_text = seg.get("text", "")
                    break

            ocr_engine = get_ocr_engine()
            detected_text = ocr_engine(frame_file)

            sim_score = compare_text(expected_text, detected_text) if expected_text else (100.0 if not detected_text else 0.0)
            overall_similarity += sim_score
            is_match = sim_score >= 75.0

            verdict = None
            if not is_match and expected_text:
                pct = 30 + int(60 * (i / total_frames))
                update_status(job_path, "running", pct, f"InternVL2 checking frame {i+1}/{total_frames}...")
                verdict = await qa_verdict(frame_file, expected_text, detected_text)
                if verdict and not verdict.get("match", False):
                    issues_found += 1
                elif not verdict:
                    issues_found += 1

            reports.append({
                "timestamp_sec": round(t, 1),
                "frame_file": os.path.basename(frame_file),
                "expected_text": expected_text,
                "detected_text": detected_text,
                "similarity_score": round(sim_score, 1),
                "is_match": is_match,
                "verdict": verdict,
            })

        patched_path = os.path.join(job_path, "patched.mp4")
        if do_patch:
            update_status(job_path, "running", 90, "Generating patched video...")
            create_patched_video(video_path, expected_data, patched_path)

        final_score = (overall_similarity / total_frames) if total_frames > 0 else 0
        qa_report = {
            "variant_id": variant_id,
            "overall_score": round(final_score, 1),
            "frames_checked": total_frames,
            "issues_found": issues_found,
            "frames": reports,
        }

        with open(os.path.join(job_path, "qa_report.json"), "w") as f:
            json.dump(qa_report, f, indent=2)

        update_status(job_path, "done", 100, "QA complete")

    except Exception as e:
        print(f"[TextGuard] Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        update_status(job_path, "error", 0, str(e))

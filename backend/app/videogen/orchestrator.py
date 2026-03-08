"""
Video generation orchestrator.

Builds T2V prompts from VariantPack scene data and delegates to the
configured provider (currently Wan2.1).
"""

import os
import json
import time
from typing import Optional


PROJECTS_DIR = "projects"


def _is_enabled() -> bool:
    return os.getenv("ENABLE_VIDEO_GEN", "false").lower() == "true"


def _provider() -> str:
    return os.getenv("VIDEO_GEN_PROVIDER", "wan21")


def _build_prompt_from_variant(variant_pack: dict) -> str:
    """
    Concatenate scene visual_prompts into a single T2V prompt.

    Uses separator markers so the model treats it as a progression of visuals.
    Falls back to the voiceover if no visual prompts exist.
    """
    scenes = variant_pack.get("scenes", [])
    visual_parts = []

    for i, scene in enumerate(scenes, 1):
        vp = scene.get("visual_prompt", "").strip()
        if vp:
            visual_parts.append(f"Scene {i}: {vp}")

    if visual_parts:
        prompt = " | ".join(visual_parts)
    else:
        prompt = variant_pack.get("script", {}).get("voiceover", "")

    audience = variant_pack.get("audience", "")
    platform = variant_pack.get("platform", "")
    style = variant_pack.get("style_tokens", {})
    visual_style = style.get("visual_style", "")
    pacing = style.get("pacing", "")

    style_suffix_parts = [p for p in [visual_style, pacing, f"{platform} style" if platform else ""] if p]
    if style_suffix_parts:
        prompt += f". Style: {', '.join(style_suffix_parts)}."
    if audience:
        prompt += f" Target audience: {audience}."

    return prompt


def _output_dir(project_id: str, variant_id: str) -> str:
    d = os.path.join(PROJECTS_DIR, project_id, "videogen", variant_id)
    os.makedirs(d, exist_ok=True)
    return d


def _output_path(project_id: str, variant_id: str) -> str:
    return os.path.join(_output_dir(project_id, variant_id), "generated.mp4")


def _metadata_path(project_id: str, variant_id: str) -> str:
    return os.path.join(_output_dir(project_id, variant_id), "metadata.json")


def get_generated_video_path(project_id: str, variant_id: str) -> Optional[str]:
    """Return the path to a previously generated video, or None."""
    p = _output_path(project_id, variant_id)
    return p if os.path.exists(p) else None


def generate_video_for_variant(
    project_id: str,
    variant_id: str,
    variant_pack: dict,
    mode: str = "full_variant",
) -> str:
    """
    Build a T2V prompt from the variant and run generation.

    Args:
        mode: "full_variant" joins all scene prompts; "first_scene_only" uses scene 1.

    Returns the path to the generated mp4.
    """
    if not _is_enabled():
        raise RuntimeError(
            "Video generation is disabled. Set ENABLE_VIDEO_GEN=true in .env to enable."
        )

    provider = _provider()
    if provider != "wan21":
        raise RuntimeError(f"Unknown VIDEO_GEN_PROVIDER: {provider}. Only 'wan21' is supported.")

    if mode == "first_scene_only":
        scenes = variant_pack.get("scenes", [])
        if scenes:
            first_prompt = scenes[0].get("visual_prompt", "").strip()
            if not first_prompt:
                first_prompt = scenes[0].get("narration", "A dynamic video introduction.")
            prompt = first_prompt
        else:
            prompt = variant_pack.get("script", {}).get("voiceover", "A product showcase video.")
    else:
        prompt = _build_prompt_from_variant(variant_pack)

    if not prompt.strip():
        prompt = "A professional product showcase video with dynamic transitions."

    out_path = _output_path(project_id, variant_id)

    from .wan21 import generate_video
    meta = generate_video(prompt=prompt, output_path=out_path)

    meta["project_id"] = project_id
    meta["variant_id"] = variant_id
    meta["mode"] = mode
    meta["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    with open(_metadata_path(project_id, variant_id), "w") as f:
        json.dump(meta, f, indent=2)

    return out_path


async def run_videogen_job(
    job_id: str,
    job_path: str,
    project_id: str,
    variant_id: str,
    variant_pack: dict,
    mode: str = "full_variant",
):
    """Background task wrapper for video generation with status updates."""
    def update_status(status: str, progress: int, message: str):
        with open(os.path.join(job_path, "status.json"), "w") as f:
            json.dump({"status": status, "progress": progress, "message": message}, f)

    try:
        update_status("running", 10, "Building T2V prompt from variant scenes...")
        update_status("running", 20, "Loading Wan2.1 model (first run downloads weights)...")

        out_path = generate_video_for_variant(project_id, variant_id, variant_pack, mode)

        update_status("done", 100, f"Video generated: {os.path.basename(out_path)}")

    except Exception as e:
        print(f"[VideoGen] Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        update_status("error", 0, str(e))

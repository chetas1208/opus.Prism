"""
Wan2.1 Text-to-Video inference via Diffusers.

Loads the model lazily on first call and caches it for subsequent requests.
All settings are driven by env vars with sensible defaults from the Wan2.1 model card.
"""

import os
import time
import torch
from typing import Optional

_pipe = None


def _get_device() -> str:
    return os.getenv("WAN21_DEVICE", "cuda")


def _get_torch_dtype():
    dt = os.getenv("WAN21_TORCH_DTYPE", "bfloat16").lower()
    return {"bfloat16": torch.bfloat16, "float16": torch.float16, "float32": torch.float32}.get(dt, torch.bfloat16)


def _load_pipeline():
    """Lazy-load the Wan2.1 Diffusers pipeline (heavy — ~3-6 GB VRAM for 1.3B)."""
    global _pipe
    if _pipe is not None:
        return _pipe

    device = _get_device()
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError(
            "Wan2.1 video generation requires a CUDA GPU. "
            "Set ENABLE_VIDEO_GEN=false or run on a machine with a CUDA GPU."
        )

    from diffusers import AutoencoderKLWan, WanPipeline

    model_id = os.getenv("WAN21_MODEL_ID", "Wan-AI/Wan2.1-T2V-1.3B-Diffusers")
    compute_dtype = _get_torch_dtype()

    print(f"[Wan2.1] Loading model {model_id} on {device} ({compute_dtype}) ...")
    t0 = time.time()

    vae = AutoencoderKLWan.from_pretrained(model_id, subfolder="vae", torch_dtype=torch.float32)
    _pipe = WanPipeline.from_pretrained(model_id, vae=vae, torch_dtype=compute_dtype)
    _pipe.to(device)

    print(f"[Wan2.1] Model loaded in {time.time() - t0:.1f}s")
    return _pipe


def get_default_negative_prompt() -> str:
    return os.getenv(
        "WAN21_NEGATIVE_PROMPT",
        "Bright tones, overexposed, static, blurry details, subtitles, style, works, "
        "paintings, images, static, overall gray, worst quality, low quality, JPEG artifacts, "
        "ugly, incomplete, extra fingers, poorly drawn hands, poorly drawn faces, deformed, "
        "disfigured, misshapen limbs, fused fingers, still picture, messy background, "
        "three legs, many people in the background, walking backwards"
    )


def generate_video(
    prompt: str,
    output_path: str,
    negative_prompt: Optional[str] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
    num_frames: Optional[int] = None,
    guidance_scale: Optional[float] = None,
    fps: Optional[int] = None,
    seed: Optional[int] = None,
) -> dict:
    """
    Run Wan2.1 T2V inference and export to mp4.

    Returns a dict with generation metadata (timings, parameters used).
    """
    pipe = _load_pipeline()

    w = width or int(os.getenv("WAN21_WIDTH", "832"))
    h = height or int(os.getenv("WAN21_HEIGHT", "480"))
    nf = num_frames or int(os.getenv("WAN21_NUM_FRAMES", "81"))
    gs = guidance_scale or float(os.getenv("WAN21_GUIDANCE_SCALE", "5.0"))
    out_fps = fps or int(os.getenv("WAN21_FPS", "15"))
    s = seed if seed is not None else int(os.getenv("WAN21_SEED", "42"))
    neg = negative_prompt if negative_prompt is not None else get_default_negative_prompt()

    generator = torch.Generator(device=_get_device()).manual_seed(s)

    print(f"[Wan2.1] Generating {w}x{h}, {nf} frames, gs={gs}, seed={s} ...")
    t0 = time.time()

    output = pipe(
        prompt=prompt,
        negative_prompt=neg,
        height=h,
        width=w,
        num_frames=nf,
        guidance_scale=gs,
        generator=generator,
    )

    gen_time = time.time() - t0
    print(f"[Wan2.1] Generation completed in {gen_time:.1f}s")

    from diffusers.utils import export_to_video

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    export_to_video(output.frames[0], output_path, fps=out_fps)
    print(f"[Wan2.1] Exported to {output_path}")

    return {
        "prompt": prompt,
        "negative_prompt": neg,
        "width": w,
        "height": h,
        "num_frames": nf,
        "guidance_scale": gs,
        "fps": out_fps,
        "seed": s,
        "generation_time_sec": round(gen_time, 1),
        "output_path": output_path,
    }

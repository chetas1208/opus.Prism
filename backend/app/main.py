import os
from dotenv import load_dotenv

load_dotenv()

import json
import uuid

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional, Tuple

from .schemas import (
    ProjectCreateRequest, ProjectResponse, JobResponse,
    ChatRequest, ChatResponse
)
from .personacut.agents import run_pipeline
from .textguard.orchestrator import run_textguard
import httpx

app = FastAPI(title="PersonaCut + TextGuard API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS_DIR = "projects"
JOBS_DIR = "jobs"
os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(JOBS_DIR, exist_ok=True)


def _create_job(project_id: Optional[str] = None) -> Tuple[str, str]:
    """Create a job directory and return (job_id, job_path)."""
    job_id = str(uuid.uuid4())
    job_path = os.path.join(JOBS_DIR, job_id)
    os.makedirs(job_path, exist_ok=True)

    with open(os.path.join(job_path, "status.json"), "w") as f:
        json.dump({"status": "queued", "progress": 0, "message": "Job created"}, f)

    if project_id:
        with open(os.path.join(job_path, "project_id.txt"), "w") as f:
            f.write(project_id)

    return job_id, job_path


# ══════════════════════════════════════════════
# PersonaCut Endpoints
# ══════════════════════════════════════════════

@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(req: ProjectCreateRequest, background_tasks: BackgroundTasks):
    project_id = str(uuid.uuid4())
    project_path = os.path.join(PROJECTS_DIR, project_id)
    os.makedirs(project_path, exist_ok=True)

    with open(os.path.join(project_path, "input.json"), "w") as f:
        json.dump(req.model_dump(), f, indent=2)

    job_id, job_path = _create_job(project_id)

    with open(os.path.join(project_path, "personacut_job_id.txt"), "w") as f:
        f.write(job_id)

    targets_dicts = [t.model_dump() for t in req.targets]
    background_tasks.add_task(
        run_pipeline, job_id, job_path, req.source_script, targets_dicts, req.style_guide, project_id
    )

    return ProjectResponse(project_id=project_id, job_id=job_id)


@app.get("/api/projects/{project_id}/results")
async def get_project_results(project_id: str):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    job_id_path = os.path.join(project_path, "personacut_job_id.txt")
    if not os.path.exists(job_id_path):
        raise HTTPException(status_code=404, detail="No PersonaCut job found")

    with open(job_id_path) as f:
        job_id = f.read().strip()

    results_path = os.path.join(JOBS_DIR, job_id, "results.json")
    if not os.path.exists(results_path):
        raise HTTPException(status_code=404, detail="Results not ready")

    with open(results_path) as f:
        return json.load(f)


# ══════════════════════════════════════════════
# TextGuard QA Endpoints
# ══════════════════════════════════════════════

@app.post("/api/projects/{project_id}/qa")
async def run_qa(
    project_id: str,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    variant_id: str = Form(""),
    fps: int = Form(1),
    patch: bool = Form(True),
    expected_text_source: str = Form("captions"),
    expected_text_json: Optional[str] = Form(None),
):
    project_path = os.path.join(PROJECTS_DIR, project_id)
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")

    job_id, job_path = _create_job(project_id)
    os.makedirs(os.path.join(job_path, "frames"), exist_ok=True)

    video_path = os.path.join(job_path, "input.mp4")
    with open(video_path, "wb") as f:
        f.write(await video.read())

    if expected_text_source == "custom" and expected_text_json:
        expected_data = json.loads(expected_text_json)
    else:
        expected_data = _extract_captions_from_variant(project_id, variant_id)

    with open(os.path.join(job_path, "expected.json"), "w") as f:
        json.dump(expected_data, f, indent=2)

    qa_dir = os.path.join(project_path, "qa", variant_id)
    os.makedirs(qa_dir, exist_ok=True)
    with open(os.path.join(qa_dir, "job_id.txt"), "w") as f:
        f.write(job_id)

    background_tasks.add_task(
        run_textguard, job_id, job_path, video_path, expected_data, variant_id, fps, patch
    )

    return {"qa_job_id": job_id}


def _extract_captions_from_variant(project_id: str, variant_id: str) -> list:
    """Extract time-segmented expected text from a variant's scenes."""
    job_id_path = os.path.join(PROJECTS_DIR, project_id, "personacut_job_id.txt")
    if not os.path.exists(job_id_path):
        return []

    with open(job_id_path) as f:
        job_id = f.read().strip()

    results_path = os.path.join(JOBS_DIR, job_id, "results.json")
    if not os.path.exists(results_path):
        return []

    with open(results_path) as f:
        results = json.load(f)

    for variant in results.get("variants", []):
        if variant.get("variant_id") == variant_id:
            segments = []
            for scene in variant.get("scenes", []):
                if scene.get("on_screen_text"):
                    segments.append({
                        "t_start": scene.get("start_sec", 0),
                        "t_end": scene.get("end_sec", 0),
                        "text": scene.get("on_screen_text", ""),
                    })
            return segments
    return []


@app.get("/api/projects/{project_id}/qa/{variant_id}/report")
async def get_qa_report(project_id: str, variant_id: str):
    qa_dir = os.path.join(PROJECTS_DIR, project_id, "qa", variant_id)
    job_id_path = os.path.join(qa_dir, "job_id.txt")
    if not os.path.exists(job_id_path):
        raise HTTPException(status_code=404, detail="QA job not found")

    with open(job_id_path) as f:
        job_id = f.read().strip()

    report_path = os.path.join(JOBS_DIR, job_id, "qa_report.json")
    if not os.path.exists(report_path):
        raise HTTPException(status_code=404, detail="QA report not ready")

    with open(report_path) as f:
        return json.load(f)


@app.get("/api/projects/{project_id}/qa/{variant_id}/patched")
async def get_patched_video(project_id: str, variant_id: str):
    qa_dir = os.path.join(PROJECTS_DIR, project_id, "qa", variant_id)
    job_id_path = os.path.join(qa_dir, "job_id.txt")
    if not os.path.exists(job_id_path):
        raise HTTPException(status_code=404, detail="QA job not found")

    with open(job_id_path) as f:
        job_id = f.read().strip()

    patched_path = os.path.join(JOBS_DIR, job_id, "patched.mp4")
    if not os.path.exists(patched_path):
        raise HTTPException(status_code=404, detail="Patched video not found")

    return FileResponse(patched_path, media_type="video/mp4", filename=f"patched_{variant_id}.mp4")


@app.get("/api/projects/{project_id}/qa/{variant_id}/original")
async def get_original_qa_video(project_id: str, variant_id: str):
    qa_dir = os.path.join(PROJECTS_DIR, project_id, "qa", variant_id)
    job_id_path = os.path.join(qa_dir, "job_id.txt")
    if not os.path.exists(job_id_path):
        raise HTTPException(status_code=404, detail="QA job not found")

    with open(job_id_path) as f:
        job_id = f.read().strip()

    video_path = os.path.join(JOBS_DIR, job_id, "input.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Original video not found")

    return FileResponse(video_path, media_type="video/mp4", filename=f"original_{variant_id}.mp4")


@app.get("/api/projects/{project_id}/qa/{variant_id}/frames/{frame_name}")
async def get_qa_frame(project_id: str, variant_id: str, frame_name: str):
    qa_dir = os.path.join(PROJECTS_DIR, project_id, "qa", variant_id)
    job_id_path = os.path.join(qa_dir, "job_id.txt")
    if not os.path.exists(job_id_path):
        raise HTTPException(status_code=404, detail="QA job not found")

    with open(job_id_path) as f:
        job_id = f.read().strip()

    frame_path = os.path.join(JOBS_DIR, job_id, "frames", frame_name)
    if not os.path.exists(frame_path):
        raise HTTPException(status_code=404, detail="Frame not found")

    return FileResponse(frame_path, media_type="image/jpeg", filename=frame_name)


# ══════════════════════════════════════════════
# Shared Job Status
# ══════════════════════════════════════════════

@app.get("/api/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    status_path = os.path.join(JOBS_DIR, job_id, "status.json")
    if not os.path.exists(status_path):
        raise HTTPException(status_code=404, detail="Job not found")
    with open(status_path) as f:
        return json.load(f)


# ══════════════════════════════════════════════
# Chatbot & TTS Endpoints
# ══════════════════════════════════════════════

from app.llm.router import chat_answer

@app.post("/api/chat", response_model=ChatResponse)
async def chat_proxy(req: ChatRequest):
    try:
        user_prompt = f"""
USER MESSAGE: "{req.message}"

CURRENT CONTEXT STATES:
{req.context.model_dump_json(indent=2)}

Respond in STRICT JSON matching the schema. Do not include markdown code fences (like ```json).
"""
        text = await chat_answer(user_prompt)
        data = json.loads(text)
        return ChatResponse(**data)
        
    except Exception as e:
        print(f"[Chat Proxy] Error: {e}")
        return ChatResponse(
            message=f"Oops, I hit a snag trying to process that. ({str(e)}). Could you try again?",
            quick_actions=[],
            links=[],
            tts_text="Oops, I hit a snag trying to process that.",
            tone="neutral",
            confidence=0.1
        )


@app.post("/api/tts")
async def tts_proxy(text: str = Form(...)):
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
    if not elevenlabs_key:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
        
    voice_id = "21m00Tcm4TlvDq8ikWAM" 
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": elevenlabs_key
    }
    
    data = {
        "text": text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    try:
        client = httpx.AsyncClient()
        req = client.build_request("POST", url, headers=headers, json=data)
        r = await client.send(req, stream=True)
        
        if r.status_code != 200:
            await r.aread()
            raise HTTPException(status_code=r.status_code, detail=f"ElevenLabs error: {r.text}")
            
        from fastapi.responses import StreamingResponse
        async def stream_generator():
            async for chunk in r.aiter_bytes():
                yield chunk
            await client.aclose()
                
        return StreamingResponse(stream_generator(), media_type="audio/mpeg")
        
    except Exception as e:
        print(f"[TTS Proxy] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

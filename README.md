# PersonaCut + TextGuard

**One system. Two powers.** Personalize → Generate → Verify → Ship.

## Architecture

```
persona-cut/
  frontend/    Next.js + Tailwind (dark futuristic dashboard)
  backend/     Python FastAPI
    app/
      personacut/   5-Agent Pipeline (Qwen 14B via vLLM)
      textguard/    Video Text QA (OCR + InternVL2 8B via LMDeploy)
      llm/          OpenAI-compatible routing layer
```

### PersonaCut Pipeline (5 Agents)
1. **Story Extractor** — extracts immutable facts from source script
2. **Audience Transformer** — per-target emphasis, tone, compression
3. **Script Writer** — personalized voiceover + captions
4. **Shot Planner** — scene-by-scene storyboard with visual prompts
5. **Critic** — scores on faithfulness/tone/duration/platform/clarity (1 retry)

### TextGuard QA Layer
1. **Frame Extraction** (ffmpeg)
2. **OCR** (EasyOCR or PP-OCRv5)
3. **Compare** (rapidfuzz similarity)
4. **VLM Verdict** (InternVL2-8B multimodal — failed frames only)
5. **Patch** (ffmpeg drawtext overlays)

## Setup

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Set your Model configurations in .env (see Model Serving below)
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## 60-Second Demo

1. Open `http://localhost:3000`
2. Paste the sample script (see `backend/sample/sample_script.txt`)
3. Add 3 targets: TikTok 15s, YouTube 45s Engineer, LinkedIn 30s Buyer
4. Click **Generate Variants** — watch the 5-agent pipeline progress
5. View personalized scripts, shot plans, scorecards, and diff rationale
6. Click **Run TextGuard QA** on a variant → upload a rendered video
7. See frame-by-frame QA: expected vs detected text, VLM verdicts
8. Download patched video + QA report JSON

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/projects` | Create project + start PersonaCut |
| GET | `/api/jobs/{id}/status` | Poll job progress |
| GET | `/api/projects/{id}/results` | Get variant packs + scorecards |
| POST | `/api/projects/{id}/videogen` | Trigger Wan2.1 T2V for a variant |
| GET | `/api/projects/{id}/videogen/status` | Check videogen availability |
| GET | `/api/projects/{id}/videogen/{vid}/video` | Download generated mp4 |
| GET | `/api/projects/{id}/videogen/{vid}/metadata` | Generation params & timings |
| POST | `/api/projects/{id}/qa` | Run TextGuard on a variant |
| GET | `/api/projects/{id}/qa/{vid}/report` | Get QA report |
| GET | `/api/projects/{id}/qa/{vid}/patched` | Download patched video |

---

## Wan2.1 Video Generation (Optional)

Generate T2V video previews directly from your variant's visual prompts using [Wan2.1 1.3B](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B-Diffusers).

### Requirements
- **CUDA GPU** with 6+ GB VRAM (1.3B model). The 14B model needs 24+ GB.
- Python packages: `diffusers>=0.31.0`, `accelerate`, `safetensors`, `imageio[ffmpeg]`

### Setup
1. Enable in `backend/.env`:
   ```ini
   ENABLE_VIDEO_GEN=true
   ```
2. (Optional) Auto-generate after PersonaCut completes:
   ```ini
   AUTO_VIDEO_GEN=true
   ```
3. Configurable settings (all have defaults):
   ```ini
   WAN21_MODEL_ID=Wan-AI/Wan2.1-T2V-1.3B-Diffusers
   WAN21_DEVICE=cuda
   WAN21_WIDTH=832
   WAN21_HEIGHT=480
   WAN21_NUM_FRAMES=81
   WAN21_FPS=15
   WAN21_GUIDANCE_SCALE=5.0
   WAN21_SEED=42
   WAN21_TORCH_DTYPE=bfloat16
   ```

### Usage
- **UI**: Click "Generate Video (Wan2.1)" on the results page sidebar.
- **API**: `POST /api/projects/{id}/videogen` with `{"variant_id": "...", "mode": "full_variant"}`
- **QA integration**: Pass `use_generated_video=true` to the QA endpoint to use the generated mp4 instead of uploading.

### How It Works
1. Scene `visual_prompt` fields from the variant are concatenated into a single T2V prompt.
2. Wan2.1 Diffusers pipeline generates frames (default: 81 frames at 480p).
3. Frames are exported to mp4 via `export_to_video`.
4. Video is stored at `projects/{project_id}/videogen/{variant_id}/generated.mp4`.

### No GPU?
If `ENABLE_VIDEO_GEN=false` (default), the entire video generation module is skipped. Existing PersonaCut + TextGuard flows work exactly as before.

---

## Advanced Backend Configuration (Opt-in Upgrades)

### 1. CrewAI Orchestration
You can switch PersonaCut from its native Python orchestrator to a multi-agent **CrewAI** crew.
- Set `USE_CREWAI=true` in `backend/.env`
- The system will boot 5 localized agents (Extractor, Strategist, Writer, Planner, Critic) automatically.

### 2. PP-OCRv5 Upgrade
For superior OCR performance, you can replace EasyOCR with Hugging Face's **PP-OCRv5** (PaddlePaddle).
- Set `OCR_PROVIDER=ppocrv5`
- On first run, the TextGuard orchestrator will auto-download the required `det` and `rec` models into `backend/models/ppocrv5`.
- *Note: Requires `paddlepaddle` and `paddleocr` installed via `pip install -r requirements.txt`.*

---

## Model Serving (No Gemini)

PersonaCut and TextGuard have been fully migrated to use **Hugging Face open-weight models** directly, removing all dependencies on Gemini or proprietary API keys.

The system relies on 3 specific models running locally on OpenAI-compatible servers:
1. **Variant Generator** (`Qwen/Qwen2.5-14B-Instruct`) via vLLM
2. **Chatbot / Workflow Engine** (`Qwen/Qwen2.5-7B-Instruct`) via vLLM
3. **TextGuard QA Critic** (`OpenGVLab/InternVL2-8B`) via LMDeploy

### Setup & Booting Servers

We’ve provided pre-configured bash scripts to spin up these endpoints. They automatically pull the specified weights from Hugging Face.

Open three separate terminals and run:
```bash
# Terminal 1
cd backend && ./scripts/serve_qwen14b_vllm.sh
# Terminal 2
cd backend && ./scripts/serve_qwen7b_vllm.sh
# Terminal 3
cd backend && ./scripts/serve_internvl2_lmdeploy.sh
```

### Environment Variables
Ensure your `backend/.env` maps exactly to these local servers (this matches the provided `.env.example`):

```ini
LLM_VARIANT_BASE_URL=http://localhost:8001/v1
LLM_VARIANT_MODEL_ID=Qwen/Qwen2.5-14B-Instruct

LLM_CHAT_BASE_URL=http://localhost:8002/v1
LLM_CHAT_MODEL_ID=Qwen/Qwen2.5-7B-Instruct

VLM_QA_BASE_URL=http://localhost:23333/v1
VLM_QA_MODEL_ID=OpenGVLab/InternVL2-8B
```

### Troubleshooting
- **Model server not reachable**: Ensure the vLLM/LMDeploy scripts have finished downloading the weights and the API server is active on the expected ports (8001, 8002, 23333).
- **CrewAI or PaddleOCR not found:** Ensure you have activated your virtual environment (`source .venv/bin/activate`) and run `pip install -r requirements.txt`.

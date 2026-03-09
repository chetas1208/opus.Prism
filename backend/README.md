# Opus.Prism Backend

The backend of Opus.Prism powers the **PersonaCut** 5-Agent Pipeline and the **TextGuard** QA system. It's built with built with Python and **FastAPI**, relying on open-weight models hosted locally via **vLLM** and **LMDeploy**.

## Prerequisites

- Python 3.10+
- `ffmpeg` installed on your system (required for frame extraction and patching).
- CUDA-enabled GPU (if running models locally).

## Standard Setup

1. **Navigate to backend and create a virtual environment:**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install requirements:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your API keys or local model server URLs (see Model Serving below).

4. **Run the API server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Model Serving (Fully Open-Weight)

The system is configured to run entirely on Hugging Face open-weight models without proprietary APIs. It requires 3 specific model endpoints:

1. **Variant Generator:** `Qwen/Qwen2.5-14B-Instruct` (via vLLM)  
   `LLM_VARIANT_BASE_URL=http://localhost:8001/v1`
2. **Chatbot / Workflow Engine:** `Qwen/Qwen2.5-7B-Instruct` (via vLLM)  
   `LLM_CHAT_BASE_URL=http://localhost:8002/v1`
3. **TextGuard QA Critic:** `Qwen2.5-VL` (via LMDeploy)  
   `VLM_QA_BASE_URL=http://localhost:23333/v1`

### Booting the local servers
We provide shell scripts to spin up these servers using Docker or local installations. Open three separate terminals:
```bash
# Terminal 1 - 14B Model
./scripts/serve_qwen14b_vllm.sh
# Terminal 2 - 7B Model
./scripts/serve_qwen7b_vllm.sh
# Terminal 3 - 8B VLM
./scripts/serve_internvl2_lmdeploy.sh
```

## Advanced Opt-in Features (via `.env`)

- **CrewAI Orchestration (`USE_CREWAI=true`):** Switch PersonaCut from its native Python orchestrator to a multi-agent CrewAI crew.

- **Local Video Gen (`ENABLE_VIDEO_GEN=true`):** Generate T2V video previews directly using Wan2.1 1.3B via diffusers.

## Key API Endpoints

- `POST /api/projects`: Create project + start PersonaCut multi-agent pipeline
- `GET /api/jobs/{id}/status`: Poll pipeline progress
- `GET /api/projects/{id}/results`: Get variant packs and scorecards
- `POST /api/projects/{id}/qa`: Trigger TextGuard QA on a specific variant (Upload MP4)
- `GET /api/projects/{id}/qa/{vid}/report`: Get QA validation JSON report
- `GET /api/projects/{id}/qa/{vid}/patched`: Download patched MP4 with OCR fixes

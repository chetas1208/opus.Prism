# Opus.Prism: PersonaCut + TextGuard

**One system. Two powers.** Personalize → Generate → Verify → Ship.

Opus.Prism is an intelligent "Story Compiler" for Personalization, and a "Unit Testing Suite" for visual text in AI video generation.

**Watch the Demo Video:** [Demo Link](https://drive.google.com/file/d/1EwU8b06NjeCNorqlQ59cAD9vb3WD-tU_/view?usp=share_link)

## The Problems We Solve

AI video generation currently faces massive bottlenecks:
1. **Personalization:** One script = one generic video. Adapting for different audiences is manual and slow.
2. **Accurate Text:** AI models hallucinate gibberish text on screen, ruining the final polish.
3. **Critic in the Loop:** Pipelines ship videos blindly without automated visual quality assurance.

## Our Merged Solution

### 1. PersonaCut (Personalization & Generation)
Instead of prompting for one specific video, users input a raw "Base Idea". By defining specific targets (e.g., a 15-second TikTok vs. a 30-second LinkedIn post), the multi-agent pipeline extracts core facts and adapts tone, length, and format simultaneously. 
* **5-Agent Pipeline:** Extractor (Facts) → Strategist (Audience) → Writer (Script/Captions) → Planner (Visuals) → Critic (Scorecard).

### 2. TextGuard QA (Verification)
AI video generators often screw up text overlays. TextGuard acts as our "Critic in the Loop" by extracting video frames, running OCR, and comparing detected text against the *Expected Captions* from PersonaCut.
* When a text match fails, a Vision-Language Model (VLM) diagnoses the issue.
* TextGuard dynamically patches the video with a clean, correct text box over the garbled frame.

## Architecture Workflow

```text
========================================================================================
                          OPUS.PRISM ARCHITECTURE WORKFLOW
========================================================================================

 [ USER ]
    |
    | (1. Inputs Source Script & Audience Specs)
    v
+----------------------------------------------------------------------------------+
| FRONTEND APP (Next.js / Tailwind)                                                |
|                                                                                  |
|  [ /personacut ] ----> [ /results ] ----> [ /qa ]      <-- (OPBot Context Aware) |
+---------|-------------------|----------------|-----------------------A-----------+
          |                   |                |                       |
          | (2. Trigger       |                | (9. Upload MP4)       | (Chat / TTS)
          |  Pipeline)        |                v                       |
+---------|-------------------|----------------|-----------------------|-----------+
|         v                   |                |     [ Qwen-7B / ElevenLabs ]      |
|  +--------------------+     |                v                                   |
|  | PERSONACUT BACKEND |     |        +--------------+                            |
|  |  (Agent Pipeline)  |     |        | TEXTGUARD QA |                            |
|  +--------------------+     |        +--------------+                            |
|    |                        |          |                                         |
|    |- Agent 1: Extractor    |          |- Frame Extractor (ffmpeg)               |
|    |    (Story Facts)       |          |      |                                  |
|    |                        |          |      v                                  |
|    |- Agent 2: Strategist   |          |- OCR Engine (Qwen2.5-VL)                |
|    |    (Demographics)      |          |      |                                  |
|    |                        |          |      v                                  |
|    |- Agent 3: Writer       |          |--[ Matcher ]                            |
|    |    (Script/Captions)   |          |      | \                                |
|    |                        |          |      |  \ (Match Fails)                 |
|    |                        |          |      |   \                              |
|    |- Agent 4: Planner      |          |      |    v                             |
|    |    (Visual Prompts)    |          |      |  [ VLM Inspector ]               |
|    |                        |          |      |    (Qwen2.5-VL)                  |
|    |- Agent 5: Critic       |          |      |          |                       |
|         (Scorecard)         |          |      |          v                       |
|         /        \          |          |      |  [ Video Patcher ]               |
|  (Pass)/          \(Fail)   |          |      |          \                       |
|       v            \--> (Retry via  |          |      |          v                      |
| [ Variant Packs ]       Agent 2)    |          v          v                      |
|       |                     |          +--------------------------+              |
|       |-------------------- |          | Output: QA Report JSON   |              |
+-------|---------------------|----------|         & Patched MP4    |              |
        |      (3. Returns)   ^          +--------------------------+              |
        v                     |                       |                            |
  (4. Export JSON / Prompt)   |                       v                            |
        |                     |             (10. Feedback / Report Displayed)      |
        |                     |                       |                            |
        v                     |                       v                            |
  [ External Video Generator ]|               (End of Workflow)                    |
    (Runway, Sora, etc.)      |                                                    |
        |                     |                                                    |
        | (5. Render MP4)     |                                                    |
        +---------------------+                                                    |
========================================================================================
```

## Quick Start & Deployment

Opus.Prism is built to be modular and deployable by anyone. The system has fully migrated to use **Hugging Face open-weight models** directly running locally, removing dependencies on proprietary API keys.

* **[Backend Setup & Deployment](./backend/README.md):** Python, FastAPI, and Model Serving (vLLM / LMDeploy).
* **[Frontend Setup & Deployment](./frontend/README.md):** Next.js UI dashboard.

Explore the respective directories for detailed deployment instructions!

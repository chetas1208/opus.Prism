# Opus.Prism — Project Plan & Architecture

## Hackathon Context & Vision

This project is built for **Sip N' Hack: OpusClip Hackathon** (Multimodal GenAI focus).
The hackathon emphasizes:
- **LLMs + VLMs** working in tandem
- **AI agents that reason across formats**
- **Vision + product workflows**
- **Automation powered by multimodal systems**

**Official Links:**
- Event page: [Luma](https://luma.com/7bf6z60j)
- Host problem doc: [OpusClip LarkSuite](https://opusclip.sg.larksuite.com/wiki/AYKkwG4AIifac3k8Upglr8UdgVf)
- Submission: [Shipyard](https://shipyardhq.tech/hackathons/sip-n-hack-opusclip-hackathon)

---

## What We Built: The Merged "Big" Idea

Opus.Prism merges two powerful systems into a single seamless pipeline:

### 1. PersonaCut (Problem 1: Personalization)
An intelligent "Story Compiler" acting as a personalization orchestrator. It takes one base story/script and produces **multiple audience-specific variants** by varying:
- **Tone:** e.g., technical vs casual vs buyer
- **Length:** e.g., 15s vs 30s vs 60s
- **Format:** e.g., explainer vs hype vs tutorial
- **Visual Density & Emphasis**

*Outputs are **structured JSON Variant Packs** (voiceover script, captions, visual prompts, and reasoning), ready to be fed into any downstream video generator.*

### 2. TextGuard QA (Problem 3 & 5: Accurate Text & Critic Loop)
A multimodal "Unit Testing Suite" for visual text. AI video generators frequently hallucinate gibberish on text overlays. TextGuard acts as the **Critic in the Loop**:
- Extracts frames from the rendered output.
- Runs OCR against expected PersonaCut captions.
- Uses a Vision-Language Model (VLM) solely on failed frames for deep diagnostics.
- Outputs an actionable QA report and a **Patched MP4** overlaying correct text.

---

## Master Architecture Flow
**Personalize → Plan → (Generate) → Verify → Patch → Ship**

1. **User Input:**
   - Source Script / Idea
   - Target Profiles (Audience, Platform, Duration, Tone)
2. **PersonaCut Pipeline (5-Agent Crew):**
   - **Agent 1 (Extractor):** Locks immutable facts.
   - **Agent 2 (Strategist):** Adapts facts to the specific target profile.
   - **Agent 3 (Writer):** Drafts personalized voiceovers and exact captions.
   - **Agent 4 (Planner):** Injects precise visual generative prompts based on the script timeline.
   - **Agent 5 (Critic):** Pre-generation evaluator scoring on faithfulness and tone (triggers retries if needed).
3. **TextGuard QA Pipeline:**
   - User uploads a rendered MP4 (from Wan2.1, Runway, or Sora).
   - Frames are extracted via `ffmpeg`.
   - `Qwen2.5-VL` reads the visual text via OCR.
   - Matcher compares visual text to the *Expected Captions* in the Variant Pack.
   - If a mismatch occurs, `Qwen2.5-VL` acts as the human-in-the-loop inspector to verify error types.
   - Patcher redraws clean SVG/ffmpeg text boxes over the botched frames.

---

## Technical Stack & Model Usage

Opus.Prism relies entirely on Hugging Face open-weight models running locally via vLLM and LMDeploy, dropping dependencies on proprietary APIs (like Gemini or OpenAI).

### Frontend
- **Framework:** Next.js (App Router), React, Tailwind CSS
- **Features:** Multipart Dashboard (`/personacut`, `/results`, `/qa`)
- **OPBot:** Context-aware ambient assistant powered by native Web Speech API and `Qwen2.5-7B-Instruct`.

### Backend
- **Framework:** Python, FastAPI
- **Variant Generation (Agents):** `Qwen2.5-14B-Instruct` served via `vLLM`
- **TextGuard QA (OCR + Verdicts):** `Qwen2.5-VL` served via `LMDeploy`
- **Video Processing:** `ffmpeg`, string similarity matchers (`rapidfuzz`)

---

## Core Data Models

### TargetSpec (Input)
```json
{
  "audience": "Software Engineers",
  "platform": "YouTube Shorts",
  "duration_sec": 45,
  "tone": ["Technical", "Fast-Paced"],
  "goal": "Explain the architecture"
}
```

### VariantPack (PersonaCut Output)
```json
{
  "variant_id": "uuid",
  "script": {
    "voiceover": "...",
    "captions": ["..."]
  },
  "scenes": [
    {
      "start_sec": 0, "end_sec": 4,
      "narration": "...",
      "on_screen_text": "...",
      "visual_prompt": "..."
    }
  ],
  "scorecard": { "faithfulness_score": 45, "tone_score": 48 }
}
```

### QAReport (TextGuard Output)
```json
{
  "issues": [
    {
      "timestamp": 2.5,
      "detected_text": "Brwvv Perfctn",
      "expected_text": "Brewed Perfection",
      "vlm_verdict": "Fail - garbled text. Action needed.",
      "recommended_action": "overlay_fix"
    }
  ]
}
```

---

## Feature Roadmap & Future Upgrades

**Personalization Upgrades (Phase 2):**
- **Dynamic User Signatures:** Learn a user’s preferred pacing, vocabulary, and humor level over time.
- **Platform Micro-Constraints:** Rule enforcement (e.g., "TikTok hooks must happen in the first 1.5s").

**QA & Guardrail Upgrades (Phase 2):**
- **In-Place Patching:** Track text motion vectors and patch dynamically moving text instead of static bounding box patches.
- **Multilingual Validation:** Verify that captions match visual languages without weird transliterations.
- **Safety & Audio Audits:** VLM-driven checks for brand-safety hazards and audio loudness limiters.
# Opus.Prism: Host Problems + Merged Project Plan 

## Official hackathon links
- Event page: https://luma.com/7bf6z60j 
- Host problem doc: https://opusclip.sg.larksuite.com/wiki/AYKkwG4AIifac3k8Upglr8UdgVf 
- Submission: https://shipyardhq.tech/hackathons/sip-n-hack-opusclip-hackathon 

---

# Our Merged Solution: Opus.Prism (PersonaCut + TextGuard)

**Opus.Prism** acts as an intelligent "Story Compiler" for Personalization, and a "Unit Testing Suite" for visual text.

**PersonaCut** personalizes one source story into multiple audience-specific generated video plans (prompts, scripts, captions).
**TextGuard** verifies and fixes text in the final rendered video so it doesn’t ship broken.

This system directly solves three distinct host problems:

## 1. Problem 1: Personalization
* **Host Challenge:** How to make generated videos feel more personalized by audience, tone, length, or format without rebuilding the whole pipeline from scratch.
* **Our Solution (PersonaCut):** 
  Instead of prompting for one specific video, users input a raw "Base Idea" and define multiple target profiles (e.g., a 15-second TikTok vs. a 30-second LinkedIn post). 
  We use a **5-Agent Pipeline** (powered locally by `Qwen2.5-14B-Instruct`):
  1. **Story Extractor** — extracts immutable facts from the source script.
  2. **Audience Transformer** — adapts emphasis, tone, and compression for the target.
  3. **Script Writer** — drafts the personalized voiceover and exact captions.
  4. **Shot Planner** — builds a scene-by-scene storyboard with visual prompt injections.

## 2. Problem 3: Accurate text (no gibberish)
* **Host Challenge:** Generated videos often have hallucinated, garbled, or wrong text overlays, ruining the professional polish of the final video.
* **Our Solution (TextGuard QA):**
  We treat text overlays like code that needs unit testing. Once a video is rendered:
  1. We extract frames via `ffmpeg`.
  2. We run OCR (Optical Character Recognition via `Qwen2.5-VL`) on the frames to detect visual text.
  3. We programmatically compare the detected text against the *Expected Captions* predefined by our PersonaCut generator.
  4. If the text is garbled, TextGuard can dynamically redraw a clean, correct text box over the bad frame, generating a newly patched MP4.

## 3. Problem 5: Critic in the loop
* **Host Challenge:** Video pipelines usually generate a clip and ship it blindly. We need a critic that runs inside the pipeline to flag issues and suggest retries.
* **Our Solution (Dual Critics):**
  Opus.Prism embeds critics at two crucial stages:
  1. **Pre-generation Critic (PersonaCut Agent 5):** Before the JSON video plan is even sent to a renderer, a Critic Agent scores the variant on Faithfulness (did it keep the core facts?) and Tone. If it scores too low, it automatically retries the generation.
  2. **Post-generation Critic (TextGuard VLM Inspector):** When the OCR matcher fails (detecting gibberish text in the rendered video), TextGuard sends the failed frame to a Vision-Language Model (`Qwen2.5-VL`). The VLM diagnoses exactly what went wrong and provides a human-readable verdict before the patch is applied.

---

## High-Level Architecture Flow

1) Input story/script + targets (audience/platform/duration/tone) via Next.js Frontend.
2) PersonaCut generates Variant Packs (scripts, visual prompts, scorecards, diff rationale).
3) (Optional) Render video locally using our integrated Wan2.1 T2V pipeline or externally using the JSON prompts.
4) Upload rendered MP4 back to the UI.
5) TextGuard extracts frames, runs OCR, compares text with the Variant Pack, leverages the VLM Critic, and outputs a QA report + Patched MP4.

## Repositories & Tech Stack
* **Frontend:** Next.js (App Router), Tailwind CSS.
* **Backend:** Python, FastAPI.
* **Models:** Open-weight running locally via vLLM and LMDeploy (Qwen2.5-14B, Qwen2.5-7B, Qwen2.5-VL).
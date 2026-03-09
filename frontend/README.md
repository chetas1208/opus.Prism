# Opus.Prism Frontend

The frontend for Opus.Prism is a sleek, dark-futuristic Next.js web application built with React and Tailwind CSS. It acts as the driver for the entire video personalization and QA workflow.

## Features & Workflow

The UI is divided into three primary core experiences:

1. **PersonaCut (`/personacut`):** 
   Input your base script/idea and configure your target audiences (Tone, Duration, Platform). Hit generate to trigger the backend 5-agent pipeline.
2. **Results Dashboard (`/results`):** 
   View the generated variant packs. Compare the original facts against the tailored script, view the scene-by-scene storyboard planning, and analyze the Critic Agent's Scorecard. Export these prompts to external video generators.
3. **TextGuard QA (`/qa`):** 
   Upload an AI-generated MP4 video. The frontend interfaces with TextGuard to highlight OCR differences, display VLM verdicts, and provide a patched video download to fix gibberish text.

### Ambient AI Assistant (OPBot)
Throughout the application, **OPBot** lives in the corner. OPBot is a context-aware AI assistant powered by Qwen-7B and ElevenLabs TTS (Web Speech API). It understands which page you are on and can guide you through the workflow or answer questions about your scripts.

## Getting Started

First, ensure you have Node.js installed on your machine.

1. **Install Dependencies:**
   ```bash
   npm install
   # or yarn / pnpm install
   ```

2. **Run the Development Server:**
   ```bash
   npm run dev
   ```

3. **Open the App:**
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

*(Note: The frontend expects the FastAPI backend to be running on `http://localhost:8000` for API calls).*

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Icons / Fonts:** Geist, Lucide React
- **Voice / Speech:** Modern Web Speech APIs

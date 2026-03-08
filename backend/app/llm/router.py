import os
from .openai_compat_client import post_openai_compat
from .json_mode import parse_and_repair_json, _encode_image
from .prompts import PERSONACUT_VARIANT_PROMPT, CHAT_SYSTEM_PROMPT, TEXTGUARD_QA_PROMPT
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# Configuration Loaders
# ---------------------------------------------------------
def get_variant_config():
    return {
        "base_url": os.getenv("LLM_VARIANT_BASE_URL", "http://localhost:8001/v1"),
        "model_id": os.getenv("LLM_VARIANT_MODEL_ID", "Qwen/Qwen2.5-14B-Instruct")
    }

def get_chat_config():
    return {
        "base_url": os.getenv("LLM_CHAT_BASE_URL", "http://localhost:8002/v1"),
        "model_id": os.getenv("LLM_CHAT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
    }

def get_qa_config():
    return {
        "base_url": os.getenv("VLM_QA_BASE_URL", "http://localhost:23333/v1"),
        "model_id": os.getenv("VLM_QA_MODEL_ID", "OpenGVLab/InternVL2-8B")
    }

def get_temperature():
    return float(os.getenv("MODEL_TEMPERATURE", "0.2"))

def get_max_tokens():
    return int(os.getenv("MODEL_MAX_TOKENS", "2048"))


# ---------------------------------------------------------
# Route 1: Variant Generation (Strict JSON, Qwen 14B)
# ---------------------------------------------------------
async def generate_variant_json(user_prompt: str) -> dict:
    """Send PersonaCut orchestrator prompt for JSON variant/story facts generation."""
    config = get_variant_config()
    messages = [
        {"role": "system", "content": PERSONACUT_VARIANT_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    async def _client_func(msgs):
        return await post_openai_compat(
            base_url=config["base_url"],
            model_id=config["model_id"],
            messages=msgs,
            temperature=get_temperature(),
            max_tokens=get_max_tokens(),
            json_format=True,
        )

    raw_response = await _client_func(messages)
    return await parse_and_repair_json(raw_response, _client_func)


# ---------------------------------------------------------
# Route 2: Chatbot Answers (Markdown/JSON hybrid, Qwen 7B)
# ---------------------------------------------------------
async def chat_answer(user_prompt: str) -> str:
    """Generates the structured JSON response for the frontend ChatWidget."""
    config = get_chat_config()
    messages = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    raw_response = await post_openai_compat(
        base_url=config["base_url"],
        model_id=config["model_id"],
        messages=messages,
        temperature=0.4,
        max_tokens=get_max_tokens(),
        json_format=True,
    )

    clean_response = raw_response.strip()
    if clean_response.startswith("```json"):
        clean_response = clean_response[7:]
    elif clean_response.startswith("```"):
        clean_response = clean_response[3:]
    if clean_response.endswith("```"):
        clean_response = clean_response[:-3]
    return clean_response.strip()


# ---------------------------------------------------------
# Route 3: QA Verdict (Vision Language Model, InternVL2 8B)
# ---------------------------------------------------------
async def qa_verdict(frame_path: str, expected_text: str, ocr_text: str) -> dict:
    """Analyze a frame + OCR vs Expectations using a VLM to judge correctness."""
    config = get_qa_config()
    b64_img = _encode_image(frame_path)

    user_prompt = f"""Task: Determine whether the on-screen text in this video frame matches the expected text.

EXPECTED TEXT: "{expected_text}"
DETECTED OCR TEXT: "{ocr_text}"

Compare the visual text in the image to the EXPECTED TEXT. Does it match flawlessly or is there a critical error?"""

    messages = [
        {"role": "system", "content": TEXTGUARD_QA_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": b64_img,
                        "detail": "high",
                    },
                },
            ],
        },
    ]

    async def _client_func(msgs):
        return await post_openai_compat(
            base_url=config["base_url"],
            model_id=config["model_id"],
            messages=msgs,
            temperature=0.1,
            max_tokens=500,
            json_format=True,
        )

    raw_response = await _client_func(messages)
    return await parse_and_repair_json(raw_response, _client_func)

import os
import httpx
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = int(os.getenv("MODEL_TIMEOUT_SECONDS", "120"))


async def post_openai_compat(
    base_url: str,
    model_id: str,
    messages: List[Dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int = 2048,
    json_format: bool = False,
) -> str:
    """POST to an OpenAI-compatible /v1/chat/completions endpoint."""
    url = f"{base_url.rstrip('/')}/chat/completions"
    api_key = os.getenv("OPENAI_COMPAT_API_KEY", "dummy")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "model": model_id,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if json_format:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        error_msg = f"Model server not reachable at {base_url}. Start the server or update env var."
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except httpx.HTTPStatusError as e:
        error_msg = f"API Error {e.response.status_code} from {base_url}: {e.response.text}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(f"Failed to generate from {model_id}: {e}")
        raise

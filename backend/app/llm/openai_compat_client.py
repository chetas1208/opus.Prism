import os
import asyncio
import httpx
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

RETRYABLE_STATUS_CODES = {429, 502, 503, 504}
MAX_RETRIES = 3
INITIAL_BACKOFF = 5


def _get_timeout() -> int:
    return int(os.getenv("MODEL_TIMEOUT_SECONDS", "120"))


def _clean_error_body(body: str, limit: int = 200) -> str:
    """Extract a useful error message from an API response (strip HTML noise)."""
    if "<html" in body.lower():
        import re
        title = re.search(r"<title>(.*?)</title>", body, re.IGNORECASE | re.DOTALL)
        h1 = re.search(r"<h1>(.*?)</h1>", body, re.IGNORECASE | re.DOTALL)
        parts = []
        if h1:
            parts.append(h1.group(1).strip())
        if title:
            parts.append(title.group(1).strip())
        return " — ".join(parts) if parts else "(HTML error page)"
    return body[:limit]


async def post_openai_compat(
    base_url: str,
    model_id: str,
    messages: List[Dict[str, Any]],
    temperature: float = 0.2,
    max_tokens: int = 2048,
    json_format: bool = False,
) -> str:
    """POST to an OpenAI-compatible /v1/chat/completions endpoint with retry."""
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

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_get_timeout()) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.ConnectError:
            error_msg = f"Model server not reachable at {base_url}. Start the server or update env var."
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            clean_body = _clean_error_body(e.response.text)

            if status in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
                wait = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    f"[Retry {attempt+1}/{MAX_RETRIES}] {status} from {model_id} — retrying in {wait}s"
                )
                await asyncio.sleep(wait)
                last_error = e
                continue

            error_msg = f"API Error {status} from {base_url} ({model_id}): {clean_body}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except httpx.ReadTimeout:
            if attempt < MAX_RETRIES:
                wait = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    f"[Retry {attempt+1}/{MAX_RETRIES}] ReadTimeout from {model_id} — retrying in {wait}s"
                )
                await asyncio.sleep(wait)
                last_error = RuntimeError(f"ReadTimeout calling {model_id}")
                continue
            error_msg = f"Request to {model_id} timed out after {MAX_RETRIES+1} attempts ({_get_timeout()}s each)"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            logger.error(f"Failed to generate from {model_id}: {e}")
            raise

    raise RuntimeError(f"All {MAX_RETRIES+1} attempts failed for {model_id}: {last_error}")

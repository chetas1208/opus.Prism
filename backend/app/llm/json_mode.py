import json
from base64 import b64encode
import mimetypes


def _encode_image(image_path: str) -> str:
    """Encode an image path to base64 string with proper mime type header."""
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = "image/jpeg"

    with open(image_path, "rb") as image_file:
        encoded = b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def parse_and_repair_json(raw_response: str, client_func) -> dict:
    """Attempt to parse response as JSON. Retry once via LLM if it fails.

    ``client_func`` must be an async callable(messages) -> str.
    """
    clean_response = _strip_markdown_fences(raw_response)

    try:
        return json.loads(clean_response)
    except json.JSONDecodeError as e:
        print(f"[JSON Repair] Primary decode failed: {e}")

    repair_prompt = (
        "You are a JSON repair bot. The following text contains invalid JSON. "
        "Fix all syntax errors and return ONLY valid JSON matching the intended "
        "schema. DO NOT output markdown.\n\n"
        f"INVALID JSON:\n{raw_response}"
    )
    messages = [{"role": "user", "content": repair_prompt}]

    try:
        repaired_raw = await client_func(messages)
        rclean = _strip_markdown_fences(repaired_raw)
        return json.loads(rclean)
    except Exception as ex:
        raise RuntimeError(
            f"Failed to generate valid JSON after repair attempt. "
            f"Raw out: {raw_response[:200]}... Error: {ex}"
        )

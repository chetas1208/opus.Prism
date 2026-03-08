from rapidfuzz import fuzz


def compare_text(expected: str, detected: str) -> float:
    """Return similarity score (0-100) between expected and detected text."""
    if not expected and not detected:
        return 100.0
    if not expected:
        return 0.0 if detected else 100.0
    return fuzz.ratio(expected.lower(), detected.lower())

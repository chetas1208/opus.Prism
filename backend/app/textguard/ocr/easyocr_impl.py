import easyocr

_reader = None

def _get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['en'])
    return _reader

def run_ocr_on_frame(frame_path: str) -> str:
    """Run OCR on a single frame and return concatenated detected text using EasyOCR."""
    reader = _get_reader()
    results = reader.readtext(frame_path)
    return " ".join([r[1] for r in results])

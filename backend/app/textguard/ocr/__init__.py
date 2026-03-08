import os

def get_ocr_engine():
    """Returns the OCR function based on OCR_PROVIDER."""
    provider = os.getenv("OCR_PROVIDER", "easyocr").lower()
    
    if provider == "ppocrv5":
        from .ppocrv5_impl import run_ocr_on_frame
        return run_ocr_on_frame
        
    # Default fallback
    from .easyocr_impl import run_ocr_on_frame
    return run_ocr_on_frame

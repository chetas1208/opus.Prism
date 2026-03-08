import os
from huggingface_hub import snapshot_download
from paddleocr import PaddleOCR

_ocr_engine = None

def _get_ppocr():
    global _ocr_engine
    if _ocr_engine is None:
        print("[PP-OCRv5] Initializing engine and downloading models if needed...")
        model_dir = os.path.join(os.getcwd(), "models", "ppocrv5")
        
        det_path = os.path.join(model_dir, "det")
        rec_path = os.path.join(model_dir, "rec")
        
        if not os.path.exists(det_path):
            print("[PP-OCRv5] Downloading det model from Hugging Face...")
            snapshot_download(repo_id="PaddlePaddle/PP-OCRv5_server_det", local_dir=det_path)
        if not os.path.exists(rec_path):
            print("[PP-OCRv5] Downloading rec model from Hugging Face...")
            snapshot_download(repo_id="PaddlePaddle/PP-OCRv5_server_rec", local_dir=rec_path)
            
        _ocr_engine = PaddleOCR(
            det_model_dir=det_path,
            rec_model_dir=rec_path,
            use_angle_cls=True,
            lang='en',
            use_gpu=False # Defaulting to CPU for typical local run, configure if necessary
        )
    return _ocr_engine

def run_ocr_on_frame(frame_path: str) -> str:
    """Run OCR on a single frame using PP-OCRv5 from Hugging Face."""
    engine = _get_ppocr()
    result = engine.ocr(frame_path, cls=True)
    
    if not result or not result[0]:
        return ""
        
    lines = [line[1][0] for line in result[0]]
    return " ".join(lines)

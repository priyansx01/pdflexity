#!/usr/bin/env python3
"""
PDFlexity OCR Worker — Highly Optimized Sequential Pipeline
"""
import argparse
import json
import io
import time
import base64
import os
import sys
import uuid
import logging

# Force stdout to be UTF-8 to avoid UnicodeEncodeError on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="[ocr-worker] %(message)s")
logger = logging.getLogger(__name__)

def emit(event: dict):
    """Write a JSON event to stdout (one line, flushed immediately)."""
    sys.stdout.write(json.dumps(event, ensure_ascii=False) + "\n")
    sys.stdout.flush()

def emit_progress(status: str, current_page: int = 0, total_pages: int = 0):
    emit({
        "type": "progress",
        "status": status,
        "currentPage": current_page,
        "totalPages": total_pages,
    })

def emit_error(msg: str):
    emit({"type": "error", "error": msg})

def run_full_ocr(input_path: str, output_dir: str, languages: str, dpi: int):
    """Full OCR pipeline: optimized sequential execution with internal multithreading."""
    import fitz
    import numpy as np
    
    logger.info(f"Opening PDF: {input_path}")
    emit_progress("uploading", 0, 0)
    
    try:
        doc = fitz.open(input_path)
        total_pages = len(doc)
    except Exception as e:
        emit_error(f"Failed to open PDF: {e}")
        return
        
    emit_progress("detecting-layout", 0, total_pages)
    
    try:
        from paddleocr import PaddleOCR
        lang_map = {
            "en": "en", "hi": "hi", "ja": "japan", "ar": "ar",
            "zh": "ch", "ko": "korean", "fr": "french", "de": "german",
            "es": "es", "pt": "pt", "ru": "ru", "it": "it",
        }
        lang_list = [l.strip() for l in languages.split(",")]
        paddle_lang = lang_map.get(lang_list[0], "en") if lang_list else "en"
        
        logging.getLogger("ppocr").setLevel(logging.ERROR)
        
        logger.info("Initializing PaddleOCR engine...")
        ocr_engine = PaddleOCR(
            use_angle_cls=False,
            lang=paddle_lang
        )
        logger.info("PaddleOCR engine initialized successfully.")
    except Exception as e:
        import traceback
        err = f"Failed to initialize PaddleOCR: {e}\n{traceback.format_exc()}"
        logger.error(err)
        emit_error(err)
        return

    all_languages = set()
    total_confidence = 0.0
    start_time = time.time()
    
    base_zoom = 2.0
    
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        page_start = time.time()
        emit_progress("running-ocr", page_num, total_pages)
        
        try:
            page = doc[page_idx]
            page_width = page.rect.width
            page_height = page.rect.height
            
            # Smart resolution capping to prevent memory spikes
            max_dim = max(page_width, page_height)
            zoom = base_zoom
            if max_dim * zoom > 2200:
                zoom = 2200 / max_dim
                
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            img_data = pix.tobytes("png")
            img_data_b64 = base64.b64encode(img_data).decode("utf-8")
            
            # Emit image early so UI feels fast
            emit({
                "type": "page-image",
                "pageImage": {
                    "page": page_num,
                    "imageBase64": img_data_b64,
                    "width": page_width,
                    "height": page_height
                }
            })
            
            img_array = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n).copy()
            result = ocr_engine.predict(img_array)
            
            text_blocks = []
            page_confidences = []
            
            if result and len(result) > 0:
                res_dict = result[0]
                dt_polys = res_dict.get('dt_polys', [])
                rec_texts = res_dict.get('rec_texts', [])
                rec_scores = res_dict.get('rec_scores', [])
                
                for idx, poly in enumerate(dt_polys):
                    if idx >= len(rec_texts) or idx >= len(rec_scores):
                        continue
                    
                    text = rec_texts[idx]
                    confidence = float(rec_scores[idx])
                    
                    if not text or not str(text).strip():
                        continue
                    
                    xs = [float(c[0]) for c in poly]
                    ys = [float(c[1]) for c in poly]
                    
                    bbox = {
                        "x": min(xs) / zoom,
                        "y": min(ys) / zoom,
                        "width": (max(xs) - min(xs)) / zoom,
                        "height": (max(ys) - min(ys)) / zoom
                    }
                    
                    font_size = bbox["height"] * 0.8
                    type_str = "paragraph"
                    text_str = str(text)
                    if len(text_str) > 0 and text_str.isupper() and len(text_str.split()) < 10:
                        type_str = "heading"
                    elif text_str.strip().startswith(("-", "•", "1.", "2.")):
                        type_str = "list"
                        
                    text_blocks.append({
                        "id": str(uuid.uuid4()),
                        "type": type_str,
                        "text": text_str,
                        "confidence": confidence,
                        "bbox": bbox,
                        "fontFamily": "Inter, sans-serif",
                        "fontSize": round(font_size, 1),
                        "fontWeight": 600 if type_str == "heading" else 400,
                        "fontStyle": "normal",
                        "alignment": "left",
                        "lineHeight": round(font_size * 1.4, 1),
                        "color": "#000000",
                    })
                    page_confidences.append(confidence)
            
            avg_confidence = sum(page_confidences) / len(page_confidences) if page_confidences else 0
            total_confidence += avg_confidence
            detected_lang = lang_list[0] if lang_list else "en"
            all_languages.add(detected_lang)
            processing_time = int((time.time() - page_start) * 1000)
            
            emit({
                "type": "page-result",
                "pageResult": {
                    "page": page_num,
                    "width": page_width,
                    "height": page_height,
                    "textBlocks": text_blocks,
                    "tables": [],
                    "images": [],
                    "language": detected_lang,
                    "avgConfidence": round(avg_confidence, 4),
                    "processingTimeMs": processing_time,
                }
            })
            
        except Exception as e:
            import traceback
            logger.error(f"Error processing page {page_num}: {e}\n{traceback.format_exc()}")
            emit({
                "type": "page-result",
                "pageResult": {
                    "page": page_num,
                    "width": page_width if 'page_width' in locals() else 0,
                    "height": page_height if 'page_height' in locals() else 0,
                    "textBlocks": [],
                    "tables": [],
                    "images": [],
                    "language": "en",
                    "avgConfidence": 0,
                    "processingTimeMs": 0,
                }
            })
            
    doc.close()
    
    overall_confidence = total_confidence / total_pages if total_pages > 0 else 0
    total_time = int((time.time() - start_time) * 1000)
    
    emit({
        "type": "complete",
        "overallConfidence": round(overall_confidence, 4),
        "detectedLanguages": list(all_languages),
        "totalProcessingTimeMs": total_time,
        "data": {
            "totalPages": total_pages,
            "overallConfidence": round(overall_confidence, 4),
            "detectedLanguages": list(all_languages),
        }
    })

def run_render_page(input_path: str, page: int, dpi: int):
    """Render a single PDF page as a base64 PNG image."""
    import fitz
    
    try:
        doc = fitz.open(input_path)
        if page < 1 or page > len(doc):
            emit_error(f"Page {page} out of range (1-{len(doc)})")
            return
        
        pg = doc[page - 1]
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = pg.get_pixmap(matrix=mat, alpha=False)
        
        img_data = pix.tobytes("png")
        b64 = base64.b64encode(img_data).decode("utf-8")
        
        result = {
            "page": page,
            "imageBase64": b64,
            "width": pix.width,
            "height": pix.height,
        }
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()
        doc.close()
    except Exception as e:
        emit_error(f"Failed to render page: {e}")

def run_export(input_path: str, output_dir: str, export_format: str, export_output: str):
    """Export OCR results to the requested format."""
    ocr_data_line = sys.stdin.readline().strip()
    edits_line = sys.stdin.readline().strip() if True else "{}"
    
    try:
        ocr_data = json.loads(ocr_data_line) if ocr_data_line else {}
    except:
        ocr_data = {}
    
    try:
        edits = json.loads(edits_line) if edits_line else {}
    except:
        edits = {}
    
    if export_format == "json":
        with open(export_output, "w", encoding="utf-8") as f:
            json.dump(ocr_data, f, indent=2, ensure_ascii=False)
        emit({"type": "complete", "data": {"outputPath": export_output}})
    elif export_format == "docx":
        export_docx(ocr_data, edits, export_output)
    elif export_format in ("editable-pdf", "searchable-pdf"):
        export_pdf(input_path, ocr_data, edits, export_output, export_format)
    else:
        emit_error(f"Unsupported export format: {export_format}")

def export_docx(ocr_data: dict, edits: dict, output_path: str):
    try:
        from docx import Document
        from docx.shared import Pt
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        doc = Document()
        pages = ocr_data if isinstance(ocr_data, list) else [ocr_data]
        
        for page_data in pages:
            if not isinstance(page_data, dict):
                continue
                
            text_blocks = page_data.get("textBlocks", [])
            text_blocks.sort(key=lambda b: (b.get("bbox", {}).get("y", 0), b.get("bbox", {}).get("x", 0)))
            
            for block in text_blocks:
                text = block.get("text", "").strip()
                if not text:
                    continue
                
                block_id = block.get("id", "")
                if block_id in edits:
                    text = edits[block_id].get("text", text)
                
                block_type = block.get("type", "paragraph")
                font_size = block.get("fontSize", 12)
                alignment = block.get("alignment", "left")
                
                if block_type == "heading":
                    heading_level = 1 if font_size >= 20 else 2 if font_size >= 16 else 3
                    para = doc.add_heading(text, level=heading_level)
                else:
                    para = doc.add_paragraph(text)
                    for run in para.runs:
                        run.font.size = Pt(min(font_size, 36))
                
                align_map = {
                    "left": WD_ALIGN_PARAGRAPH.LEFT,
                    "center": WD_ALIGN_PARAGRAPH.CENTER,
                    "right": WD_ALIGN_PARAGRAPH.RIGHT,
                }
                para.alignment = align_map.get(alignment, WD_ALIGN_PARAGRAPH.LEFT)
        
        doc.save(output_path)
        emit({"type": "complete", "data": {"outputPath": output_path}})
    except Exception as e:
        emit_error(f"DOCX export failed: {e}")

def export_pdf(input_path: str, ocr_data: dict, edits: dict, output_path: str, mode: str):
    try:
        import fitz
        doc = fitz.open(input_path)
        pages = ocr_data if isinstance(ocr_data, list) else [ocr_data]
        
        for page_data in pages:
            if not isinstance(page_data, dict):
                continue
            
            page_num = page_data.get("page", 1) - 1
            if page_num < 0 or page_num >= len(doc):
                continue
            
            page = doc[page_num]
            text_blocks = page_data.get("textBlocks", [])
            
            for block in text_blocks:
                text = block.get("text", "").strip()
                if not text:
                    continue
                
                block_id = block.get("id", "")
                if block_id in edits:
                    text = edits[block_id].get("text", text)
                
                bbox = block.get("bbox", {})
                x = bbox.get("x", 0)
                y = bbox.get("y", 0)
                w = bbox.get("width", 100)
                h = bbox.get("height", 20)
                font_size = block.get("fontSize", 11)
                
                rect = fitz.Rect(x, y, x + w, y + h)
                
                if mode == "searchable-pdf":
                    page.insert_text(fitz.Point(x, y + h), text, fontsize=font_size, render_mode=3)
                else:
                    page.draw_rect(rect, color=None, fill=(1, 1, 1))
                    page.insert_textbox(rect, text, fontsize=min(font_size, 36), align=0)
        
        doc.save(output_path)
        doc.close()
        emit({"type": "complete", "data": {"outputPath": output_path}})
    except Exception as e:
        emit_error(f"PDF export failed: {e}")

def main():
    parser = argparse.ArgumentParser(description="PDFlexity OCR Worker")
    parser.add_argument("--input", required=True, help="Input PDF path")
    parser.add_argument("--output-dir", default=".", help="Output directory")
    parser.add_argument("--languages", default="en", help="Comma-separated language codes")
    parser.add_argument("--dpi", type=int, default=300, help="Render DPI")
    parser.add_argument("--mode", default="full", choices=["full", "render-page", "export"])
    parser.add_argument("--export-format", default="searchable-pdf", help="Export format")
    parser.add_argument("--export-output", default="", help="Export output path")
    
    args, unknown = parser.parse_known_args()
    
    if not os.path.exists(args.input):
        emit_error(f"Input file not found: {args.input}")
        return
    
    if args.mode == "full":
        run_full_ocr(args.input, args.output_dir, args.languages, args.dpi)
    elif args.mode == "render-page":
        run_render_page(args.input, 1, args.dpi)
    elif args.mode == "export":
        run_export(args.input, args.output_dir, args.export_format, args.export_output)

if __name__ == "__main__":
    main()

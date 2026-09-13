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
        from rapidocr_onnxruntime import RapidOCR
        lang_list = [l.strip() for l in languages.split(",")]

        logger.info("Initializing RapidOCR (ONNX) engine...")
        # RapidOCR runs the PP-OCR detection/recognition models on ONNX Runtime.
        # Same recognition quality as PaddleOCR but ~3x faster per page, tiny
        # footprint, and no PaddlePaddle runtime to bundle.
        ocr_engine = RapidOCR()
        logger.info("RapidOCR engine initialized successfully.")
    except Exception as e:
        import traceback
        err = f"Failed to initialize OCR engine: {e}\n{traceback.format_exc()}"
        logger.error(err)
        emit_error(err)
        return

    all_languages = set()
    total_confidence = 0.0
    start_time = time.time()
    
    base_zoom = 1.75
    
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
            img_bgr = img_array[:, :, ::-1]  # fitz gives RGB; RapidOCR/opencv want BGR
            ocr_out, _ = ocr_engine(img_bgr)

            text_blocks = []
            page_confidences = []

            # RapidOCR returns a list of [box, text, score]; box is 4 [x, y] points.
            for item in (ocr_out or []):
                poly, text, score = item[0], item[1], float(item[2])
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
                    "confidence": score,
                    "bbox": bbox,
                    "fontFamily": "Inter, sans-serif",
                    "fontSize": round(font_size, 1),
                    "fontWeight": 600 if type_str == "heading" else 400,
                    "fontStyle": "normal",
                    "alignment": "left",
                    "lineHeight": round(font_size * 1.4, 1),
                    "color": "#000000",
                })
                page_confidences.append(score)
            
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

# ─── PDF text editing (fitz) ──────────────────────────────────────────────────

def _hex_color(srgb_int) -> str:
    """fitz span color is an sRGB int (0xRRGGBB) → '#rrggbb'."""
    try:
        v = int(srgb_int)
    except (TypeError, ValueError):
        return "#000000"
    return "#{:06x}".format(v & 0xFFFFFF)

def _base14_font(font_name: str, bold: bool, italic: bool) -> str:
    """Map an arbitrary font name + flags to a PyMuPDF built-in (base-14) code.
    Valid codes: helv/hebo/heit/hebi, cour/cobo/coit/cobi, tiro/tibo/tiit/tibi."""
    name = (font_name or "").lower()
    if "mono" in name or "courier" in name or "consol" in name:
        fam = "co"  # Courier
    elif "times" in name or "serif" in name or "georgia" in name or "roman" in name or "min" in name:
        fam = "ti"  # Times
    else:
        fam = "he"  # Helvetica
    if fam == "ti":
        return {(False, False): "tiro", (True, False): "tibo",
                (False, True): "tiit", (True, True): "tibi"}[(bold, italic)]
    if fam == "co":
        return {(False, False): "cour", (True, False): "cobo",
                (False, True): "coit", (True, True): "cobi"}[(bold, italic)]
    return {(False, False): "helv", (True, False): "hebo",
            (False, True): "heit", (True, True): "hebi"}[(bold, italic)]

def run_edit_extract(input_path: str):
    """Emit an editable text model per page (blocks with geometry + style)."""
    import fitz
    try:
        doc = fitz.open(input_path)
    except Exception as e:
        emit_error(f"Failed to open PDF: {e}")
        return

    pages = []
    for pno in range(len(doc)):
        page = doc[pno]
        rect = page.rect
        blocks = []
        data = page.get_text("dict")
        for bi, block in enumerate(data.get("blocks", [])):
            if block.get("type", 0) != 0:  # 0 = text block
                continue
            for li, line in enumerate(block.get("lines", [])):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = "".join(s.get("text", "") for s in spans)
                if not text.strip():
                    continue
                xs0 = min(s["bbox"][0] for s in spans)
                ys0 = min(s["bbox"][1] for s in spans)
                xs1 = max(s["bbox"][2] for s in spans)
                ys1 = max(s["bbox"][3] for s in spans)
                first = spans[0]
                flags = first.get("flags", 0)
                bold = bool(flags & 16) or "bold" in first.get("font", "").lower()
                italic = bool(flags & 2) or "italic" in first.get("font", "").lower() or "oblique" in first.get("font", "").lower()
                blocks.append({
                    "id": f"p{pno}-l{bi}-{li}",
                    "text": text,
                    "bbox": {"x": xs0, "y": ys0, "width": xs1 - xs0, "height": ys1 - ys0},
                    "fontSize": round(first.get("size", 11.0), 1),
                    "fontName": first.get("font", ""),
                    "color": _hex_color(first.get("color", 0)),
                    "bold": bold,
                    "italic": italic,
                    "align": "left",
                })
        pages.append({
            "page": pno + 1,
            "width": rect.width,
            "height": rect.height,
            "blocks": blocks,
        })
    doc.close()
    emit({"type": "complete", "data": {"pages": pages}})

def run_edit_apply(input_path: str, output_path: str):
    """Apply edits (from stdin JSON) to the PDF: redact originals, redraw edits."""
    import fitz
    edits_line = sys.stdin.readline().strip()
    try:
        edits = json.loads(edits_line) if edits_line else []
    except Exception:
        edits = []
    # edits: [{ page, bbox{x,y,width,height}, text, fontSize, color, bold, italic, align, fontName }]
    try:
        doc = fitz.open(input_path)

        # Group edits by page; redact all originals first, then redraw.
        by_page = {}
        for e in edits:
            by_page.setdefault(int(e.get("page", 1)) - 1, []).append(e)

        for pno, page_edits in by_page.items():
            if pno < 0 or pno >= len(doc):
                continue
            page = doc[pno]
            rects = []
            for e in page_edits:
                b = e.get("bbox", {})
                rects.append(fitz.Rect(b.get("x", 0), b.get("y", 0),
                                       b.get("x", 0) + b.get("width", 0),
                                       b.get("y", 0) + b.get("height", 0)))
            # Remove the original glyphs under each edited box.
            for r in rects:
                page.add_redact_annot(r, fill=(1, 1, 1))
            page.apply_redactions()
            # Redraw the edited text.
            for e, r in zip(page_edits, rects):
                text = e.get("text", "")
                if not text:
                    continue
                color_hex = (e.get("color") or "#000000").lstrip("#")
                try:
                    rr = int(color_hex[0:2], 16) / 255.0
                    gg = int(color_hex[2:4], 16) / 255.0
                    bb = int(color_hex[4:6], 16) / 255.0
                except Exception:
                    rr, gg, bb = 0.0, 0.0, 0.0
                align_map = {"left": 0, "center": 1, "right": 2, "justify": 3}
                fontname = _base14_font(e.get("fontName", ""), bool(e.get("bold")), bool(e.get("italic")))
                fs = e.get("fontSize", 11)
                align = align_map.get(e.get("align", "left"), 0)
                # fitz's insert_textbox is conservative about vertical fit; give it
                # generous height (it only draws within the text extent anyway) and
                # a tight line-height so the redrawn text lands on the original line.
                draw_rect = fitz.Rect(r.x0, r.y0 - 1, r.x1, r.y0 + fs * 3.0 + 2)
                rc = page.insert_textbox(
                    draw_rect, text, fontsize=fs, fontname=fontname,
                    color=(rr, gg, bb), align=align, lineheight=1.0,
                )
                # If it still overflowed, step the font down until it fits.
                shrink = fs
                while rc < 0 and shrink > 5:
                    shrink -= 1
                    rc = page.insert_textbox(
                        draw_rect, text, fontsize=shrink, fontname=fontname,
                        color=(rr, gg, bb), align=align, lineheight=1.0,
                    )

        doc.save(output_path, garbage=3, deflate=True)
        doc.close()
        emit({"type": "complete", "data": {"outputPath": output_path}})
    except Exception as e:
        import traceback
        emit_error(f"Edit apply failed: {e}\n{traceback.format_exc()}")

def main():
    parser = argparse.ArgumentParser(description="PDFlexity OCR Worker")
    parser.add_argument("--input", required=True, help="Input PDF path")
    parser.add_argument("--output-dir", default=".", help="Output directory")
    parser.add_argument("--languages", default="en", help="Comma-separated language codes")
    parser.add_argument("--dpi", type=int, default=300, help="Render DPI")
    parser.add_argument("--mode", default="full", choices=["full", "render-page", "export", "edit-extract", "edit-apply"])
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
    elif args.mode == "edit-extract":
        run_edit_extract(args.input)
    elif args.mode == "edit-apply":
        run_edit_apply(args.input, args.export_output)

if __name__ == "__main__":
    main()

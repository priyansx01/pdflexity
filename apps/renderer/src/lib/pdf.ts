"use client";

/**
 * pdf.js facade — lazy loader + minimal-but-accurate structural types, plus
 * best-effort metadata/thumbnail helpers. NEVER throws; callers get nulls.
 * pdf.js neutralizes (detaches) the buffers it renders — every entry point
 * copies the input first.
 */

// ─── Structural types for the pdf.js legacy build ────────────────────────────

export interface PdfViewport {
  width: number;
  height: number;
  /** [scaleX, skewX, skewY, scaleY, translateX, translateY] */
  transform: number[];
}

/** A single text run from `getTextContent()` (pdf.js `TextItem`). */
export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export interface PdfTextContent {
  items: PdfTextItem[];
}

/** In-flight render; call `cancel()` on unmount / before re-rendering. */
export interface PdfRenderTask {
  promise: Promise<void>;
  cancel(): void;
}

export interface PdfPage {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
    transform?: number[];
  }): PdfRenderTask;
  getTextContent(): Promise<PdfTextContent>;
}

export interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}

export interface PdfGetDocumentTask {
  promise: Promise<PdfDocument>;
}

export interface PdfJsLib {
  getDocument(options: { data: Uint8Array; password?: string }): PdfGetDocumentTask;
  GlobalWorkerOptions: { workerSrc: string };
}

// ─── Lazy singleton ───────────────────────────────────────────────────────────

let pdfjsLib: PdfJsLib | null = null;
let pdfjsLibPromise: Promise<PdfJsLib> | null = null;

export async function getPdfjs(): Promise<PdfJsLib> {
  if (pdfjsLib) return pdfjsLib;
  if (pdfjsLibPromise) return pdfjsLibPromise;
  pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((lib) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
    pdfjsLib = lib as unknown as PdfJsLib;
    return pdfjsLib;
  });
  return pdfjsLibPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function getPdfMeta(
  buffer: ArrayBuffer,
): Promise<{ pages: number | null; encrypted: boolean }> {
  try {
    const lib = await getPdfjs();
    const data = new Uint8Array(buffer.slice(0));
    const pdf = await lib.getDocument({ data, password: "" }).promise;
    const pages = pdf.numPages;
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
    return { pages, encrypted: false };
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") return { pages: null, encrypted: true };
    return { pages: null, encrypted: false };
  }
}

/**
 * Render page 1 of a PDF to a PNG dataURL sized to `maxWidth` (keeps aspect).
 * Returns null on any failure. Never throws and never detaches the input
 * buffer (it renders from a copy).
 */
export async function renderThumbnail(
  buffer: ArrayBuffer,
  maxWidth = 96,
): Promise<string | null> {
  try {
    const lib = await getPdfjs();
    const data = new Uint8Array(buffer.slice(0));
    const pdf = await lib.getDocument({ data, password: "" }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = maxWidth / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const url = canvas.toDataURL("image/png");
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
    return url;
  } catch {
    return null;
  }
}

"use client";

// Lazily load pdf.js (legacy build) with the worker configured the same way the
// existing viewers do, and expose best-effort page-count + encryption detection.
// NEVER throws — callers get nulls on failure.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLibPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPdfjs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (pdfjsLibPromise) return pdfjsLibPromise;
  pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((lib) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
    pdfjsLib = lib;
    return lib;
  });
  return pdfjsLibPromise;
}

export async function getPdfMeta(
  buffer: ArrayBuffer,
): Promise<{ pages: number | null; encrypted: boolean }> {
  try {
    const lib = await getPdfjs();
    // Copy the buffer — pdf.js neutralizes (detaches) the data it's handed.
    const data = new Uint8Array(buffer.slice(0));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = lib.getDocument({ data, password: "" });
    const pdf = await task.promise;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
